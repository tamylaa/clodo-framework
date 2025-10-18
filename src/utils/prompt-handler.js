/**
 * Shared Prompt Utilities
 * Common prompt handling functionality used across the framework
 */

import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'node:process';

/**
 * Base prompt handler for interactive user input
 */
export class PromptHandler {
  constructor(options = {}) {
    this.interactive = options.interactive !== false;
    this.rl = null;
  }

  /**
   * Initialize readline interface
   */
  async initialize() {
    if (this.interactive && !this.rl) {
      this.rl = readline.createInterface({ input, output });
    }
  }

  /**
   * Prompt user for input
   */
  async prompt(question) {
    if (!this.interactive) {
      return '';
    }

    await this.initialize();
    try {
      const answer = await this.rl.question(question);
      return answer.trim();
    } catch (error) {
      console.error('Prompt error:', error.message);
      return '';
    }
  }

  /**
   * Prompt with choices
   */
  async promptChoice(question, choices, defaultIndex = 0) {
    if (!this.interactive) {
      return choices[defaultIndex];
    }

    console.log(question);
    choices.forEach((choice, index) => {
      const marker = index === defaultIndex ? ' (default)' : '';
      console.log(`  ${index + 1}. ${choice}${marker}`);
    });

    const answer = await this.prompt('Enter choice: ');
    if (!answer) return choices[defaultIndex];

    const choiceIndex = parseInt(answer) - 1;
    if (choiceIndex >= 0 && choiceIndex < choices.length) {
      return choices[choiceIndex];
    }

    return choices[defaultIndex];
  }

  /**
   * Confirm yes/no question
   */
  async confirm(question, defaultValue = false) {
    if (!this.interactive) {
      return defaultValue;
    }

    const suffix = defaultValue ? ' (Y/n)' : ' (y/N)';
    const answer = await this.prompt(question + suffix);
    
    if (!answer) return defaultValue;
    
    const normalized = answer.toLowerCase();
    return normalized === 'y' || normalized === 'yes';
  }

  /**
   * Cleanup readline interface
   */
  async close() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}

/**
 * Factory for creating prompt handlers
 */
export function createPromptHandler(options = {}) {
  return new PromptHandler(options);
}