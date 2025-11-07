/**
 * Progress Spinner Utility
 * Enhanced progress display with spinner animation
 * Extracted from clodo-service-old.js for modular reuse
 */

import chalk from 'chalk';

/**
 * Display progress with animated spinner
 * @param {string} message - Progress message to display
 * @param {number} duration - Duration in milliseconds (default: 2000)
 * @returns {Promise} Resolves when progress completes
 */
export function showProgressSpinner(message, duration = 2000) {
  return new Promise(resolve => {
    process.stdout.write(chalk.cyan(`⏳ ${message}...`));

    const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;

    const interval = setInterval(() => {
      process.stdout.write(`\r${chalk.cyan(spinner[i])} ${message}...`);
      i = (i + 1) % spinner.length;
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      process.stdout.write(`\r${chalk.green('✅')} ${message}... Done!\n`);
      resolve();
    }, duration);
  });
}

/**
 * Display progress with custom spinner characters
 * @param {string} message - Progress message
 * @param {Array<string>} spinnerChars - Custom spinner characters
 * @param {number} duration - Duration in milliseconds
 * @returns {Promise} Resolves when complete
 */
export function showProgressWithSpinner(message, spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'], duration = 2000) {
  return new Promise(resolve => {
    process.stdout.write(chalk.cyan(`⏳ ${message}...`));

    let i = 0;
    const interval = setInterval(() => {
      process.stdout.write(`\r${chalk.cyan(spinnerChars[i])} ${message}...`);
      i = (i + 1) % spinnerChars.length;
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      process.stdout.write(`\r${chalk.green('✅')} ${message}... Done!\n`);
      resolve();
    }, duration);
  });
}