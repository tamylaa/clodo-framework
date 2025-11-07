/**
 * ConfirmationEngine - Tier 2: Smart Confirmations
 *
 * Takes the 6 core inputs and generates 15 derived confirmation values
 * that users can review and modify before service generation.
 *
 * Core Inputs (6):
 * 1. Service Name
 * 2. Service Type
 * 3. Domain Name
 * 4. Cloudflare Token
 * 5. Cloudflare Account ID
 * 6. Cloudflare Zone ID
 * 7. Environment
 *
 * Derived Confirmations (15):
 * 1. Display Name
 * 2. Description
 * 3. Version
 * 4. Author
 * 5. Production URL
 * 6. Staging URL
 * 7. Development URL
 * 8. Features Configuration
 * 9. Database Name
 * 10. Worker Name
 * 11. Package Name
 * 12. Git Repository URL
 * 13. Documentation URL
 * 14. Health Check Path
 * 15. API Base Path
 */

import { createInterface } from 'readline';
import chalk from 'chalk';
import { validateServiceName, validateDomainName } from '../utils/validation.js';
import { NameFormatters, UrlFormatters, ResourceFormatters } from '../../lib/shared/utils/formatters.js';

export class ConfirmationEngine {
  constructor(options = {}) {
    this.interactive = options.interactive !== false;
    this.rl = this.interactive ? createInterface({
      input: process.stdin,
      output: process.stdout
    }) : null;
  }

  /**
   * Generate and confirm all derived values from core inputs
   */
  async generateAndConfirm(coreInputs) {
    console.log(chalk.cyan('\n🔍 Tier 2: Smart Confirmations'));
    console.log(chalk.white('Reviewing and confirming 15 derived configuration values...\n'));

    // Generate smart defaults
    const derivedValues = this.generateSmartDefaults(coreInputs);

    // Interactive confirmation if enabled
    if (this.interactive) {
      return await this.interactiveConfirmation(derivedValues, coreInputs);
    } else {
      console.log(chalk.gray('⚠️  Non-interactive mode: Using generated defaults'));
      return derivedValues;
    }
  }

  /**
   * Generate smart defaults for all 15 confirmation values
   */
  generateSmartDefaults(coreInputs) {
    const { serviceName, serviceType, domainName, environment } = coreInputs;

    return {
      // 1. Display Name - Convert kebab-case to Title Case
      displayName: this.generateDisplayName(serviceName),

      // 2. Description - Based on service type
      description: this.generateDescription(serviceType),

      // 3. Version - Standard semantic versioning
      version: '1.0.0',

      // 4. Author - Default framework author
      author: 'Clodo Framework',

      // 5-7. URLs - Derived from domain and service name
      productionUrl: UrlFormatters.buildProductionUrl(serviceName, domainName),
      stagingUrl: UrlFormatters.buildStagingUrl(serviceName, domainName),
      developmentUrl: UrlFormatters.buildDevUrl(serviceName, domainName),

      // 8. Features - Based on service type
      features: this.generateFeaturesForType(serviceType),

      // 9. Database Name - Cloudflare D1 naming
      databaseName: ResourceFormatters.databaseName(serviceName),

      // 10. Worker Name - Cloudflare Worker naming
      workerName: ResourceFormatters.workerName(serviceName),

      // 11. Package Name - NPM package naming
      packageName: ResourceFormatters.packageName(serviceName),

      // 12. Git Repository URL - GitHub naming
      gitRepositoryUrl: `https://github.com/tamylaa/${serviceName}`,

      // 13. Documentation URL - Based on domain
      documentationUrl: `https://docs.${domainName}`,

      // 14. Health Check Path - Standard health endpoint
      healthCheckPath: '/health',

      // 15. API Base Path - Service-specific API path
      apiBasePath: `/api/v1/${serviceName.replace('-', '/')}`
    };
  }

