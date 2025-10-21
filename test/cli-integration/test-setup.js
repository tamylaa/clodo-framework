/**
 * CLI Integration Test Setup
 * 
 * Global setup for CLI integration tests
 */

import { beforeAll, afterAll } from '@jest/globals';
import { rmSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Clean up any previous test artifacts before starting
beforeAll(() => {
  const testBaseDir = join(tmpdir(), 'clodo-cli-tests');
  
  console.log('\n🧹 Cleaning up previous test artifacts...');
  
  if (existsSync(testBaseDir)) {
    try {
      rmSync(testBaseDir, { recursive: true, force: true });
      console.log('✅ Previous test artifacts cleaned up\n');
    } catch (error) {
      console.warn(`⚠️  Could not clean up test directory: ${error.message}\n`);
    }
  }
  
  // Create fresh test directory
  mkdirSync(testBaseDir, { recursive: true });
});

// Final cleanup after all tests
afterAll(() => {
  const testBaseDir = join(tmpdir(), 'clodo-cli-tests');
  
  console.log('\n🧹 Final cleanup of test artifacts...');
  
  if (existsSync(testBaseDir)) {
    try {
      rmSync(testBaseDir, { recursive: true, force: true });
      console.log('✅ All test artifacts cleaned up\n');
    } catch (error) {
      console.warn(`⚠️  Could not clean up test directory: ${error.message}`);
      console.warn(`   Manual cleanup required: ${testBaseDir}\n`);
    }
  }
});
