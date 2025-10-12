import { ConfigurationValidator } from '../security/ConfigurationValidator.js';
// DeploymentManager removed - was simulated deployment only
// Use MultiDomainOrchestrator for real deployments
import { SecretGenerator } from '../security/SecretGenerator.js';
import { isValidEnvironment } from '../security/patterns/environment-rules.js';

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

  // Secure deployment (DEPRECATED)
  deployWithSecurity: () => {
    throw new Error('deployWithSecurity is deprecated. Use MultiDomainOrchestrator for real deployments.');
  },
  generateSecureConfig: () => {
    throw new Error('generateSecureConfig is deprecated. Use UnifiedConfigManager for configuration.');
  },
  validateDeploymentReadiness: () => {
    throw new Error('validateDeploymentReadiness is deprecated. Use MultiDomainOrchestrator validation.');
  },

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

      // Check deployment readiness (DEPRECATED - commented out)
      // Use MultiDomainOrchestrator's validation instead
      console.log('⚠️  DeploymentManager readiness check skipped (deprecated)');
      
      console.log(`✅ Security validation passed (${issues.length} total issues, ${criticalIssues.length} critical)`);

      return {
        valid: true,
        issues
      };
    },

    'post-deployment': async (context) => {
      const { customer, environment } = context;

      console.log(`🔍 Post-deployment security checks for ${customer}/${environment}`);

      // Perform post-deployment validation (DEPRECATED - commented out)
      // DeploymentManager.performPostDeploymentChecks was simulated only
      console.log('⚠️  Post-deployment checks skipped (DeploymentManager deprecated)');
      console.log(`✅ Post-deployment phase complete`);
      
      return {
        success: true,
        message: 'Post-deployment phase complete (DeploymentManager checks deprecated)'
      };
    }
  },

  // Utility methods
  utils: {
    calculateKeyEntropy: (key) => SecretGenerator.calculateEntropy(key),
    validateKeyStrength: (key, requirements) => SecretGenerator.validateKeyStrength(key, requirements),
    isValidEnvironment: (env) => isValidEnvironment(env)
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