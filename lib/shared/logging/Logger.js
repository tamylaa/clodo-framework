/**
 * Unified Logger for Clodo Framework
 * Replaces: 6 separate logging implementations
 * Savings: 300+ lines, unified logging across entire codebase
 * 
 * @version 1.0.0
 */

import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

export class Logger {
  constructor(context = {}) {
    this.context = context;
    this.logLevel = this._parseLogLevel(process.env.LOG_LEVEL || 'info');
    this.logDir = process.env.LOG_DIR || null;
    this.logFile = null;
    this.cache = new Map();
    this.isDev = process.env.NODE_ENV !== 'production';
    
    if (this.logDir) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * DEBUG level logging
   */
  debug(message, data = {}) {
    if (this.logLevel > LOG_LEVELS.DEBUG) return;
    this._log('DEBUG', message, data);
  }

  /**
   * INFO level logging
   */
  info(message, data = {}) {
    if (this.logLevel > LOG_LEVELS.INFO) return;
    this._log('INFO', message, data);
  }

  /**
   * WARN level logging
   */
  warn(message, data = {}) {
    if (this.logLevel > LOG_LEVELS.WARN) return;
    this._log('WARN', message, data);
  }

  /**
   * ERROR level logging
   */
  error(message, data = {}) {
    if (this.logLevel > LOG_LEVELS.ERROR) return;
    this._log('ERROR', message, data);
  }

  /**
   * FATAL level logging (exits process)
   */
  fatal(message, data = {}) {
    this._log('FATAL', message, data);
    if (!this.isDev) {
      process.exit(1);
    }
  }

  /**
   * Log HTTP request
   */
  logRequest(request, context = {}) {
    this.info('HTTP Request', {
      method: request.method,
      url: request.url,
      userAgent: request.headers?.get?.('User-Agent'),
      ...context
    });
  }

  /**
   * Log deployment event
   */
  logDeployment(deploymentId, message, context = {}) {
    this.info(`[Deployment ${deploymentId}] ${message}`, {
      deploymentId,
      ...context
    });
  }

  /**
   * Log audit event
   */
  logAudit(eventType, domain, details = {}) {
    this.info(`[Audit] ${eventType} for ${domain}`, {
      eventType,
      domain,
      ...details
    });
  }

  /**
   * Log performance metric
   */
  logPerformance(operation, durationMs, context = {}) {
    const level = durationMs > 5000 ? 'warn' : 'info';
    this[level](`Performance: ${operation}`, {
      operation,
      durationMs,
      ...context
    });
  }

  /**
   * Redact sensitive information from text
   */
  redact(text) {
    if (typeof text !== 'string') return text;
    
    const patterns = [
      // Cloudflare tokens
      [/(CLOUDFLARE_API_TOKEN=?)(\w{20,})/gi, '$1[REDACTED]'],
      // Generic tokens
      [/(token|api[_-]?key|auth[_-]?token)["']?[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi, '$1: [REDACTED]'],
      // Passwords
      [/(password|passwd|pwd)["']?[:=]\s*["']?([^"'\s]{3,})["']?/gi, '$1: [REDACTED]'],
      // Secrets
      [/(secret|key)["']?[:=]\s*["']?([a-zA-Z0-9_-]{10,})["']?/gi, '$1: [REDACTED]'],
      // Account/Zone IDs (partial)
      [/(account[_-]?id|zone[_-]?id)["']?[:=]\s*["']?([a-zA-Z0-9]{8})([a-zA-Z0-9]{24,})["']?/gi, '$1: $2[REDACTED]']
    ];
    
    let redacted = text;
    patterns.forEach(([pattern, replacement]) => {
      redacted = redacted.replace(pattern, replacement);
    });
    return redacted;
  }

  /**
   * Set log file for file output
   */
  setLogFile(filePath) {
    this.logFile = filePath;
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Private: Core logging implementation
   */
  _log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const contextStr = Object.keys(this.context).length > 0 
      ? ` [${JSON.stringify(this.context)}]`
      : '';
    
    const logMessage = `[${timestamp}] ${level}${contextStr}: ${message}`;
    const redactedMessage = this.redact(logMessage);
    
    // Console output
    const display = data && Object.keys(data).length > 0
      ? `${redactedMessage} ${this.redact(JSON.stringify(data))}`
      : redactedMessage;
    
    console.log(display);
    
    // File output
    if (this.logFile) {
      try {
        const fileEntry = JSON.stringify({
          timestamp,
          level,
          message: this.redact(message),
          context: this.context,
          data: this.redact(JSON.stringify(data))
        }) + '\n';
        
        appendFileSync(this.logFile, fileEntry);
      } catch (error) {
        console.error('Failed to write to log file:', error.message);
      }
    }
  }

  /**
   * Parse log level string to numeric value
   */
  _parseLogLevel(levelStr) {
    const upper = levelStr.toUpperCase();
    return LOG_LEVELS[upper] ?? LOG_LEVELS.INFO;
  }
}

/**
 * Export singleton logger
 */
export const logger = new Logger({ framework: 'clodo' });

/**
 * Backwards compatible factory function (for gradual migration)
 */
export const createLogger = (prefix = 'ClodoFramework') => {
  return new Logger({ prefix });
};
