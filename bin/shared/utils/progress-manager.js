/**
 * ProgressManager - Unified progress tracking and spinners for all commands
 * Provides consistent progress display, spinners, and step indicators
 * Integrates with OutputFormatter for consistent output
 */
export class ProgressManager {
  /**
   * Create a ProgressManager instance
   * @param {Object} options - Configuration options
   * @param {OutputFormatter} options.output - OutputFormatter instance for output
   * @param {boolean} options.quiet - Suppress progress display
   * @param {boolean} options.json - Output progress as JSON
   */
  constructor(options = {}) {
    this.output = options.output || null;
    this.quiet = options.quiet || false;
    this.json = options.json || false;
    this.spinner = null;
    this.steps = [];
    this.currentStep = 0;
    this.totalSteps = 0;
    this.startTime = null;
    this.stepStartTime = null;
  }

  /**
   * Initialize progress tracking with defined steps
   * @param {Array<string>} stepNames - Array of step names
   * @returns {ProgressManager} This instance for chaining
   */
  initialize(stepNames = []) {
    this.steps = stepNames;
    this.totalSteps = stepNames.length;
    this.currentStep = 0;
    this.startTime = Date.now();
    return this;
  }

  /**
   * Start a spinner with a message
   * @param {string} message - The spinner message
   * @returns {ProgressManager} This instance for chaining
   */
  start(message) {
    if (this.quiet) {
      return this;
    }

    if (this.json && this.output) {
      this.output.progress(message, { status: 'started' });
    } else if (!this.json && this.output) {
      this.output.progress(message);
    } else if (!this.json && !this.output) {
      // Try to use ora if available, otherwise use simple console spinner
      try {
        // Dynamic require to avoid top-level import issues
        const ora = require('ora').default || require('ora');
        this.spinner = ora(message).start();
      } catch (err) {
        // Fallback to simple console output
        console.log(`⏳ ${message}`);
      }
    }

    return this;
  }

  /**
   * Start a new step in the progress sequence
   * @param {string} stepName - Optional custom step name (overrides initialized name)
   * @returns {ProgressManager} This instance for chaining
   */
  nextStep(stepName = null) {
    if (this.quiet) {
      return this;
    }

    this.currentStep++;
    this.stepStartTime = Date.now();

    const name = stepName || (this.steps[this.currentStep - 1] || `Step ${this.currentStep}`);
    const progress = this.totalSteps > 0 
      ? Math.round((this.currentStep / this.totalSteps) * 100)
      : 0;

    if (this.output) {
      this.output.progress(`[${this.currentStep}/${this.totalSteps}] ${name}`, { 
        percent: progress,
        step: this.currentStep,
        total: this.totalSteps
      });
    } else {
      console.log(`[${this.currentStep}/${this.totalSteps}] ${name}`);
    }

    return this;
  }

  /**
   * Update progress with a message and optional percent
   * @param {string} message - Progress message
   * @param {number} percent - Optional progress percentage (0-100)
   * @returns {ProgressManager} This instance for chaining
   */
  update(message, percent = null) {
    if (this.quiet) {
      return this;
    }

    if (this.json && this.output) {
      this.output.progress(message, { percent });
    } else if (this.output) {
      this.output.progress(message, { percent });
    } else if (this.spinner) {
      this.spinner.text = message;
    } else {
      console.log(`→ ${message}`);
    }

    return this;
  }

  /**
   * Mark progress as successful
   * @param {string} message - Success message
   * @returns {ProgressManager} This instance for chaining
   */
  succeed(message) {
    if (this.quiet) {
      return this;
    }

    const duration = this.getDuration();

    if (this.json && this.output) {
      this.output.success(message, { duration });
    } else if (this.output) {
      this.output.success(message);
    } else if (this.spinner) {
      if (typeof this.spinner.succeed === 'function') {
        this.spinner.succeed(message);
      } else {
        console.log(`✓ ${message}`);
      }
      this.spinner = null;
    } else {
      console.log(`✓ ${message}`);
    }

    return this;
  }

