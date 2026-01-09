import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { WorkerIndexGenerator } from '../../../../src/service-management/generators/code/WorkerIndexGenerator.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('WorkerIndexGenerator', () => {
  let gen;
  let tmpDir;
  let servicePath;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `worker-gen-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    servicePath = path.join(tmpDir, 'services', 'test');
    await fs.mkdir(path.join(servicePath, 'src', 'worker'), { recursive: true });
    await fs.mkdir(path.join(servicePath, 'src', 'middleware'), { recursive: true });
    gen = new WorkerIndexGenerator();
  });

  afterEach(async () => {
    try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch (e) {}
  });

  it('generates worker index that supports middleware registry and composer', async () => {
    const coreInputs = { serviceName: 'test', serviceType: 'api', environment: 'development' };
    const confirmed = { displayName: 'Test', version: '1.0.0' };

    const filePath = await gen.generate(coreInputs, confirmed, servicePath);
    const expectedPath = path.join(servicePath, 'src', 'worker', 'index.js');

    const exists = await fs.access(expectedPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    const content = await fs.readFile(expectedPath, 'utf-8');
    expect(content).toContain("'../middleware/runtime.js'")
    expect(content).toContain("'../middleware/shared/index.js'")
    expect(content).toContain('registerMiddleware');
  });
});
