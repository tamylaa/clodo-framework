import chalk from 'chalk';
import { Clodo, StandardOptions } from '@tamyla/clodo-framework';

export function registerValidateCommand(program) {
  const command = program
    .command('validate <service-path>')
    .description('Validate an existing service configuration')
    .option('--export-report <file>', 'Export validation report to JSON file')

  // Add standard options (--verbose, --quiet, --json, --no-color, --config-file)
  StandardOptions.define(command)
    .action(async (servicePath, options) => {
      try {
        const output = new (await import('../../lib/shared/utils/output-formatter.js')).OutputFormatter(options);

        // Use simple API for validation
        const result = await Clodo.validate({
          servicePath: servicePath || '.',
          exportReport: options.exportReport
        });

        if (result.success) {
          output.success(result.message);
          if (result.issues && result.issues.length > 0) {
            output.warning(`Found ${result.issues.length} issues:`);
            result.issues.forEach(issue => {
              output.info(`  - ${issue}`);
            });
          }
        } else {
          output.error(result.message);
          if (result.issues && result.issues.length > 0) {
            output.info('Issues found:');
            result.issues.forEach(issue => {
              output.info(`  - ${issue}`);
            });
          }
          process.exit(1);
        }

      } catch (error) {
        const output = new (await import('../../lib/shared/utils/output-formatter.js')).OutputFormatter(options || {});
        output.error(`Validation failed: ${error.message}`);
        process.exit(1);
      }
    });
}
