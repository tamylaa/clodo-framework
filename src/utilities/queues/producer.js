/**
 * Queue Producer
 * Send messages to Cloudflare Queues
 * 
 * @example
 * import { QueueProducer } from '@tamyla/clodo-framework/utilities/queues';
 * 
 * const producer = new QueueProducer(env.MY_QUEUE);
 * await producer.send({ type: 'email', to: 'user@example.com' });
 * await producer.sendBatch([msg1, msg2, msg3]);
 */

export class QueueProducer {
  /**
   * @param {Queue} queue - Queue binding
   */
  constructor(queue) {
    if (!queue) {
      throw new Error('Queue binding is required');
    }
    this.queue = queue;
  }

  /**
   * Send a single message to the queue
   * @param {*} body - Message body (will be JSON serialized)
   * @param {Object} options - Send options
   * @param {number} options.delaySeconds - Delay before processing (max 12 hours)
   * @returns {Promise<void>}
   */
  async send(body, options = {}) {
    const message = {
      body,
      ...(options.delaySeconds && { delaySeconds: options.delaySeconds })
    };
    
    await this.queue.send(message);
  }

  /**
   * Send multiple messages in a batch
   * @param {Array<*>} bodies - Array of message bodies
   * @param {Object} options - Batch options
   * @returns {Promise<void>}
   */
  async sendBatch(bodies, options = {}) {
    const messages = bodies.map(body => ({
      body,
      ...(options.delaySeconds && { delaySeconds: options.delaySeconds })
    }));
    
    await this.queue.sendBatch(messages);
  }

  /**
   * Send a message with automatic retry info
   * @param {*} body - Message body
   * @param {Object} options - Options including retry tracking
   */
  async sendWithRetry(body, options = {}) {
    const enhancedBody = {
      ...body,
      _meta: {
        attempt: (body._meta?.attempt || 0) + 1,
        firstAttemptAt: body._meta?.firstAttemptAt || Date.now(),
        lastAttemptAt: Date.now()
      }
    };
    
    await this.send(enhancedBody, options);
  }
}

export default QueueProducer;
