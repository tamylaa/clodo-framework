import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
const execFileP = promisify(execFile);

describe('migrate-middleware-legacy-to-contract', () => {
  let tmpDir;
  let servicePath;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `migrate-mw-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    servicePath = path.join(tmpDir, 'services', 'legacy-svc');
    await fs.mkdir(path.join(servicePath, 'src', 'middleware'), { recursive: true });

    const legacy = `export function createServiceMiddleware(serviceConfig, env) { return { async processRequest(r) { return r; } } }`;
    await fs.writeFile(path.join(servicePath, 'src', 'middleware', 'service-middleware.js'), legacy, 'utf-8');
  });

  afterEach(async () => {
    try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch (e) {}
  });

  it('converts legacy factory into contract class with registerMiddleware', async () => {
    const script = path.join(process.cwd(), 'scripts', 'migration', 'migrate-middleware-legacy-to-contract.js');
    await execFileP('node', [script, servicePath, 'legacy-svc']);

    const content = await fs.readFile(path.join(servicePath, 'src', 'middleware', 'service-middleware.js'), 'utf-8');
    expect(content).toContain('export default class');
    expect(content).toContain('registerMiddleware');
    // Ensure the legacy factory function was removed (function definition or call won't exist)
    expect(content).not.toContain('export function createServiceMiddleware');
    expect(content).not.toContain('createServiceMiddleware(');
  });
});
