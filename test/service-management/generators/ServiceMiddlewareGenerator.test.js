import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ServiceMiddlewareGenerator } from '../../../src/service-management/generators/code/ServiceMiddlewareGenerator.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('ServiceMiddlewareGenerator', () => {
  let gen;
  let tmpDir;
  let servicePath;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `svc-mw-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    servicePath = path.join(tmpDir, 'services', 'user-service');
    await fs.mkdir(servicePath, { recursive: true });
    gen = new ServiceMiddlewareGenerator();
  });

  afterEach(async () => {
    try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch (e) {}
  });

  it('generates a minimal middleware skeleton and registration helper', async () => {
    const coreInputs = { serviceName: 'user-service', serviceType: 'api', environment: 'development' };
    const confirmed = { displayName: 'User Service', version: '1.0.0', packageName: 'user-service' };

    const filePath = await gen.generate({ coreInputs, confirmedValues: confirmed, servicePath });
    expect(filePath).toBeDefined();

    const expectedPath = path.join(servicePath, 'src', 'middleware', 'service-middleware.js');
    const exists = await fs.access(expectedPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    const content = await fs.readFile(expectedPath, 'utf-8');
    expect(content).toContain('export default class');
    expect(content).toContain('registerMiddleware');

    const runtimePath = path.join(servicePath, 'src', 'middleware', 'runtime.js');
    expect(await fs.access(runtimePath).then(() => true).catch(() => false)).toBe(true);

    const sharedIndex = path.join(servicePath, 'src', 'middleware', 'shared', 'index.js');
    expect(await fs.access(sharedIndex).then(() => true).catch(() => false)).toBe(true);
  });

  it('generates legacy createServiceMiddleware when middlewareStrategy=legacy', async () => {
    const coreInputs = { serviceName: 'legacy-svc', serviceType: 'api', environment: 'development' };
    const confirmed = { displayName: 'Legacy Service', version: '1.0.0', packageName: 'legacy-svc' };

    const filePath = await gen.generate({ coreInputs, confirmedValues: confirmed, servicePath, middlewareStrategy: 'legacy' });
    const expectedPath = path.join(servicePath, 'src', 'middleware', 'service-middleware.js');
    const content = await fs.readFile(expectedPath, 'utf-8');

    expect(content).toContain('createServiceMiddleware');
    expect(content).toContain('processRequest');
    expect(content).toContain('processResponse');
  });
});
