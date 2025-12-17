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
  // Run CLI via local bin using node to avoid package.exports restrictions
  const binPath = path.join(process.cwd(), 'node_modules', '.bin', 'clodo-service');
  const versionOut = execSync(`node ${JSON.stringify(binPath)} --version`, { encoding: 'utf8' }).toString().trim();
  console.log('clodo-service --version output:', versionOut.split('\n')[0]);
  // Run --help to ensure CLI executes successfully (exit code 0)
  execSync(`node ${JSON.stringify(binPath)} --help`, { stdio: 'ignore' });
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
