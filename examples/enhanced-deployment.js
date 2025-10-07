/**
 * LEGO Framework v3.0.3 - Enhanced Deployment Example
 *
 * This example demonstrates the new features in v3.0.3:
 * - Interactive deployment configuration
 * - Real HTTP-based health checks
 * - Enhanced error handling and reporting
 * - Improved security validation
 */

import {
  deployWithSecurity,
  ConfigurationManager as InteractiveDeploymentConfigurator,
  ErrorHandler
} from '../src/security/index.js';

/**
 * Example: Interactive Deployment Setup
 */
async function exampleInteractiveDeployment() {
  console.log('🚀 LEGO Framework v3.0.3 - Interactive Deployment Example\n');

  try {
    // Step 1: Interactive configuration setup
    console.log('Step 1: Configuration Setup');
    const config = await InteractiveDeploymentConfigurator.runConfigurationWizard({
      customer: 'example-customer',
      environment: 'staging'
    });

    console.log('✅ Configuration completed:', config);

    // Step 2: Secure deployment with real validation
    console.log('\nStep 2: Secure Deployment');
    await deployWithSecurity({
      customer: config.customer,
      environment: config.environment,
      deploymentUrl: InteractiveDeploymentConfigurator.generateDeploymentUrl(config),
      dryRun: config.dryRun,
      allowInsecure: config.allowInsecure
    });

    console.log('\n🎉 Deployment completed successfully!');

  } catch (error) {
    // Step 3: Enhanced error handling
    console.log('\nStep 3: Error Handling');
    ErrorHandler.handleDeploymentError(error, {
      customer: 'example-customer',
      environment: 'staging',
      phase: 'deployment'
    });

    // Get detailed error report
    const errorReport = ErrorHandler.createErrorReport(error, {
      customer: 'example-customer',
      phase: 'deployment'
    });

    console.log('\n📋 Error Report:', JSON.stringify(errorReport, null, 2));
  }
}

/**
 * Example: Programmatic Deployment Configuration
 */
async function exampleProgrammaticConfig() {
  console.log('🔧 Programmatic Configuration Example\n');

  // Use mock configuration data for demonstration
  const config = {
    customer: 'api-customer',
    environment: 'production',
    domain: 'api.example.com',
    enableSecurityValidation: true,
    runTests: true,
    dryRun: false,
    allowInsecure: false
  };

  // Validate configuration
  const validation = InteractiveDeploymentConfigurator.validateConfiguration(config);

  if (validation.valid) {
    console.log('✅ Configuration is valid');
    console.log('📋 Summary:', InteractiveDeploymentConfigurator.createConfigurationSummary(config));
  } else {
    console.log('❌ Configuration has errors:', validation.errors);
  }
}

/**
 * Example: Error Handling and Suggestions
 */
function exampleErrorHandling() {
  console.log('🛠️ Error Handling Example\n');

  // Simulate different types of errors
  const errors = [
    new Error('Health check failed: Connection timeout'),
    new Error('Authentication failed: Invalid token'),
    new Error('Validation failed: Missing required field')
  ];

  errors.forEach((error, index) => {
    console.log(`Error ${index + 1}: ${error.message}`);
    const suggestions = ErrorHandler.generateSuggestions(error, {
      customer: 'test-customer',
      environment: 'production'
    });
    console.log('💡 Suggestions:', suggestions);
    console.log('');
  });
}

// Run examples
async function runExamples() {
  console.log('='.repeat(60));
  console.log('LEGO FRAMEWORK v3.0.3 - ENHANCED FEATURES DEMO');
  console.log('='.repeat(60));

  await exampleProgrammaticConfig();
  console.log('\n' + '='.repeat(40));

  exampleErrorHandling();
  console.log('\n' + '='.repeat(40));

  console.log('💡 Interactive deployment example requires user input');
  console.log('   (Requires terminal with user interaction)');

  console.log('\n✨ Demo completed!');
}

// Export for use in other examples
export {
  exampleInteractiveDeployment,
  exampleProgrammaticConfig,
  exampleErrorHandling,
  runExamples
};

// Run examples directly
console.log('Starting LEGO Framework demo...');
runExamples().catch(console.error);