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
import { NameFormatters, UrlFormatters, ResourceFormatters } from '../../bin/shared/utils/Formatters.js';

// Assessment capabilities moved to @tamyla/clodo-orchestration (professional edition)

export class InputCollector {
  constructor(options = {}) {
    this.interactive = options.interactive !== false;
    this.isPowerShell = process.env.PSModulePath !== undefined;
    
    // Don't create readline immediately - lazy initialize
    this.rl = null;
    this.options = options;
  }

  /**
   * Ensure readline is initialized and healthy
   * Creates new instance if needed (e.g., after password input corrupted state)
   */
  ensureReadline() {
    if (!this.rl || this.rl.closed) {
      // Fix for PowerShell double-echo issue
      this.rl = this.interactive ? createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: !this.isPowerShell // Disable terminal mode in PowerShell
      }) : null;
    }
    return this.rl;
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

        // Assessment moved to professional edition (@tamyla/clodo-orchestration)
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
      console.log(chalk.gray(`📊 ${autoTemplate.template.inputCount} configurations will be generated automatically`));
      console.log(chalk.gray(`⏱️ Estimated time: ${autoTemplate.template.estimatedTime}`));

      // Show some examples of what will be automated
      result.automatedGenerations = {
        count: autoTemplate.template.inputCount,
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
    const serviceName = (coreInputs['service-name']?.value || coreInputs.serviceName?.value || '');
    const environment = (coreInputs['environment']?.value || coreInputs.environment?.value || 'development');
    const domainName = (coreInputs['domain-name']?.value || coreInputs.domainName?.value || '');
    const serviceType = (coreInputs['service-type']?.value || coreInputs.serviceType?.value || '');
    const customerName = (coreInputs['customer-name']?.value || coreInputs.customerName?.value || '');
    const cloudflareToken = (coreInputs['cloudflare-api-token']?.value || coreInputs.cloudflareApiToken?.value || '');

    switch (inputId) {
      case 'display-name':
        return serviceName ? NameFormatters.toDisplayName(serviceName) : '';
      case 'description':
        return `A service built with CLODO Framework`;
      case 'version':
        return '1.0.0';
      case 'author':
        return 'CLODO Framework';
      case 'production-url':
        return domainName && serviceName ? UrlFormatters.buildProductionUrl(serviceName, domainName) : '';
      case 'staging-url':
        return domainName && serviceName ? UrlFormatters.buildStagingUrl(serviceName, domainName) : '';
      case 'development-url':
        return domainName && serviceName ? UrlFormatters.buildDevUrl(serviceName, domainName) : '';
      case 'service-directory':
        return serviceName ? `./services/${serviceName}` : '';
      case 'database-name':
        return serviceName ? ResourceFormatters.databaseName(serviceName) : '';
      case 'worker-name':
        return serviceName ? ResourceFormatters.workerName(serviceName) : '';
      case 'log-level':
        return environment === 'production' ? 'warn' : environment === 'staging' ? 'info' : 'debug';
      case 'cors-policy':
        return domainName ? `https://${domainName}` : '*';
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
    return NameFormatters.toDisplayName(inputId);
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
   * Promisified readline question with timeout protection
   * Automatically recreates readline if needed
   */
  question(prompt, timeout = 120000) {
    return new Promise((resolve, reject) => {
      const rl = this.ensureReadline();
      
      if (!rl) {
        reject(new Error('Readline interface not initialized - running in non-interactive mode?'));
        return;
      }
      
      // Verify stdin is readable
      if (!process.stdin.readable) {
        reject(new Error('stdin not readable - terminal may be in broken state'));
        return;
      }
      
      // Set timeout to detect hangs (default 2 minutes)
      const timer = setTimeout(() => {
        console.log(chalk.red('\n\n⚠️  Input timeout - readline may be blocked'));
        console.log(chalk.yellow('This can happen in some terminal environments.'));
        console.log(chalk.white('Try running with explicit parameters: npx clodo-service deploy --customer=NAME --env=ENV\n'));
        reject(new Error('Input timeout after ' + (timeout / 1000) + ' seconds'));
      }, timeout);
      
      rl.question(prompt, (answer) => {
        clearTimeout(timer);
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
   * Collect Cloudflare API token (securely, hidden input)
   */
  async collectCloudflareToken() {
    console.log(chalk.yellow('Cloudflare Configuration:'));
    console.log(chalk.white('You can find your API token at: https://dash.cloudflare.com/profile/api-tokens'));
    console.log('');

    for (;;) {
      // Use secure password input to hide token from terminal history
      const { askPassword } = await import('../utils/interactive-prompts.js');
      const token = await askPassword('Cloudflare API Token (hidden)');

      if (token && token.length > 20) { // Basic length validation
        // Verify token with CloudflareAPI
        try {
          const { CloudflareAPI } = await import('../utils/cloudflare/api.js');
          const cfApi = new CloudflareAPI(token);
          const tokenCheck = await cfApi.verifyToken();

          if (tokenCheck.valid) {
            // Check D1 permissions
            const permissionCheck = await cfApi.checkD1Permissions();
            if (!permissionCheck.hasPermission) {
              console.log(chalk.yellow(`⚠️  ${permissionCheck.error}`));
              console.log(chalk.white('   💡 You can update permissions at: https://dash.cloudflare.com/profile/api-tokens'));
              console.log(chalk.white('   💡 Or continue and the framework will fall back to OAuth authentication'));
              console.log('');

              const { askYesNo } = await import('../utils/interactive-prompts.js');
              const continueAnyway = await askYesNo('Continue with limited API token permissions?', false);

              if (!continueAnyway) {
                console.log(chalk.blue('Please update your API token permissions and try again.'));
                process.exit(0);
              }

              console.log(chalk.yellow('⚠️  Proceeding with limited permissions - database operations will use OAuth'));
            }

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
      
      let selectedZone;
      
      // Auto-select if only one domain
      if (zones.length === 1) {
        selectedZone = zones[0];
        console.log(chalk.white(`  1. ✅ ${zones[0].name} (${zones[0].plan?.name || 'Free'}) - Account: ${zones[0].account?.name || 'N/A'}`));
        console.log(chalk.green(`\n✓ Auto-selected: ${selectedZone.name} (only domain available)\n`));
      } else {
        // Format zones for display
        const formatted = formatZonesForDisplay(zones);
        formatted.forEach((line, index) => {
          console.log(chalk.white(`  ${index + 1}. ${line}`));
        });
        
        // Let user select a domain
        const selection = await this.prompt('\nSelect domain (enter number or name): ');
        const selectedIndex = parseZoneSelection(selection, zones);
        
        if (selectedIndex === -1) {
          throw new Error('Invalid domain selection');
        }
        
        selectedZone = zones[selectedIndex];
        console.log(chalk.green(`\n✓ Selected: ${selectedZone.name}`));
      }
      
      // Get full zone details
      const zoneDetails = await cfApi.getZoneDetails(selectedZone.id);
      
      return {
        domainName: zoneDetails.name,
        zoneId: zoneDetails.id,
        accountId: zoneDetails.accountId,  // Already flattened in getZoneDetails response
        accountName: zoneDetails.accountName,
        nameServers: zoneDetails.nameServers,
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
   * Close readline interface and clean up
   */
  close() {
    if (this.rl && !this.rl.closed) {
      this.rl.close();
      this.rl = null; // Clear reference so ensureReadline() can create new one if needed
    }
  }

  /**
   * Collect inputs and return full three-tier result
   * Used by CLI for comprehensive service operations
   */
  async collect() {
    const result = await this.collectInputsWithTransparency();
    
    // For CLI compatibility, also provide flat coreInputs
    const flatCoreInputs = {};
    for (const [key, inputObj] of Object.entries(result.coreInputs)) {
      flatCoreInputs[key] = inputObj.value;
    }
    
    // Merge smart confirmations into flat object
    for (const [key, value] of Object.entries(result.smartConfirmations)) {
      flatCoreInputs[key] = value;
    }
    
    return {
      ...result,
      flatInputs: flatCoreInputs
    };
  }
}