/**
 * ErrorTracker - Comprehensive Error Handling and Recovery System
 *
 * Captures failures, tracks input states, and provides recovery mechanisms
 * for the Clodo Framework service lifecycle management.
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { logger } from '../lib/shared/logging/Logger.js';

export class ErrorTracker {
  constructor() {
    this.errors = [];
    this.errorLogPath = './clodo-service-errors.log';
    this.maxErrors = 100; // Keep last 100 errors
  }

  /**
   * Capture an error with context and input state
   */
  captureError(error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context: {
        command: context.command || 'unknown',
        servicePath: context.servicePath || process.cwd(),
        inputState: context.inputState || {},
        userInputs: context.userInputs || {},
        action: context.action || 'unknown',
        options: context.options || {}
      },
      recovery: this.generateRecoverySuggestions(error, context),
      severity: this.determineSeverity(error, context)
    };

    this.errors.push(errorEntry);

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log to file asynchronously (don't block)
    this.logErrorToFile(errorEntry).catch(err => {
      logger.warn('Failed to write error log', { error: err.message });
    });

    return errorEntry;
  }

  /**
   * Generate recovery suggestions based on error type and context
   */
  generateRecoverySuggestions(error, context) {
    const suggestions = [];

    // Network/API errors
    if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('API')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Verify Cloudflare API token is valid and has required permissions');
      suggestions.push('Confirm Cloudflare account and zone IDs are correct');
    }

    // Authentication errors
    if (error.message.includes('auth') || error.message.includes('token') || error.message.includes('401') || error.message.includes('403')) {
      suggestions.push('Verify Cloudflare API token has not expired');
      suggestions.push('Check that the token has permissions for the required operations');
      suggestions.push('Regenerate API token if necessary');
    }

    // File system errors
    if (error.message.includes('ENOENT') || error.message.includes('permission') || error.message.includes('access')) {
      suggestions.push('Check file permissions on the service directory');
      suggestions.push('Ensure you have write access to the target directory');
      suggestions.push('Verify the service path exists and is accessible');
    }

    // Validation errors
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      suggestions.push('Review input values for correctness');
      suggestions.push('Use clodo-service validate <path> to check service configuration');
      suggestions.push('Run clodo-service diagnose <path> for detailed issue analysis');
    }

    // Configuration errors
    if (error.message.includes('config') || error.message.includes('configuration')) {
      suggestions.push('Run clodo-service update --fix-errors to attempt automatic fixes');
      suggestions.push('Check domain configuration in src/config/domains.js');
      suggestions.push('Verify package.json has all required fields');
    }

    // Template errors
    if (error.message.includes('template') || error.message.includes('variable')) {
      suggestions.push('Check that all required template variables are provided');
      suggestions.push('Verify template files exist and are readable');
      suggestions.push('Regenerate service with clodo-service update --regenerate-configs');
    }

    // Service creation/update specific
    if (context.action === 'create' || context.action === 'update') {
      suggestions.push('Try running the command again with --non-interactive flag');
      suggestions.push('Use clodo-service diagnose to identify specific issues');
      suggestions.push('Check that service name follows naming conventions (lowercase, hyphens only)');
    }

    // Cloudflare specific
    if (context.action && context.action.includes('cloudflare')) {
      suggestions.push('Verify Cloudflare account has D1 database enabled');
      suggestions.push('Check zone ID corresponds to the correct domain');
      suggestions.push('Ensure API token has D1:Edit permission');
    }

    // Add generic suggestions if none specific found
    if (suggestions.length === 0) {
      suggestions.push('Check the error message for specific details');
      suggestions.push('Review the Clodo Framework documentation');
      suggestions.push('Try the operation again after reviewing inputs');
      suggestions.push('Contact support if the issue persists');
    }

    return suggestions;
  }

  /**
   * Determine error severity level
   */
  determineSeverity(error, context) {
    // Critical errors that prevent operation
    if (error.message.includes('authentication') ||
        error.message.includes('permission') ||
        error.message.includes('access denied') ||
        error.message.includes('critical')) {
      return 'critical';
    }

    // High severity - operation fails but may be recoverable
    if (error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('connection') ||
        error.message.includes('validation')) {
      return 'high';
    }

    // Medium severity - partial failure or warnings
    if (error.message.includes('warning') ||
        error.message.includes('deprecated') ||
        error.message.includes('not found')) {
      return 'medium';
    }

    // Low severity - minor issues
    return 'low';
  }

  /**
   * Log error to file
   */
  async logErrorToFile(errorEntry) {
    try {
      const logEntry = JSON.stringify(errorEntry, null, 2) + '\n---\n';
      await fs.appendFile(this.errorLogPath, logEntry);
    } catch (error) {
      // If we can't write to the log file, at least show a warning
      logger.warn('Could not write to error log', { error: error.message });
    }
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10) {
    return this.errors.slice(-limit);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity) {
    return this.errors.filter(error => error.severity === severity);
  }

  /**
   * Get errors by command
   */
  getErrorsByCommand(command) {
    return this.errors.filter(error => error.context.command === command);
  }

  /**
   * Clear error history
   */
  clearErrors() {
    this.errors = [];
  }

  /**
   * Export error report
   */
  async exportErrorReport(filePath) {
    const report = {
      generated: new Date().toISOString(),
      totalErrors: this.errors.length,
      errorsBySeverity: {
        critical: this.getErrorsBySeverity('critical').length,
        high: this.getErrorsBySeverity('high').length,
        medium: this.getErrorsBySeverity('medium').length,
        low: this.getErrorsBySeverity('low').length
      },
      recentErrors: this.getRecentErrors(20),
      summary: this.generateErrorSummary()
    };

    await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf8');
  }

  /**
   * Generate error summary
   */
  generateErrorSummary() {
    const summary = {
      mostCommonErrors: [],
      mostProblematicCommands: [],
      recentTrends: 'Analysis not implemented yet'
    };

    // Count error types
    const errorCounts = {};
    this.errors.forEach(error => {
      const key = error.error.name || 'Unknown';
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });

    summary.mostCommonErrors = Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    // Count problematic commands
    const commandCounts = {};
    this.errors.forEach(error => {
      const command = error.context.command || 'unknown';
      commandCounts[command] = (commandCounts[command] || 0) + 1;
    });

    summary.mostProblematicCommands = Object.entries(commandCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([command, count]) => ({ command, count }));

    return summary;
  }

  /**
   * Display error summary to console
   */
  displayErrorSummary() {
    const summary = this.generateErrorSummary();

    console.log(chalk.cyan('\n📊 Error Summary'));
    console.log(chalk.white(`Total Errors: ${this.errors.length}`));

    if (summary.mostCommonErrors.length > 0) {
      console.log(chalk.cyan('\nMost Common Errors:'));
      summary.mostCommonErrors.forEach(({ type, count }) => {
        console.log(chalk.white(`  ${type}: ${count} times`));
      });
    }

    if (summary.mostProblematicCommands.length > 0) {
      console.log(chalk.cyan('\nMost Problematic Commands:'));
      summary.mostProblematicCommands.forEach(({ command, count }) => {
        console.log(chalk.white(`  ${command}: ${count} errors`));
      });
    }
  }

  /**
   * Attempt automatic error recovery
   */
  async attemptRecovery(errorEntry) {
    const recoveries = [];

    try {
      // Try common recovery actions based on error type
      if (errorEntry.error.message.includes('permission') || errorEntry.error.message.includes('access')) {
        // Try to fix permissions (limited in what we can do)
        recoveries.push('Checked permissions - manual intervention may be required');
      }

      if (errorEntry.error.message.includes('network') || errorEntry.error.message.includes('timeout')) {
        // Wait and retry logic could be implemented here
        recoveries.push('Network error detected - consider retrying the operation');
      }

      if (errorEntry.context.action === 'validate' || errorEntry.context.action === 'create') {
        // Try to validate/fix configuration
        recoveries.push('Consider running clodo-service update --fix-errors');
      }

    } catch (recoveryError) {
      recoveries.push(`Recovery attempt failed: ${recoveryError.message}`);
    }

    return recoveries;
  }
}
