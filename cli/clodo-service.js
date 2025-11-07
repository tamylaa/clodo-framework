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
import chalk from 'chalk';

// Create program instance
const program = new Command();

program
  .name('clodo-service')
  .description('Unified conversational CLI for Clodo Framework service lifecycle management')
  .version('1.0.0');

// Dynamically load available command modules
// This makes the CLI resilient if some commands are excluded from the package
async function registerAvailableCommands() {
  const commands = [
    { name: 'create', path: './commands/create.js', register: 'registerCreateCommand' },
    { name: 'deploy', path: './commands/deploy.js', register: 'registerDeployCommand' },
    { name: 'validate', path: './commands/validate.js', register: 'registerValidateCommand' },
    { name: 'update', path: './commands/update.js', register: 'registerUpdateCommand' },
    { name: 'diagnose', path: './commands/diagnose.js', register: 'registerDiagnoseCommand' },
    { name: 'assess', path: './commands/assess.js', register: 'registerAssessCommand' },
    { name: 'init-config', path: './commands/init-config.js', register: 'registerInitConfigCommand' }
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
