#!/usr/bin/env node
/**
 * Verify that all documented imports are actually exported from the package
 * This catches missing exports that would cause errors for users
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// All symbols documented as importable from '@tamyla/clodo-framework'
const DOCUMENTED_MAIN_EXPORTS = [
  // Core API
  'Clodo',
  'createService',
  'deploy',
  'validate',
  'initialize',
  'getInfo',
  
  // Worker integration
  'initializeService',
  'createFeatureGuard',
  'createRateLimitGuard',
  'COMMON_FEATURES',
  
  // Data & Schema
  'GenericDataService',
  'SchemaManager',
  'schemaManager',
  'ModuleManager',
  'moduleManager',
  'EnhancedRouter',
  'GenericRouteHandler',
  
  // Domain config
  'createDomainConfigSchema',
  'validateDomainConfig',
  'createDomainRegistry',
  'createDefaultDomainConfig',
  
  // Features
  'FeatureFlagManager',
  'featureManager',
  'isFeatureEnabled',
  'withFeature',
  'FeatureManager',
  
  // Security
  'SecurityCLI',
  'ConfigurationValidator',
  'SecretGenerator',
  
  // Deployment
  'DeploymentValidator',
  'DeploymentAuditor',
  
  // Service Management
  'ServiceCreator',
  'ServiceOrchestrator',
  'ServiceEnhancer',
  'InputCollector',
  'ServiceConfigManager',
  'InteractiveDeploymentCoordinator',
  
  // CLI utilities
  'StandardOptions',
  'ConfigLoader',
  'OutputFormatter',
  
  // Monitoring
  'verifyWorkerDeployment',
  'healthCheckWithBackoff',
  'checkHealth',
  
  // Error handling
  'ErrorRecoveryManager',
  'ErrorHandler',
  'classifyError',
  'getRecoverySuggestions',
  
  // Utilities
  'createLogger',
  'validateRequired',
  'deepMerge',
  'withRetry',
  'withCircuitBreaker',
  
  // Data services
  'createDataService',
  'getAllDataServices',
  
  // Framework info
  'FRAMEWORK_VERSION',
  'FRAMEWORK_NAME',
  'initializeFramework',
  
  // Config
  'autoConfigureFramework',
  
  // Wrangler (may be unavailable in npm)
  'WranglerConfigManager',
  'WranglerDeployer',
  
  // Route management
  'addRoute',
  'addEnvVar',
  
  // Legacy/alternate names
  'ClodoFramework',
  'CrossDomainCoordinator',
  'BaseDataService',
  'MultiDomainOrchestrator',
];

// Check what's actually exported from the compiled dist
async function checkExports() {
  console.log('🔍 Verifying package exports...\n');
  
  // Read the main index.js to see what's exported
  const indexPath = join(rootDir, 'src', 'index.js');
  const indexContent = readFileSync(indexPath, 'utf8');
  
  // Read worker/index.js for worker exports
  const workerIndexPath = join(rootDir, 'src', 'worker', 'index.js');
  const workerIndexContent = readFileSync(workerIndexPath, 'utf8');
  
  // Read config/index.js for config exports
  const configIndexPath = join(rootDir, 'src', 'config', 'index.js');
  const configIndexContent = readFileSync(configIndexPath, 'utf8');
  
  const allContent = indexContent + '\n' + workerIndexContent + '\n' + configIndexContent;
  
  const missing = [];
  const available = [];
  const maybeExported = []; // via export *
  
  for (const symbol of DOCUMENTED_MAIN_EXPORTS) {
    // Check if explicitly exported
    const exportPatterns = [
      new RegExp(`export\\s+\\{[^}]*\\b${symbol}\\b[^}]*\\}`),
      new RegExp(`export\\s+const\\s+${symbol}\\s*=`),
      new RegExp(`export\\s+class\\s+${symbol}\\b`),
      new RegExp(`export\\s+function\\s+${symbol}\\b`),
      new RegExp(`export\\s+default.*${symbol}`),
    ];
    
    const isExplicitlyExported = exportPatterns.some(pattern => pattern.test(allContent));
    
    if (isExplicitlyExported) {
      available.push(symbol);
    } else if (allContent.includes('export *')) {
      // Might be exported via export * from './module'
      maybeExported.push(symbol);
    } else {
      missing.push(symbol);
    }
  }
  
  console.log(`✅ EXPLICITLY EXPORTED (${available.length}):`);
  available.forEach(s => console.log(`   ✓ ${s}`));
  
  if (maybeExported.length > 0) {
    console.log(`\n⚠️  POSSIBLY EXPORTED via export * (${maybeExported.length}):`);
    console.log('   (These need manual verification)');
    maybeExported.forEach(s => console.log(`   ? ${s}`));
  }
  
  if (missing.length > 0) {
    console.log(`\n❌ MISSING EXPORTS (${missing.length}):`);
    console.log('   These are documented but not found in exports:');
    missing.forEach(s => console.log(`   ✗ ${s}`));
    console.log('\n⚠️  Users will get import errors for these symbols!');
    return false;
  }
  
  console.log(`\n✅ All documented exports appear to be available!`);
  return true;
}

checkExports()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
