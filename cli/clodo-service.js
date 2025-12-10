#!/usr/bin/env node

/**
 * Clodo Framework - Unified Service Management CLI
 *
 * Main entry point that registers and orchestrates all service management commands.
 * Each command is in its own module in bin/commands/ for clean separation of concerns.
 *
 * Commands:
 * - create      Create a new Clodo service with conversational setup
 * - deploy      Deploy a Clodo service with smart credential handling
 * - validate    Validate an existing service configuration
 * - update      Update an existing service configuration
 * - diagnose    Diagnose and report issues with an existing service
 * - assess      Run intelligent capability assessment
 * - list-types  List available service types and their features
 */

import { Command } from 'commander';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create program instance
const program = new Command();

program
  .name('clodo-service')
  .description('Unified conversational CLI for Clodo Framework service lifecycle management')
  .version('1.0.0');

// Dynamically load available command modules
// This makes the CLI resilient if some commands are excluded from the package
async function registerAvailableCommands() {
  // Use absolute paths to ensure commands are found regardless of working directory
  const commandsDir = join(__dirname, 'commands');
  
  const commands = [
    { name: 'create', path: pathToFileURL(join(commandsDir, 'create.js')).href, register: 'registerCreateCommand' },
    { name: 'deploy', path: pathToFileURL(join(commandsDir, 'deploy.js')).href, register: 'registerDeployCommand' },
    { name: 'validate', path: pathToFileURL(join(commandsDir, 'validate.js')).href, register: 'registerValidateCommand' },
    { name: 'update', path: pathToFileURL(join(commandsDir, 'update.js')).href, register: 'registerUpdateCommand' },
    { name: 'diagnose', path: pathToFileURL(join(commandsDir, 'diagnose.js')).href, register: 'registerDiagnoseCommand' },
    { name: 'assess', path: pathToFileURL(join(commandsDir, 'assess.js')).href, register: 'registerAssessCommand' },
    { name: 'init-config', path: pathToFileURL(join(commandsDir, 'init-config.js')).href, register: 'registerInitConfigCommand' }
  ];

  for (const cmd of commands) {
    try {
      const module = await import(cmd.path);
      if (module[cmd.register]) {
        module[cmd.register](program);
      }
    } catch (error) {
      // Command module not available in this package - skip silently
      // This allows for minimal CLI distributions
    }
  }
}

// List available service types
program
  .command('list-types')
  .description('List available service types and their features')
  .action(() => {
    console.log(chalk.cyan('Available Clodo Framework Service Types:'));
    console.log('');

    const types = {
      'data-service': ['Authentication', 'Authorization', 'File Storage', 'Search', 'Filtering', 'Pagination'],
      'auth-service': ['Authentication', 'Authorization', 'User Profiles', 'Email Notifications', 'Magic Link Auth'],
      'content-service': ['File Storage', 'Search', 'Filtering', 'Pagination', 'Caching'],
      'api-gateway': ['Authentication', 'Authorization', 'Rate Limiting', 'Caching', 'Monitoring'],
      'generic': ['Logging', 'Monitoring', 'Error Reporting']
    };

    Object.entries(types).forEach(([type, features]) => {
      console.log(chalk.green(`  ${type}`));
      features.forEach(feature => {
        console.log(chalk.white(`    • ${feature}`));
      });
      console.log('');
    });
  });

// Register available commands dynamically
await registerAvailableCommands();

// Parse command line arguments
program.parse();
