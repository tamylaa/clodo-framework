import { describe, test, expect } from '@jest/globals';
import { WranglerTomlGenerator } from '../../../src/service-management/generators/config/WranglerTomlGenerator.js';

describe('WranglerTomlGenerator', () => {
  const baseCoreInputs = {
    cloudflareAccountId: 'acct-1',
    serviceName: 'svc',
    serviceType: 'generic',
    domainName: 'example.com',
    environment: 'development'
  };

  const baseConfirmed = {
    displayName: 'Svc',
    workerName: 'svc',
    databaseName: 'svc-db',
    apiBasePath: '/api',
    healthCheckPath: '/health',
    productionUrl: 'https://example.com',
    stagingUrl: 'https://staging.example.com',
    developmentUrl: 'https://dev.example.com'
  };

  test('includes D1 block when features.d1 = true', async () => {
    const gen = new WranglerTomlGenerator({ outputPath: process.cwd() });
    const confirmed = { ...baseConfirmed, features: { d1: true } };

    const content = await gen._buildWranglerToml(baseCoreInputs, confirmed, '# routes', '');

    expect(content).toMatch(/\[\[d1_databases\]\]/);
    expect(content).toMatch(/database_name = "svc-db"/);
  });

  test('omits D1 block when features.d1 = false or missing', async () => {
    const gen = new WranglerTomlGenerator({ outputPath: process.cwd() });

    const confirmedFalse = { ...baseConfirmed, features: { d1: false } };
    const contentFalse = await gen._buildWranglerToml(baseCoreInputs, confirmedFalse, '# routes', '');
    expect(contentFalse).not.toMatch(/\[\[d1_databases\]\]/);

    const confirmedMissing = { ...baseConfirmed };
    const contentMissing = await gen._buildWranglerToml(baseCoreInputs, confirmedMissing, '# routes', '');
    expect(contentMissing).not.toMatch(/\[\[d1_databases\]\]/);
  });

  test('includes KV block when features.kv = true and omits when false/missing', async () => {
    const gen = new WranglerTomlGenerator({ outputPath: process.cwd() });

    const confirmed = { ...baseConfirmed, features: { kv: true } };
    const content = await gen._buildWranglerToml(baseCoreInputs, confirmed, '# routes', '');
    expect(content).toMatch(/\[\[kv_namespaces\]\]/);

    const confirmedFalse = { ...baseConfirmed, features: { kv: false } };
    const contentFalse = await gen._buildWranglerToml(baseCoreInputs, confirmedFalse, '# routes', '');
    expect(contentFalse).not.toMatch(/\[\[kv_namespaces\]\]/);

    const confirmedMissing = { ...baseConfirmed };
    const contentMissing = await gen._buildWranglerToml(baseCoreInputs, confirmedMissing, '# routes', '');
    expect(contentMissing).not.toMatch(/\[\[kv_namespaces\]\]/);
  }, 15000);

  test('includes R2 block when features.r2 = true and omits when false/missing', async () => {
    const gen = new WranglerTomlGenerator({ outputPath: process.cwd() });

    const confirmed = { ...baseConfirmed, features: { r2: true }, bucketName: 'my-bucket' };
    const content = await gen._buildWranglerToml(baseCoreInputs, confirmed, '# routes', '');
    expect(content).toMatch(/\[\[r2_buckets\]\]/);
    expect(content).toMatch(/bucket_name = "my-bucket"/);

    const confirmedFalse = { ...baseConfirmed, features: { r2: false } };
    const contentFalse = await gen._buildWranglerToml(baseCoreInputs, confirmedFalse, '# routes', '');
    expect(contentFalse).not.toMatch(/\[\[r2_buckets\]\]/);

    const confirmedMissing = { ...baseConfirmed };
    const contentMissing = await gen._buildWranglerToml(baseCoreInputs, confirmedMissing, '# routes', '');
    expect(contentMissing).not.toMatch(/\[\[r2_buckets\]\]/);
  }, 15000);
});
