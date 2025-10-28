#!/usr/bin/env node

/**
 * Check Import Paths Validator
 * 
 * Validates that all re-export wrappers in src/utils/ have correct paths that work
 * when compiled to dist/. This prevents module resolution errors in published packages.
 * 
 * Purpose: Catch path issues BEFORE publication to npm
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '../../');

const RULES = {
  // Re-export wrappers in src/utils/ should use '../bin/...' paths
  // After compilation: src/utils/X.js → dist/utils/X.js
  // And: bin/shared/X.js → dist/bin/shared/X.js
  // So the relative path from dist/utils/ to dist/bin/ is '../bin/'
  
  'src/utils/file-manager.js': {
    pattern: /from\s+['"]([^'"]+)['"]/,
    shouldContain: '../bin/shared/utils/file-manager.js',
    description: 'file-manager re-export wrapper'
  },
  'src/utils/formatters.js': {
    pattern: /from\s+['"]([^'"]+)['"]/,
    shouldContain: '../bin/shared/utils/Formatters.js',
    description: 'formatters re-export wrapper'
  },
  'src/utils/logger.js': {
    pattern: /from\s+['"]([^'"]+)['"]/,
    shouldContain: '../bin/shared/logging/Logger.js',
    description: 'logger re-export wrapper'
  },
  'src/utils/cloudflare/ops.js': {
    pattern: /from\s+['"]([^'"]+)['"]/,
    shouldContain: '../bin/shared/cloudflare/ops.js',
    description: 'cloudflare ops re-export wrapper'
  }
};

let passCount = 0;
let failCount = 0;
const failures = [];

console.log('\n🔍 Checking import paths in re-export wrappers...\n');

for (const [filePath, rule] of Object.entries(RULES)) {
  const fullPath = path.join(projectRoot, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ MISSING: ${filePath}`);
    failCount++;
    failures.push(`File not found: ${filePath}`);
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const match = content.match(rule.pattern);
  
  if (!match || match[1] !== rule.shouldContain) {
    const actual = match ? match[1] : 'NOT FOUND';
    console.log(`❌ INCORRECT PATH: ${filePath}`);
    console.log(`   Expected: ${rule.shouldContain}`);
    console.log(`   Actual:   ${actual}`);
    console.log(`   (${rule.description})\n`);
    failCount++;
    failures.push(`${filePath}: expected "${rule.shouldContain}", got "${actual}"`);
  } else {
    console.log(`✅ CORRECT: ${filePath}`);
    console.log(`   → ${rule.shouldContain}\n`);
    passCount++;
  }
}

// Check compiled dist paths
console.log('\n📦 Verifying compiled dist/ structure...\n');

const distFiles = [
  'dist/utils/file-manager.js',
  'dist/utils/formatters.js', 
  'dist/utils/logger.js',
  'dist/utils/cloudflare/ops.js'
];

for (const file of distFiles) {
  const fullPath = path.join(projectRoot, file);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ MISSING: ${file}`);
    failCount++;
    failures.push(`Compiled file not found: ${file}`);
  } else {
    console.log(`✅ EXISTS: ${file}`);
    passCount++;
  }
}

// Check dist/bin/ exists
console.log('\n📂 Verifying bin/ was compiled to dist/bin/...\n');

const binPath = path.join(projectRoot, 'dist/bin');
if (!fs.existsSync(binPath)) {
  console.log(`❌ MISSING: dist/bin/ directory`);
  failCount++;
  failures.push('dist/bin/ directory not found - bin/ not compiled');
} else {
  console.log(`✅ EXISTS: dist/bin/ directory\n`);
  passCount++;
}

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`Validation Results: ${passCount} passed, ${failCount} failed`);
console.log(`${'='.repeat(60)}\n`);

if (failCount > 0) {
  console.log('❌ PATH VALIDATION FAILED\n');
  console.log('Issues found:');
  failures.forEach(f => console.log(`  • ${f}`));
  console.log('\nRecommendations:');
  console.log('1. Ensure all src/utils/*.js re-export wrappers use "../bin/shared/..." paths');
  console.log('2. These paths are relative to the compiled dist/ structure');
  console.log('3. Run: npm run build && npm run check:imports\n');
  process.exit(1);
} else {
  console.log('✅ ALL PATHS VALID\n');
  console.log('The re-export wrappers are correctly configured for the npm package.');
  console.log('Users should not encounter ERR_MODULE_NOT_FOUND errors.\n');
  process.exit(0);
}
