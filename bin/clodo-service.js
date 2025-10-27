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

// Import command registration functions
import { registerCreateCommand } from './commands/create.js';
import { registerDeployCommand } from './commands/deploy.js';
import { registerValidateCommand } from './commands/validate.js';
import { registerUpdateCommand } from './commands/update.js';
import { registerDiagnoseCommand } from './commands/diagnose.js';
import { registerAssessCommand } from './commands/assess.js';

// Create program instance
const program = new Command();

program
  .name('clodo-service')
  .description('Unified conversational CLI for Clodo Framework service lifecycle management')
  .version('1.0.0');

// Register all command modules
registerCreateCommand(program);
registerDeployCommand(program);
registerValidateCommand(program);
registerUpdateCommand(program);
registerDiagnoseCommand(program);
registerAssessCommand(program);

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

// Parse command line arguments
program.parse();
