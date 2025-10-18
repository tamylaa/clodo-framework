/**
 * Rate Limiter for Cloudflare API calls
 * Implements exponential backoff and request queuing to prevent rate limit violations
 */

import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

/**
 * Rate limiter configuration for different Cloudflare API endpoints
 */
const RATE_LIMITS = {
  // Workers API limits (1000/hour, 100/minute)
  workers: {
    maxRequestsPerMinute: 100,
    maxRequestsPerHour: 1000,
    baseDelay: 1000, // 1 second
    maxDelay: 300000, // 5 minutes
  },
  // D1 Database API limits (1000/hour)
  d1: {
    maxRequestsPerMinute: 50,
    maxRequestsPerHour: 1000,
    baseDelay: 2000, // 2 seconds
    maxDelay: 600000, // 10 minutes
  },
  // General API limits
  general: {
    maxRequestsPerMinute: 30,
    maxRequestsPerHour: 500,
    baseDelay: 3000, // 3 seconds
    maxDelay: 900000, // 15 minutes
  }
};

/**
 * Request queue for each API type
 */
const requestQueues = {
  workers: [],
  d1: [],
  general: []
};

/**
 * Current request counts and timestamps
 */
const requestCounts = {
  workers: { minute: 0, hour: 0, lastMinuteReset: Date.now(), lastHourReset: Date.now() },
  d1: { minute: 0, hour: 0, lastMinuteReset: Date.now(), lastHourReset: Date.now() },
  general: { minute: 0, hour: 0, lastMinuteReset: Date.now(), lastHourReset: Date.now() }
};

/**
 * Reset counters based on time windows
 */
function resetCounters() {
  const now = Date.now();

  Object.keys(requestCounts).forEach(apiType => {
    const counts = requestCounts[apiType];

    // Reset minute counter if needed
    if (now - counts.lastMinuteReset >= 60000) { // 1 minute
      counts.minute = 0;
      counts.lastMinuteReset = now;
    }

    // Reset hour counter if needed
    if (now - counts.lastHourReset >= 3600000) { // 1 hour
      counts.hour = 0;
      counts.lastHourReset = now;
    }
  });
}

/**
 * Calculate delay based on exponential backoff
 */
function calculateDelay(apiType, attempt = 0) {
  const config = RATE_LIMITS[apiType];
  const delay = Math.min(config.baseDelay * Math.pow(2, attempt), config.maxDelay);
  return delay + Math.random() * 1000; // Add jitter
}

/**
 * Check if we can make a request without violating rate limits
 */
function canMakeRequest(apiType) {
  resetCounters();
  const counts = requestCounts[apiType];
  const limits = RATE_LIMITS[apiType];

  return counts.minute < limits.maxRequestsPerMinute && counts.hour < limits.maxRequestsPerHour;
}

/**
 * Execute a Cloudflare API command with rate limiting
 */
async function executeWithRateLimit(command, apiType = 'general', maxRetries = 5) {
  return new Promise((resolve, reject) => {
    const attemptRequest = async (attempt = 0) => {
      try {
        // Check if we can make the request
        if (!canMakeRequest(apiType)) {
          const delay = calculateDelay(apiType, attempt);
          console.log(`Rate limit approaching for ${apiType} API. Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptRequest(attempt);
        }

        // Execute the command
        console.log(`Executing ${apiType} API command (attempt ${attempt + 1}/${maxRetries + 1})`);
        const result = await execAsync(command);

        // Update counters on success
        requestCounts[apiType].minute++;
        requestCounts[apiType].hour++;

        resolve(result);
      } catch (error) {
        // Check if it's a rate limit error
        if (error.stderr && (
          error.stderr.includes('rate limit') ||
          error.stderr.includes('429') ||
          error.stderr.includes('Too Many Requests')
        )) {
          if (attempt < maxRetries) {
            const delay = calculateDelay(apiType, attempt);
            console.log(`Rate limit hit for ${apiType} API. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
            setTimeout(() => attemptRequest(attempt + 1), delay);
          } else {
            reject(new Error(`Rate limit exceeded for ${apiType} API after ${maxRetries + 1} attempts: ${error.message}`));
          }
        } else {
          // Not a rate limit error, reject immediately
          reject(error);
        }
      }
    };

    attemptRequest();
  });
}

/**
 * Queue a request for execution with rate limiting
 */
async function queueRequest(command, apiType = 'general', priority = 'normal') {
  return new Promise((resolve, reject) => {
    const request = {
      command,
      apiType,
      priority,
      resolve,
      reject,
      timestamp: Date.now()
    };

    // Add to appropriate queue
    requestQueues[apiType].push(request);

    // Sort by priority (high priority first)
    requestQueues[apiType].sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Process the queue
    processQueue(apiType);
  });
}

/**
 * Process the request queue for a specific API type
 */
async function processQueue(apiType) {
  const queue = requestQueues[apiType];

  if (queue.length === 0) return;

  // Only process one request at a time per API type
  if (queue.processing) return;

  queue.processing = true;

  try {
    while (queue.length > 0) {
      const request = queue.shift();

      try {
        const result = await executeWithRateLimit(request.command, request.apiType);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }

      // Small delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } finally {
    queue.processing = false;
  }
}

/**
 * Get current rate limit status
 */
function getRateLimitStatus(apiType) {
  resetCounters();
  const counts = requestCounts[apiType];
  const limits = RATE_LIMITS[apiType];

  return {
    minute: {
      used: counts.minute,
      limit: limits.maxRequestsPerMinute,
      remaining: Math.max(0, limits.maxRequestsPerMinute - counts.minute)
    },
    hour: {
      used: counts.hour,
      limit: limits.maxRequestsPerHour,
      remaining: Math.max(0, limits.maxRequestsPerHour - counts.hour)
    }
  };
}

/**
 * Clear all queues (useful for testing or emergency situations)
 */
function clearQueues() {
  Object.keys(requestQueues).forEach(apiType => {
    requestQueues[apiType].length = 0;
    requestQueues[apiType].processing = false;
  });
}

export {
  executeWithRateLimit,
  queueRequest,
  getRateLimitStatus,
  clearQueues,
  RATE_LIMITS
};