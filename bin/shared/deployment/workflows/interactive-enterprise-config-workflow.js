// Interactive Enterprise Configuration Workflow
// Handles interactive configuration of enterprise features

import { askYesNo, askChoice } from '../../../shared/utils/interactive-prompts.js';

/**
 * Interactive workflow for configuring enterprise features
 */
export class InteractiveEnterpriseConfigWorkflow {
  constructor(options = {}) {
    this.interactive = options.interactive !== false;
  }

  /**
   * Configure all enterprise features interactively
   * 
   * @param {Object} config - Deployment configuration to update
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} Updated configuration
   */
  async configureEnterpriseFeatures(config, options = {}) {
    console.log('\n⚙️  Enterprise Step 3: Enterprise Feature Configuration');
    console.log('====================================================');

    const enableAdvanced = await askYesNo(
      'Enable advanced enterprise features? (Recommended for production)',
      options.defaultEnableAdvanced || 'y'
    );

    if (enableAdvanced) {
      await this.configureAdvancedFeatures(config, options);
    } else {
      console.log('\n✅ Using standard enterprise configuration');
    }

    return config;
  }

  /**
   * Configure advanced enterprise features
   * 
   * @param {Object} config - Deployment configuration to update
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} Updated configuration
   */
  async configureAdvancedFeatures(config, options = {}) {
    console.log('\n🚀 Advanced Enterprise Features');
    console.log('-------------------------------');

    // Validation level
    const validationLevels = ['Basic', 'Standard', 'Comprehensive (Recommended)'];
    const validationChoice = await askChoice(
      'Select validation level:', 
      validationLevels, 
      options.defaultValidationLevel || 2
    );
    config.deployment.validationLevel = ['basic', 'standard', 'comprehensive'][validationChoice];

    // Audit level  
    const auditLevels = ['Minimal', 'Standard', 'Detailed (Recommended)', 'Verbose'];
    const auditChoice = await askChoice(
      'Select audit logging level:', 
      auditLevels, 
      options.defaultAuditLevel || 2
    );
    config.deployment.auditLevel = ['minimal', 'standard', 'detailed', 'verbose'][auditChoice];

    // Production testing
    config.deployment.runTests = await askYesNo(
      'Enable comprehensive production testing?', 
      options.defaultRunTests || 'y'
    );

    // Cross-domain features (if applicable)
    if (config.deploymentMode !== 'single') {
      config.secrets.crossDomainSharing = await askYesNo(
        'Enable cross-domain secret sharing?', 
        options.defaultCrossDomainSharing || 'n'
      );
    }

    console.log('\n✅ Advanced features configured');

    return config;
  }

  /**
   * Get configuration summary
   * 
   * @param {Object} config - Deployment configuration
   * @returns {string} Configuration summary
   */
  getSummary(config) {
    const lines = [
      '📊 Enterprise Configuration Summary:',
      `   🔍 Validation Level: ${config.deployment.validationLevel}`,
      `   📋 Audit Level: ${config.deployment.auditLevel}`,
      `   🧪 Production Testing: ${config.deployment.runTests ? 'Enabled' : 'Disabled'}`
    ];

    if (config.deploymentMode !== 'single') {
      lines.push(`   🌐 Cross-Domain Sharing: ${config.secrets.crossDomainSharing ? 'Enabled' : 'Disabled'}`);
    }

    return lines.join('\n');
  }

  /**
   * Configure features non-interactively
   * 
   * @param {Object} config - Deployment configuration
   * @param {Object} presets - Preset configuration values
   * @returns {Object} Updated configuration
   */
  configureNonInteractive(config, presets = {}) {
    config.deployment.validationLevel = presets.validationLevel || 'comprehensive';
    config.deployment.auditLevel = presets.auditLevel || 'detailed';
    config.deployment.runTests = presets.runTests !== false;
    
    if (config.deploymentMode !== 'single') {
      config.secrets.crossDomainSharing = presets.crossDomainSharing || false;
    }

    return config;
  }

  /**
   * Validate configuration
   * 
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  validateConfiguration(config) {
    const errors = [];
    const warnings = [];

    // Validate validation level
    const validValidationLevels = ['basic', 'standard', 'comprehensive'];
    if (!validValidationLevels.includes(config.deployment.validationLevel)) {
      errors.push(`Invalid validation level: ${config.deployment.validationLevel}`);
    }

    // Validate audit level
    const validAuditLevels = ['minimal', 'standard', 'detailed', 'verbose'];
    if (!validAuditLevels.includes(config.deployment.auditLevel)) {
      errors.push(`Invalid audit level: ${config.deployment.auditLevel}`);
    }

    // Warnings for potentially risky configurations
    if (config.deployment.validationLevel === 'basic') {
      warnings.push('Basic validation level may miss critical issues');
    }

    if (!config.deployment.runTests) {
      warnings.push('Production testing is disabled - deployment issues may not be detected');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
