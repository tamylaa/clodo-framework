/**
 * Queue Consumer
 * Process messages from Cloudflare Queues
 * 
 * @example
 * import { QueueConsumer } from '@tamyla/clodo-framework/utilities/queues';
 * 
 * export default {
 *   async queue(batch, env) {
 *     const consumer = new QueueConsumer(batch, env);
 *     await consumer.process(async (message) => {
 *       console.log('Processing:', message.body);
 *     });
 *   }
 * }
 */

export class QueueConsumer {
  /**
   * @param {MessageBatch} batch - The message batch from queue handler
   * @param {Object} env - Environment bindings
   */
  constructor(batch, env) {
    this.batch = batch;
    this.env = env;
    this.results = new Map();
  }

  /**
   * Process all messages in the batch
   * @param {Function} handler - Async function to handle each message
   * @param {Object} options - Processing options
   */
  async process(handler, options = {}) {
    const { 
      continueOnError = true,
      maxRetries = 3,
      deadLetterQueue = null
    } = options;

    for (const message of this.batch.messages) {
      try {
        await handler(message.body, {
          id: message.id,
          timestamp: message.timestamp,
          attempts: message.attempts
        });
        
        message.ack();
        this.results.set(message.id, { status: 'success' });
        
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
        
        if (message.attempts >= maxRetries) {
          // Max retries exceeded
          if (deadLetterQueue) {
            // Send to dead letter queue
            await deadLetterQueue.send({
              originalMessage: message.body,
              error: error.message,
              attempts: message.attempts,
              failedAt: Date.now()
            });
          }
          message.ack(); // Acknowledge to prevent infinite retry
          this.results.set(message.id, { status: 'dead_lettered', error: error.message });
        } else {
          // Retry
          message.retry();
          this.results.set(message.id, { status: 'retrying', error: error.message });
        }
        
        if (!continueOnError) {
          throw error;
        }
      }
    }
    
    return this.results;
  }

  /**
   * Process messages with typed handlers
   * @param {Object} handlers - Map of message types to handlers
   * @param {Object} options - Processing options
   */
  async processTyped(handlers, options = {}) {
    const defaultHandler = handlers.default || (async () => {
      console.warn('No handler for message type');
    });

    return this.process(async (body, meta) => {
      const type = body.type || body._type || 'default';
      const handler = handlers[type] || defaultHandler;
      return handler(body, meta, this.env);
    }, options);
  }

  /**
   * Acknowledge all messages (use with caution)
   */
  ackAll() {
    this.batch.ackAll();
  }

  /**
   * Retry all messages (use with caution)
   */
  retryAll() {
    this.batch.retryAll();
  }

  /**
   * Get batch statistics
   */
  getStats() {
    return {
      total: this.batch.messages.length,
      queue: this.batch.queue,
      results: Object.fromEntries(this.results)
    };
  }
}

/**
 * Typed message builder for type-safe queue messages
 */
export class MessageBuilder {
  constructor(type) {
    this.message = { type };
  }

  data(data) {
    this.message = { ...this.message, ...data };
    return this;
  }

  meta(meta) {
    this.message._meta = { ...this.message._meta, ...meta };
    return this;
  }

  priority(priority) {
    this.message._priority = priority;
    return this;
  }

  build() {
    return {
      ...this.message,
      _meta: {
        ...this.message._meta,
        createdAt: Date.now()
      }
    };
  }
}

/**
 * Create a typed message
 */
export function createMessage(type) {
  return new MessageBuilder(type);
}

/**
 * Common message type definitions
 */
export const MessageTypes = {
  EMAIL_SEND: 'email:send',
  EMAIL_BULK: 'email:bulk',
  NOTIFICATION_PUSH: 'notification:push',
  NOTIFICATION_SMS: 'notification:sms',
  TASK_PROCESS: 'task:process',
  TASK_CLEANUP: 'task:cleanup',
  DATA_IMPORT: 'data:import',
  DATA_EXPORT: 'data:export',
  DATA_SYNC: 'data:sync',
  WEBHOOK_DELIVER: 'webhook:deliver',
  WEBHOOK_RETRY: 'webhook:retry'
};

export default QueueConsumer;
