/**
 * Unit Tests for Enhanced Interactive Utils
 * Tests the enhanced interactive base improvements without requiring user input
 */

import { DeploymentInteractiveUtils } from '../bin/shared/utils/interactive-utils.js';

describe('Enhanced Interactive Utils', () => {
  let deployUtils;

  beforeEach(() => {
    deployUtils = new DeploymentInteractiveUtils({
      enableColors: true,
      enableProgress: true,
      validateInputs: true
    });
  });

  describe('DeploymentInteractiveUtils Class', () => {
    test('should instantiate with default configuration', () => {
      expect(deployUtils).toBeInstanceOf(DeploymentInteractiveUtils);
      expect(deployUtils.options.enableColors).toBe(true);
      expect(deployUtils.options.enableProgress).toBe(true);
      expect(deployUtils.options.validateInputs).toBe(true);
    });

    test('should have required methods', () => {
      expect(typeof deployUtils.askDeploymentMode).toBe('function');
      expect(typeof deployUtils.askDomain).toBe('function');
      expect(typeof deployUtils.askEnvironment).toBe('function');
      expect(typeof deployUtils.askEmail).toBe('function');
      expect(typeof deployUtils.askUrl).toBe('function');
    });
  });

  describe('Validation Rules', () => {
    test('should have domain validation rule', () => {
      const domainRule = deployUtils.validationRules.get('domain');
      expect(domainRule).toBeDefined();
      expect(domainRule.pattern).toBeDefined();
      expect(domainRule.message).toBeDefined();
    });

    test('should have email validation rule', () => {
      const emailRule = deployUtils.validationRules.get('email');
      expect(emailRule).toBeDefined();
      expect(emailRule.pattern).toBeDefined();
      expect(emailRule.message).toBeDefined();
    });

    test('should have URL validation rule', () => {
      const urlRule = deployUtils.validationRules.get('url');
      expect(urlRule).toBeDefined();
      expect(urlRule.pattern).toBeDefined();
      expect(urlRule.message).toBeDefined();
    });
  });

  describe('Configuration Management', () => {
    test('should handle configuration with disabled features', () => {
      const minimalUtils = new DeploymentInteractiveUtils({
        enableColors: false,
        enableProgress: false,
        validateInputs: false
      });

      expect(minimalUtils.options.enableColors).toBe(false);
      expect(minimalUtils.options.enableProgress).toBe(false);
      expect(minimalUtils.options.validateInputs).toBe(false);
    });
  });
});

describe('Interactive Utils Integration', () => {
  test('should export required functions', async () => {
    const { 
      askUser, 
      askYesNo, 
      askChoice, 
      DeploymentInteractiveUtils,
      startProgress,
      closePrompts 
    } = await import('../bin/shared/utils/interactive-utils.js');

    expect(typeof askUser).toBe('function');
    expect(typeof askYesNo).toBe('function');
    expect(typeof askChoice).toBe('function');
    expect(typeof DeploymentInteractiveUtils).toBe('function');
    expect(typeof startProgress).toBe('function');
    expect(typeof closePrompts).toBe('function');
  });

  test('should handle progress tracking initialization', async () => {
    const { startProgress, closePrompts } = await import('../bin/shared/utils/interactive-utils.js');
    
    const progressTracker = startProgress(3, 'Test Progress');
    expect(progressTracker).toBeDefined();
    expect(typeof progressTracker.nextStep).toBe('function');
    
    // Clean up
    closePrompts();
  });
});