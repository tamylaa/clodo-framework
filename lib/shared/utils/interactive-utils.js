/**
 * Enhanced Interactive Utils Module
 * Unified interactive utilities with advanced deployment capabilities
 * 
 * Consolidates duplicate interactive-prompts.js modules and provides:
 * - Enhanced user input validation
 * - Progress tracking integration
 * - Multi-step workflow support
 * - Deployment-specific prompts
 * - Rich formatting and colors
 * - Error recovery and retry logic
 * 
 * @version 2.0.0 - Enhanced Interactive Base
 */

import readline from 'readline';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Singleton readline interface
let rl = null;
let isInitialized = false;

/**
 * Enhanced Interactive Utils Class
 */
export class InteractiveUtils {
  constructor(options = {}) {
    this.options = {
      enableColors: options.enableColors !== false,
      enableProgress: options.enableProgress !== false,
      validateInputs: options.validateInputs !== false,
      retryOnError: options.retryOnError !== false,
      maxRetries: options.maxRetries || 3,
      ...options
    };
    
    this.progressState = {
      currentStep: 0,
      totalSteps: 0,
      stepName: '',
      startTime: null
    };
    
    this.validationRules = new Map();
    this.inputHistory = [];
  }

  /**
   * Initialize readline interface
   */
  static getReadlineInterface() {
    if (!rl) {
      rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
      });
      
      // Enhanced signal handling
      rl.on('SIGINT', () => {
        console.log('\\n\\n🚫 Operation cancelled by user');
        process.exit(0);
      });
      
