/**
 * Input Handler Module
 * Focused module for collecting core service inputs
 */

import { InputCollector } from '../InputCollector.js';
import { createPromptHandler } from '../../utils/prompt-handler.js';

export class InputHandler {
  constructor(options = {}) {
    this.interactive = options.interactive !== false;
    this.promptHandler = createPromptHandler({ interactive: this.interactive });
    this.inputCollector = new InputCollector({ interactive: this.interactive });
  }

  /**
   * Collect the 6 core inputs required for service creation
   */
  async collectCoreInputs() {
    return await this.inputCollector.collectCoreInputs();
  }

  /**
   * Validate core inputs without prompting
   */
  async validateCoreInputs(inputs) {
    return await this.inputCollector.validateCoreInputs(inputs);
  }

  /**
   * Interactive input collection with custom prompts
   */
  async promptForInput(field, question, defaultValue = '', required = false) {
    if (!this.interactive) {
      return defaultValue;
    }

    let answer;
    do {
      answer = await this.promptHandler.prompt(question);
      if (!answer && defaultValue) {
        answer = defaultValue;
      }
      
      if (required && !answer) {
        console.log('This field is required. Please provide a value.');
      }
    } while (required && !answer);

    return answer;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.promptHandler.close();
  }
}