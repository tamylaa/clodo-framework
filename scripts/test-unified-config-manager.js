#!/usr/bin/env node
/**
 * Integration test for UnifiedConfigManager
 * Verifies all functionality works correctly
 */

import { UnifiedConfigManager } from '../src/utils/config/unified-config-manager.js';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const testDir = await mkdtemp(join(tmpdir(), 'unified-config-test-'));
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
  console.log('\n🧪 Testing UnifiedConfigManager...\n');
  console.log(`📁 Test directory: ${testDir}\n`);

  // Test 1: Create UnifiedConfigManager instance
  console.log('Test 1: Create instance');
  manager = new UnifiedConfigManager({ configDir: testDir });
  assert(manager !== null, 'Manager instance created');

  // Test 2: listCustomers - empty directory
  console.log('\nTest 2: listCustomers (empty)');
  const emptyList = manager.listCustomers();
  assert(Array.isArray(emptyList) && emptyList.length === 0, 'Returns empty array for no customers');

  // Test 3: saveCustomerConfig
  console.log('\nTest 3: saveCustomerConfig');
  const deploymentData = {
    coreInputs: {
      serviceName: 'test-service',
      serviceType: 'api',
      domainName: 'example.com',
      cloudflareAccountId: '12345',
      cloudflareZoneId: '67890',
      cloudflareToken: 'secret-token'
    },
    confirmations: {
      displayName: 'Test Service',
      description: 'A test service',
      deploymentUrl: 'https://api.example.com',
      workerName: 'test-worker',
      databaseName: 'test-db'
    },
    result: {
      databaseId: 'db-123',
      url: 'https://test.workers.dev',
      deploymentId: 'deploy-456'
    }
  };

  const savedPath = await manager.saveCustomerConfig('testcustomer', 'development', deploymentData);
  assert(savedPath.includes('testcustomer'), 'Config saved to correct path');

  // Test 4: listCustomers - with customer
  console.log('\nTest 4: listCustomers (with customer)');
  const customerList = manager.listCustomers();
  assert(customerList.length === 1 && customerList[0] === 'testcustomer', 'Lists saved customer');

  // Test 5: configExists
  console.log('\nTest 5: configExists');
  const exists = manager.configExists('testcustomer', 'development');
  assert(exists === true, 'Detects existing config');
  
  const notExists = manager.configExists('nonexistent', 'development');
  assert(notExists === false, 'Returns false for non-existent config');

  // Test 6: loadCustomerConfig
  console.log('\nTest 6: loadCustomerConfig');
  const loadedConfig = manager.loadCustomerConfig('testcustomer', 'development');
  assert(loadedConfig !== null, 'Loads existing config');
  assert(loadedConfig.customer === 'testcustomer', 'Customer name correct');
  assert(loadedConfig.serviceName === 'test-service', 'Service name correct');
  assert(loadedConfig.domainName === 'example.com', 'Domain name correct');
  assert(loadedConfig.cloudflareAccountId === '12345', 'Cloudflare account ID correct');

  // Test 7: loadCustomerConfigSafe - existing
  console.log('\nTest 7: loadCustomerConfigSafe (existing)');
  const safeConfig = manager.loadCustomerConfigSafe('testcustomer', 'development');
  assert(safeConfig !== null, 'Returns config for existing customer');
  assert(safeConfig.serviceName === 'test-service', 'Config data correct');

  // Test 8: loadCustomerConfigSafe - non-existent
  console.log('\nTest 8: loadCustomerConfigSafe (non-existent)');
  const defaultConfig = manager.loadCustomerConfigSafe('nonexistent', 'production');
  assert(defaultConfig !== null, 'Returns object for non-existent customer');
  assert(defaultConfig.customer === 'nonexistent', 'Customer name in defaults');
  assert(defaultConfig.serviceName === 'nonexistent', 'Service name defaults to customer');

  // Test 9: isTemplateConfig
  console.log('\nTest 9: isTemplateConfig');
  const templateVars = {
    CUSTOMER_NAME: '{{CUSTOMER_NAME}}',
    CLOUDFLARE_ACCOUNT_ID: '00000000000000000000000000000000'
  };
  assert(manager.isTemplateConfig(templateVars) === true, 'Detects template with placeholders');
  
  const realVars = {
    CUSTOMER_NAME: 'acme',
    CLOUDFLARE_ACCOUNT_ID: '12345',
    DOMAIN: 'acme.com'
  };
  assert(manager.isTemplateConfig(realVars) === false, 'Real config not detected as template');

  // Test 10: getMissingFields
  console.log('\nTest 10: getMissingFields');
  const partialConfig = {
    customer: 'test',
    serviceName: 'test-service',
    domainName: null,
    cloudflareAccountId: ''
  };
  const requiredFields = ['customer', 'serviceName', 'domainName', 'cloudflareAccountId'];
  const missing = manager.getMissingFields(partialConfig, requiredFields);
  assert(missing.length === 2, `Found 2 missing fields (got: ${missing.length})`);
  assert(missing.includes('domainName'), 'Detected missing domainName');
  assert(missing.includes('cloudflareAccountId'), 'Detected missing cloudflareAccountId');

  // Test 11: mergeConfigs
  console.log('\nTest 11: mergeConfigs');
  const storedConfig = {
    customer: 'test',
    serviceName: 'old-service',
    domainName: 'old.com',
    envVars: { KEY1: 'value1' }
  };
  const collectedInputs = {
    serviceName: 'new-service',
    cloudflareAccountId: '12345',
    envVars: { KEY2: 'value2' }
  };
  const merged = manager.mergeConfigs(storedConfig, collectedInputs);
  assert(merged.serviceName === 'new-service', 'Collected inputs take precedence');
  assert(merged.domainName === 'old.com', 'Stored config preserved when not overridden');
  assert(merged.cloudflareAccountId === '12345', 'New fields added');
  assert(merged.envVars.KEY1 === 'value1', 'EnvVars merged - KEY1 preserved');
  assert(merged.envVars.KEY2 === 'value2', 'EnvVars merged - KEY2 added');

  // Test 12: parseToStandardFormat
  console.log('\nTest 12: parseToStandardFormat');
  const envVars = {
    SERVICE_NAME: 'my-service',
    SERVICE_TYPE: 'api',
    DOMAIN: 'myservice.com',
    CLOUDFLARE_ACCOUNT_ID: 'acc123',
    CLOUDFLARE_ZONE_ID: 'zone456',
    DATABASE_NAME: 'my-db',
    WORKER_NAME: 'my-worker'
  };
  const standardFormat = manager.parseToStandardFormat(envVars, 'mycustomer', 'production');
  assert(standardFormat.customer === 'mycustomer', 'Customer name set');
  assert(standardFormat.serviceName === 'my-service', 'Service name parsed');
  assert(standardFormat.domainName === 'myservice.com', 'Domain parsed');
  assert(standardFormat.cloudflareAccountId === 'acc123', 'Cloudflare account parsed');
  assert(standardFormat.databaseName === 'my-db', 'Database name parsed');

  // Test 13: Round-trip (save then load)
  console.log('\nTest 13: Round-trip (save then load)');
  const roundtripData = {
    coreInputs: {
      serviceName: 'roundtrip-service',
      domainName: 'roundtrip.com',
      cloudflareAccountId: 'rt123'
    },
    confirmations: {
      displayName: 'Roundtrip Test'
    }
  };
  await manager.saveCustomerConfig('roundtrip', 'staging', roundtripData);
  const roundtripLoaded = manager.loadCustomerConfig('roundtrip', 'staging');
  assert(roundtripLoaded.serviceName === 'roundtrip-service', 'Round-trip: service name preserved');
  assert(roundtripLoaded.domainName === 'roundtrip.com', 'Round-trip: domain preserved');
  assert(roundtripLoaded.cloudflareAccountId === 'rt123', 'Round-trip: cloudflare account preserved');

  // Test 14: displayCustomerConfig
  console.log('\nTest 14: displayCustomerConfig');
  manager.displayCustomerConfig('testcustomer', 'development');
  assert(true, 'Display config executed without error');

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
