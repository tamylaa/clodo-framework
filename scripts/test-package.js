#!/usr/bin/env node
/**
 * Comprehensive Package Testing Script
 * Tests the built package as a downstream developer would use it
 * 
 * This script:
 * 1. Creates a temporary test project
 * 2. Packs the current package (creates a .tgz file)
 * 3. Installs it in the test project like a real user would
 * 4. Tests all exported modules and APIs
 * 5. Checks for import errors, circular dependencies, and runtime issues
 */

import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const testDir = join(projectRoot, 'tmp', 'package-test');

console.log('\n🧪 Starting Comprehensive Package Test\n');
console.log('━'.repeat(60));

// Clean up previous test
if (existsSync(testDir)) {
  console.log('🧹 Cleaning up previous test directory...');
  rmSync(testDir, { recursive: true, force: true });
}

// Step 1: Build the package
console.log('\n📦 Step 1: Building package...');
try {
  execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
  console.log('✅ Build successful');
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

// Step 2: Pack the package (creates .tgz)
console.log('\n📦 Step 2: Packing package...');
let tarballPath;
try {
  const output = execSync('npm pack', { cwd: projectRoot, encoding: 'utf8' });
  tarballPath = output.trim().split('\n').pop();
  console.log(`✅ Package created: ${tarballPath}`);
} catch (error) {
  console.error('❌ Pack failed');
  process.exit(1);
}

// Step 3: Create test project
console.log('\n📁 Step 3: Creating test project...');
mkdirSync(testDir, { recursive: true });

// Create package.json for test project
const testPackageJson = {
  name: 'test-downstream-project',
  version: '1.0.0',
  type: 'module',
  private: true
};
writeFileSync(
  join(testDir, 'package.json'),
  JSON.stringify(testPackageJson, null, 2)
);
console.log('✅ Test project created');

// Step 4: Install the packed package
console.log('\n📥 Step 4: Installing package in test project...');
try {
  const tarballFullPath = join(projectRoot, tarballPath);
  execSync(`npm install "${tarballFullPath}"`, {
    cwd: testDir,
    stdio: 'inherit'
  });
  console.log('✅ Package installed');
} catch (error) {
  console.error('❌ Installation failed');
  process.exit(1);
}

// Step 5: Test all exports
console.log('\n🧪 Step 5: Testing package exports...');

const tests = [
  {
    name: 'Main Entry Point',
    code: `import * as framework from '@tamyla/clodo-framework';
console.log('✓ Main export loaded');
if (!framework.initializeService) throw new Error('Missing initializeService');
console.log('✓ initializeService exists');`
  },
  {
    name: 'Worker Integration',
    code: `import { initializeService, configManager } from '@tamyla/clodo-framework/worker';
console.log('✓ Worker exports loaded');
if (typeof initializeService !== 'function') throw new Error('initializeService is not a function');
console.log('✓ initializeService is a function');`
  },
  {
    name: 'Config Module',
    code: `import * as config from '@tamyla/clodo-framework/config';
console.log('✓ Config exports loaded');
if (!config.getDomainFromEnv) throw new Error('Missing getDomainFromEnv');
console.log('✓ getDomainFromEnv exists');`
  },
  {
    name: 'Services Module',
    code: `import { GenericDataService, createDataService } from '@tamyla/clodo-framework/services';
console.log('✓ Services exports loaded');
if (typeof createDataService !== 'function') throw new Error('createDataService is not a function');
console.log('✓ createDataService is a function');`
  },
  {
    name: 'Schema Module',
    code: `import { SchemaManager, schemaManager } from '@tamyla/clodo-framework/schema';
console.log('✓ Schema exports loaded');
if (!SchemaManager) throw new Error('Missing SchemaManager');
console.log('✓ SchemaManager exists');`
  },
  {
    name: 'Routing Module',
    code: `import { EnhancedRouter, createEnhancedRouter } from '@tamyla/clodo-framework/routing';
console.log('✓ Routing exports loaded');
if (typeof createEnhancedRouter !== 'function') throw new Error('createEnhancedRouter is not a function');
console.log('✓ createEnhancedRouter is a function');`
  },
  {
    name: 'Security Module',
    code: `import { SecurityCLI, SecretGenerator } from '@tamyla/clodo-framework/security';
console.log('✓ Security exports loaded');
if (!SecurityCLI) throw new Error('Missing SecurityCLI');
console.log('✓ SecurityCLI exists');`
  },
  {
    name: 'Service Management',
    code: `import { ServiceCreator, ServiceOrchestrator } from '@tamyla/clodo-framework/service-management';
console.log('✓ Service management exports loaded');
if (!ServiceCreator) throw new Error('Missing ServiceCreator');
console.log('✓ ServiceCreator exists');`
  },
  {
    name: 'Database Module',
    code: `import * as db from '@tamyla/clodo-framework/database';
console.log('✓ Database exports loaded');
if (!db.DatabaseOrchestrator) throw new Error('Missing DatabaseOrchestrator');
console.log('✓ DatabaseOrchestrator exists');`
  },
  {
    name: 'Deployment Module',
    code: `import { DeploymentValidator, DeploymentAuditor } from '@tamyla/clodo-framework/deployment';
console.log('✓ Deployment exports loaded');
if (!DeploymentValidator) throw new Error('Missing DeploymentValidator');
console.log('✓ DeploymentValidator exists');`
  },
  {
    name: 'Cloudflare Utils',
    code: `import * as cf from '@tamyla/clodo-framework/utils/cloudflare';
console.log('✓ Cloudflare utils exports loaded');
if (!cf.CloudflareAPI) throw new Error('Missing CloudflareAPI');
console.log('✓ CloudflareAPI exists');`
  },
  {
    name: 'Dynamic Import Test (frameworkConfig)',
    code: `import { initializeService } from '@tamyla/clodo-framework/worker';
// Test that dynamic imports work at runtime
const env = { DOMAIN: 'test' };
const domains = { test: { name: 'test', accountId: '123' } };
try {
  const result = initializeService(env, domains);
  console.log('✓ initializeService executed without import errors');
} catch (error) {
  if (error.message.includes('Cannot find module')) {
    throw new Error('Dynamic import path broken: ' + error.message);
  }
  // Other errors are OK (we're not testing full functionality, just imports)
  console.log('✓ No import path errors (functional errors are OK for this test)');
}`
  },
  {
    name: 'Circular Dependency Check',
    code: `import * as framework from '@tamyla/clodo-framework';
import * as worker from '@tamyla/clodo-framework/worker';
import * as config from '@tamyla/clodo-framework/config';
console.log('✓ No circular dependency errors on import');
// Check that we can access nested properties without infinite loops
if (config.getDomainFromEnv) {
  console.log('✓ Config module accessible');
}
if (worker.initializeService) {
  console.log('✓ Worker module accessible');
}
console.log('✓ No circular reference runtime errors');`
  }
];

let passed = 0;
let failed = 0;
const failures = [];

for (const test of tests) {
  const testFile = join(testDir, `test-${passed + failed}.mjs`);
  writeFileSync(testFile, test.code);
  
  try {
    console.log(`\n  Testing: ${test.name}`);
    execSync(`node "${testFile}"`, { cwd: testDir, encoding: 'utf8', stdio: 'pipe' });
    console.log(`  ✅ ${test.name} passed`);
    passed++;
  } catch (error) {
    console.error(`  ❌ ${test.name} failed`);
    console.error(`     ${error.message}`);
    failed++;
    failures.push({ name: test.name, error: error.message });
  }
}

// Step 6: Check for common issues in dist/
console.log('\n🔍 Step 6: Checking for common packaging issues...');

const distPath = join(projectRoot, 'dist');
const issuesFound = [];

// Check for references to src/ or ../lib/ that escaped outside dist/
function checkFileForBadImports(filePath, relativePath) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  //Skip re-export wrappers in dist/utils/ that are intended to re-export from dist/lib/
  // Normalize path separators to forward slashes for consistent matching
  const normalizedPath = relativePath.replace(/\\/g, '/');
  const isReExportWrapper = normalizedPath.match(/^utils\/(file-manager|formatters|logger|index|cloudflare\/ops)\.js$/);
  const isServiceManagementGenerator = normalizedPath.match(/^service-management\/generators\/testing\//);
  
  lines.forEach((line, index) => {
    // Check for imports that go outside dist/
    // Skip if this is within lib/ going to another lib location or to config/ (which is also in dist/)
    const isLibToLib = normalizedPath.startsWith('lib/') && line.match(/from\s+['"]\.\.\/\.\.\//);
    const isLibToConfig = normalizedPath.startsWith('lib/shared/config/') && line.includes('../../../config/');
    
    if (line.match(/from\s+['"]\.\.\/\.\.\/\.\.\//)) {
      if (!isLibToLib && !isLibToConfig) {
        issuesFound.push({
          file: relativePath,
          line: index + 1,
          issue: 'Import path goes too far up (../../../)',
          code: line.trim()
        });
      }
    }
    
    // Check for absolute imports to src/ or lib/
    if (line.match(/from\s+['"].*\/src\//) && !isServiceManagementGenerator) {
      issuesFound.push({
        file: relativePath,
        line: index + 1,
        issue: 'Absolute import to src/ (should be relative within dist/)',
        code: line.trim()
      });
    }
    
    // Check for imports that try to access lib/ from project root
    if (line.match(/from\s+['"]\.\.\/lib\//) && !relativePath.includes('lib\\') && !relativePath.includes('lib/') && !isReExportWrapper) {
      issuesFound.push({
        file: relativePath,
        line: index + 1,
        issue: 'Import tries to access lib/ outside dist/',
        code: line.trim()
      });
    }
  });
}

function walkDir(dir, baseDir = dir) {
  const files = readdirSync(dir, { withFileTypes: true });
  files.forEach(file => {
    const fullPath = join(dir, file.name);
    if (file.isDirectory()) {
      walkDir(fullPath, baseDir);
    } else if (file.name.endsWith('.js')) {
      const relativePath = fullPath.substring(baseDir.length + 1);
      checkFileForBadImports(fullPath, relativePath);
    }
  });
}

walkDir(distPath);

if (issuesFound.length > 0) {
  console.log('\n⚠️  Found potential packaging issues:');
  issuesFound.forEach(issue => {
    console.log(`\n  File: ${issue.file}:${issue.line}`);
    console.log(`  Issue: ${issue.issue}`);
    console.log(`  Code: ${issue.code}`);
  });
} else {
  console.log('✅ No obvious packaging issues found');
}

// Final Report
console.log('\n' + '━'.repeat(60));
console.log('\n📊 TEST SUMMARY');
console.log('━'.repeat(60));
console.log(`\n  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);

if (issuesFound.length > 0) {
  console.log(`  ⚠️  Packaging issues: ${issuesFound.length}`);
}

if (failed > 0) {
  console.log('\n❌ FAILURES:');
  failures.forEach(f => {
    console.log(`\n  ${f.name}:`);
    console.log(`    ${f.error}`);
  });
}

console.log('\n' + '━'.repeat(60));

// Cleanup
console.log('\n🧹 Cleaning up...');
const tarballFullPath = join(projectRoot, tarballPath);
if (existsSync(tarballFullPath)) {
  rmSync(tarballFullPath);
}

if (failed > 0 || issuesFound.length > 0) {
  console.log('\n❌ Package has issues that need to be fixed before publishing!\n');
  process.exit(1);
} else {
  console.log('\n✅ Package is ready for publication!\n');
  process.exit(0);
}
