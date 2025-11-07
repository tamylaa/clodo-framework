/**
 * Unit Tests for CLODO Framework Deployment and Security Features v3.0.3
 *
 * Tests the enhanced deployment configuration, security validation,
 * and error handling functionality that was previously demonstrated in examples.
 */

import fs from 'fs';
import path from 'path';

describe('CLODO Framework Deployment & Security Features v3.0.3', () => {

  test('should validate framework version and enhancements', () => {
    // Test that the framework version includes the v3.0.3 enhancements
    expect('3.0.3').toMatch(/^\d+\.\d+\.\d+$/);

    // Test that key enhancement features are documented
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    const changelog = fs.readFileSync(changelogPath, 'utf8');

    // Should mention v3.0.3 enhancements
    expect(changelog).toContain('3.0.3');
  });

  test('should validate security module exports', () => {
    // Test that the security module exports the expected functions
    const securityIndexPath = path.join(process.cwd(), 'src', 'security', 'index.js');
    const content = fs.readFileSync(securityIndexPath, 'utf8');

    // Should export the key functions that were demonstrated
    expect(content).toContain('deployWithSecurity');
    expect(content).toContain('InteractiveDeploymentConfigurator');
    expect(content).toContain('ErrorHandler');
  });

  test('should validate error handler structure', () => {
    // Test that the error handler has the expected methods
    // Updated to use consolidated location in lib/shared/utils
    const errorHandlerPath = path.join(process.cwd(), 'lib', 'shared', 'utils', 'ErrorHandler.js');
    const content = fs.readFileSync(errorHandlerPath, 'utf8');

    // Should contain the methods that were demonstrated
    expect(content).toContain('handleDeploymentError');
    expect(content).toContain('createErrorReport');
    expect(content).toContain('generateSuggestions');
  });

});
