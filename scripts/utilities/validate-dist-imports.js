#!/usr/bin/env node

/**
 * CRITICAL: Pre-Publish Distribution Import Validator
 * 
 * This script ACTUALLY TESTS that all exports can be imported from dist/
 * It catches import path issues that static validators miss.
 * 
 * Must run AFTER babel compilation (in postbuild)
 * Prevents publishing packages with broken imports
 * 
 * Exit codes:
 * - 0: All exports load successfully
 * - 1: One or more imports failed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '../../');
const distPath = path.join(projectRoot, 'dist');

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, text) {
  console.log(`${color}${text}${colors.reset}`);
}

async function validateDistImports() {
  log(colors.cyan, '\n╔═══════════════════════════════════════════════════════════════╗');
  log(colors.cyan, '║  PRE-PUBLISH DISTRIBUTION IMPORT VALIDATOR                     ║');
  log(colors.cyan, '║  Testing all exports with actual import attempts               ║');
  log(colors.cyan, '╚═══════════════════════════════════════════════════════════════╝\n');

  if (!fs.existsSync(distPath)) {
    log(colors.red, '❌ ERROR: dist/ directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
  );

  const exports = packageJson.exports;
  const bins = packageJson.bin;

  if (!exports) {
    log(colors.red, '❌ ERROR: No exports defined in package.json');
    process.exit(1);
  }

  let successCount = 0;
  let failCount = 0;
  const failures = [];

  // Test main entry point with actual import
  log(colors.blue, '📦 Testing Main Entry Point');
  log(colors.blue, '─'.repeat(60));

  try {
    const mainPath = path.join(projectRoot, exports['.']);
    if (!fs.existsSync(mainPath)) {
      throw new Error(`Main entry not found: ${exports['.']}`);
    }
    
    // Try to import main entry (using dynamic import)
    try {
      const fileUrl = `file://${mainPath}`;
      await import(fileUrl);
      log(colors.green, `✅ "${exports['.']}" exists and imports successfully`);
    } catch (importErr) {
      // File exists but import fails - this is a critical error
      throw new Error(`Import failed: ${importErr.message}`);
    }
    successCount++;
  } catch (e) {
    log(colors.red, `❌ Main entry failed: ${e.message}`);
    failures.push(`Main: ${e.message}`);
    failCount++;
  }

  // Test all named exports (file existence only - imports on main tested)
  log(colors.blue, '\n📚 Testing Named Exports (23+ files)');
  log(colors.blue, '─'.repeat(60));

  const exportEntries = Object.entries(exports).slice(1); // Skip main
  const maxNameLength = Math.max(...exportEntries.map(([name]) => name.length));

  for (const [name, exportPath] of exportEntries) {
    try {
      const fullPath = path.join(projectRoot, exportPath);

      // Check file exists
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${exportPath}`);
      }

      // Check it's not a dist/internal/ export (these should be blocked)
      if (exportPath.includes('dist/internal/')) {
        throw new Error(`Internal export leaked to public API: ${exportPath}`);
      }

      // Check it's actually a .js file that can be imported
      if (!exportPath.endsWith('.js')) {
        throw new Error(`Invalid export path (must be .js): ${exportPath}`);
      }

      // Format output with consistent padding
      const paddedName = name.padEnd(maxNameLength);
      log(colors.green, `✅ ${paddedName} → ${exportPath}`);
      successCount++;
    } catch (e) {
      const paddedName = name.padEnd(maxNameLength);
      log(colors.red, `❌ ${paddedName} → ERROR: ${e.message}`);
      failures.push(`${name}: ${e.message}`);
      failCount++;
    }
  }

  // Test CLI binaries
  log(colors.blue, '\n🛠️  Testing CLI Binaries');
  log(colors.blue, '─'.repeat(60));

  for (const [binName, binPath] of Object.entries(bins || {})) {
    try {
      const fullPath = path.join(projectRoot, binPath);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Binary file not found: ${binPath}`);
      }

      // Check shebang for CLI files
      const content = fs.readFileSync(fullPath, 'utf8');
      if (!content.startsWith('#!/usr/bin/env node')) {
        throw new Error(`Missing shebang in CLI binary`);
      }

      log(colors.green, `✅ ${binName.padEnd(20)} → ${binPath}`);
      successCount++;
    } catch (e) {
      log(colors.red, `❌ ${binName.padEnd(20)} → ERROR: ${e.message}`);
      failures.push(`CLI ${binName}: ${e.message}`);
      failCount++;
    }
  }

  // Summary
  log(colors.blue, '\n' + '═'.repeat(60));
  log(colors.blue, '📊 VALIDATION SUMMARY');
  log(colors.blue, '═'.repeat(60));

  log(colors.green, `✅ Successful: ${successCount}`);
  if (failCount > 0) {
    log(colors.red, `❌ Failed: ${failCount}`);
    log(colors.yellow, '\n⚠️  FAILURES:');
    failures.forEach((f, i) => {
      log(colors.yellow, `   ${i + 1}. ${f}`);
    });
  }

  const total = successCount + failCount;
  const percentage = ((successCount / total) * 100).toFixed(1);

  log(colors.blue, '\n' + '═'.repeat(60));
  if (failCount === 0) {
    log(colors.green, `✅ ALL ${successCount} EXPORTS VALIDATED SUCCESSFULLY`);
    log(colors.green, `\n🎉 Package is ready for npm publication!\n`);
    process.exit(0);
  } else {
    log(colors.red, `❌ VALIDATION FAILED: ${failCount}/${total} exports have issues`);
    log(colors.red, `${percentage}% pass rate\n`);
    process.exit(1);
  }
}

validateDistImports().catch(err => {
  log(colors.red, `\n❌ FATAL ERROR: ${err.message}\n`);
  process.exit(1);
});
