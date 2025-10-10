#!/usr/bin/env node

/**
 * Test Enhanced Interactive Utils
 * Quick test to verify the enhanced interactive base improvements
 */

import { 
  askUser, 
  askYesNo, 
  askChoice, 
  DeploymentInteractiveUtils,
  startProgress,
  closePrompts 
} from '../shared/utils/interactive-utils.js';

async function testEnhancedInteractiveUtils() {
  console.log('🧪 Testing Enhanced Interactive Utils v2.0.0');
  console.log('============================================');

  try {
    // Test progress tracking
    const progressTracker = startProgress(5, 'Starting Interactive Tests');

    // Test enhanced yes/no with colors
    progressTracker.nextStep('Testing Enhanced Yes/No Prompts');
    const continueTest = await askYesNo('Continue with interactive utils test?', 'y');
    
    if (!continueTest) {
      console.log('Test cancelled by user');
      return;
    }

    // Test deployment interactive utilities
    progressTracker.nextStep('Testing Deployment-Specific Utilities');
    const deployUtils = new DeploymentInteractiveUtils({
      enableColors: true,
      enableProgress: true,
      validateInputs: true
    });

    // Test deployment mode selection
    progressTracker.nextStep('Testing Deployment Mode Selection');
    console.log('\n🎯 Testing Enhanced Deployment Mode Selection:');
    const deploymentMode = await deployUtils.askDeploymentMode(0);
    console.log(`Selected mode: ${deploymentMode}`);

    // Test domain validation
    progressTracker.nextStep('Testing Domain Validation');
    console.log('\n🌐 Testing Domain Validation:');
    const testDomain = await deployUtils.askDomain('Enter a test domain (e.g., "testcorp")');
    console.log(`Valid domain entered: ${testDomain}`);

    // Test environment selection with warnings
    progressTracker.nextStep('Testing Environment Selection');
    console.log('\n🌍 Testing Environment Selection with Warnings:');
    const environment = await deployUtils.askEnvironment(2); // Default to development
    console.log(`Selected environment: ${environment}`);

    console.log('\n🎉 Enhanced Interactive Utils Test Completed Successfully!');
    console.log('Features tested:');
    console.log('  ✅ Progress tracking with visual progress bars');
    console.log('  ✅ Enhanced prompts with color formatting');
    console.log('  ✅ Input validation with retry logic');
    console.log('  ✅ Deployment-specific utilities');
    console.log('  ✅ Environment warnings and confirmations');

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  } finally {
    closePrompts();
  }
}

// Run the test
if (process.argv[1] && import.meta.url.includes(process.argv[1].replace(/\\\\/g, '/'))) {
  testEnhancedInteractiveUtils().catch(console.error);
}

export { testEnhancedInteractiveUtils };