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
});
