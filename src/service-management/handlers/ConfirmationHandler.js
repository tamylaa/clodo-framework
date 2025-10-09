/**
 * Confirmation Handler Module
 * Focused module for handling smart confirmations and derived values
 */

import { ConfirmationEngine } from '../ConfirmationEngine.js';
import { createPromptHandler } from '../../utils/prompt-handler.js';

export class ConfirmationHandler {
  constructor(options = {}) {
    this.interactive = options.interactive !== false;
    this.promptHandler = createPromptHandler({ interactive: this.interactive });
    this.confirmationEngine = new ConfirmationEngine({ interactive: this.interactive });
  }

  /**
   * Generate and confirm derived values from core inputs
   */
  async generateAndConfirm(coreInputs) {
    return await this.confirmationEngine.generateAndConfirm(coreInputs);
  }

  /**
   * Generate smart defaults without interaction
   */
  generateSmartDefaults(coreInputs) {
    return this.confirmationEngine.generateSmartDefaults(coreInputs);
  }

  /**
   * Interactive confirmation of specific values
   */
  async confirmValue(field, currentValue, question) {
    if (!this.interactive) {
      return currentValue;
    }

    const confirmed = await this.promptHandler.confirm(
      `${question}\nCurrent value: ${currentValue}\nKeep this value?`, 
      true
    );

    if (!confirmed) {
      return await this.promptHandler.prompt('Enter new value: ');
    }

    return currentValue;
  }

  /**
   * Confirm entire configuration
   */
  async confirmConfiguration(config) {
    if (!this.interactive) {
      return true;
    }

    console.log('\n📋 Configuration Summary:');
    Object.entries(config).forEach(([key, value]) => {
      // Mask sensitive values
      if (key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) {
        value = '*'.repeat(8) + value.slice(-4);
      }
      console.log(`  ${key}: ${value}`);
    });

    return await this.promptHandler.confirm('\nProceed with this configuration?', true);
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.promptHandler.close();
  }
}