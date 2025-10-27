/**
 * Diagnose Command - Diagnose and report issues with an existing service
 */

import chalk from 'chalk';
import { ServiceOrchestrator } from '../../src/service-management/ServiceOrchestrator.js';

export function registerDiagnoseCommand(program) {
  program
    .command('diagnose [service-path]')
    .description('Diagnose and report issues with an existing service')
    .option('--deep-scan', 'Perform deep analysis including dependencies and deployment readiness')
    .option('--export-report <file>', 'Export diagnostic report to file')
    .action(async (servicePath, options) => {
      try {
        const orchestrator = new ServiceOrchestrator();

        // Auto-detect service path if not provided
        if (!servicePath) {
          servicePath = await orchestrator.detectServicePath();
          if (!servicePath) {
            console.error(chalk.red('No service path provided and could not auto-detect service directory'));
            process.exit(1);
          }
        }

        console.log(chalk.cyan('🔍 Diagnosing service...'));
        const diagnosis = await orchestrator.diagnoseService(servicePath, options);

        // Display results
        console.log(chalk.cyan('\n📋 Diagnostic Report'));
        console.log(chalk.white(`Service: ${diagnosis.serviceName || 'Unknown'}`));
        console.log(chalk.white(`Path: ${servicePath}`));

        if (diagnosis.errors.length > 0) {
          console.log(chalk.red('\n❌ Critical Errors:'));
          diagnosis.errors.forEach(error => {
            console.log(chalk.red(`  • ${error.message}`));
            if (error.location) {
              console.log(chalk.gray(`    Location: ${error.location}`));
            }
            if (error.suggestion) {
              console.log(chalk.cyan(`    💡 ${error.suggestion}`));
            }
          });
        }

        if (diagnosis.warnings.length > 0) {
          console.log(chalk.yellow('\n⚠️  Warnings:'));
          diagnosis.warnings.forEach(warning => {
            console.log(chalk.yellow(`  • ${warning.message}`));
            if (warning.suggestion) {
              console.log(chalk.cyan(`    💡 ${warning.suggestion}`));
            }
          });
        }

        if (diagnosis.recommendations.length > 0) {
          console.log(chalk.cyan('\n💡 Recommendations:'));
          diagnosis.recommendations.forEach(rec => {
            console.log(chalk.white(`  • ${rec}`));
          });
        }

        // Export report if requested
        if (options.exportReport) {
          await orchestrator.exportDiagnosticReport(diagnosis, options.exportReport);
          console.log(chalk.green(`\n📄 Report exported to: ${options.exportReport}`));
        }

        // Exit with error code if critical issues found
        if (diagnosis.errors.length > 0) {
          process.exit(1);
        }

      } catch (error) {
        console.error(chalk.red(`Diagnosis failed: ${error.message}`));
        process.exit(1);
      }
    });
}
