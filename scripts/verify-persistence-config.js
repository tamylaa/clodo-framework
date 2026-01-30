#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const checks = [];

function read(file) {
  const p = path.join(repoRoot, file);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

const stateManager = read('src/orchestration/modules/StateManager.js');
if (stateManager) {
  if (!/\.clodo-cache\/deployments/.test(stateManager)) {
    checks.push('StateManager default logDirectory should point to ".clodo-cache/deployments"');
  }
  if (!/CLODO_ENABLE_PERSISTENCE/.test(stateManager)) {
    checks.push('StateManager should check CLODO_ENABLE_PERSISTENCE to enable persistence');
  }
} else {
  checks.push('StateManager.js not found');
}

const secretGen = read('src/utils/deployment/secret-generator.js') || read('src/utils/deployment/secretGenerator.js');
if (secretGen) {
  if (!/\.clodo-cache\/secrets/.test(secretGen)) {
    checks.push('secret-generator default secrets path should point to ".clodo-cache/secrets"');
  }
  if (!/CLODO_ENABLE_PERSISTENCE/.test(secretGen)) {
    checks.push('secret-generator should check CLODO_ENABLE_PERSISTENCE to enable persistence');
  }
} else {
  checks.push('secret-generator file not found');
}

if (checks.length) {
  console.error('Persistence config verification failed:');
  for (const c of checks) console.error(' -', c);
  process.exitCode = 1;
  process.exit(1);
}

console.log('Persistence config looks good ✅');
