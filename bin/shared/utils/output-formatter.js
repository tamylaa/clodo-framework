import chalk from 'chalk';

/**
 * OutputFormatter - Unified output formatting for all commands
 * Respects standard flags: --quiet, --verbose, --json, --no-color
 * Provides consistent output formatting across all CLI commands
 */
export class OutputFormatter {
  /**
   * Create an OutputFormatter instance
   * @param {Object} options - Configuration options
   * @param {boolean} options.quiet - Suppress all non-critical output
   * @param {boolean} options.verbose - Show debug and detailed information
   * @param {boolean} options.json - Output as JSON (machine-parseable)
   * @param {boolean} options.noColor - Disable ANSI color codes
   */
  constructor(options = {}) {
    this.quiet = options.quiet || false;
    this.verbose = options.verbose || false;
    this.json = options.json || false;
    this.noColor = options.noColor || false;
    this.buffer = [];

    // Disable chalk colors if requested
    if (this.noColor) {
      chalk.level = 0;
    }
  }

  /**
   * Output a success message
   * @param {string} message - The message to display
   * @param {Object} data - Optional data object for JSON output
   */
  success(message, data = {}) {
    if (this.quiet) {
      return; // Suppress success messages in quiet mode
    }
    if (this.json) {
      this._jsonOutput('success', message, data);
    } else {
      console.log(chalk.green(`✓ ${message}`));
      if (this.verbose && Object.keys(data).length > 0) {
        this._printData(data);
      }
    }
  }

  /**
   * Output an error message
   * @param {string} message - The message to display
   * @param {Object} data - Optional error details
   */
  error(message, data = {}) {
    if (this.json) {
      this._jsonOutput('error', message, data);
    } else {
      console.error(chalk.red(`✗ Error: ${message}`));
      if (this.verbose && Object.keys(data).length > 0) {
        this._printData(data);
      }
    }
  }

  /**
   * Output a warning message
   * @param {string} message - The message to display
   * @param {Object} data - Optional additional information
   */
  warning(message, data = {}) {
    if (this.quiet) {
      return; // Suppress warnings in quiet mode
    }
    if (this.json) {
      this._jsonOutput('warning', message, data);
    } else {
      console.log(chalk.yellow(`⚠ Warning: ${message}`));
      if (this.verbose && Object.keys(data).length > 0) {
        this._printData(data);
      }
    }
  }

  /**
   * Output an informational message
   * @param {string} message - The message to display
   * @param {Object} data - Optional additional information
   */
  info(message, data = {}) {
    if (this.quiet) {
      return; // Suppress info messages in quiet mode
    }
    if (this.json) {
      this._jsonOutput('info', message, data);
    } else {
      console.log(chalk.blue(`ℹ ${message}`));
      if (this.verbose && Object.keys(data).length > 0) {
        this._printData(data);
      }
    }
  }

  /**
   * Output a section header
   * @param {string} title - The section title
   */
  section(title) {
    if (this.quiet) {
      return; // Suppress section headers in quiet mode
    }
    if (this.json) {
      this._jsonOutput('section', title, {});
    } else {
      console.log('');
      console.log(chalk.cyan.bold(`\n═══ ${title} ═══`));
      console.log('');
    }
  }

  /**
   * Output a list of items
   * @param {string} title - The list title
   * @param {Array<string>} items - Array of items to list
   * @param {Object} options - List formatting options
   */
  list(title, items = [], options = {}) {
    if (this.quiet) {
      return; // Suppress lists in quiet mode
    }
    const indent = options.indent || '  ';
    const symbol = options.symbol || '•';

    if (this.json) {
      this._jsonOutput('list', title, { items });
    } else {
      if (title) {
        console.log(chalk.cyan(`${title}:`));
      }
      items.forEach(item => {
        console.log(`${indent}${symbol} ${item}`);
      });
    }
  }

  /**
   * Output data in table format
   * @param {Array<Object>} rows - Array of objects to display as table
   * @param {Array<string>} columns - Column names to display
   */
  table(rows = [], columns = []) {
    if (this.quiet) {
      return; // Suppress tables in quiet mode
    }
    if (this.json) {
      this._jsonOutput('table', 'Data Table', { rows, columns });
    } else if (rows.length > 0) {
      // Simple table formatting
      const headers = columns.length > 0 ? columns : Object.keys(rows[0]);
      const colWidths = headers.map(h => h.length);

      // Calculate column widths based on content
      rows.forEach(row => {
        headers.forEach((header, idx) => {
          const value = String(row[header] || '');
          colWidths[idx] = Math.max(colWidths[idx], value.length);
        });
      });

      // Print headers
      const headerRow = headers
        .map((h, idx) => h.padEnd(colWidths[idx]))
        .join('  ');
      console.log(chalk.cyan.bold(headerRow));

      // Print separator
      const separator = colWidths
        .map(w => '─'.repeat(w))
        .join('──');
      console.log(chalk.gray(separator));

      // Print rows
      rows.forEach(row => {
        const dataRow = headers
          .map((h, idx) => String(row[h] || '').padEnd(colWidths[idx]))
          .join('  ');
        console.log(dataRow);
      });
    }
  }

  /**
   * Output a progress update message
   * @param {string} message - Progress message
   * @param {Object} data - Progress data (steps, total, percent, etc)
   */
  progress(message, data = {}) {
    if (this.quiet) {
      return; // Suppress progress in quiet mode
    }
    if (this.json) {
      this._jsonOutput('progress', message, data);
    } else {
      if (data.percent !== undefined) {
        const bar = this._progressBar(data.percent);
        console.log(`${message} ${bar} ${data.percent}%`);
      } else {
        console.log(`→ ${message}`);
      }
    }
  }

  /**
   * Output debug information (only if verbose flag is set)
   * @param {string} message - Debug message
   * @param {Object} data - Debug data
   */
  debug(message, data = {}) {
    if (this.verbose && !this.quiet && !this.json) {
      console.log(chalk.gray(`[DEBUG] ${message}`));
      if (Object.keys(data).length > 0) {
        this._printData(data);
      }
    } else if (this.json && this.verbose) {
      this._jsonOutput('debug', message, data);
    }
  }

  /**
   * Clear the output buffer
   */
  clear() {
    this.buffer = [];
  }

  /**
   * Get accumulated output as string
   * @returns {string} The buffered output
   */
  getBuffer() {
    return this.buffer.join('\n');
  }

  /**
   * Print JSON output to console
   * @private
   */
  _jsonOutput(type, message, data) {
    const output = {
      type,
      message,
      ...data,
      timestamp: new Date().toISOString()
    };
    console.log(JSON.stringify(output));
  }

  /**
   * Print data object in readable format
   * @private
   */
  _printData(data) {
    console.log(chalk.gray(JSON.stringify(data, null, 2)));
  }

  /**
   * Generate a simple progress bar
   * @private
   */
  _progressBar(percent = 0) {
    const filled = Math.round(percent / 5);
    const empty = 20 - filled;
    return `[${chalk.green('█'.repeat(filled))}${chalk.gray('░'.repeat(empty))}]`;
  }
}

export default OutputFormatter;
