import { jest, describe, beforeEach, test, expect } from '@jest/globals';

// Mock ValidationHandler before importing programmatic API
await jest.unstable_mockModule('../src/service-management/handlers/ValidationHandler.js', () => ({
  ValidationHandler: jest.fn().mockImplementation(() => ({
    validateService: jest.fn().mockResolvedValue({ valid: false, issues: ['post-generation problem'] })
  }))
}));

const fs = await import('fs/promises');
const { createServiceProgrammatic } = await import('../src/programmatic/createService.js');

describe('ServiceOrchestrator - post-generation validation integration', () => {
  let tmpDir;
  beforeEach(async () => {
    const pathMod = await import('path');
    const osMod = await import('os');
    tmpDir = pathMod.join(osMod.tmpdir(), `prog-create-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    try { await fs.mkdir(tmpDir, { recursive: true }); } catch (e) {}
  });

  test('createService should fail when post-generation validation fails and force is not set', async () => {
    const payload = { serviceName: 'test-service-validate', serviceType: 'generic', domain: 'example.com' };

    const result = await createServiceProgrammatic(payload, { dryRun: true, outputDir: tmpDir });

    expect(result.success).toBe(false);
    expect(result.errors).toContain('post-generation problem');
  });

  test('createService should succeed when force=true even if post-validation fails', async () => {
    const payload = { serviceName: 'test-service-validate', serviceType: 'generic', domain: 'example.com' };

    const result = await createServiceProgrammatic(payload, { dryRun: true, outputDir: tmpDir, force: true });

    expect(result.success).toBe(true);
    expect(result.validationReport).toBeDefined();
  });
});