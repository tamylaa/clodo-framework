/**
 * Analytics Engine Utilities
 * Write events to Cloudflare Analytics Engine
 * 
 * @example
 * import { AnalyticsWriter, EventTracker } from '@tamyla/clodo-framework/utilities/analytics';
 * 
 * const analytics = new AnalyticsWriter(env.ANALYTICS);
 * 
 * // Write a data point
 * analytics.write({
 *   indexes: ['user-123'],
 *   blobs: ['page_view', '/home'],
 *   doubles: [Date.now()],
 * });
 * 
 * // Use event tracker for common patterns
 * const tracker = new EventTracker(env.ANALYTICS);
 * tracker.pageView('/home', { userId: '123', referrer: 'google.com' });
 * tracker.event('button_click', { buttonId: 'signup' });
 */

/**
 * Analytics Engine Writer
 */
export class AnalyticsWriter {
  /**
   * @param {AnalyticsEngineDataset} dataset - Analytics Engine binding
   */
  constructor(dataset) {
    if (!dataset) {
      throw new Error('Analytics Engine dataset binding is required');
    }
    this.dataset = dataset;
  }

  /**
   * Write a data point to Analytics Engine
   * @param {Object} dataPoint - Data point to write
   * @param {string[]} dataPoint.indexes - Index values (up to 1)
   * @param {string[]} dataPoint.blobs - Blob values (up to 20)
   * @param {number[]} dataPoint.doubles - Double values (up to 20)
   */
  write(dataPoint) {
    this.dataset.writeDataPoint({
      indexes: dataPoint.indexes || [],
      blobs: dataPoint.blobs || [],
      doubles: dataPoint.doubles || []
    });
  }

  /**
   * Write multiple data points
   * @param {Array<Object>} dataPoints
   */
  writeBatch(dataPoints) {
    for (const dataPoint of dataPoints) {
      this.write(dataPoint);
    }
  }
}

/**
 * High-level event tracker
 */
export class EventTracker {
  constructor(dataset, options = {}) {
    this.writer = new AnalyticsWriter(dataset);
    this.defaultIndex = options.defaultIndex || '';
    this.includeTimestamp = options.includeTimestamp !== false;
  }

  /**
   * Track a page view
   */
  pageView(path, properties = {}) {
    this.writer.write({
      indexes: [properties.userId || this.defaultIndex],
      blobs: [
        'page_view',
        path,
        properties.referrer || '',
        properties.userAgent || '',
        properties.country || ''
      ],
      doubles: this.includeTimestamp ? [Date.now()] : []
    });
  }

  /**
   * Track a custom event
   */
  event(eventName, properties = {}) {
    const blobs = [
      'event',
      eventName,
      JSON.stringify(properties).slice(0, 1024) // Truncate if too long
    ];

    this.writer.write({
      indexes: [properties.userId || this.defaultIndex],
      blobs,
      doubles: this.includeTimestamp 
        ? [Date.now(), properties.value || 0]
        : [properties.value || 0]
    });
  }

  /**
   * Track an error
   */
  error(errorType, message, properties = {}) {
    this.writer.write({
      indexes: [properties.userId || this.defaultIndex],
      blobs: [
        'error',
        errorType,
        message.slice(0, 1024),
        properties.stack?.slice(0, 1024) || '',
        properties.path || ''
      ],
      doubles: this.includeTimestamp ? [Date.now()] : []
    });
  }

  /**
   * Track API request
   */
  apiRequest(method, path, properties = {}) {
    this.writer.write({
      indexes: [properties.userId || this.defaultIndex],
      blobs: [
        'api_request',
        method,
        path,
        properties.status?.toString() || '',
        properties.error || ''
      ],
      doubles: [
        Date.now(),
        properties.duration || 0,
        properties.status || 0,
        properties.responseSize || 0
      ]
    });
  }

  /**
   * Track user action
   */
  userAction(action, target, properties = {}) {
    this.writer.write({
      indexes: [properties.userId || this.defaultIndex],
      blobs: [
        'user_action',
        action,
        target,
        properties.label || '',
        properties.category || ''
      ],
      doubles: this.includeTimestamp 
        ? [Date.now(), properties.value || 0]
        : [properties.value || 0]
    });
  }
}

/**
 * Metrics collector for performance monitoring
 */
export class MetricsCollector {
  constructor(dataset, options = {}) {
    this.writer = new AnalyticsWriter(dataset);
    this.serviceName = options.serviceName || 'worker';
    this.buffer = [];
    this.flushInterval = options.flushInterval || 1000;
    this.maxBufferSize = options.maxBufferSize || 100;
  }

  /**
   * Record a timing metric
   */
  timing(name, durationMs, tags = {}) {
    this._addToBuffer({
      type: 'timing',
      name,
      value: durationMs,
      tags
    });
  }

  /**
   * Record a counter metric
   */
  counter(name, value = 1, tags = {}) {
    this._addToBuffer({
      type: 'counter',
      name,
      value,
      tags
    });
  }

  /**
   * Record a gauge metric
   */
  gauge(name, value, tags = {}) {
    this._addToBuffer({
      type: 'gauge',
      name,
      value,
      tags
    });
  }

  /**
   * Record request metrics
   */
  request(properties = {}) {
    this.writer.write({
      indexes: [this.serviceName],
      blobs: [
        'request',
        properties.method || 'GET',
        properties.path || '/',
        properties.status?.toString() || '200',
        properties.colo || ''
      ],
      doubles: [
        Date.now(),
        properties.duration || 0,
        properties.status || 200,
        properties.requestSize || 0,
        properties.responseSize || 0
      ]
    });
  }

  /**
   * Create a timer that records duration on stop
   */
  startTimer(name, tags = {}) {
    const start = performance.now();
    return {
      stop: () => {
        const duration = performance.now() - start;
        this.timing(name, duration, tags);
        return duration;
      }
    };
  }

  _addToBuffer(metric) {
    this.buffer.push(metric);
    
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * Flush buffered metrics
   */
  flush() {
    if (this.buffer.length === 0) return;

    const timestamp = Date.now();
    
    for (const metric of this.buffer) {
      this.writer.write({
        indexes: [this.serviceName],
        blobs: [
          metric.type,
          metric.name,
          JSON.stringify(metric.tags || {})
        ],
        doubles: [timestamp, metric.value]
      });
    }
    
    this.buffer = [];
  }
}

export default AnalyticsWriter;
