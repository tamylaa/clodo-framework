/**
 * Config Schema CLI Command
 * Provides schema inspection, validation, and documentation for config files
 * 
 * Subcommands:
 *   clodo config-schema show <type>      - Show schema for a command type
 *   clodo config-schema validate <file>  - Validate a config file
 *   clodo config-schema types            - List all config types
 */

import chalk from 'chalk';
import { readFileSync } from 'fs';

// Load ConfigSchemaValidator lazily so this module can be imported both
// from source (cli/) and from the compiled distribution (dist/cli/).
async function loadConfigSchemaValidator() {
  try {
    return (await import('../../src/validation/ConfigSchemaValidator.js')).ConfigSchemaValidator;
  } catch (err) {
    return (await import('../../validation/ConfigSchemaValidator.js')).ConfigSchemaValidator;
  }
}

export function registerConfigSchemaCommand(program) {
  const cmd = program
    .command('config-schema')
    .description('Inspect and validate configuration file schemas');

  // ─── show ──────────────────────────────────────────────────────────────
  cmd
    .command('show <type>')
    .description('Show the schema definition for a config type (create, deploy, validate, update)')
    .option('--json', 'Output as JSON')
    .action(async (type, options) => {
      const ValidatorClass = await loadConfigSchemaValidator();
      const validator = new ValidatorClass();
      const definition = validator.getSchemaDefinition(type);

      if (!definition) {
        console.error(chalk.red(`Unknown config type: '${type}'`));
        console.log(`Valid types: ${validator.getRegisteredTypes().join(', ')}`);
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(definition, null, 2));
        return;
      }

      console.log(chalk.cyan(`\n📋 Config Schema: ${type}`));
      console.log(chalk.gray('═'.repeat(60)));
      console.log(chalk.white(definition.description));
      console.log('');

      console.log(chalk.bold('Fields:'));
      for (const [name, field] of Object.entries(definition.fields)) {
        const required = field.required ? chalk.red('*') : ' ';
        const type = chalk.gray(`(${field.type})`);
        console.log(`  ${required} ${chalk.white(name)} ${type}`);
        if (field.description) {
          console.log(`    ${chalk.gray(field.description)}`);
        }
      }

      console.log('');
      console.log(chalk.bold('Valid Service Types:'));
      console.log(`  ${definition.validServiceTypes.join(', ')}`);
      console.log('');
      console.log(chalk.bold('Valid Features:'));
      console.log(`  ${definition.validFeatures.join(', ')}`);
      console.log('');
      console.log(chalk.gray(`Total fields: ${definition.fieldCount}`));
      console.log(chalk.gray(`Usage: npx clodo-service ${type} --config-file your-config.json`));
    });

  // ─── validate ──────────────────────────────────────────────────────────
  cmd
    .command('validate <file>')
    .description('Validate a config file against its schema')
    .option('--type <type>', 'Config type (auto-detected if not specified)')
    .option('--strict', 'Exit with error code on validation failures')
    .option('--json', 'Output as JSON')
    .action(async (file, options) => {
      const ValidatorClass = await loadConfigSchemaValidator();
      const validator = new ValidatorClass();

      // Determine command type
      let commandType = options.type;
      if (!commandType) {
        // Try to auto-detect from filename or content
        const filenameLower = file.toLowerCase();
        if (filenameLower.includes('create')) commandType = 'create';
        else if (filenameLower.includes('deploy')) commandType = 'deploy';
        else if (filenameLower.includes('validate')) commandType = 'validate';
        else if (filenameLower.includes('update')) commandType = 'update';
        else {
          // Try content-based detection
          try {
            const content = JSON.parse(readFileSync(file, 'utf8'));
            const detection = validator.detectConfigType(content);
            if (detection.detected) {
              commandType = detection.commandType;
              if (!options.json) {
                console.log(chalk.gray(`Auto-detected config type: ${commandType} (confidence: ${Math.round(detection.confidence * 100)}%)`));
              }
            }
          } catch {
            // Fall through
          }
        }

        if (!commandType) {
          console.error(chalk.red('Could not detect config type. Use --type to specify.'));
          console.log(`Valid types: ${validator.getRegisteredTypes().join(', ')}`);
          process.exit(1);
        }
      }

      const result = validator.validateConfigFile(file, commandType);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.cyan(`\n🔍 Config Validation: ${file}`));
        console.log(chalk.gray(`Type: ${commandType}`));
        console.log(chalk.gray('═'.repeat(60)));

        if (result.valid) {
          console.log(chalk.green(`✅ Valid configuration (${result.fieldCount} fields)`));
        } else {
          console.log(chalk.red(`❌ Invalid configuration — ${result.errors.length} error(s)`));
        }

        if (result.errors.length > 0) {
          console.log('');
          console.log(chalk.bold('Errors:'));
          for (const err of result.errors) {
            console.log(chalk.red(`  ✗ ${err.field}: ${err.message}`));
          }
        }

        if (result.warnings.length > 0) {
          console.log('');
          console.log(chalk.bold('Warnings:'));
          for (const warn of result.warnings) {
            console.log(chalk.yellow(`  ⚠ ${warn.field}: ${warn.message}`));
          }
        }
      }

      // Exit with error code for file-level errors (always) or validation errors (when --strict)
      if (!result.valid) {
        const hasFileError = result.errors.some(e => e.code === 'FILE_NOT_FOUND' || e.code === 'INVALID_JSON');
        if (hasFileError || options.strict) {
          process.exit(1);
        }
      }
    });

  // ─── types ─────────────────────────────────────────────────────────────
  cmd
    .command('types')
    .description('List all available config types')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const ValidatorClass = await loadConfigSchemaValidator();
      const validator = new ValidatorClass();
      const types = validator.getRegisteredTypes();

      if (options.json) {
        const details = {};
        for (const type of types) {
          details[type] = validator.getSchemaDefinition(type);
        }
        console.log(JSON.stringify(details, null, 2));
        return;
      }

      console.log(chalk.cyan('\n📋 Available Config Types'));
      console.log(chalk.gray('═'.repeat(60)));

      for (const type of types) {
        const def = validator.getSchemaDefinition(type);
        console.log(`  ${chalk.white(type)} — ${def.fieldCount} fields`);
        console.log(chalk.gray(`    Example: config/clodo-${type}.example.json`));
        console.log(chalk.gray(`    Usage:   npx clodo-service ${type} --config-file config.json`));
      }

      console.log('');
      console.log(chalk.gray('Run `clodo config-schema show <type>` for detailed field info'));
    });
}
