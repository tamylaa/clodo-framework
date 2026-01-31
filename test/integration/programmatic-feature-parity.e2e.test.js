import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createServiceProgrammatic } from '../../src/programmatic/createService.js';

describe('Programmatic createService - feature parity (D1/KV/R2)', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `prog-parity-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch (e) {}
  });

  const combos = [
    { name: 'none', features: [] },
    { name: 'd1', features: ['d1'] },
    { name: 'upstash', features: ['upstash'] },
    { name: 'r2', features: ['r2'] },
    { name: 'd1-upstash-r2', features: ['d1', 'upstash', 'r2'] }
  ];

  test('createService produces wrangler manifest parity for feature combos', async () => {
    for (const combo of combos) {
      const payload = {
        serviceName: `parity-${combo.name}`,
        serviceType: 'generic',
        domain: 'example.com',
        features: combo.features
      };

      const outDir = path.join(tmpDir, combo.name);
      await fs.mkdir(outDir, { recursive: true });

      const res = await createServiceProgrammatic(payload, { dryRun: true, outputDir: outDir });

      expect(res).toBeDefined();
      if (!res.success) {
        console.log('FAILED combo:', combo.name, JSON.stringify(res, null, 2));
        throw new Error(`createService failed for combo: ${combo.name}`);
      }

      expect(res.success).toBe(true);
      expect(res.validationReport).toBeDefined();
      expect(res.validationReport.valid).toBe(true);

      // Read generated wrangler.toml and assert presence/absence of bindings
      // The GenerationHandler may create a nested service path (e.g., outputDir/<serviceName>), so use res.servicePath
      const servicePath = res.servicePath || outDir;
      const wranglerPath = path.join(servicePath, 'wrangler.toml');
      const wranglerExists = await fs.access(wranglerPath).then(() => true).catch(() => false);
      expect(wranglerExists).toBe(true);

      const wranglerContent = await fs.readFile(wranglerPath, 'utf8');

      const expects = {
        d1: combo.features.includes('d1'),
        // kv may be represented via provider flags (e.g., upstash)
        kv: combo.features.includes('kv') || combo.features.includes('upstash'),
        r2: combo.features.includes('r2')
      };

      if (expects.d1) {
        expect(wranglerContent).toMatch(/\[\[d1_databases\]\]/);
      } else {
        expect(wranglerContent).not.toMatch(/\[\[d1_databases\]\]/);
      }

      if (expects.kv) {
        expect(wranglerContent).toMatch(/\[\[kv_namespaces\]\]/);
      } else {
        expect(wranglerContent).not.toMatch(/\[\[kv_namespaces\]\]/);
      }

      if (expects.r2) {
        expect(wranglerContent).toMatch(/\[\[r2_buckets\]\]/);
      } else {
        expect(wranglerContent).not.toMatch(/\[\[r2_buckets\]\]/);
      }
    }
  }, 60000);
});
