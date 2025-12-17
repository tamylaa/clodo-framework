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
  // Run a node script that requires the package and a couple of internal modules
  const nodeScript = `try {
  const path = require('path');
  const pkg = require('@tamyla/clodo-framework');
  console.log('package loaded, exports count:', Object.keys(pkg).length);
  // require a CLI entry to ensure bin/ packaging works (resolve via node_modules path to avoid exports map restrictions)
  const cliPath = path.join(process.cwd(), 'node_modules', '@tamyla', 'clodo-framework', 'dist', 'cli', 'clodo-service.js');
  const cli = require(cliPath);
  console.log('cli loaded');
  // require an internal dist module used earlier via node_modules path
  const wdPath = path.join(process.cwd(), 'node_modules', '@tamyla', 'clodo-framework', 'dist', 'deployment', 'wrangler-deployer.js');
  const wd = require(wdPath);
  console.log('deployment module loaded');
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
