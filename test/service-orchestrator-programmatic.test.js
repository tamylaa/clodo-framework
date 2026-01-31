import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createServiceProgrammatic } from '../src/programmatic/createService.js';

describe('ServiceOrchestrator - Programmatic', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `prog-create-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch (e) {}
  });

  it('creates service programmatically (dry-run)', async () => {
    const payload = {
      serviceName: 'test-service-1',
      serviceType: 'generic',
      domain: 'example.com',
      features: ['metrics']
    };

    const result = await createServiceProgrammatic(payload, { dryRun: true, outputDir: tmpDir });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.servicePath).toBeDefined();
    expect(result.generatedFiles).toBeInstanceOf(Array);
  });
});