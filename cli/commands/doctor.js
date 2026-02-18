/**
 * Doctor Command Module
 * Provides preflight diagnostic checks for Clodo services
 */

import chalk from 'chalk';

// ValidationHandler is loaded at runtime so the same command module works
// both when running from source (imports from `src/...`) and from the
// compiled distribution (imports from `dist/...`). We attempt the source
// import first, then fall back to the dist path.
async function loadValidationHandler() {
  try {
    return (await import('../../src/service-management/handlers/ValidationHandler.js')).ValidationHandler;
  } catch (errSource) {
    // running from dist/ (compiled package)
    try {
      return (await import('../../service-management/handlers/ValidationHandler.js')).ValidationHandler;
    } catch (errDist) {
      // last-resort: try explicit dist path (useful in some CI/dev layouts)
      return (await import('../../../dist/service-management/handlers/ValidationHandler.js')).ValidationHandler;
    }
  }
}

export function registerDoctorCommand(program) {
  program
    .command('doctor')
    .description('Run preflight diagnostic checks for service health and deployment readiness')
    .option('--json', 'Output results in JSON format for machine consumption')
    .option('--fix', 'Attempt to automatically fix detected issues')
    .option('--strict', 'Treat warnings as errors (non-zero exit code)')
    .option('--service-path <path>', 'Path to service directory (defaults to current directory)')
    .action(async (options) => {
      try {
        const ValidationHandlerClass = await loadValidationHandler();
        const handler = new ValidationHandlerClass({ strict: options.strict });
        const results = await handler.runDoctor({
          json: options.json,
          fix: options.fix,
          strict: options.strict,
          servicePath: options.servicePath || process.cwd()
        });

        if (options.json) {
          console.log(JSON.stringify(results, null, 2));
        } else {
          displayHumanReadable(results);
        }

        process.exit(results.exitCode);
      } catch (error) {
        console.error(chalk.red('Doctor command failed:'), error.message);
        process.exit(1);
      }
    });
}

/**
 * Display results in human-readable format
 */
function displayHumanReadable(results) {
  console.log(chalk.cyan('🔍 Clodo Doctor - Preflight Diagnostics'));
  console.log(chalk.gray(`Service: ${results.servicePath}`));
  console.log(chalk.gray(`Timestamp: ${results.timestamp}`));
  console.log('');

  // Summary
  const { summary } = results;
  console.log(chalk.bold('Summary:'));
  console.log(`  Total checks: ${summary.total}`);
  console.log(chalk.green(`  Passed: ${summary.passed}`));
  if (summary.warnings > 0) console.log(chalk.yellow(`  Warnings: ${summary.warnings}`));
  if (summary.errors > 0) console.log(chalk.red(`  Errors: ${summary.errors}`));
  if (summary.critical > 0) console.log(chalk.red.bold(`  Critical: ${summary.critical}`));
  console.log('');

  // Show fixes applied
  if (results.fixesApplied && results.fixesApplied.length > 0) {
    console.log(chalk.bold('Fixes Applied:'));
    results.fixesApplied.forEach(fix => {
      console.log(chalk.green(`  ✅ ${fix}`));
    });
    console.log('');
  }

  // Detailed results
  results.checks.forEach(check => {
    const icon = getStatusIcon(check.status);
    const color = getStatusColor(check.status);
    console.log(color(`${icon} ${check.name}`));
    console.log(`  ${check.message}`);

    if (check.details && check.details.length > 0) {
      check.details.forEach(detail => {
        console.log(`    ${detail}`);
      });
    }

    if (check.fixSuggestions && check.fixSuggestions.length > 0) {
      console.log(chalk.blue('  Suggestions:'));
      check.fixSuggestions.forEach(suggestion => {
        console.log(`    • ${suggestion}`);
      });
    }
    console.log('');
  });

  // Overall status
  if (results.exitCode === 0) {
    console.log(chalk.green('✅ All checks passed! Service is ready for deployment.'));
  } else {
    console.log(chalk.red('❌ Issues found. Address them before deployment.'));
    if (results.fixSuggestions.length > 0) {
      console.log(chalk.blue('Run with --fix to attempt automatic fixes.'));
    }
  }
}

/**
 * Get status icon
 */
function getStatusIcon(status) {
  switch (status) {
    case 'passed': return '✅';
    case 'warning': return '⚠️';
    case 'failed': return '❌';
    default: return '❓';
  }
}

/**
 * Get status color
 */
function getStatusColor(status) {
  switch (status) {
    case 'passed': return chalk.green;
    case 'warning': return chalk.yellow;
    case 'failed': return chalk.red;
    default: return chalk.gray;
  }
}