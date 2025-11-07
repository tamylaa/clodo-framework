/**
 * Interactive Prompts Module
 * Standardized user input functions for all scripts
 * 
 * Replaces duplicate prompt code across 10+ scripts
 */

import readline from 'readline';

// Create readline interface (singleton)
let rl = null;
function getReadlineInterface() {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }
  return rl;
}

export function askUser(question, defaultValue = null) {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    getReadlineInterface().question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

export function askYesNo(question, defaultValue = 'n') {
  return new Promise((resolve) => {
    const prompt = `${question} [y/N]: `;
    getReadlineInterface().question(prompt, (answer) => {
      const response = answer.trim().toLowerCase() || defaultValue;
      resolve(response === 'y' || response === 'yes');
    });
  });
}

export function askChoice(question, choices, defaultIndex = 0) {
  return new Promise((resolve) => {
    console.log(`\n${question}`);
    choices.forEach((choice, index) => {
      const marker = index === defaultIndex ? '>' : ' ';
      console.log(`${marker} ${index + 1}. ${choice}`);
    });
    
    getReadlineInterface().question(`\nSelect option [1-${choices.length}]: `, (answer) => {
      const choice = parseInt(answer) - 1;
      if (isNaN(choice) || choice < 0 || choice >= choices.length) {
        resolve(defaultIndex);
      } else {
        resolve(choice);
      }
    });
  });
}

export function askMultiChoice(question, choices, defaultIndices = []) {
  return new Promise((resolve) => {
    console.log(`\n${question}`);
    console.log('(Enter comma-separated numbers, e.g., "1,3,5")');
    choices.forEach((choice, index) => {
      const marker = defaultIndices.includes(index) ? '>' : ' ';
      console.log(`${marker} ${index + 1}. ${choice}`);
    });
    
    const defaultStr = defaultIndices.map(i => i + 1).join(',');
    getReadlineInterface().question(`\nSelect options [${defaultStr}]: `, (answer) => {
      if (!answer.trim()) {
        resolve(defaultIndices);
        return;
      }
      
      const selected = answer.split(',')
        .map(s => parseInt(s.trim()) - 1)
        .filter(i => !isNaN(i) && i >= 0 && i < choices.length);
      
      resolve(selected.length > 0 ? selected : defaultIndices);
    });
  });
}

export function closePrompts() {
  if (rl) {
    rl.close();
    rl = null;
  }
}

// Utility function for progress indicators
export function showProgress(message, steps = ['⏳', '⚡', '✅']) {
  return new Promise((resolve) => {
    let stepIndex = 0;
    const interval = setInterval(() => {
      process.stdout.write(`\r${steps[stepIndex]} ${message}`);
      stepIndex = (stepIndex + 1) % steps.length;
    }, 500);
    
    // Auto-resolve after 2 seconds or when manually resolved
    setTimeout(() => {
      clearInterval(interval);
      process.stdout.write(`\r✅ ${message}\n`);
      resolve();
    }, 2000);
  });
}

/**
 * Ask for sensitive input (like API tokens) with hidden input
 * Supports pasting with Ctrl+V or right-click paste
 */
export function askPassword(question) {
  return new Promise((resolve) => {
    const prompt = `${question}: `;
    process.stdout.write(prompt);
    
    // Hide input for sensitive data
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let password = '';
    
    const onData = (chunk) => {
      // Handle multi-character input (paste operations)
      for (let i = 0; i < chunk.length; i++) {
        const char = chunk[i];
        const charCode = char.charCodeAt(0);
        
        if (charCode === 13 || charCode === 10) { // Enter key (CR or LF)
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(password);
          return;
        } else if (charCode === 127 || charCode === 8) { // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else if (charCode === 3) { // Ctrl+C
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          console.log('\nOperation cancelled');
          process.exit(0);
        } else if (charCode >= 32 && charCode <= 126) { // Printable characters
          password += char;
          process.stdout.write('*');
        }
        // Ignore other control characters (allows paste to work)
      }
    };
    
    process.stdin.on('data', onData);
  });
}