#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ServiceMiddlewareGenerator } from '../src/service-management/generators/code/ServiceMiddlewareGenerator.js';
import { WorkerIndexGenerator } from '../src/service-management/generators/code/WorkerIndexGenerator.js';

(async () => {
  const tmpDir = path.join(os.tmpdir(), `debug-worker-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const servicePath = path.join(tmpDir, 'services', 'test-svc');
  await fs.mkdir(servicePath, { recursive: true });

  const smg = new ServiceMiddlewareGenerator();
  const wig = new WorkerIndexGenerator();

  const coreInputs = { serviceName: 'test-svc', serviceType: 'api', environment: 'development' };
  const confirmed = { displayName: 'Test Svc', version: '1.0.0', packageName: 'test-svc' };

  console.log('Service path:', servicePath);
  console.log('Generating middleware...');
  await smg.generate({ coreInputs, confirmedValues: confirmed, servicePath, middlewareStrategy: 'contract' });

  console.log('Writing domains and handlers...');
  const configDir = path.join(servicePath, 'src', 'config');
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(path.join(configDir, 'domains.js'), `export const domains = { 'test-svc': { name: 'test-svc', corsPolicy: '*', logLevel: 'info' } }\n`,'utf8');

  const handlersDir = path.join(servicePath, 'src', 'handlers');
  await fs.mkdir(handlersDir, { recursive: true });
  await fs.writeFile(path.join(handlersDir, 'service-handlers.js'), `export function createServiceHandlers() { return { handleRequest: async (req) => new Response(JSON.stringify({handled: true, url: new URL(req.url).pathname}), { status: 200, headers: { 'Content-Type': 'application/json' } }) } }\n`,'utf8');

  console.log('Generating worker index...');
  await wig.generate({ coreInputs, confirmedValues: confirmed, servicePath });

  const expectedPath = path.join(servicePath, 'src', 'worker', 'index.js');
  const exists = await fs.access(expectedPath).then(() => true).catch(() => false);
  console.log('Worker index exists?', exists);

  if (exists) {
    const content = await fs.readFile(expectedPath, 'utf8');
    console.log('Worker index content length:', content.length);
    console.log(content.slice(0, 400));
  } else {
    async function listDir(dir, depth = 0) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const p = path.join(dir, e.name);
        console.log(`${' '.repeat(depth*2)}- ${p}`);
        if (e.isDirectory()) await listDir(p, depth+1);
      }
    }
    console.log('Directory listing for servicePath:');
    await listDir(servicePath);
  }

  // cleanup
  try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch (e) {}
})();