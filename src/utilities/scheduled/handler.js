/**
 * Scheduled/Cron Job Utilities
 * Helpers for Cloudflare Workers Cron Triggers
 * 
 * @example
 * import { ScheduledHandler, CronJob } from '@tamyla/clodo-framework/utilities/scheduled';
 * 
 * const handler = new ScheduledHandler()
 *   .register('0 * * * *', new CleanupJob())
 *   .register('0 0 * * *', new DailyReportJob())
 *   .register('* /5 * * * *', async (event, env) => {
 *     // Run every 5 minutes
 *   });
 * 
 * export default {
 *   scheduled: (event, env, ctx) => handler.handle(event, env, ctx)
 * }
 */

/**
 * Base class for cron jobs
 */
export class CronJob {
  /**
   * Execute the job
   * @param {ScheduledEvent} event - Scheduled event
   * @param {Object} env - Environment bindings
   * @param {ExecutionContext} ctx - Execution context
   */
  async execute(event, env, ctx) {
    throw new Error('execute() must be implemented');
  }

  /**
   * Check if job should run
   * @param {ScheduledEvent} event
   * @returns {boolean}
   */
  shouldRun(event) {
    return true;
  }

  /**
   * Called before execution
   */
  async beforeExecute(event, env) {}

  /**
   * Called after successful execution
   */
  async afterExecute(event, env, result) {}

  /**
   * Called on error
   */
  async onError(event, env, error) {
    console.error(`Job error: ${error.message}`);
    throw error;
  }
}

/**
 * Scheduled event handler with job registration
 */
export class ScheduledHandler {
  constructor() {
    this.jobs = new Map();
    this.defaultJob = null;
    this.middleware = [];
  }

  /**
   * Register a job for a cron pattern
   * @param {string} cron - Cron pattern (e.g., '0 * * * *')
   * @param {CronJob|Function} job - Job instance or function
   */
  register(cron, job) {
    if (typeof job === 'function') {
      // Wrap function in CronJob
      const fn = job;
      job = new class extends CronJob {
        async execute(event, env, ctx) {
          return fn(event, env, ctx);
        }
      };
    }
    
    this.jobs.set(cron, job);
    return this;
  }

  /**
   * Set default job for unmatched cron patterns
   */
  setDefault(job) {
    if (typeof job === 'function') {
      const fn = job;
      job = new class extends CronJob {
        async execute(event, env, ctx) {
          return fn(event, env, ctx);
        }
      };
    }
    this.defaultJob = job;
    return this;
  }

  /**
   * Add middleware
   * @param {Function} fn - Middleware function (event, env, next) => Promise
   */
  use(fn) {
    this.middleware.push(fn);
    return this;
  }

  /**
   * Handle scheduled event
   * @param {ScheduledEvent} event
   * @param {Object} env
   * @param {ExecutionContext} ctx
   */
  async handle(event, env, ctx) {
    const job = this.jobs.get(event.cron) || this.defaultJob;
    
    if (!job) {
      console.warn(`No job registered for cron: ${event.cron}`);
      return;
    }

    if (!job.shouldRun(event)) {
      console.log(`Job skipped for cron: ${event.cron}`);
      return;
    }

    // Run middleware chain
    const runWithMiddleware = async () => {
      let index = 0;
      
      const next = async () => {
        if (index < this.middleware.length) {
          const middleware = this.middleware[index++];
          return middleware(event, env, next);
        }
        return this._executeJob(job, event, env, ctx);
      };
      
      return next();
    };

    return runWithMiddleware();
  }

  async _executeJob(job, event, env, ctx) {
    try {
      await job.beforeExecute(event, env);
      const result = await job.execute(event, env, ctx);
      await job.afterExecute(event, env, result);
      return result;
    } catch (error) {
      return job.onError(event, env, error);
    }
  }
}

/**
 * Job scheduler for dynamic job management
 */
export class JobScheduler {
  constructor(kvNamespace) {
    this.kv = kvNamespace;
    this.prefix = 'jobs:';
  }

  /**
   * Schedule a job for future execution
   * @param {string} jobId - Unique job ID
   * @param {Object} jobData - Job data
   * @param {Date|number} runAt - When to run (Date or timestamp)
   */
  async schedule(jobId, jobData, runAt) {
    const timestamp = runAt instanceof Date ? runAt.getTime() : runAt;
    
    await this.kv.put(
      `${this.prefix}${timestamp}:${jobId}`,
      JSON.stringify({
        id: jobId,
        data: jobData,
        scheduledAt: Date.now(),
        runAt: timestamp
      }),
      { expirationTtl: Math.ceil((timestamp - Date.now()) / 1000) + 86400 }
    );
  }

  /**
   * Get jobs ready to run
   * @returns {Promise<Array>}
   */
  async getReadyJobs() {
    const now = Date.now();
    const jobs = [];
    
    const { keys } = await this.kv.list({ prefix: this.prefix });
    
    for (const key of keys) {
      const [, timestampAndId] = key.name.split(this.prefix);
      const [timestamp] = timestampAndId.split(':');
      
      if (parseInt(timestamp) <= now) {
        const jobData = await this.kv.get(key.name, { type: 'json' });
        if (jobData) {
          jobs.push(jobData);
        }
      }
    }
    
    return jobs;
  }

  /**
   * Mark job as completed
   */
  async complete(jobId, timestamp) {
    await this.kv.delete(`${this.prefix}${timestamp}:${jobId}`);
  }

  /**
   * Reschedule a job
   */
  async reschedule(jobId, currentTimestamp, newRunAt) {
    const key = `${this.prefix}${currentTimestamp}:${jobId}`;
    const jobData = await this.kv.get(key, { type: 'json' });
    
    if (jobData) {
      await this.kv.delete(key);
      await this.schedule(jobId, jobData.data, newRunAt);
    }
  }
}

/**
 * Registry for tracking scheduled jobs
 */
export class ScheduledJobRegistry {
  constructor() {
    this.jobs = new Map();
  }

  /**
   * Define a named job
   */
  define(name, JobClass) {
    this.jobs.set(name, JobClass);
    return this;
  }

  /**
   * Get a job class by name
   */
  get(name) {
    return this.jobs.get(name);
  }

  /**
   * Create a job instance
   */
  create(name, ...args) {
    const JobClass = this.get(name);
    if (!JobClass) {
      throw new Error(`Unknown job: ${name}`);
    }
    return new JobClass(...args);
  }

  /**
   * List all registered jobs
   */
  list() {
    return Array.from(this.jobs.keys());
  }
}

export default ScheduledHandler;