      isInitialized = true;
    }
    return rl;
  }

  /**
   * Enhanced user input with validation and retry logic
   */
  static async askUser(question, defaultValue = null, options = {}) {
    const utils = new InteractiveUtils(options);
    return await utils.askUserWithValidation(question, defaultValue, options.validator);
  }

  /**
   * Enhanced yes/no prompts with clear formatting
   */
  static async askYesNo(question, defaultValue = 'n', options = {}) {
    const utils = new InteractiveUtils(options);
    
    let attempts = 0;
    const maxAttempts = options.maxRetries || 3;
    
    while (attempts < maxAttempts) {
      try {
        const defaultDisplay = defaultValue === 'y' ? 'Y/n' : 'y/N';
        const coloredQuestion = utils.formatQuestion(question);
        const prompt = `${coloredQuestion} [${defaultDisplay}]: `;
        
        const answer = await utils.promptUser(prompt);
        const response = answer.trim().toLowerCase() || defaultValue;
        
        if (['y', 'yes', 'n', 'no'].includes(response)) {
          const result = response === 'y' || response === 'yes';
          utils.recordInput(question, result);
          return result;
        } else {
          attempts++;
          console.log(`   ⚠️  Please answer 'y' or 'n'. (Attempt ${attempts}/${maxAttempts})`);
          if (attempts >= maxAttempts) {
            throw new Error('Maximum retry attempts exceeded');
          }
        }
      } catch (error) {
        if (attempts >= maxAttempts - 1) throw error;
        attempts++;
      }
    }
  }

  /**
   * Enhanced choice selection with better formatting
   */
  static async askChoice(question, choices, defaultIndex = 0, options = {}) {
    const utils = new InteractiveUtils(options);
    
    if (!Array.isArray(choices) || choices.length === 0) {
      throw new Error('Choices must be a non-empty array');
    }
    
    let attempts = 0;
    const maxAttempts = options.maxRetries || 3;
    
    while (attempts < maxAttempts) {
      try {
        const coloredQuestion = utils.formatQuestion(question);
        console.log(`\\n${coloredQuestion}`);
        
        // Enhanced choice formatting
        choices.forEach((choice, index) => {
          const marker = index === defaultIndex ? '▶' : ' ';
          const color = index === defaultIndex ? utils.colors.cyan : utils.colors.white;
          console.log(`${marker} ${color}${index + 1}. ${choice}${utils.colors.reset}`);
        });
        
        const prompt = `\\nSelect option [1-${choices.length}] (default: ${defaultIndex + 1}): `;
        const answer = await utils.promptUser(prompt);
        
        let choice;
        if (answer.trim() === '') {
          choice = defaultIndex;
        } else {
          choice = parseInt(answer) - 1;
        }
        
        if (choice >= 0 && choice < choices.length) {
          utils.recordInput(question, { choice, value: choices[choice] });
          return choice;
        } else {
          attempts++;
          console.log(`   ⚠️  Please select a number between 1 and ${choices.length}. (Attempt ${attempts}/${maxAttempts})`);
          if (attempts >= maxAttempts) {
            throw new Error('Maximum retry attempts exceeded');
          }
        }
      } catch (error) {
        if (attempts >= maxAttempts - 1) throw error;
        attempts++;
      }
    }
  }

  /**
   * Enhanced password input (hidden)
   */
  static async askPassword(question, options = {}) {
    const utils = new InteractiveUtils(options);
    const coloredQuestion = utils.formatQuestion(question);
    
    return new Promise((resolve) => {
      const rl = InteractiveUtils.getReadlineInterface();
      
      // Temporarily hide input
      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      
      let password = '';
      console.log(`${coloredQuestion}: `);
      
      stdin.on('data', function handler(char) {
        char = char.toString();
        
        switch (char) {
          case '\\n':
          case '\\r':
          case '\\u0004': // Ctrl+D
            stdin.setRawMode(false);
            stdin.removeListener('data', handler);
            console.log(''); // New line
            utils.recordInput(question, '[HIDDEN]');
            resolve(password);
            break;
          case '\\u0003': // Ctrl+C
            console.log('\\n\\n🚫 Operation cancelled');
            process.exit(0);
            break;
          case '\\u007f': // Backspace
            if (password.length > 0) {
              password = password.slice(0, -1);
              process.stdout.write('\\b \\b');
            }
            break;
          default:
            password += char;
            process.stdout.write('*');
        }
      });
    });
  }

  /**
   * Multi-step progress tracking
   */
  static startProgress(totalSteps, initialStepName = '') {
    const utils = new InteractiveUtils();
    utils.progressState = {
      currentStep: 0,
      totalSteps,
      stepName: initialStepName,
      startTime: new Date()
    };
    
    if (initialStepName) {
      utils.displayProgress();
    }
    
    return utils;
  }

  /**
   * Update progress step
   */
  nextStep(stepName) {
    this.progressState.currentStep++;
    this.progressState.stepName = stepName;
    this.displayProgress();
  }

  /**
   * Display progress with formatting
   */
  displayProgress() {
    if (!this.options.enableProgress) return;
    
    const { currentStep, totalSteps, stepName, startTime } = this.progressState;
    const percentage = Math.round((currentStep / totalSteps) * 100);
    const elapsed = startTime ? Math.round((Date.now() - startTime.getTime()) / 1000) : 0;
    
    const progressBar = this.generateProgressBar(percentage);
    
    console.log(`\\n${this.colors.blue}[${currentStep}/${totalSteps}] ${progressBar} ${percentage}%${this.colors.reset}`);
    console.log(`${this.colors.cyan}🔄 ${stepName}${this.colors.reset} ${elapsed > 0 ? `(${elapsed}s)` : ''}`);
  }

  /**
   * Generate visual progress bar
   */
  generateProgressBar(percentage, length = 20) {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return `${'█'.repeat(filled)}${'░'.repeat(empty)}`;
  }

  /**
   * Internal method: Ask user with validation
   */
  async askUserWithValidation(question, defaultValue = null, validator = null) {
    let attempts = 0;
    const maxAttempts = this.options.maxRetries;
    
    while (attempts < maxAttempts) {
      try {
        const coloredQuestion = this.formatQuestion(question);
        const prompt = defaultValue ? `${coloredQuestion} [${defaultValue}]: ` : `${coloredQuestion}: `;
        
        const answer = await this.promptUser(prompt);
        const finalAnswer = answer.trim() || defaultValue;
        
        // Validation
        if (validator) {
          const validationResult = await this.validateInput(finalAnswer, validator);
          if (!validationResult.valid) {
            attempts++;
            console.log(`   ❌ ${validationResult.error} (Attempt ${attempts}/${maxAttempts})`);
            if (attempts >= maxAttempts) {
              throw new Error('Maximum validation attempts exceeded');
            }
            continue;
          }
        }
        
        this.recordInput(question, finalAnswer);
        return finalAnswer;
        
      } catch (error) {
        if (attempts >= maxAttempts - 1) throw error;
        attempts++;
      }
    }
  }

  /**
   * Internal method: Prompt user for input
   */
  promptUser(prompt) {
    return new Promise((resolve) => {
      InteractiveUtils.getReadlineInterface().question(prompt, (answer) => {
        resolve(answer);
      });
    });
  }

  /**
   * Validate user input
   */
  async validateInput(input, validator) {
    if (typeof validator === 'function') {
      try {
        const result = await validator(input);
        return { valid: result === true, error: typeof result === 'string' ? result : 'Invalid input' };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    }
    
    if (typeof validator === 'object') {
      // Built-in validation rules
      if (validator.required && (!input || input.trim() === '')) {
        return { valid: false, error: 'This field is required' };
      }
      
      if (validator.minLength && input.length < validator.minLength) {
        return { valid: false, error: `Minimum length is ${validator.minLength} characters` };
      }
      
      if (validator.maxLength && input.length > validator.maxLength) {
        return { valid: false, error: `Maximum length is ${validator.maxLength} characters` };
      }
      
      if (validator.pattern && !validator.pattern.test(input)) {
        return { valid: false, error: validator.message || 'Invalid format' };
      }
      
      if (validator.custom) {
        return await this.validateInput(input, validator.custom);
      }
    }
    
    return { valid: true };
  }

  /**
   * Format question with colors
   */
  formatQuestion(question) {
    if (!this.options.enableColors) return question;
    return `${this.colors.yellow}❓ ${question}${this.colors.reset}`;
  }

  /**
   * Record input for history/debugging
   */
  recordInput(question, answer) {
    this.inputHistory.push({
      timestamp: new Date(),
      question,
      answer: typeof answer === 'object' ? JSON.stringify(answer) : answer
    });
  }

  /**
   * Color codes for enhanced display
   */
  get colors() {
    if (!this.options.enableColors) {
      return {
        reset: '', red: '', green: '', yellow: '', blue: '', cyan: '', white: ''
      };
    }
    
    return {
      reset: '\\x1b[0m',
      red: '\\x1b[31m',
      green: '\\x1b[32m',
      yellow: '\\x1b[33m',
      blue: '\\x1b[34m',
      cyan: '\\x1b[36m',
      white: '\\x1b[37m'
    };
  }

  /**
   * Export input history
   */
  getInputHistory() {
    return this.inputHistory;
  }

  /**
   * Clean up readline interface
   */
  static closePrompts() {
    if (rl && isInitialized) {
      rl.close();
      rl = null;
      isInitialized = false;
    }
  }
}

