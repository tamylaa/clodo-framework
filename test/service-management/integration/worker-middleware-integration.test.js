import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ServiceMiddlewareGenerator } from '../../../src/service-management/generators/code/ServiceMiddlewareGenerator.js';
import { WorkerIndexGenerator } from '../../../src/service-management/generators/code/WorkerIndexGenerator.js';
import { pathToFileURL } from 'url';

async function writeDomains(servicePath, serviceName) {
  const dir = path.join(servicePath, 'src', 'config');
  await fs.mkdir(dir, { recursive: true });
  const content = `export const domains = { '${serviceName}': { name: '${serviceName}', corsPolicy: '*', logLevel: 'info' } };\n`;
  await fs.writeFile(path.join(dir, 'domains.js'), content, 'utf-8');
}

async function writeHandlers(servicePath) {
  const dir = path.join(servicePath, 'src', 'handlers');
  await fs.mkdir(dir, { recursive: true });
  const content = `export function createServiceHandlers() { return { handleRequest: async (req) => new Response(JSON.stringify({handled: true, url: new URL(req.url).pathname}), { status: 200, headers: { 'Content-Type': 'application/json' } }) } }\n`;
  await fs.writeFile(path.join(dir, 'service-handlers.js'), content, 'utf-8');
}

describe('Worker integration (middleware)', () => {
  let tmpDir;
  let servicePath;
  let smg;
  let wig;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `worker-mw-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    servicePath = path.join(tmpDir, 'services', 'test-svc');
    await fs.mkdir(servicePath, { recursive: true });
    smg = new ServiceMiddlewareGenerator();
    wig = new WorkerIndexGenerator();
  });

  afterEach(async () => {
    try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch (e) {}
  });

  it('executes contract-style middleware registration and handler', async () => {
    const coreInputs = { serviceName: 'test-svc', serviceType: 'api', environment: 'development' };
    const confirmed = { displayName: 'Test Svc', version: '1.0.0', packageName: 'test-svc', apiBasePath: '/api' };

    // Generate contract middleware and runtime
    await smg.generate({ coreInputs, confirmedValues: confirmed, servicePath, middlewareStrategy: 'contract' });

    // Add minimal domains and handlers for runtime
    await writeDomains(servicePath, 'test-svc');
    await writeHandlers(servicePath);

    // Generate worker index
    await wig.generate({ coreInputs, confirmedValues: confirmed, servicePath });

    // Import generated worker module and invoke fetch
    const workerModule = await import(pathToFileURL(path.join(servicePath, 'src', 'worker', 'index.js')).href);
    const req = new Request('https://example.com/api/hello', { method: 'GET' });
    let workerExport = workerModule.default;
    if (workerExport && workerExport.default && typeof workerExport.fetch !== 'function' && typeof workerExport.default.fetch === 'function') {
      workerExport = workerExport.default;
    }
    const res = await workerExport.fetch(req, {}, {});

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.handled).toBe(true);
    expect(body.url).toBe('/api/hello');
  });

  it('executes legacy factory middleware via adapter and handler', async () => {
    const coreInputs = { serviceName: 'test-svc', serviceType: 'api', environment: 'development' };
    const confirmed = { displayName: 'Test Svc Legacy', version: '1.0.0', packageName: 'test-svc', apiBasePath: '/api' };

    // Generate legacy middleware
    await smg.generate({ coreInputs, confirmedValues: confirmed, servicePath, middlewareStrategy: 'legacy' });

    // Add minimal domains and handlers for runtime
    await writeDomains(servicePath, 'test-svc');
    await writeHandlers(servicePath);

    // Generate worker index
    await wig.generate({ coreInputs, confirmedValues: confirmed, servicePath });

    // Import generated worker module and invoke fetch
    const workerModule = await import(pathToFileURL(path.join(servicePath, 'src', 'worker', 'index.js')).href);
    const req = new Request('https://example.com/api/legacy', { method: 'GET' });
    let workerExport = workerModule.default;
    if (workerExport && workerExport.default && typeof workerExport.fetch !== 'function' && typeof workerExport.default.fetch === 'function') {
      workerExport = workerExport.default;
    }
    const res = await workerExport.fetch(req, {}, {});

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.handled).toBe(true);
    expect(body.url).toBe('/api/legacy');
  });
});
