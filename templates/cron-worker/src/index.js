/**
 * Cron Worker Template — @tamyla/clodo-framework
 * 
 * A fully working scheduled/cron worker with:
 * - Scheduled handler with cron trigger
 * - KV state persistence between runs
 * - Job registry for multiple cron schedules
 * - Notification pattern
 * - Health check endpoint
 * 
 * Deploy with: npx wrangler deploy
 */

import {
  createCorsMiddleware,
  createErrorHandler,
  createLogger,
  composeMiddleware,
  createEnvironmentGuard
} from '@tamyla/clodo-framework';

// ── Environment validation ────────────────────────────────────────────
const envGuard = createEnvironmentGuard({
  required: ['KV_DATA'],
  optional: ['NOTIFICATION_WEBHOOK']
});

// ── Middleware ────────────────────────────────────────────────────────
const middleware = composeMiddleware(
  createCorsMiddleware({ origins: ['*'] }),
  createLogger({ prefix: 'cron-worker' }),
  createErrorHandler()
);

// ── Job registry — define your scheduled jobs ─────────────────────────
const jobs = {
  /**
   * Daily cleanup job — runs every day at midnight UTC
   * Cron: 0 0 * * *
   */
  async 'daily-cleanup'(env, ctx) {
    console.log('Running daily cleanup...');

    const state = await getJobState(env, 'daily-cleanup');
    
    // Your cleanup logic here
    const result = {
      cleanedItems: 0,
      freedSpace: '0 MB',
      timestamp: new Date().toISOString()
    };

    // Persist state
    await saveJobState(env, 'daily-cleanup', {
      lastRun: new Date().toISOString(),
      lastResult: result,
      runCount: (state.runCount || 0) + 1
    });

    return result;
  },

  /**
   * Periodic health probe — runs every 5 minutes
   * Cron: *​/5 * * * *
   */
  async 'health-probe'(env, ctx) {
    console.log('Running health probe...');

    // Example: check external dependencies
    const checks = {
      timestamp: new Date().toISOString(),
      status: 'healthy'
    };

    await saveJobState(env, 'health-probe', {
      lastRun: new Date().toISOString(),
      lastResult: checks
    });

    // Optionally notify on unhealthy status
    if (checks.status !== 'healthy' && env.NOTIFICATION_WEBHOOK) {
      ctx.waitUntil(
        fetch(env.NOTIFICATION_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `⚠️ Health probe failed: ${JSON.stringify(checks)}`
          })
        })
      );
    }

    return checks;
  }
};

// ── State helpers ────────────────────────────────────────────────────
async function getJobState(env, jobName) {
  try {
    const data = await env.KV_DATA.get(`cron:${jobName}`, { type: 'json' });
    return data || {};
  } catch {
    return {};
  }
}

async function saveJobState(env, jobName, state) {
  await env.KV_DATA.put(`cron:${jobName}`, JSON.stringify(state));
}

// ── HTTP Routes (for monitoring) ─────────────────────────────────────
const routes = {
  'GET /health': async (req, env) => {
    return jsonResponse({ status: 'healthy', type: 'cron-worker' });
  },

  'GET /api/jobs': async (req, env) => {
    const jobNames = Object.keys(jobs);
    const statuses = await Promise.all(
      jobNames.map(async (name) => ({
        name,
        state: await getJobState(env, name)
      }))
    );
    return jsonResponse({ jobs: statuses });
  },

  'GET /api/jobs/:name': async (req, env) => {
    const name = req.params?.name;
    if (!jobs[name]) {
      return jsonResponse({ error: `Job '${name}' not found` }, 404);
    }
    const state = await getJobState(env, name);
    return jsonResponse({ name, state });
  },

  // Manual trigger endpoint (useful for testing)
  'POST /api/jobs/:name/trigger': async (req, env, ctx) => {
    const name = req.params?.name;
    if (!jobs[name]) {
      return jsonResponse({ error: `Job '${name}' not found` }, 404);
    }

    const result = await jobs[name](env, ctx);
    return jsonResponse({ triggered: true, name, result });
  }
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ── Worker entry point ────────────────────────────────────────────────
export default {
  // HTTP handler (for monitoring/manual triggers)
  async fetch(request, env, ctx) {
    envGuard.check(env);
    const url = new URL(request.url);
    const routeKey = `${request.method} ${url.pathname}`;
    const handler = routes[routeKey];

    if (!handler) {
      return jsonResponse({ error: 'Not Found' }, 404);
    }

    return middleware.execute(request, () => handler(request, env, ctx));
  },

  // Scheduled handler (runs on cron triggers)
  async scheduled(event, env, ctx) {
    console.log(`Cron triggered at ${new Date(event.scheduledTime).toISOString()}, cron: ${event.cron}`);

    // Map cron expressions to job names
    const cronMap = {
      '0 0 * * *': 'daily-cleanup',
      '*/5 * * * *': 'health-probe'
    };

    const jobName = cronMap[event.cron];

    if (jobName && jobs[jobName]) {
      try {
        const result = await jobs[jobName](env, ctx);
        console.log(`Job ${jobName} completed:`, result);
      } catch (error) {
        console.error(`Job ${jobName} failed:`, error.message);

        // Track failure
        await saveJobState(env, jobName, {
          lastRun: new Date().toISOString(),
          lastError: error.message,
          status: 'failed'
        });
      }
    } else {
      console.warn(`No job mapped to cron expression: ${event.cron}`);
      // Run all jobs if no specific mapping
      for (const [name, job] of Object.entries(jobs)) {
        try {
          await job(env, ctx);
        } catch (error) {
          console.error(`Job ${name} failed:`, error.message);
        }
      }
    }
  }
};
