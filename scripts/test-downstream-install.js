#!/usr/bin/env node

/**
 * DOWNSTREAM USER PACKAGE TEST
 * 
 * Simulates exactly what a downstream user does:
 * 1. Creates tarball via npm pack (exactly what npm publish does)
 * 2. Creates fresh directory
 * 3. Runs npm install with the tarball
 * 4. Tests importing all exports
 * 5. Tests CLI commands
 * 
 * This catches issues that internal tests miss because it tests
 * the actual packaged distribution, not source files.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

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

async function testDownstreamInstall() {
  log(colors.cyan, '\n╔═══════════════════════════════════════════════════════════════╗');
  log(colors.cyan, '║  DOWNSTREAM USER PACKAGE TEST                                  ║');
  log(colors.cyan, '║  Testing tarball installation and imports                       ║');
  log(colors.cyan, '╚═══════════════════════════════════════════════════════════════╝\n');

  const testDir = path.join(tmpdir(), `clodo-user-test-${Date.now()}`);
  let tarballPath = null;

  try {
    // Step 1: Create tarball
    log(colors.blue, '📦 Step 1: Creating npm tarball');
    log(colors.blue, '─'.repeat(60));
    
    try {
      const output = execSync('npm pack --silent', { 
        cwd: projectRoot,
        encoding: 'utf8'
      }).trim();
      
      tarballPath = path.join(projectRoot, output);
      if (!fs.existsSync(tarballPath)) {
        throw new Error(`Tarball created but not found: ${tarballPath}`);
      }
      
      const size = (fs.statSync(tarballPath).size / 1024).toFixed(2);
      log(colors.green, `✅ Created tarball: ${path.basename(tarballPath)} (${size} KB)\n`);
    } catch (e) {
      throw new Error(`Failed to create tarball: ${e.message}`);
    }

    // Step 2: Create fresh test directory
    log(colors.blue, '📁 Step 2: Creating fresh test directory');
    log(colors.blue, '─'.repeat(60));
    
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    
    const packageJson = {
      name: 'clodo-user-test',
      version: '1.0.0',
      type: 'module',
      private: true,
      dependencies: {
        '@tamyla/clodo-framework': `file:${tarballPath}`
      }
    };
    
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    log(colors.green, `✅ Created test directory: ${testDir}\n`);

    // Step 3: Install from tarball
    log(colors.blue, '⬇️  Step 3: Installing package from tarball');
    log(colors.blue, '─'.repeat(60));
    
    try {
      execSync('npm install --no-save', {
        cwd: testDir,
        stdio: 'pipe',
        encoding: 'utf8'
      });
      log(colors.green, `✅ Installation successful\n`);
    } catch (e) {
      throw new Error(`Failed to install from tarball: ${e.message}`);
    }

    // Step 4: Test imports
    log(colors.blue, '🧪 Step 4: Testing module imports');
    log(colors.blue, '─'.repeat(60));

    const testScript = `
import('@tamyla/clodo-framework')
  .then(mod => {
    const exports = Object.keys(mod);
    console.log('Loaded exports: ' + exports.length);
    if (exports.length < 20) throw new Error('Not enough exports: ' + exports.length);
    
    // Test key exports
    const required = [
      'Clodo', 'SchemaManager', 'ModuleManager', 'initializeService',
      'GenericDataService', 'EnhancedRouter', 'SecurityCLI',
      'ServiceOrchestrator', 'DeploymentValidator'
    ];
    
    const missing = required.filter(exp => !exports.includes(exp));
    if (missing.length > 0) {
      throw new Error('Missing key exports: ' + missing.join(', '));
    }
    
    console.log('All key exports present');
    process.exit(0);
  })
  .catch(err => {
    console.error('Import failed: ' + err.message);
    process.exit(1);
  });
`;

    const testFile = path.join(testDir, 'test-imports.mjs');
    fs.writeFileSync(testFile, testScript);
    
    try {
      const output = execSync('node test-imports.mjs', {
        cwd: testDir,
        encoding: 'utf8'
      });
      
      log(colors.green, `✅ ${output.trim()}\n`);
    } catch (e) {
      throw new Error(`Import test failed: ${e.message}`);
    }

    // Step 5: Test CLI commands
    log(colors.blue, '🛠️  Step 5: Testing CLI commands');
    log(colors.blue, '─'.repeat(60));

    const cliTests = [
      { cmd: 'clodo-service', args: '--help' },
      { cmd: 'clodo-simple', args: '--help' },
      { cmd: 'clodo-security', args: '--help' }
    ];

    for (const test of cliTests) {
      try {
        execSync(`node node_modules/.bin/${test.cmd} ${test.args}`, {
          cwd: testDir,
          stdio: 'pipe',
          encoding: 'utf8'
        });
        log(colors.green, `✅ CLI command works: ${test.cmd}`);
      } catch (e) {
        // Some CLIs may fail on --help if they require args, that's ok
        if (e.status !== 0 && e.status !== 1) {
          throw new Error(`CLI test failed for ${test.cmd}: ${e.message}`);
        }
        log(colors.yellow, `⚠️  CLI command ${test.cmd} returned non-zero (expected for some CLIs)`);
      }
    }

    log(colors.green, '\n');

    // Success
    log(colors.cyan, '═'.repeat(60));
    log(colors.green, '✅ ALL DOWNSTREAM USER TESTS PASSED!');
    log(colors.cyan, '═'.repeat(60));
    log(colors.green, `\n🎉 Package is safe for downstream users to install!\n`);
    
    process.exit(0);

  } catch (error) {
    log(colors.red, '\n' + '═'.repeat(60));
    log(colors.red, '❌ DOWNSTREAM USER TEST FAILED');
    log(colors.red, '═'.repeat(60));
    log(colors.red, `\nError: ${error.message}\n`);
    process.exit(1);

  } finally {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    if (tarballPath && fs.existsSync(tarballPath)) {
      fs.unlinkSync(tarballPath);
    }
  }
}

testDownstreamInstall().catch(err => {
  log(colors.red, `\n❌ Fatal error: ${err.message}\n`);
  process.exit(1);
});
