#!/usr/bin/env node

/**
 * Initialize Configuration Command
 * Copies the framework's validation-config.json to the service directory for customization
 */

import { copyFile, access } from 'fs/promises';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Find the framework's config directory by walking up from the current working directory
 * or from the command file location
 */
export async function findFrameworkConfig() {
  // First try relative to this command file
  const relativeToCommand = join(__dirname, '../../config/validation-config.json');
  
  try {
    // Check if the file exists at the expected location
    await access(relativeToCommand);
    return relativeToCommand;
  } catch {
    // If not found, try to find it by walking up from current working directory
    let currentDir = process.cwd();
    const maxDepth = 10;
    
    for (let i = 0; i < maxDepth; i++) {
      const candidatePath = join(currentDir, 'config', 'validation-config.json');
      try {
        await access(candidatePath);
        return candidatePath;
      } catch {
        const parentDir = dirname(currentDir);
        if (parentDir === currentDir) {
          // Reached root directory
          break;
        }
        currentDir = parentDir;
      }
    }
    
    // As fallback, try absolute path from command location
    return resolve(__dirname, '../../config/validation-config.json');
  }
}

/**
 * Register the init-config command with the CLI
 */
export function registerInitConfigCommand(program) {
  program
    .command('init-config')
    .description('Initialize validation-config.json in your service directory')
    .option('-f, --force', 'Overwrite existing validation-config.json', false)
    .action(handler);
}

async function handler(options) {
  const targetPath = join(process.cwd(), 'validation-config.json');
  
  try {
    // Find the framework config file
    const frameworkConfigPath = await findFrameworkConfig();
    
    // Check if file already exists
    try {
      await access(targetPath);
      if (!options.force) {
        console.log(chalk.yellow('⚠️  validation-config.json already exists.'));
        console.log(chalk.gray('   Use --force to overwrite.'));
        process.exit(0);
      } else {
        console.log(chalk.yellow('🔄 Overwriting existing validation-config.json...'));
      }
    } catch {
      // File doesn't exist, proceed
    }

    // Copy framework config to service directory
    await copyFile(frameworkConfigPath, targetPath);
    
    console.log(chalk.green('✅ Successfully initialized validation-config.json'));
    console.log(chalk.gray('\n📝 Configuration file details:'));
    console.log(chalk.gray(`   Location: ${targetPath}`));
    console.log(chalk.gray('\n💡 Usage:'));
    console.log(chalk.gray('   • Customize timing values (timeouts, intervals)'));
    console.log(chalk.gray('   • Add service-specific endpoints for validation'));
    console.log(chalk.gray('   • Configure platform-specific commands'));
    console.log(chalk.gray('   • Set environment-specific requirements'));
    console.log(chalk.gray('\n⚠️  Note: Most services don\'t need this file.'));
    console.log(chalk.gray('   The framework provides sensible defaults.'));
    
  } catch (error) {
    console.error(chalk.red('❌ Failed to initialize configuration:'));
    console.error(chalk.red(`   ${error.message}`));
    process.exit(1);
  }
}
