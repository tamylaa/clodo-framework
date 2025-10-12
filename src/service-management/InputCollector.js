/**
 * InputCollector - Tier 1: Core Input Collection
 *
 * Collects the 6 absolutely required inputs for service creation:
 * 1. Service Name
 * 2. Service Type
 * 3. Domain Name
 * 4. Cloudflare API Token
 * 5. Cloudflare Account ID
 * 6. Cloudflare Zone ID
 * 7. Target Environment (derived but required)
 */

import { createInterface } from 'readline';
import chalk from 'chalk';
import { validateServiceName, validateDomainName } from '../utils/validation.js';
import { uiStructuresLoader } from '../utils/ui-structures-loader.js';

export class InputCollector {
  constructor(options = {}) {
    this.interactive = options.interactive !== false;
    
    // Fix for PowerShell double-echo issue
    const isPowerShell = process.env.PSModulePath !== undefined;
    
    this.rl = this.interactive ? createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: !isPowerShell // Disable terminal mode in PowerShell to prevent double echo
    }) : null;
  }

  /**
   * Collect all inputs using three-tier template-driven approach
   * Tier 1: 6 core inputs (required)
   * Tier 2: 15 smart confirmations (assumed, user can modify)
   * Tier 3: 67 automated generations (framework handles)
   */
  async collectInputsWithTransparency() {
    await uiStructuresLoader.loadTemplates();

    const result = {
      collectionMetadata: {
        method: 'three-tier-template-driven',
        timestamp: new Date().toISOString(),
        tiers: {
          core: 6,
          confirmable: 15,
          automated: 67
        }
      },
      coreInputs: {},
      smartConfirmations: {},
      automatedGenerations: {},
      userModifications: []
    };

    // Tier 1: Core Inputs (required from user)
    console.log(chalk.cyan('\n📝 Tier 1: Core Service Information'));
    console.log(chalk.white('These 6 inputs are required to create your service.\n'));

    const coreTemplate = uiStructuresLoader.getCoreInputsTemplate();
    if (!coreTemplate) {
      throw new Error('Core inputs template not found. Cannot proceed with input collection.');
    }
    if (coreTemplate) {
      for (const inputDef of coreTemplate.inputs) {
        const value = await this.collectInputFromDefinition(inputDef);
        result.coreInputs[inputDef.id] = {
          value,
          source: 'user-provided',
          required: true
        };
      }
    }

    // Tier 2: Smart Confirmations (framework assumptions, user can modify)
    console.log(chalk.cyan('\n🤔 Tier 2: Smart Confirmations'));
    console.log(chalk.white('Based on your core inputs, we\'ve made smart assumptions. Review and modify as needed.\n'));

    const confirmTemplate = uiStructuresLoader.getSmartConfirmableTemplate();
    if (confirmTemplate) {
      for (const category of confirmTemplate.categories) {
        console.log(chalk.yellow(`\n${category.title}`));
        console.log(chalk.gray(`${category.description}\n`));

        for (const inputId of category.inputs) {
          // Generate smart default based on core inputs
          const smartDefault = this.generateSmartDefault(inputId, result.coreInputs);
          const userValue = await this.confirmOrModifyValue(inputId, smartDefault);

          result.smartConfirmations[inputId] = {
            value: userValue,
            defaultAssumed: smartDefault,
            userModified: userValue !== smartDefault,
            source: userValue === smartDefault ? 'framework-assumed' : 'user-modified'
          };

          if (userValue !== smartDefault) {
            result.userModifications.push({
              field: inputId,
              assumed: smartDefault,
              chosen: userValue
            });
          }
        }
      }
    }

    // Tier 3: Automated Generation (show transparency)
    console.log(chalk.cyan('\n⚡ Tier 3: Automated Generation'));
    console.log(chalk.white('The following will be automatically generated from your inputs:\n'));

    const autoTemplate = uiStructuresLoader.getAutomatedGenerationTemplate();
    if (autoTemplate) {
      console.log(chalk.gray(`📊 ${autoTemplate.collectionStrategy.inputCount} configurations will be generated automatically`));
      console.log(chalk.gray(`⏱️ Estimated time: ${autoTemplate.template.estimatedTime}`));

      // Show some examples of what will be automated
      result.automatedGenerations = {
        count: autoTemplate.collectionStrategy.inputCount,
        estimatedTime: autoTemplate.template.estimatedTime,
        examples: [
          'Database connection strings',
          'Environment variables',
          'API endpoints',
          'Security configurations',
          'Deployment scripts'
        ]
      };
    }

    // Summary
    console.log(chalk.green('\n✅ Collection Complete!'));
    console.log(chalk.white(`Core inputs: ${Object.keys(result.coreInputs).length}`));
    console.log(chalk.white(`Smart confirmations: ${Object.keys(result.smartConfirmations).length}`));
    console.log(chalk.white(`Automated generations: ${result.automatedGenerations.count || 0}`));
    if (result.userModifications.length > 0) {
      console.log(chalk.yellow(`User modifications: ${result.userModifications.length}`));
    }

    return result;
  }

  /**
   * Generate smart defaults based on core inputs
   */
  generateSmartDefault(inputId, coreInputs) {
    const serviceName = coreInputs.serviceName?.value || '';
    const environment = coreInputs.environment?.value || 'development';
    const domainName = coreInputs.domainName?.value || '';

    switch (inputId) {
      case 'display-name':
        return serviceName ? serviceName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
      case 'description':
        return `A service built with CLODO Framework`;
      case 'version':
        return '1.0.0';
      case 'author':
        return 'CLODO Framework';
      case 'production-url':
        return domainName ? `https://api.${domainName}` : '';
      case 'staging-url':
        return domainName ? `https://staging-api.${domainName}` : '';
      case 'development-url':
        return domainName ? `https://dev-api.${domainName}` : '';
      case 'service-directory':
        return serviceName ? `./services/${serviceName}` : '';
      case 'database-name':
        return serviceName ? `${serviceName}-db` : '';
      case 'worker-name':
        return serviceName ? `${serviceName}-worker` : '';
      case 'log-level':
        return environment === 'production' ? 'warn' : environment === 'staging' ? 'info' : 'debug';
      case 'env-prefix':
        return environment === 'production' ? 'PROD_' : environment === 'staging' ? 'STAGING_' : 'DEV_';
      default:
        return '';
    }
  }

  /**
   * Allow user to confirm or modify a smart default
   */
  async confirmOrModifyValue(inputId, defaultValue) {
    console.log(chalk.blue(`❓ ${this.formatFieldName(inputId)}`));
    console.log(chalk.gray(`   Suggested: ${defaultValue}`));

    const answer = await this.question(`Press Enter to accept, or enter new value: `);
    return answer.trim() || defaultValue;
  }

  /**
   * Format field names for display
   */
  formatFieldName(inputId) {
    return inputId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Collect a single input based on UI definition
   */
  async collectInputFromDefinition(inputDef) {
    const { id, ui, validation, examples, followUp } = inputDef;

    // Display prompt
    console.log(chalk.blue(`❓ ${ui.label}`));
    if (ui.description) {
      console.log(chalk.gray(`   ${ui.description}`));
    }
    if (examples && examples.length > 0) {
      console.log(chalk.gray(`   Examples: ${examples.join(', ')}`));
    }

    for (;;) {
      const answer = await this.question(`${ui.placeholder || 'Enter value'}: `);

      // Basic validation
      if (validation) {
        if (validation.required && !answer) {
          console.log(chalk.red('❌ This field is required'));
          continue;
        }
        if (validation.minLength && answer.length < validation.minLength) {
          console.log(chalk.red(`❌ Minimum length: ${validation.minLength}`));
          continue;
        }
        if (validation.maxLength && answer.length > validation.maxLength) {
          console.log(chalk.red(`❌ Maximum length: ${validation.maxLength}`));
          continue;
        }
        if (validation.pattern && !new RegExp(validation.pattern).test(answer)) {
          console.log(chalk.red(`❌ ${validation.customMessage || 'Invalid format'}`));
          continue;
        }
      }

      // Follow-up message
      if (followUp) {
        const message = followUp.message.replace('{value}', answer);
        console.log(chalk.green(`✅ ${message}`));
        if (followUp.preview) {
          console.log(chalk.gray(`   ${followUp.preview.replace('{value}', answer)}`));
        }
      }

      return answer;
    }
  }

  /**
   * Promisified readline question
   */
  question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  /**
   * Validate core inputs (for non-interactive mode)
   */
  async validateCoreInputs(inputs) {
    const required = ['serviceName', 'serviceType', 'domainName', 'cloudflareToken', 'cloudflareAccountId', 'cloudflareZoneId', 'environment'];

    for (const field of required) {
      if (!inputs[field]) {
        throw new Error(`Missing required input: ${field}`);
      }
    }

    // Validate service name
    if (!validateServiceName(inputs.serviceName)) {
      throw new Error('Invalid service name format');
    }

    // Validate domain name
    if (!validateDomainName(inputs.domainName)) {
      throw new Error('Invalid domain name format');
    }

    // Validate service type
    const validTypes = ['data-service', 'auth-service', 'content-service', 'api-gateway', 'generic'];
    if (!validTypes.includes(inputs.serviceType)) {
      throw new Error(`Invalid service type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate environment
    const validEnvs = ['development', 'staging', 'production'];
    if (!validEnvs.includes(inputs.environment)) {
      throw new Error(`Invalid environment. Must be one of: ${validEnvs.join(', ')}`);
    }
  }

  /**
   * Collect service name with validation
   */
  async collectServiceName() {
    for (;;) {
      const name = await this.prompt('Service Name (lowercase, letters/numbers/hyphens only): ');

      if (validateServiceName(name)) {
        return name;
      }

      console.log(chalk.red('✗ Invalid service name. Use only lowercase letters, numbers, and hyphens.'));
    }
  }

  /**
   * Collect service type with menu
   */
  async collectServiceType() {
    const types = {
      'data-service': 'Data service with CRUD operations, search, and filtering',
      'auth-service': 'Authentication and authorization service',
      'content-service': 'Content management with file storage and search',
      'api-gateway': 'API gateway with rate limiting and routing',
      'generic': 'Basic service with core Clodo Framework features'
    };

    console.log(chalk.cyan('Available Service Types:'));
    Object.entries(types).forEach(([type, desc]) => {
      console.log(chalk.white(`  ${type}: ${desc}`));
    });
    console.log('');

    for (;;) {
      const type = await this.prompt('Service Type (default: generic): ', 'generic');

      if (Object.keys(types).includes(type)) {
        return type;
      }

      console.log(chalk.red('✗ Invalid service type. Choose from the list above.'));
    }
  }

  /**
   * Collect domain name with validation
   */
  async collectDomainName() {
    for (;;) {
      const domain = await this.prompt('Domain Name (e.g., my-service.com): ');

      if (validateDomainName(domain)) {
        return domain;
      }

      console.log(chalk.red('✗ Invalid domain name format.'));
    }
  }

  /**
   * Collect Cloudflare API token
   */
  async collectCloudflareToken() {
    console.log(chalk.yellow('Cloudflare Configuration:'));
    console.log(chalk.white('You can find your API token at: https://dash.cloudflare.com/profile/api-tokens'));
    console.log('');

    for (;;) {
      const token = await this.prompt('Cloudflare API Token: ');

      if (token && token.length > 20) { // Basic length validation
        // Verify token with CloudflareAPI
        try {
          const { CloudflareAPI } = await import('../utils/cloudflare/api.js');
          const cfApi = new CloudflareAPI(token);
          const isValid = await cfApi.verifyToken();
          
          if (isValid) {
            console.log(chalk.green('✓ API token verified successfully'));
            return token;
          }
        } catch (error) {
          console.log(chalk.red(`✗ Token verification failed: ${error.message}`));
          continue;
        }
      }

      console.log(chalk.red('✗ Invalid API token format.'));
    }
  }

  /**
   * Collect Cloudflare configuration with automatic domain discovery
   * Returns { accountId, zoneId, domainName }
   */
  async collectCloudflareConfigWithDiscovery(apiToken, preferredDomain = null) {
    try {
      const { CloudflareAPI } = await import('../utils/cloudflare/api.js');
      const { formatZonesForDisplay, parseZoneSelection } = await import('../utils/cloudflare/api.js');
      
      const cfApi = new CloudflareAPI(apiToken);
      
      console.log(chalk.cyan('\n🔍 Discovering your Cloudflare domains...'));
      const zones = await cfApi.listZones();
      
      if (!zones || zones.length === 0) {
        console.log(chalk.yellow('⚠️  No domains found in your Cloudflare account.'));
        console.log(chalk.white('Please add a domain to Cloudflare first.'));
        throw new Error('No domains available');
      }
      
      console.log(chalk.green(`✓ Found ${zones.length} domain(s)\n`));
      
      // Format zones for display
      const formatted = formatZonesForDisplay(zones);
      console.log(formatted);
      
      // Let user select a domain
      const selection = await this.prompt('\nSelect domain (enter number or name): ');
      const selectedZone = parseZoneSelection(selection, zones);
      
      if (!selectedZone) {
        throw new Error('Invalid domain selection');
      }
      
      console.log(chalk.green(`\n✓ Selected: ${selectedZone.name}`));
      
      // Get full zone details
      const zoneDetails = await cfApi.getZoneDetails(selectedZone.id);
      
      return {
        domainName: zoneDetails.name,
        zoneId: zoneDetails.id,
        accountId: zoneDetails.account.id,
        accountName: zoneDetails.account.name,
        nameServers: zoneDetails.name_servers,
        status: zoneDetails.status
      };
      
    } catch (error) {
      console.log(chalk.red(`\n✗ Domain discovery failed: ${error.message}`));
      console.log(chalk.yellow('Falling back to manual entry...\n'));
      
      // Fallback to manual entry
      return {
        accountId: await this.collectCloudflareAccountIdManual(),
        zoneId: await this.collectCloudflareZoneIdManual(),
        domainName: preferredDomain
      };
    }
  }

  /**
   * Manual Cloudflare Account ID collection (fallback)
   */
  async collectCloudflareAccountIdManual() {
    console.log(chalk.white('Find your Account ID in the right sidebar of your Cloudflare dashboard.'));
    console.log('');

    for (;;) {
      const accountId = await this.prompt('Cloudflare Account ID: ');

      if (accountId && /^[a-f0-9]{32}$/i.test(accountId)) { // 32 hex chars
        return accountId;
      }

      console.log(chalk.red('✗ Invalid Account ID format (should be 32 hexadecimal characters).'));
    }
  }

  /**
   * Manual Cloudflare Zone ID collection (fallback)
   */
  async collectCloudflareZoneIdManual() {
    console.log(chalk.white('Find your Zone ID in the Overview tab of your domain in Cloudflare.'));
    console.log('');

    for (;;) {
      const zoneId = await this.prompt('Cloudflare Zone ID: ');

      if (zoneId && /^[a-f0-9]{32}$/i.test(zoneId)) { // 32 hex chars
        return zoneId;
      }

      console.log(chalk.red('✗ Invalid Zone ID format (should be 32 hexadecimal characters).'));
    }
  }

  /**
   * Collect Cloudflare Account ID (kept for backward compatibility)
   * @deprecated Use collectCloudflareConfigWithDiscovery instead
   */
  async collectCloudflareAccountId() {
    return this.collectCloudflareAccountIdManual();
  }

  /**
   * Collect Cloudflare Zone ID (kept for backward compatibility)
   * @deprecated Use collectCloudflareConfigWithDiscovery instead
   */
  async collectCloudflareZoneId() {
    return this.collectCloudflareZoneIdManual();
  }

  /**
   * Collect target environment
   */
  async collectEnvironment() {
    const environments = {
      'development': 'Local development environment',
      'staging': 'Staging environment for testing',
      'production': 'Production environment for live services'
    };

    console.log(chalk.cyan('Target Environment:'));
    Object.entries(environments).forEach(([env, desc]) => {
      console.log(chalk.white(`  ${env}: ${desc}`));
    });
    console.log('');

    for (;;) {
      const env = await this.prompt('Environment (default: development): ', 'development');

      if (Object.keys(environments).includes(env)) {
        return env;
      }

      console.log(chalk.red('✗ Invalid environment. Choose from development, staging, or production.'));
    }
  }

  /**
   * Prompt user for input (interactive mode)
   */
  async prompt(question, defaultValue = '') {
    if (!this.interactive) {
      throw new Error('Cannot prompt in non-interactive mode');
    }

    return new Promise((resolve) => {
      const promptText = defaultValue ? `${question}(default: ${defaultValue}) ` : question;
      this.rl.question(promptText, (answer) => {
        resolve(answer || defaultValue);
      });
    });
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