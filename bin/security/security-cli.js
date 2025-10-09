#!/usr/bin/env node

import { SecurityCLI } from '../../src/security/SecurityCLI.js';

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  const cli = new SecurityCLI();

  switch (command) {
    case 'validate':
      const [customer, environment] = args;
      const result = await cli.validateConfiguration(customer, environment);
      if (result.valid) {
        console.log('✅ Security validation passed');
      } else {
        console.log('❌ Security issues found');
        result.securityIssues.forEach(issue => {
          console.log(`   ${issue.severity.toUpperCase()}: ${issue.message}`);
        });
      }
      process.exit(result.valid ? 0 : 1);
      break;

    case 'generate-key':
      const [type, lengthStr] = args;
      const length = lengthStr ? parseInt(lengthStr) : undefined;
      const keyResult = cli.generateKey(type, length);
      if (keyResult.success) {
        console.log(`Generated ${keyResult.type}: ${keyResult.key}`);
      } else {
        console.error(`Key generation failed: ${keyResult.error}`);
        process.exit(1);
      }
      break;

    case 'deploy':
      const [deployCustomer, deployEnvironment] = args;
      const dryRun = args.includes('--dry-run');
      const deployResult = await cli.deployWithSecurity(deployCustomer, deployEnvironment, { dryRun });
      if (deployResult.success) {
        console.log(`✅ Deployment ${dryRun ? 'validation' : 'completed'} successfully`);
      } else {
        console.error(`Deployment failed: ${deployResult.error}`);
        process.exit(1);
      }
      break;

    case 'generate-config':
      const [configCustomer, configEnvironment] = args;
      const configResult = cli.generateSecureConfig(configCustomer, configEnvironment);
      if (configResult.success) {
        console.log('Generated secure configuration:');
        console.log(JSON.stringify(configResult.config, null, 2));
      } else {
        console.error(`Config generation failed: ${configResult.error}`);
        process.exit(1);
      }
      break;

    case 'check-readiness':
      const [readyCustomer, readyEnvironment] = args;
      const readinessResult = cli.checkDeploymentReadiness(readyCustomer, readyEnvironment);
      if (readinessResult.ready) {
        console.log('✅ Deployment ready');
      } else {
        console.log('❌ Deployment not ready:');
        readinessResult.issues.forEach(issue => console.log(`   - ${issue}`));
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
}

main().catch(error => {
  console.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});