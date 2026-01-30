import os from 'os';
import { StateManager } from '../../src/orchestration/modules/StateManager.js';
import fs from 'fs/promises';
import { join } from 'path';

describe('StateManager defaults and persistence', () => {
  test('respects explicit enablePersistence: false option', async () => {
    // Test that explicit false overrides environment variable
    process.env.CLODO_ENABLE_PERSISTENCE = '1'; // Set it to true
    const sm = new StateManager({ enablePersistence: false });
    expect(sm.enablePersistence).toBe(false); // Should be false despite env var

    // Clean up environment
    delete process.env.CLODO_ENABLE_PERSISTENCE;
  });

  test('uses environment variable when no explicit option provided', async () => {
    // Test environment variable fallback
    process.env.CLODO_ENABLE_PERSISTENCE = '1';
    const sm = new StateManager({});
    expect(sm.enablePersistence).toBe(true);

    // Clean up
    delete process.env.CLODO_ENABLE_PERSISTENCE;

    process.env.CLODO_ENABLE_PERSISTENCE = '0';
    const sm2 = new StateManager({});
    expect(sm2.enablePersistence).toBe(false);

    // Clean up
    delete process.env.CLODO_ENABLE_PERSISTENCE;
  });
});
