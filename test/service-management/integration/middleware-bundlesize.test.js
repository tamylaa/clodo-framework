import { describe, it, expect } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ServiceMiddlewareGenerator } from '../../../src/service-management/generators/code/ServiceMiddlewareGenerator.js';

async function dirSize(root) {
  let total = 0;
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(root, e.name);
      if (e.isDirectory()) total += await dirSize(p);
      else if (e.isFile()) {
        const st = await fs.stat(p);
        total += st.size;
      }
    }
  } catch {
    return 0;
  }
  return total;
}

describe('Middleware bundle size smoke test', () => {
  it('contract strategy should not be larger than legacy strategy', async () => {
    const tmp = path.join(os.tmpdir(), `mw-size-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const svcContract = path.join(tmp, 'contract');
    const svcLegacy = path.join(tmp, 'legacy');

    await fs.mkdir(path.join(svcContract, 'src', 'middleware'), { recursive: true });
    await fs.mkdir(path.join(svcLegacy, 'src', 'middleware'), { recursive: true });

    const smg = new ServiceMiddlewareGenerator();

    // generate contract
    await smg.generate({ coreInputs: { serviceName: 'svc-c' }, confirmedValues: { displayName: 'Svc C', version: '1.0.0' }, servicePath: svcContract, middlewareStrategy: 'contract' });

    // generate legacy
    await smg.generate({ coreInputs: { serviceName: 'svc-l' }, confirmedValues: { displayName: 'Svc L', version: '1.0.0' }, servicePath: svcLegacy, middlewareStrategy: 'legacy' });

    const sizeC = await dirSize(path.join(svcContract, 'src', 'middleware'));
    const sizeL = await dirSize(path.join(svcLegacy, 'src', 'middleware'));

    // Record (assert contract is not larger than legacy by design)
    expect(sizeC).toBeGreaterThanOrEqual(0);
    expect(sizeL).toBeGreaterThanOrEqual(0);

    // Prefer smaller or equal for contract strategy
    expect(sizeC).toBeLessThanOrEqual(sizeL);

    // Cleanup
    try { await fs.rm(tmp, { recursive: true, force: true }); } catch (e) {}
  });
});
