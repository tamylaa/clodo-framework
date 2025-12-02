#!/usr/bin/env node

/**
 * Check Import Paths Validator
 * 
 * Validates that all re-export wrappers AND dynamic imports have correct paths that work
 * when compiled to dist/. This prevents module resolution errors in published packages.
 * 
 * Purpose: Catch path issues BEFORE publication to npm
 * 
 * Checks:
 * 1. Static imports in re-export wrappers (src/utils/)
 * 2. Dynamic imports in bin/ files (must NOT reference dist/)
 * 3. Compiled dist/ structure integrity
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '../../');

const RULES = {
  // Re-export wrappers in src/utils/ compile to dist/utils/ and need paths that work in npm packages
  // When installed via npm, only dist/ exists at package root level
  // So paths must resolve correctly: dist/utils/X.js -> ../lib/ (one level up to dist, then lib)
  
  // Files at src/utils/X.js compile to dist/utils/X.js (2 levels deep) use '../lib/...'
  'src/utils/file-manager.js': {
    pattern: /from\s+['"]([^'"]+)['"]/,
    shouldContain: '../lib/shared/utils/file-manager.js',
    description: 'file-manager re-export wrapper (compiles with depth adjustment for npm)'
  },
  'src/utils/formatters.js': {
    pattern: /from\s+['"]([^'"]+)['"]/,
    shouldContain: '../lib/shared/utils/formatters.js',
    description: 'formatters re-export wrapper (compiles with depth adjustment for npm)'
  },
  'src/utils/logger.js': {
    pattern: /from\s+['"]([^'"]+)['"]/,
    shouldContain: '../lib/shared/logging/Logger.js',
    description: 'logger re-export wrapper (compiles with depth adjustment for npm)'
  },
  
  // Files at src/utils/cloudflare/X.js compile to dist/utils/cloudflare/X.js (3 levels deep) use '../../lib/...'
  'src/utils/cloudflare/ops.js': {
    pattern: /from\s+['"]([^'"]+)['"]/,
    shouldContain: '../../lib/shared/cloudflare/ops.js',
    description: 'cloudflare ops re-export wrapper (3 levels, compiles with depth adjustment)'
  }
};

// Check for problematic dynamic imports that reference dist/ from bin/
const DYNAMIC_IMPORT_CHECKS = {
  'lib/shared/cloudflare/ops.js': {
    pattern: /import\(['"]([^'"]*dist[^'"]*)['"]\)/g,
    shouldNotContain: 'dist/',
    description: 'Dynamic imports in lib/ must not reference dist/ (causes dist/dist/ bug)'
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

// Check for problematic dynamic imports
console.log('\n🔍 Checking dynamic imports in bin/ files...\n');

for (const [filePath, rule] of Object.entries(DYNAMIC_IMPORT_CHECKS)) {
  const fullPath = path.join(projectRoot, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  SKIPPED: ${filePath} (file not found)`);
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const matches = [...content.matchAll(rule.pattern)];
  
  if (matches.length > 0) {
    console.log(`❌ PROBLEMATIC IMPORTS: ${filePath}`);
    matches.forEach(match => {
      console.log(`   → ${match[1]}`);
    });
    console.log(`   Issue: ${rule.description}\n`);
    failCount += matches.length;
    failures.push(`${filePath}: contains ${matches.length} dynamic import(s) referencing dist/`);
  } else {
    console.log(`✅ NO DIST/ IMPORTS: ${filePath}\n`);
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

// Check dist/cli/ and dist/lib/ exist
console.log('\n📂 Verifying cli/ and lib/ were compiled to dist/...\n');

const cliPath = path.join(projectRoot, 'dist/cli');
const libPath = path.join(projectRoot, 'dist/lib');

if (!fs.existsSync(cliPath)) {
  console.log(`❌ MISSING: dist/cli/ directory`);
  failCount++;
  failures.push('dist/cli/ directory not found - cli/ not compiled');
} else {
  console.log(`✅ EXISTS: dist/cli/ directory`);
  passCount++;
}

if (!fs.existsSync(libPath)) {
  console.log(`❌ MISSING: dist/lib/ directory`);
  failCount++;
  failures.push('dist/lib/ directory not found - lib/ not compiled');
} else {
  console.log(`✅ EXISTS: dist/lib/ directory\n`);
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
  console.log('1. Ensure all src/utils/*.js re-export wrappers use "../../bin/shared/..." paths');
  console.log('2. These paths must work AFTER Babel compilation to dist/');
  console.log('3. Run: npm run build && npm run check:imports\n');
  process.exit(1);
} else {
  console.log('✅ ALL PATHS VALID\n');
  console.log('The re-export wrappers are correctly configured for the npm package.');
  console.log('Users should not encounter ERR_MODULE_NOT_FOUND errors.\n');
  process.exit(0);
}
