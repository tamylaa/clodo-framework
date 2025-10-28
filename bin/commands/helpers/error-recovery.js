/**
 * Error Recovery Helpers (UI Wrapper)
 * Provides interactive error recovery by delegating to shared error classification
 */

import { classifyError, getRecoverySuggestions } from '../../shared/error-handling/error-classifier.js';
import chalk from 'chalk';
import readline from 'readline';

/**
 * Handle deployment error with contextual recovery options
 * @param {Error} error - The deployment error
 * @param {Object} context - Deployment context
 * @returns {Promise<string>} Recovery action: 'retry', 'dry-run', or 'abort'
 */
export async function handleDeploymentError(error, context = {}) {
  // Classify error using shared infrastructure
  const errorType = classifyError(error);
  const suggestions = getRecoverySuggestions(errorType);
  
  // Display error with contextual information
  console.error(chalk.red(`\n❌ Deployment failed: ${error.message}\n`));
  console.log(chalk.yellow(`Error Type: ${errorType.toUpperCase()}\n`));
  
  // Display recovery suggestions
  console.log(chalk.cyan('💡 Suggestions:'));
  suggestions.forEach(suggestion => {
    console.log(chalk.gray(`   • ${suggestion}`));
  });
  
  // Prompt for recovery action
  return await promptForRecoveryAction();
}

/**
 * Prompt user for recovery action
 * @returns {Promise<string>} Recovery action
 */
async function promptForRecoveryAction() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(chalk.cyan('\nRecovery Options:'));
  console.log(chalk.gray('  1) Retry deployment'));
  console.log(chalk.gray('  2) Run in dry-run mode to diagnose'));
  console.log(chalk.gray('  3) Abort'));

  return new Promise((resolve) => {
    rl.question(chalk.cyan('\nSelect option (1-3): '), (answer) => {
      rl.close();
      
      switch (answer.trim()) {
        case '1':
          resolve('retry');
          break;
        case '2':
          resolve('dry-run');
          break;
        case '3':
        default:
          resolve('abort');
          break;
      }
    });
  });
}

/**
 * Display error summary for non-interactive mode
 * @param {Error} error - The error
 */
export function displayErrorSummary(error) {
  const errorType = classifyError(error);
  const suggestions = getRecoverySuggestions(errorType);
  
  console.error(chalk.red(`\n❌ ${error.message}`));
  console.log(chalk.yellow(`\nError Type: ${errorType.toUpperCase()}`));
  console.log(chalk.cyan('\nSuggestions:'));
  suggestions.forEach(suggestion => {
    console.log(chalk.gray(`  • ${suggestion}`));
  });
}
