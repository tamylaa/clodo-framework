#!/usr/bin/env node
/**
 * Manual integration test for WranglerConfigManager
 * This script verifies all core functionality works correctly
 */

import { WranglerConfigManager } from '../src/utils/deployment/wrangler-config-manager.js';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const testDir = await mkdtemp(join(tmpdir(), 'wrangler-test-'));
const testConfig = join(testDir, 'wrangler.toml');
let manager;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ ${message}`);
    testsPassed++;
  } else {
    console.error(`❌ ${message}`);
    testsFailed++;
  }
}

try {
  console.log('\n🧪 Testing WranglerConfigManager...\n');
  console.log(`📁 Test directory: ${testDir}\n`);

  // Test 1: Create WranglerConfigManager instance
  console.log('Test 1: Create instance');
  manager = new WranglerConfigManager(testConfig);
  assert(manager !== null, 'Manager instance created');

  // Test 2: createMinimalConfig
  console.log('\nTest 2: createMinimalConfig');
  const config = await manager.createMinimalConfig('test-worker', 'development');
  assert(config.name === 'test-worker', `Config name is 'test-worker' (got: ${config.name})`);
  assert(config.main === 'src/index.js', 'Config main is src/index.js');
  assert(config.env && config.env.development !== undefined, 'Development environment created');

  // Test 3: readConfig
  console.log('\nTest 3: readConfig');
  const readConfig = await manager.readConfig();
  assert(readConfig.name === 'test-worker', 'Config read successfully');

  // Test 4: ensureEnvironment  
  console.log('\nTest 4: ensureEnvironment');
  await manager.ensureEnvironment('staging');
  const configWithStaging = await manager.readConfig();
  assert(configWithStaging.env.staging !== undefined, 'Staging environment added');

  // Test 5: addDatabaseBinding
  console.log('\nTest 5: addDatabaseBinding');
  await manager.addDatabaseBinding('development', {
    binding: 'DB',
    database_name: 'my-database',
    database_id: 'abc-123'
  });
  const configWithDB = await manager.readConfig();
  assert(
    configWithDB.env.development.d1_databases && 
    configWithDB.env.development.d1_databases.length === 1,
    'Database binding added to development'
  );
  assert(
    configWithDB.env.development.d1_databases[0].binding === 'DB',
    'Database binding name correct'
  );

  // Test 6: Add second database binding
  console.log('\nTest 6: Add second database binding');
  await manager.addDatabaseBinding('development', {
    binding: 'DB2',
    database_name: 'second-database',
    database_id: 'def-456'
  });
  const configWith2DBs = await manager.readConfig();
  assert(
    configWith2DBs.env.development.d1_databases.length === 2,
    'Two database bindings exist'
  );

  // Test 7: getDatabaseBindings
  console.log('\nTest 7: getDatabaseBindings');
  const bindings = await manager.getDatabaseBindings('development');
  assert(bindings.length === 2, `Found 2 bindings (got: ${bindings.length})`);

  // Test 8: removeDatabaseBinding
  console.log('\nTest 8: removeDatabaseBinding');
  await manager.removeDatabaseBinding('development', 'my-database');
  const configAfterRemove = await manager.readConfig();
  assert(
    configAfterRemove.env.development.d1_databases.length === 1,
    'Database binding removed'
  );
  assert(
    configAfterRemove.env.development.d1_databases[0].database_name === 'second-database',
    'Correct binding remained'
  );

  // Test 9: validate
  console.log('\nTest 9: validate');
  const validation = await manager.validate();
  assert(validation.valid === true, `Validation passed (errors: ${validation.errors.join(', ')})`);

  // Test 10: displaySummary
  console.log('\nTest 10: displaySummary');
  await manager.displaySummary();
  assert(true, 'Summary displayed without error');

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Tests passed: ${testsPassed}`);
  console.log(`❌ Tests failed: ${testsFailed}`);
  console.log('='.repeat(60));

  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed\n');
    process.exit(1);
  }

} catch (error) {
  console.error('\n💥 Test suite crashed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  // Cleanup
  try {
    await rm(testDir, { recursive: true, force: true });
    console.log(`🧹 Cleaned up test directory: ${testDir}`);
  } catch (error) {
    console.error('Failed to cleanup test directory:', error.message);
  }
}
