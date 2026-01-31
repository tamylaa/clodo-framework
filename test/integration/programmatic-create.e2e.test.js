import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createServiceProgrammatic } from '../../src/programmatic/createService.js';

describe('Programmatic createService E2E', () => {
  let tmpDir;
  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `prog-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch (e) {}
  });

  test('createService generates valid service and passes post-generation validation', async () => {
    const payload = {
      serviceName: 'e2e-service',
      serviceType: 'generic',
      domain: 'example.com',
      features: ['metrics']
    };

    const res = await createServiceProgrammatic(payload, { dryRun: true, outputDir: tmpDir });

    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(res.servicePath).toBeDefined();
    expect(res.validationReport).toBeDefined();
    expect(res.validationReport.valid).toBe(true);
  }, 20000);
});