  /**
   * Mark progress as failed
   * @param {string} message - Error message
   * @returns {ProgressManager} This instance for chaining
   */
  fail(message) {
    if (this.json && this.output) {
      this.output.error(message, { duration: this.getDuration() });
    } else if (this.output) {
      this.output.error(message);
    } else if (this.spinner) {
      if (typeof this.spinner.fail === 'function') {
        this.spinner.fail(message);
      } else {
        console.error(`✗ ${message}`);
      }
      this.spinner = null;
    } else {
      console.error(`✗ ${message}`);
    }

    return this;
  }

  /**
   * Mark progress as warning
   * @param {string} message - Warning message
   * @returns {ProgressManager} This instance for chaining
   */
  warn(message) {
    if (this.quiet) {
      return this;
    }

    if (this.json && this.output) {
      this.output.warning(message);
    } else if (this.output) {
      this.output.warning(message);
    } else if (this.spinner) {
      if (typeof this.spinner.warn === 'function') {
        this.spinner.warn(message);
      } else {
        console.log(`⚠ ${message}`);
      }
      this.spinner = null;
    } else {
      console.log(`⚠ ${message}`);
    }

    return this;
  }

  /**
   * Stop the spinner
   * @returns {ProgressManager} This instance for chaining
   */
  stop() {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
    return this;
  }

  /**
   * Get formatted duration from start time
   * @returns {string} Formatted duration (e.g., '1.5s', '2m 30s')
   */
  getDuration() {
    if (!this.startTime) {
      return null;
    }

    const ms = Date.now() - this.startTime;
    const seconds = Math.floor(ms / 1000);
    const milliseconds = ms % 1000;

    if (seconds < 60) {
      return `${seconds}.${Math.floor(milliseconds / 100)}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }

  /**
   * Get current progress as percentage
   * @returns {number} Progress percentage (0-100)
   */
  getProgress() {
    if (this.totalSteps === 0) {
      return 0;
    }
    return Math.round((this.currentStep / this.totalSteps) * 100);
  }

  /**
   * Get step information
   * @returns {Object} {current: number, total: number, name: string}
   */
  getStepInfo() {
    const name = this.steps[this.currentStep - 1] || `Step ${this.currentStep}`;
    return {
      current: this.currentStep,
      total: this.totalSteps,
      name
    };
  }

  /**
   * Create a task list progress display
   * @param {Array<Object>} tasks - Array of {name, completed} objects
   * @returns {ProgressManager} This instance for chaining
   */
  showTasks(tasks = []) {
    if (this.quiet) {
      return this;
    }

    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (this.output) {
      this.output.progress(`Tasks: ${completed}/${total}`, { percent });
    }

    return this;
  }

  /**
   * Create a multi-step progress display
   * @param {Object} info - Progress information
   * @returns {ProgressManager} This instance for chaining
   */
  showMultiStep(info = {}) {
    if (this.quiet) {
      return this;
    }

    const { current = 0, total = 0, message = '' } = info;
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    const displayMsg = message ? `${message} [${current}/${total}]` : `Step ${current}/${total}`;

    if (this.output) {
      this.output.progress(displayMsg, { percent });
    }

    return this;
  }

  /**
   * Create a time-based progress display
   * @param {number} elapsed - Elapsed time in ms
   * @param {number} total - Total expected time in ms
   * @param {string} message - Progress message
   * @returns {ProgressManager} This instance for chaining
   */
  showTimed(elapsed, total, message = '') {
    if (this.quiet) {
      return this;
    }

    const percent = total > 0 ? Math.round((elapsed / total) * 100) : 0;
    const displayMsg = message ? `${message}` : 'Processing';

    if (this.output) {
      this.output.progress(displayMsg, { percent, elapsed, total });
    }

    return this;
  }

  /**
   * Reset progress tracker
   * @returns {ProgressManager} This instance for chaining
   */
  reset() {
    this.stop();
    this.steps = [];
    this.currentStep = 0;
    this.totalSteps = 0;
    this.startTime = null;
    this.stepStartTime = null;
    return this;
  }
}

export default ProgressManager;