  /**
   * Interactive confirmation process
   */
  async interactiveConfirmation(derivedValues, coreInputs) {
    console.log(chalk.cyan('Please review and confirm the following derived values:'));
    console.log(chalk.gray('Press Enter to accept default, or type new value to modify.\n'));

    const confirmed = { ...derivedValues };

    // Group confirmations for better UX
    const confirmationGroups = [
      {
        title: '📋 Basic Information',
        items: [
          { key: 'displayName', label: 'Display Name', description: 'Human-readable service name' },
          { key: 'description', label: 'Description', description: 'Service description' },
          { key: 'version', label: 'Version', description: 'Initial version number' },
          { key: 'author', label: 'Author', description: 'Service author/maintainer' }
        ]
      },
      {
        title: '🌐 URLs & Endpoints',
        items: [
          { key: 'productionUrl', label: 'Production URL', description: 'Live production endpoint' },
          { key: 'stagingUrl', label: 'Staging URL', description: 'Staging environment endpoint' },
          { key: 'developmentUrl', label: 'Development URL', description: 'Development environment endpoint' },
          { key: 'documentationUrl', label: 'Documentation URL', description: 'API documentation location' }
        ]
      },
      {
        title: '⚙️ Service Configuration',
        items: [
          { key: 'databaseName', label: 'Database Name', description: 'Cloudflare D1 database name' },
          { key: 'workerName', label: 'Worker Name', description: 'Cloudflare Worker script name' },
          { key: 'packageName', label: 'Package Name', description: 'NPM package identifier' },
          { key: 'healthCheckPath', label: 'Health Check Path', description: 'Health endpoint path' },
          { key: 'apiBasePath', label: 'API Base Path', description: 'Base path for API endpoints' }
        ]
      }
    ];

    for (const group of confirmationGroups) {
      console.log(chalk.yellow(`\n${group.title}`));
      console.log(chalk.gray('─'.repeat(50)));

      for (const item of group.items) {
        const currentValue = confirmed[item.key];
        const newValue = await this.confirmValue(
          `${item.label} (${item.description})`,
          currentValue
        );

        if (newValue !== null && newValue !== currentValue) {
          // Validate the new value if it's a URL or name
          if (this.validateConfirmationValue(item.key, newValue)) {
            confirmed[item.key] = newValue;
            console.log(chalk.green(`✓ Updated: ${newValue}`));
          } else {
            console.log(chalk.red(`✗ Invalid value, keeping: ${currentValue}`));
          }
        } else {
          console.log(chalk.gray(`✓ Keeping: ${currentValue}`));
        }
      }
    }

    // Special handling for features
    console.log(chalk.yellow('\n🔧 Feature Configuration'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.white('Current features for service type:'), chalk.cyan(coreInputs.serviceType));
    this.displayFeatures(confirmed.features);

    const modifyFeatures = await this.confirmYesNo('\nWould you like to modify feature flags?', false);
    if (modifyFeatures) {
      confirmed.features = await this.interactiveFeatureConfiguration(confirmed.features, coreInputs.serviceType);
    }

    return confirmed;
  }

  /**
   * Confirm a single value with user
   */
  async confirmValue(prompt, currentValue) {
    return new Promise((resolve) => {
      const displayValue = typeof currentValue === 'object'
        ? JSON.stringify(currentValue, null, 2)
        : String(currentValue);

      this.rl.question(`${prompt} [${displayValue}]: `, (answer) => {
        resolve(answer.trim() || null);
      });
    });
  }

  /**
   * Confirm yes/no question
   */
  async confirmYesNo(question, defaultValue = true) {
    return new Promise((resolve) => {
      const defaultText = defaultValue ? '[Y/n]' : '[y/N]';
      this.rl.question(`${question} ${defaultText}: `, (answer) => {
        const normalized = answer.toLowerCase().trim();
        if (normalized === '') {
          resolve(defaultValue);
        } else if (normalized === 'y' || normalized === 'yes') {
          resolve(true);
        } else if (normalized === 'n' || normalized === 'no') {
          resolve(false);
        } else {
          resolve(defaultValue);
        }
      });
    });
  }

  /**
   * Interactive feature configuration
   */
  async interactiveFeatureConfiguration(currentFeatures, serviceType) {
    console.log(chalk.cyan('\nFeature Configuration:'));
    console.log(chalk.white('Type feature name to toggle, or "done" to finish'));

    const features = { ...currentFeatures };

    for (;;) {
      console.log(chalk.gray('\nCurrent features:'));
      this.displayFeatures(features);

      const input = await new Promise((resolve) => {
        this.rl.question('Feature to toggle (or "done"): ', resolve);
      });

      const feature = input.trim().toLowerCase();

      if (feature === 'done' || feature === '') {
        break;
      }

      if (Object.prototype.hasOwnProperty.call(features, feature)) {
        features[feature] = !features[feature];
        console.log(chalk.green(`✓ ${feature}: ${features[feature] ? 'ENABLED' : 'DISABLED'}`));
      } else {
        console.log(chalk.red(`✗ Unknown feature: ${feature}`));
        console.log(chalk.gray('Available features:'), Object.keys(features).join(', '));
      }
    }

    return features;
  }

  /**
   * Display features in a nice format
   */
  displayFeatures(features) {
    const enabled = Object.entries(features)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);

    const disabled = Object.entries(features)
      .filter(([, enabled]) => !enabled)
      .map(([name]) => name);

    if (enabled.length > 0) {
      console.log(chalk.green('  Enabled:'), enabled.join(', '));
    }
    if (disabled.length > 0) {
      console.log(chalk.gray('  Disabled:'), disabled.join(', '));
    }
  }

