/**
 * Configuration Module
 * Exports all configuration management utilities
 * Includes consolidated ConfigurationManager from Phase 3.2
 */

export { ConfigCache } from './cache.js';
export { ConfigManager } from './manager.js';
export { CommandConfigManager } from './command-config-manager.js';
export { CustomerConfigurationManager } from '../../../dist/config/customers.js';

// Phase 3.2 consolidated configuration management
export { 
  ConfigurationManager, 
  configManager, 
  isFeatureEnabled, 
  getEnabledFeatures, 
  withFeature, 
  FEATURES, 
  COMMON_FEATURES 
} from './ConfigurationManager.js';