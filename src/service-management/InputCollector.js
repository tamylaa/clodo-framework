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

export class InputCollector {
  constructor(options = {}) {
    this.interactive = options.interactive !== false;
    this.rl = this.interactive ? createInterface({
      input: process.stdin,
      output: process.stdout
    }) : null;
  }

  /**
   * Collect all 6 core inputs interactively
   */
  async collectCoreInputs() {
    const inputs = {};

    console.log(chalk.cyan('📝 Collecting Core Service Information'));
    console.log(chalk.white('These 6 inputs are required to create your Clodo service.\n'));

    // 1. Service Name
    inputs.serviceName = await this.collectServiceName();

    // 2. Service Type
    inputs.serviceType = await this.collectServiceType();

    // 3. Domain Name
    inputs.domainName = await this.collectDomainName();

    // 4. Cloudflare API Token
    inputs.cloudflareToken = await this.collectCloudflareToken();

    // 5. Cloudflare Account ID
    inputs.cloudflareAccountId = await this.collectCloudflareAccountId();

    // 6. Cloudflare Zone ID
    inputs.cloudflareZoneId = await this.collectCloudflareZoneId();

    // 7. Target Environment
    inputs.environment = await this.collectEnvironment();

    return inputs;
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
        return token;
      }

      console.log(chalk.red('✗ Invalid API token format.'));
    }
  }

  /**
   * Collect Cloudflare Account ID
   */
  async collectCloudflareAccountId() {
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
   * Collect Cloudflare Zone ID
   */
  async collectCloudflareZoneId() {
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