  /**
   * Validate confirmation value based on type
   */
  validateConfirmationValue(key, value) {
    switch (key) {
      case 'displayName':
        return value.length > 0 && value.length <= 100;
      case 'description':
        return value.length > 0 && value.length <= 500;
      case 'version':
        return /^\d+\.\d+\.\d+$/.test(value);
      case 'productionUrl':
      case 'stagingUrl':
      case 'developmentUrl':
      case 'documentationUrl':
        return /^https?:\/\/.+/.test(value);
      case 'databaseName':
      case 'workerName':
        return validateServiceName(value);
      case 'packageName':
        return /^@?[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/.test(value);
      case 'healthCheckPath':
      case 'apiBasePath':
        return value.startsWith('/');
      default:
        return true;
    }
  }

  /**
   * Generate display name from service name
   */
  generateDisplayName(serviceName) {
    return NameFormatters.toDisplayName(serviceName);
  }

  /**
   * Generate description based on service type
   */
  generateDescription(serviceType) {
    const descriptions = {
      'data-service': 'A comprehensive data service providing CRUD operations, search, filtering, and pagination capabilities',
      'auth-service': 'Authentication and authorization service with user management and security features',
      'content-service': 'Content management service with file storage, search, and delivery capabilities',
      'api-gateway': 'API gateway providing routing, rate limiting, authentication, and monitoring',
      'generic': 'A Clodo Framework service providing core functionality and extensibility'
    };
    return descriptions[serviceType] || descriptions.generic;
  }

  /**
   * Generate features based on service type
   */
  generateFeaturesForType(serviceType) {
    const baseFeatures = {
      logging: true,
      monitoring: true,
      errorReporting: true,
      metrics: true,
      healthChecks: true
    };

    const typeSpecificFeatures = {
      'data-service': {
        authentication: true,
        authorization: true,
        database: true,
        search: true,
        filtering: true,
        pagination: true,
        caching: true,
        backup: true
      },
      'auth-service': {
        authentication: true,
        authorization: true,
        userProfiles: true,
        emailNotifications: true,
        magicLinkAuth: true,
        passwordReset: true,
        sessionManagement: true,
        rateLimiting: true
      },
      'content-service': {
        fileStorage: true,
        search: true,
        filtering: true,
        pagination: true,
        caching: true,
        cdn: true,
        imageProcessing: true,
        metadata: true
      },
      'api-gateway': {
        authentication: true,
        authorization: true,
        rateLimiting: true,
        caching: true,
        monitoring: true,
        loadBalancing: true,
        requestRouting: true,
        responseTransformation: true
      },
      'generic': {
        extensibility: true,
        configuration: true,
        deployment: true
      }
    };

    return { ...baseFeatures, ...(typeSpecificFeatures[serviceType] || typeSpecificFeatures.generic) };
  }

  /**
   * Close readline interface
   */
  close() {
    if (this.rl) {
      this.rl.close();
    }
  }
}
