/**
 * Secrets Command Module
 * Provides secret scanning, baseline management, and validation for Clodo services
 *
 * Subcommands:
 *   clodo-service secrets scan       Scan for potential secrets in the service
 *   clodo-service secrets validate   Validate scanned secrets against baseline
 *   clodo-service secrets baseline   Show/update the secrets baseline
 */

import chalk from 'chalk';

// Lazy-load SecretsManager so this command module imports successfully from dist/
async function loadSecretsManager() {
  try {
    return (await import('../../src/security/SecretsManager.js')).SecretsManager;
  } catch (err) {
    return (await import('../../security/SecretsManager.js')).SecretsManager;
  }
}

export function registerSecretsCommand(program) {
  const secrets = program
    .command('secrets')
    .description('Secret scanning and baseline management for leak prevention');

  // ─── secrets scan ──────────────────────────────────────────

  secrets
    .command('scan')
    .description('Scan for potential secrets in the service directory')
    .option('--json', 'Output results in JSON format')
    .option('--include-tests', 'Include test/example/placeholder values in results')
    .option('--service-path <path>', 'Path to service directory (defaults to current directory)')
    .option('--severity <level>', 'Minimum severity to report: critical, high, medium', 'medium')
    .action(async (options) => {
      try {
        const SecretsManagerClass = await loadSecretsManager();
        const mgr = new SecretsManagerClass({ includeTests: options.includeTests });
        const servicePath = options.servicePath || process.cwd();
        const findings = await mgr.scan(servicePath);

        // Filter by severity
        const severityOrder = { critical: 3, high: 2, medium: 1 };
        const minSeverity = severityOrder[options.severity] || 1;
        const filtered = findings.filter(f => (severityOrder[f.severity] || 0) >= minSeverity);

        if (options.json) {
          console.log(JSON.stringify({ findings: filtered, total: filtered.length, servicePath }, null, 2));
          return;
        }

        displayScanResults(filtered, servicePath);
      } catch (error) {
        console.error(chalk.red('Secrets scan failed:'), error.message);
        process.exit(1);
      }
    });

  // ─── secrets validate ──────────────────────────────────────

  secrets
    .command('validate')
    .description('Validate secrets against the baseline — fails if new secrets are found')
    .option('--json', 'Output results in JSON format')
    .option('--strict', 'Exit with non-zero code on any findings (even baselined)')
    .option('--service-path <path>', 'Path to service directory (defaults to current directory)')
    .action(async (options) => {
      try {
        const SecretsManagerClass = await loadSecretsManager();
        const mgr = new SecretsManagerClass();
        const servicePath = options.servicePath || process.cwd();
        const result = await mgr.validate(servicePath);

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          displayValidationResults(result, servicePath);
        }

        const exitCode = result.passed ? 0 : 1;
        if (options.strict && result.totalFindings > 0) {
          process.exit(1);
        }
        process.exit(exitCode);
      } catch (error) {
        console.error(chalk.red('Secrets validation failed:'), error.message);
        process.exit(1);
      }
    });

  // ─── secrets baseline ──────────────────────────────────────

  const baseline = secrets
    .command('baseline')
    .description('Manage the .secrets.baseline file');

  // ─── secrets baseline show ─────────────────────────────────

  baseline
    .command('show')
    .description('Display current baseline entries')
    .option('--json', 'Output results in JSON format')
    .option('--service-path <path>', 'Path to service directory (defaults to current directory)')
    .action(async (options) => {
      try {
        const SecretsManagerClass = await loadSecretsManager();
        const mgr = new SecretsManagerClass();
        const servicePath = options.servicePath || process.cwd();
        const entries = await mgr.baselineShow(servicePath);

        if (options.json) {
          console.log(JSON.stringify(entries, null, 2));
          return;
        }

        displayBaselineEntries(entries, servicePath);
      } catch (error) {
        console.error(chalk.red('Failed to show baseline:'), error.message);
        process.exit(1);
      }
    });

  // ─── secrets baseline update ───────────────────────────────

  baseline
    .command('update')
    .description('Update baseline with current scan findings')
    .option('--json', 'Output results in JSON format')
    .option('--add-all', 'Add all new findings to the baseline')
    .option('--prune', 'Remove stale entries no longer detected')
    .option('--reason <reason>', 'Reason for updating (audit trail)')
    .option('--service-path <path>', 'Path to service directory (defaults to current directory)')
    .action(async (options) => {
      try {
        const SecretsManagerClass = await loadSecretsManager();
        const mgr = new SecretsManagerClass();
        const servicePath = options.servicePath || process.cwd();

        const result = await mgr.baselineUpdate(servicePath, {
          addAll: options.addAll,
          prune: options.prune,
          reason: options.reason
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        displayBaselineUpdateResults(result);
      } catch (error) {
        console.error(chalk.red('Baseline update failed:'), error.message);
        process.exit(1);
      }
    });

  // ─── secrets patterns ──────────────────────────────────────

  secrets
    .command('patterns')
    .description('List configured detection patterns and their severity')
    .option('--json', 'Output results in JSON format')
    .action(async (options) => {
      const SecretsManagerClass = await loadSecretsManager();
      const mgr = new SecretsManagerClass();
      const patterns = mgr.getPatterns();

      if (options.json) {
        console.log(JSON.stringify(patterns, null, 2));
        return;
      }

      console.log(chalk.cyan('🔑 Secret Detection Patterns'));
      console.log('');

      const grouped = {};
      for (const p of patterns) {
        if (!grouped[p.severity]) grouped[p.severity] = [];
        grouped[p.severity].push(p.name);
      }

      for (const severity of ['critical', 'high', 'medium']) {
        if (grouped[severity]) {
          const color = severity === 'critical' ? chalk.red : severity === 'high' ? chalk.yellow : chalk.blue;
          console.log(color(`  [${severity.toUpperCase()}]`));
          grouped[severity].forEach(name => {
            console.log(`    • ${name}`);
          });
          console.log('');
        }
      }
    });
}

// ─── Display Helpers ──────────────────────────────────────────

function displayScanResults(findings, servicePath) {
  console.log(chalk.cyan('🔑 Clodo Secrets Scan'));
  console.log(chalk.gray(`Service: ${servicePath}`));
  console.log('');

  if (findings.length === 0) {
    console.log(chalk.green('✅ No potential secrets found. Code looks clean!'));
    return;
  }

  console.log(chalk.yellow(`⚠️  Found ${findings.length} potential secret(s):`));
  console.log('');

  // Group by severity
  const bySeverity = { critical: [], high: [], medium: [] };
  findings.forEach(f => {
    if (bySeverity[f.severity]) bySeverity[f.severity].push(f);
  });

  for (const severity of ['critical', 'high', 'medium']) {
    const group = bySeverity[severity];
    if (group.length === 0) continue;

    const color = severity === 'critical' ? chalk.red.bold : severity === 'high' ? chalk.yellow : chalk.blue;
    console.log(color(`  ── ${severity.toUpperCase()} (${group.length}) ──`));

    group.forEach(f => {
      console.log(`    ${chalk.gray(f.file)}:${chalk.white(f.line)} [${f.pattern}]`);
      console.log(`      ${chalk.dim(f.match)}`);
    });
    console.log('');
  }

  console.log(chalk.blue('💡 Run `clodo-service secrets baseline update --add-all` to baseline known findings'));
  console.log(chalk.blue('   Run `clodo-service secrets validate` to check against baseline'));
}

function displayValidationResults(result, servicePath) {
  console.log(chalk.cyan('🔑 Clodo Secrets Validation'));
  console.log(chalk.gray(`Service: ${servicePath}`));
  console.log('');

  if (result.passed) {
    console.log(chalk.green(`✅ ${result.message}`));
    if (result.baselineCount > 0) {
      console.log(chalk.gray(`   (${result.baselineCount} known entries in baseline)`));
    }
  } else {
    console.log(chalk.red(`❌ ${result.message}`));
    console.log('');

    result.newFindings.forEach(f => {
      const color = f.severity === 'critical' ? chalk.red : chalk.yellow;
      console.log(color(`  ${f.file}:${f.line} [${f.pattern}] (${f.severity})`));
      console.log(`    ${chalk.dim(f.match)}`);
    });

    console.log('');
    console.log(chalk.blue('💡 Fix the secrets above, or run:'));
    console.log(chalk.blue('   clodo-service secrets baseline update --add-all --reason "reviewed-safe"'));
  }

  if (result.removedFromBaseline.length > 0) {
    console.log('');
    console.log(chalk.gray(`ℹ️  ${result.removedFromBaseline.length} baseline entries are stale (no longer detected).`));
    console.log(chalk.gray('   Run `clodo-service secrets baseline update --prune` to clean them up.'));
  }
}

function displayBaselineEntries(entries, servicePath) {
  console.log(chalk.cyan('🔑 Secrets Baseline'));
  console.log(chalk.gray(`Service: ${servicePath}`));
  console.log('');

  if (entries.length === 0) {
    console.log(chalk.gray('  No baseline entries. Run `clodo-service secrets scan` to find potential secrets.'));
    return;
  }

  console.log(`  Total entries: ${entries.length}`);
  console.log('');

  // Group by file
  const byFile = {};
  entries.forEach(e => {
    if (!byFile[e.file]) byFile[e.file] = [];
    byFile[e.file].push(e);
  });

  Object.entries(byFile).forEach(([file, fileEntries]) => {
    console.log(chalk.white(`  ${file}`));
    fileEntries.forEach(e => {
      const info = e.addedAt ? chalk.dim(` (added: ${e.addedAt.split('T')[0]})`) : '';
      const reason = e.reason ? chalk.dim(` [${e.reason}]`) : '';
      console.log(`    L${e.line}: [${e.pattern}] ${chalk.dim(e.match)}${info}${reason}`);
    });
  });
}

function displayBaselineUpdateResults(result) {
  console.log(chalk.cyan('🔑 Baseline Update'));
  console.log('');

  if (result.added > 0) {
    console.log(chalk.green(`  ✅ Added ${result.added} new entries`));
  }
  if (result.pruned > 0) {
    console.log(chalk.yellow(`  🧹 Pruned ${result.pruned} stale entries`));
  }
  if (result.added === 0 && result.pruned === 0) {
    if (result.newFindings === 0 && result.staleEntries === 0) {
      console.log(chalk.green('  ✅ Baseline is already up to date'));
    } else {
      if (result.newFindings > 0) {
        console.log(chalk.yellow(`  ⚠️  ${result.newFindings} new findings detected but --add-all not specified`));
      }
      if (result.staleEntries > 0) {
        console.log(chalk.gray(`  ℹ️  ${result.staleEntries} stale entries detected but --prune not specified`));
      }
    }
  }

  console.log('');
  console.log(chalk.gray(`  Total baseline entries: ${result.total}`));
  console.log(chalk.gray(`  Baseline path: ${result.baselinePath}`));
}
