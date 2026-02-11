import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { WorkerIndexGenerator } from '../../../src/service-management/generators/code/WorkerIndexGenerator.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('WorkerIndexGenerator', () => {
  let gen;
  let tmpDir;
  let servicePath;

  beforeEach(async () => {
    // Use a more unique temp directory name to avoid conflicts with other tests
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}-${process.pid}-${Math.random().toString(36).slice(2)}`;
    tmpDir = path.join(os.tmpdir(), `worker-gen-${uniqueId}`);
    servicePath = path.join(tmpDir, 'services', 'test');
    await fs.mkdir(path.join(servicePath, 'src', 'worker'), { recursive: true });
    await fs.mkdir(path.join(servicePath, 'src', 'middleware'), { recursive: true });
    gen = new WorkerIndexGenerator();
  });

  afterEach(async () => {
    // Add a small delay to ensure file operations complete before cleanup
    await new Promise(resolve => setTimeout(resolve, 10));
    try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch (e) {}
  });

  it('generates worker index that supports middleware registry and composer', async () => {
    const coreInputs = { serviceName: 'test', serviceType: 'api', environment: 'development' };
    const confirmed = { displayName: 'Test', version: '1.0.0' };

    // Generate the file
    const filePath = await gen.generate({ coreInputs, confirmedValues: confirmed, servicePath });
    const expectedPath = path.join(servicePath, 'src', 'worker', 'index.js');

    // Verify the returned path is correct
    expect(filePath).toBe(expectedPath);

    // Add a delay to ensure file operations complete - increased for Windows file system
    await new Promise(resolve => setTimeout(resolve, 800));

    // Verify the file was created by reading it
    const content = await fs.readFile(expectedPath, 'utf-8');
    // New generator imports from the framework package, not local middleware files
    expect(content).toContain("from '@tamyla/clodo-framework'");
    expect(content).toContain('createEnhancedRouter');
    expect(content).toContain('composeMiddleware');
    expect(content).toContain('createEnvironmentGuard');
    expect(content).toContain('export default');
    expect(content).toContain('async fetch(request, env, ctx)');
  });
});
