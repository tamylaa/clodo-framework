#!/usr/bin/env node

import { ConfigurationValidator } from '../../src/security/ConfigurationValidator.js';
import { SecretGenerator } from '../../src/security/SecretGenerator.js';
import { DeploymentManager } from '../../src/security/DeploymentManager.js';

const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'validate':
    const [customer, environment] = args;
    if (!customer || !environment) {
      console.error('Usage: lego-security validate <customer> <environment>');
      process.exit(1);
    }

    try {
      const result = ConfigurationValidator.validateConfiguration(customer, environment);
      if (result.valid) {
        console.log('✅ Security validation passed');
      } else {
        console.log('❌ Security issues found');
        result.securityIssues.forEach(issue => {
          console.log(`   ${issue.severity.toUpperCase()}: ${issue.message}`);
        });
      }
      process.exit(result.valid ? 0 : 1);
    } catch (error) {
      console.error(`Validation failed: ${error.message}`);
      process.exit(1);
    }
    break;

  case 'generate-key':
    const [type, lengthStr] = args;
    const length = lengthStr ? parseInt(lengthStr) : undefined;

    if (type === 'jwt') {
      const key = SecretGenerator.generateSecureJwtSecret(length);
      console.log(`Generated JWT secret: ${key}`);
    } else {
      const prefix = type && type !== 'api' ? type : '';
      const key = SecretGenerator.generateSecureApiKey(length || 32, prefix);
      console.log(`Generated API key: ${key}`);
    }
    break;

  case 'deploy':
    const [deployCustomer, deployEnvironment] = args;
    if (!deployCustomer || !deployEnvironment) {
      console.error('Usage: lego-security deploy <customer> <environment> [--dry-run]');
      process.exit(1);
    }

    const dryRun = args.includes('--dry-run');

    try {
      await DeploymentManager.deployWithSecurity({
        customer: deployCustomer,
        environment: deployEnvironment,
        dryRun
      });
    } catch (error) {
      console.error(`Deployment failed: ${error.message}`);
      process.exit(1);
    }
    break;

  case 'generate-config':
    const [configCustomer, configEnvironment] = args;
    if (!configCustomer || !configEnvironment) {
      console.error('Usage: lego-security generate-config <customer> <environment>');
      process.exit(1);
    }

    try {
      const config = DeploymentManager.generateSecureConfig(configCustomer, configEnvironment);
      console.log('Generated secure configuration:');
      console.log(JSON.stringify(config, null, 2));
    } catch (error) {
      console.error(`Config generation failed: ${error.message}`);
      process.exit(1);
    }
    break;

  case 'check-readiness':
    const [readyCustomer, readyEnvironment] = args;
    if (!readyCustomer || !readyEnvironment) {
      console.error('Usage: lego-security check-readiness <customer> <environment>');
      process.exit(1);
    }

    try {
      const result = DeploymentManager.validateDeploymentReadiness(readyCustomer, readyEnvironment);
      if (result.ready) {
        console.log('✅ Deployment ready');
      } else {
        console.log('❌ Deployment not ready:');
        result.issues.forEach(issue => console.log(`   - ${issue}`));
        process.exit(1);
      }
    } catch (error) {
      console.error(`Readiness check failed: ${error.message}`);
      process.exit(1);
    }
    break;

  default:
    console.log('Lego Framework Security CLI');
    console.log('');
    console.log('Commands:');
    console.log('  validate <customer> <environment>    - Validate configuration security');
    console.log('  generate-key [type] [length]         - Generate secure key (api/jwt)');
    console.log('  deploy <customer> <environment>      - Deploy with security validation');
    console.log('  generate-config <customer> <env>     - Generate secure configuration');
    console.log('  check-readiness <customer> <env>     - Check deployment readiness');
    console.log('');
    console.log('Examples:');
    console.log('  lego-security validate tamyla production');
    console.log('  lego-security generate-key jwt 64');
    console.log('  lego-security generate-key content-skimmer');
    console.log('  lego-security deploy tamyla staging --dry-run');
    break;
}