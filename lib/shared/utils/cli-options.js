/**
 * CLI Standard Options - Unified global options for all commands
 * Ensures consistent behavior across all clodo-service commands
 * 
 * All commands should use this to define standard options:
 * - --verbose, -v: Verbose output with debug info
 * - --quiet, -q: Minimal output (only errors/warnings)
 * - --json: Output results as JSON (parseable)
 * - --no-color: Disable colored output
 * - --config-file <path>: Load defaults from JSON configuration file
 */

/**
 * StandardOptions - Provides unified option definition for all commands
 */
export class StandardOptions {
  /**
   * Define standard options on a commander command
   * @param {Command} command - The commander command to add options to
   * @returns {Command} The command for chaining
   */
  static define(command) {
    return command
      .option('-v, --verbose', 'Verbose output with debug information')
      .option('-q, --quiet', 'Minimal output (only errors and warnings)')
      .option('--json', 'Output results as JSON (machine-parseable format)')
      .option('--no-color', 'Disable colored output')
      .option('--config-file <path>', 'Load configuration defaults from JSON file')
  }

  /**
   * Get all standard option definitions
   * @returns {Object} Object with option metadata
   */
  static getOptions() {
    return {
      verbose: {
        flags: '-v, --verbose',
        description: 'Verbose output with debug information',
        type: 'boolean',
        default: false
      },
      quiet: {
        flags: '-q, --quiet',
        description: 'Minimal output (only errors and warnings)',
        type: 'boolean',
        default: false
      },
      json: {
        flags: '--json',
        description: 'Output results as JSON (machine-parseable format)',
        type: 'boolean',
        default: false
      },
      noColor: {
        flags: '--no-color',
        description: 'Disable colored output',
        type: 'boolean',
        default: true // Note: --no-color sets this to false
      },
      configFile: {
        flags: '--config-file <path>',
        description: 'Load configuration defaults from JSON file',
        type: 'string',
        default: null
      }
    }
  }

  /**
   * Validate option combinations
   * @param {Object} options - Parsed options
   * @returns {Object} {valid: boolean, errors: string[]}
   */
  static validate(options = {}) {
    const errors = [];

    // Handle null options
    if (!options || typeof options !== 'object') {
      return { valid: true, errors };
    }

    // Cannot be both quiet and verbose
    if (options.quiet && options.verbose) {
      errors.push('Cannot use both --quiet and --verbose flags simultaneously');
    }

    // Config file must exist (if specified)
    if (options.configFile) {
      try {
        const { existsSync } = require('fs');
        if (!existsSync(options.configFile)) {
          errors.push(`Config file not found: ${options.configFile}`);
        }
      } catch (err) {
        // If we can't check, don't error
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get display name for an option
   * @param {string} optionKey - The option key (e.g., 'verbose', 'configFile')
   * @returns {string} Display name (e.g., 'Verbose' or 'Config File')
   */
  static getDisplayName(optionKey) {
    const specialCases = {
      'json': 'JSON',
      'noColor': 'No Color',
      'configFile': 'Config File'
    };

    if (specialCases[optionKey]) {
      return specialCases[optionKey];
    }

    const camelToWords = (str) => {
      const result = str.replace(/([A-Z])/g, ' $1');
      return result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
    };

    return camelToWords(optionKey).trim();
  }

  /**
   * Check if a specific option was provided
   * @param {Object} options - Parsed options
   * @param {string} optionKey - The option to check
   * @returns {boolean} Whether the option was provided
   */
  static isProvided(options, optionKey) {
    return options[optionKey] !== undefined && options[optionKey] !== null
  }
}

export default StandardOptions