// Export static convenience functions for backward compatibility
export const askUser = InteractiveUtils.askUser;
export const askYesNo = InteractiveUtils.askYesNo;
export const askChoice = InteractiveUtils.askChoice;
export const askPassword = InteractiveUtils.askPassword;
export const closePrompts = InteractiveUtils.closePrompts;
export const startProgress = InteractiveUtils.startProgress;

// Export class for advanced usage
export { InteractiveUtils as default };

/**
 * Deployment-specific interactive utilities
 */
export class DeploymentInteractiveUtils extends InteractiveUtils {
  constructor(options = {}) {
    super(options);
    
    // Deployment-specific validation rules
    this.validationRules.set('domain', {
      pattern: /^[a-z0-9-]+$/,
      message: 'Domain must contain only lowercase letters, numbers, and hyphens'
    });
    
    this.validationRules.set('email', {
      pattern: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/,
      message: 'Please enter a valid email address'
    });
    
    this.validationRules.set('url', {
      pattern: /^https?:\/\/[^\s]+$/,
      message: 'Please enter a valid URL starting with http:// or https://'
    });
  }

  /**
   * Ask for domain name with validation
   */
  async askDomain(question = 'Enter domain name', defaultValue = null) {
    return await this.askUserWithValidation(
      question, 
      defaultValue, 
      this.validationRules.get('domain')
    );
  }

  /**
   * Ask for email with validation
   */
  async askEmail(question = 'Enter email address', defaultValue = null) {
    return await this.askUserWithValidation(
      question, 
      defaultValue, 
      this.validationRules.get('email')
    );
  }

  /**
   * Ask for URL with validation
   */
  async askUrl(question = 'Enter URL', defaultValue = null) {
    return await this.askUserWithValidation(
      question, 
      defaultValue, 
      this.validationRules.get('url')
    );
  }

  /**
   * Deployment mode selection
   */
  async askDeploymentMode(defaultMode = 0) {
    const modes = [
      'Single Domain (Recommended for first-time users)',
      'Multi-Domain (Deploy multiple domains together)',
      'Portfolio Mode (Advanced: Full portfolio management)'
    ];
    
    return await InteractiveUtils.askChoice(
      'Select deployment mode:',
      modes,
      defaultMode,
      { enableColors: true }
    );
  }

  /**
   * Environment selection with warnings
   */
  async askEnvironment(defaultEnv = 0) {
    const environments = ['production', 'staging', 'development', 'preview'];
    
    const choice = await InteractiveUtils.askChoice(
      'Select deployment environment:',
      environments,
      defaultEnv,
      { enableColors: true }
    );

    // Show environment-specific warnings
    if (environments[choice] === 'production') {
      console.log(`\\n${this.colors.yellow}⚠️  Production Environment Selected:${this.colors.reset}`);
      console.log('   - Enhanced security validation will be performed');
      console.log('   - Backup and recovery mechanisms will be enabled');
      console.log('   - Performance monitoring will be activated');
      
      const confirm = await InteractiveUtils.askYesNo('Continue with production deployment?', 'y');
      if (!confirm) {
        throw new Error('Production deployment cancelled by user');
      }
    }
    
    return choice;
  }
}