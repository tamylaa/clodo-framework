#!/usr/bin/env node

/**
 * Test Packaged Artifact
 *
 * Steps:
 * 1. Run npm pack and get tarball name
 * 2. Create temp directory, initialize npm project
 * 3. Install the tarball into temp project
 * 4. Require the package and a couple of internal modules/cli entry points
 *
 * Exit non-zero on any failure.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

const cwd = process.cwd();

try {
  console.log('Packing package...');
  const tarball = execSync('npm pack', { cwd, stdio: 'pipe' }).toString().trim().split('\n').pop();
  const tarPath = path.join(cwd, tarball);
  console.log('Tarball:', tarPath);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clodo-pack-'));
  console.log('Using temp dir:', tmpDir);
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'clodo-test-temp', version: '0.0.0' }));

  console.log('Installing tarball into temp project...');
  execSync(`npm install "${tarPath}" --no-audit --no-fund --no-package-lock`, { cwd: tmpDir, stdio: 'inherit' });

  console.log('Running smoke checks...');
  // Run a node script that requires the package and exercises the CLI via installed bin
  const nodeScript = `try {
  const path = require('path');
  const { execSync } = require('child_process');
  const pkg = require('@tamyla/clodo-framework');
  console.log('package loaded, exports count:', Object.keys(pkg).length);
  // require a named export that is part of the public exports map
  const services = require('@tamyla/clodo-framework/services');
  console.log('named export services loaded');
  // Verify middleware export and included migration script/docs
  let middleware;
  try {
    middleware = require('@tamyla/clodo-framework/middleware');
    console.log('middleware export loaded, keys:', Object.keys(middleware));
  } catch (e) {
    console.error('middleware export missing:', e && e.stack || e);
    throw e;
  }

  if (!middleware || !middleware.MiddlewareComposer) {
    throw new Error('MiddlewareComposer not exported from @tamyla/clodo-framework/middleware');
  }

  const migrationScript = path.join(process.cwd(), 'node_modules', '@tamyla', 'clodo-framework', 'scripts', 'migration', 'migrate-middleware-legacy-to-contract.js');
  if (!require('fs').existsSync(migrationScript)) {
    throw new Error('Migration script missing in packaged artifact: ' + migrationScript);
  }
  const migrationDoc = path.join(process.cwd(), 'node_modules', '@tamyla', 'clodo-framework', 'docs', 'MIDDLEWARE_MIGRATION_SUMMARY.md');
  if (!require('fs').existsSync(migrationDoc)) {
    throw new Error('Migration doc missing in packaged artifact: ' + migrationDoc);
  }
  // Execute CLI via the installed dist path to avoid shell wrapper issues on Windows
  const pkgRoot = path.join(process.cwd(), 'node_modules', '@tamyla', 'clodo-framework');
  const cliPath = path.join(pkgRoot, 'dist', 'cli', 'clodo-service.js');
  // Run --version and --help to ensure CLI executes successfully
  execSync('node ' + JSON.stringify(cliPath) + ' --version', { stdio: 'inherit' });
  execSync('node ' + JSON.stringify(cliPath) + ' --help', { stdio: 'ignore' });
  console.log('cli executed successfully');
  process.exit(0);
} catch (err) {
  console.error('Smoke check failed:', err && err.stack || err);
  process.exit(2);
}
`;

  // Write the smoke script to a file in the temp project and run it directly to avoid shell quoting issues
  const smokeScriptPath = path.join(tmpDir, 'smoke-test.js');
  fs.writeFileSync(smokeScriptPath, nodeScript.replace(/\r\n/g, '\n'));
  execSync(`node "${smokeScriptPath}"`, { cwd: tmpDir, stdio: 'inherit' });

  console.log('\nAll packaged-artifact smoke checks passed.');
  // Clean up tarball to avoid leaving artifacts
  try { fs.unlinkSync(tarPath); } catch (e) {}
  process.exit(0);
} catch (err) {
  console.error('\nPackaged artifact test failed:', err && err.stack || err);
  process.exit(1);
}
