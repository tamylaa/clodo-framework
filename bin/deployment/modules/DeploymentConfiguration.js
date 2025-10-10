/**
 * Deployment Configuration Module
 * Centralized configuration management for enterprise deployments
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { askUser, askYesNo, askChoice } from '../shared/utils/interactive-prompts.js';

/**
 * Manages all deployment configuration including domain setup, 
 * worker configuration, database config, and secrets management
 */
export class DeploymentConfiguration {
  constructor(options = {}) {
    this.options = options;
    this.config = this.initializeDefaultConfig();
    this.state = {
      configurationId: this.generateConfigId(),
      configDiscovered: false,
      secretsGenerated: false,
      validated: false
    };
  }

  /**
   * Generate unique configuration ID
   */
  generateConfigId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substr(2, 9);
    return `config-${timestamp}-${random}`;
  }

  /**
   * Initialize default configuration structure
   */
  initializeDefaultConfig() {
    return {
      // Domain and service configuration
      domain: null,
      environment: 'production',
      deploymentMode: 'single',
      
      // Worker configuration
      worker: {
        name: null,
        url: null,
        routes: []
      },
      
      // Database configuration
      database: {
        name: null,
        id: null,
        createNew: true,
        enableMigrations: true
      },
      
      // Secrets management
      secrets: {
        generateNew: true,
        keys: {},
        distributionMethod: 'individual'
      },
      
      // Enterprise features
      enterprise: {
        enableOrchestration: true,
        enableCrossDomainCoordination: false,
        enableAdvancedValidation: true,
        enableProductionTesting: true,
        enableConfigCaching: true,
        enableAuditLogging: true
      },
      
      // Deployment options
      deployment: {
        runTests: true,
        skipExisting: false,
        enableRollback: true,
        validationLevel: 'comprehensive',
        auditLevel: 'detailed'
      }
    };
  }

  /**
   * Gather single domain configuration information
   */
  async gatherSingleDomainInfo() {
    console.log('\n🌐 Step 1: Domain Configuration');
    console.log('===============================');

    this.config.domain = await askUser(
      'Enter the domain name (e.g., example.com)',
      this.config.domain
    );

    const envChoice = await askChoice(
      'Select deployment environment',
      ['production', 'staging', 'development'],
      0
    );
    this.config.environment = ['production', 'staging', 'development'][envChoice];

    // Generate worker name and URL
    this.config.worker.name = `${this.config.domain.replace(/\./g, '-')}-${this.config.environment}`;
    this.config.worker.url = this.config.environment === 'production' 
      ? `https://${this.config.domain}` 
      : `https://${this.config.environment}.${this.config.domain}`;

    console.log(`\n📋 Configuration Summary:`);
    console.log(`   🌐 Domain: ${this.config.domain}`);
    console.log(`   🏷️ Environment: ${this.config.environment}`);
    console.log(`   👷 Worker: ${this.config.worker.name}`);
    console.log(`   🔗 URL: ${this.config.worker.url}`);

    const confirmConfig = await askYesNo('Is this configuration correct?', true);
    if (!confirmConfig) {
      return await this.gatherSingleDomainInfo();
    }

    return this.config;
  }

  /**
   * Configure database settings
   */
  async configureDatabaseSettings() {
    console.log('\n🗄️ Database Configuration');
    console.log('=========================');

    this.config.database.name = `${this.config.domain}-auth-db`;
    console.log(`\n📋 Generated database name: ${this.config.database.name}`);

    const useGeneratedName = await askYesNo('Use this database name?', true);
    if (!useGeneratedName) {
      this.config.database.name = await askUser(
        'Enter custom database name',
        this.config.database.name
      );
    }

    const enableMigrations = await askYesNo(
      'Enable automatic database migrations?', 
      true
    );
    this.config.database.enableMigrations = enableMigrations;

    return this.config.database;
  }

  /**
   * Configure secrets management
   */
  async configureSecretsManagement() {
    console.log('\n🔐 Secrets Management Configuration');
    console.log('==================================');

    // Check for existing secrets file
    const secretsFile = join('secrets', `${this.config.domain}-secrets.json`);
    let existingSecrets = {};
    
    try {
      const secretsData = JSON.parse(readFileSync(secretsFile, 'utf8'));
      const { domain, environment, generated, note, ...secrets } = secretsData;
      existingSecrets = secrets;
      
      console.log(`\n📂 Found existing secrets file: ${secretsFile}`);
      console.log(`   🔑 Contains ${Object.keys(secrets).length} secrets`);
      console.log(`   📅 Generated: ${generated}`);
      
      const reuseSecrets = await askYesNo(
        'Do you want to reuse these existing secrets? (Recommended for consistency)',
        true
      );
      
      if (reuseSecrets) {
        this.config.secrets.keys = existingSecrets;
        this.config.secrets.generateNew = false;
        this.state.secretsGenerated = true;
        console.log('   ✅ Will reuse existing secrets');
        return this.config.secrets;
      }
    } catch (error) {
      console.log('   ⚠️ No existing secrets found or file unreadable');
    }

    // Configure new secrets generation
    const confirmGenerate = await askYesNo(
      'Generate new cryptographic secrets? (Required for first deployment)',
      true
    );

    if (!confirmGenerate) {
      throw new Error('Secret generation is required for deployment');
    }

    this.config.secrets.generateNew = true;

    // Select distribution method
    const distributionChoice = await askChoice(
      'Choose secret distribution method',
      [
        'Individual secrets (Recommended)',
        'Batch deployment (Faster)',
        'Manual distribution (Advanced)'
      ],
      0
    );

    this.config.secrets.distributionMethod = [
      'individual',
      'batch', 
      'manual'
    ][distributionChoice];

    return this.config.secrets;
  }

  /**
   * Configure enterprise features
   */
  async configureEnterpriseFeatures() {
    console.log('\n🏢 Enterprise Features Configuration');
    console.log('===================================');

    const features = [
      {
        key: 'enableOrchestration',
        name: 'Multi-Domain Orchestration',
        description: 'Advanced deployment coordination across multiple domains',
        default: true
      },
      {
        key: 'enableAdvancedValidation',
        name: 'Advanced Validation',
        description: 'Comprehensive pre-deployment validation and testing',
        default: true
      },
      {
        key: 'enableProductionTesting',
        name: 'Production Testing',
        description: 'Automated post-deployment testing and validation',
        default: true
      },
      {
        key: 'enableConfigCaching',
        name: 'Configuration Caching',
        description: 'High-performance configuration caching and optimization',
        default: true
      },
      {
        key: 'enableAuditLogging',
        name: 'Audit Logging',
        description: 'Detailed audit trails and compliance reporting',
        default: true
      }
    ];

    for (const feature of features) {
      console.log(`\n🔧 ${feature.name}`);
      console.log(`   ${feature.description}`);
      
      const enable = await askYesNo(
        `Enable ${feature.name}?`,
        feature.default
      );
      
      this.config.enterprise[feature.key] = enable;
    }

    return this.config.enterprise;
  }

  /**
   * Update wrangler.toml configuration
   */
  async updateWranglerConfig() {
    console.log('\n⚙️ Updating wrangler.toml configuration...');
    
    try {
      let config = readFileSync('wrangler.toml', 'utf8');

      // Update worker name
      config = config.replace(
        /^name = "[^"]*"/m,
        `name = "${this.config.worker.name}"`
      );

      // Update production environment name
      config = config.replace(
        /^\[env\.production\]\s*\nname = "[^"]*"/m,
        `[env.production]\nname = "${this.config.worker.name}"`
      );

      // Update database configuration if database is configured
      if (this.config.database.name && this.config.database.id) {
        config = config.replace(
          /database_name = "[^"]*"/g,
          `database_name = "${this.config.database.name}"`
        );

        config = config.replace(
          /database_id = "[^"]*"/g,
          `database_id = "${this.config.database.id}"`
        );
      }

      // Update SERVICE_DOMAIN
      config = config.replace(
        /SERVICE_DOMAIN = "[^"]*"/g,
        `SERVICE_DOMAIN = "${this.config.domain}"`
      );

      // Write updated configuration
      writeFileSync('wrangler.toml', config);
      console.log('   ✅ wrangler.toml updated successfully');

      return { success: true, config };
    } catch (error) {
      console.log(`   ❌ Failed to update wrangler.toml: ${error.message}`);
      throw new Error(`wrangler.toml update failed: ${error.message}`);
    }
  }

  /**
   * Try to discover existing configuration
   */
  async tryConfigurationDiscovery() {
    console.log('\n🔍 Attempting configuration discovery...');
    
    const discoveries = [];

    try {
      // Try to discover from wrangler.toml
      const wranglerConfig = readFileSync('wrangler.toml', 'utf8');
      const nameMatch = wranglerConfig.match(/^name = "([^"]+)"/m);
      if (nameMatch) {
        discoveries.push({ source: 'wrangler.toml', key: 'worker.name', value: nameMatch[1] });
      }

      const domainMatch = wranglerConfig.match(/SERVICE_DOMAIN = "([^"]+)"/);
      if (domainMatch) {
        discoveries.push({ source: 'wrangler.toml', key: 'domain', value: domainMatch[1] });
      }

    } catch (error) {
      console.log('   ⚠️ No wrangler.toml found for discovery');
    }

    try {
      // Try to discover from package.json
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      if (packageJson.name) {
        discoveries.push({ source: 'package.json', key: 'project.name', value: packageJson.name });
      }
    } catch (error) {
      console.log('   ⚠️ No package.json found for discovery');
    }

    if (discoveries.length > 0) {
      console.log('\n📋 Discovered configuration:');
      discoveries.forEach(discovery => {
        console.log(`   ${discovery.source}: ${discovery.key} = ${discovery.value}`);
      });

      const useDiscovered = await askYesNo('Use discovered configuration as starting point?', true);
      if (useDiscovered) {
        // Apply discoveries to config
        discoveries.forEach(discovery => {
          const keys = discovery.key.split('.');
          let target = this.config;
          for (let i = 0; i < keys.length - 1; i++) {
            if (!target[keys[i]]) target[keys[i]] = {};
            target = target[keys[i]];
          }
          target[keys[keys.length - 1]] = discovery.value;
        });
        
        this.state.configDiscovered = true;
        console.log('   ✅ Configuration discovery applied');
      }
    } else {
      console.log('   ℹ️ No configuration discovered, will use interactive setup');
    }

    return this.state.configDiscovered;
  }

  /**
   * Validate configuration completeness
   */
  validateConfiguration() {
    const issues = [];

    // Check required fields
    if (!this.config.domain) {
      issues.push('Domain is required');
    }
    if (!this.config.worker.name) {
      issues.push('Worker name is required');
    }
    if (!this.config.environment) {
      issues.push('Environment is required');
    }

    // Validate domain format
    if (this.config.domain && !/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/.test(this.config.domain)) {
      issues.push('Invalid domain format');
    }

    // Check database configuration if enabled
    if (this.config.database.enableMigrations && !this.config.database.name) {
      issues.push('Database name is required when migrations are enabled');
    }

    this.state.validated = issues.length === 0;

    return {
      valid: this.state.validated,
      issues
    };
  }

  /**
   * Get configuration summary for display
   */
  getConfigurationSummary() {
    return {
      domain: this.config.domain,
      environment: this.config.environment,
      worker: this.config.worker.name,
      database: this.config.database.name,
      secretsConfigured: this.state.secretsGenerated,
      enterpriseFeatures: Object.entries(this.config.enterprise)
        .filter(([key, value]) => value)
        .map(([key]) => key),
      validated: this.state.validated
    };
  }

  /**
   * Export configuration for other modules
   */
  exportConfiguration() {
    return {
      ...this.config,
      state: { ...this.state }
    };
  }

  /**
   * Import configuration from external source
   */
  importConfiguration(externalConfig) {
    if (externalConfig.state) {
      this.state = { ...this.state, ...externalConfig.state };
      delete externalConfig.state;
    }
    this.config = { ...this.config, ...externalConfig };
    return this.config;
  }
}