import { ConfigurationValidator } from '../security/ConfigurationValidator.js';
import { DeploymentManager } from '../security/DeploymentManager.js';
import { SecretGenerator } from '../security/SecretGenerator.js';

/**
 * Security Module for Clodo Framework
 * Provides comprehensive security validation and management
 */
export const securityModule = {
  name: 'security',
  version: '1.0.0',

  // Main security methods
  validate: (config, env) => ConfigurationValidator.validate(config, env),
  validateConfiguration: (customer, env) => ConfigurationValidator.validateConfiguration(customer, env),

  // Key generation
  generateSecureKey: (prefix) => SecretGenerator.generateSecureApiKey(32, prefix),
  generateSecureJwtSecret: (length) => SecretGenerator.generateSecureJwtSecret(length || 64),
  generateServiceKey: (serviceName, env, length) => SecretGenerator.generateServiceKey(serviceName, env, length),

  // Secure deployment
  deployWithSecurity: (options) => DeploymentManager.deployWithSecurity(options),
  generateSecureConfig: (customer, env) => DeploymentManager.generateSecureConfig(customer, env),
  validateDeploymentReadiness: (customer, env) => DeploymentManager.validateDeploymentReadiness(customer, env),

  // Pre-deployment hooks
  hooks: {
    'pre-deployment': async (context) => {
      const { config, environment, customer } = context;

      console.log(`🔒 Security validation for ${customer}/${environment}`);

      // Validate configuration
      const issues = ConfigurationValidator.validate(config, environment);
      const criticalIssues = issues.filter(i => i.severity === 'critical');

      if (criticalIssues.length > 0) {
        console.error('❌ Critical security issues detected:');
        criticalIssues.forEach(issue => {
          console.error(`   - ${issue.message}`);
          if (issue.key) console.error(`     Field: ${issue.key}`);
        });
        throw new Error('Deployment blocked due to critical security issues');
      }

      // Check deployment readiness
      const readiness = DeploymentManager.validateDeploymentReadiness(customer, environment);
      if (!readiness.ready) {
        console.error('❌ Deployment not ready:');
        readiness.issues.forEach(issue => console.error(`   - ${issue}`));
        throw new Error('Deployment blocked due to readiness issues');
      }

      console.log(`✅ Security validation passed (${issues.length} total issues, ${criticalIssues.length} critical)`);

      return {
        valid: true,
        issues,
        readiness
      };
    },

    'post-deployment': async (context) => {
      const { customer, environment } = context;

      console.log(`🔍 Post-deployment security checks for ${customer}/${environment}`);

      // Perform post-deployment validation
      try {
        await DeploymentManager.performPostDeploymentChecks(customer, environment);
        console.log(`✅ Post-deployment checks passed`);
      } catch (error) {
        console.error(`❌ Post-deployment checks failed: ${error.message}`);
        throw error;
      }
    }
  },

  // Utility methods
  utils: {
    calculateKeyEntropy: (key) => SecretGenerator.calculateEntropy(key),
    validateKeyStrength: (key, requirements) => SecretGenerator.validateKeyStrength(key, requirements),
    isValidEnvironment: (env) => {
      const { isValidEnvironment } = require('../security/patterns/environment-rules.js');
      return isValidEnvironment(env);
    }
  }
};

// Auto-register the security module if ModuleManager is available
try {
  const { moduleManager } = await import('../modules/ModuleManager.js');
  moduleManager.registerModule('security', securityModule);
  console.log('🔒 Security module registered with Clodo Framework');
} catch (error) {
  // ModuleManager not available, module will be registered manually
}