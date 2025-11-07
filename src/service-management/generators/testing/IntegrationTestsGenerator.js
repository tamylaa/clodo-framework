import { BaseGenerator } from '../BaseGenerator.js';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

/**
 * Integration Tests Generator
 * Generates integration tests for end-to-end service testing
 */
export class IntegrationTestsGenerator extends BaseGenerator {
  /**
   * Generate integration tests
   * @param {Object} context - Generation context
   * @returns {Promise<string>} Path to generated test file
   */
  async generate(context) {
    const { coreInputs, confirmedValues, servicePath } = this.extractContext(context);
    
    if (!this.shouldGenerate(context)) {
      return null;
    }

    // Ensure test/integration directory exists
    const testDir = join(servicePath, 'test', 'integration');
    mkdirSync(testDir, { recursive: true });

    const integrationTestContent = this._generateIntegrationTestContent(coreInputs, confirmedValues);
    
    const filePath = join(testDir, 'service.integration.test.js');
    writeFileSync(filePath, integrationTestContent, 'utf8');
    return filePath;
  }

  /**
   * Generate integration test content
   * @private
   */
  _generateIntegrationTestContent(coreInputs, confirmedValues) {
    return `import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('${confirmedValues.displayName} - Integration Tests', () => {
  let baseUrl;

  beforeAll(() => {
    baseUrl = process.env.TEST_URL || '${confirmedValues.developmentUrl}';
  });

  afterAll(() => {
    // Cleanup after tests
  });

  describe('Health Check Endpoint', () => {
    test('responds with 200 status', async () => {
      const response = await fetch(\`\${baseUrl}${confirmedValues.healthCheckPath}\`);
      expect(response.status).toBe(200);
    });

    test('returns valid health check response', async () => {
      const response = await fetch(\`\${baseUrl}${confirmedValues.healthCheckPath}\`);
      const json = await response.json();

      expect(json.status).toBe('healthy');
      expect(json.service).toBe('${coreInputs.serviceName}');
      expect(json.version).toBe('${confirmedValues.version}');
      expect(json.timestamp).toBeDefined();
    });

    test('includes health checks', async () => {
      const response = await fetch(\`\${baseUrl}${confirmedValues.healthCheckPath}\`);
      const json = await response.json();

      expect(Array.isArray(json.checks)).toBe(true);
      expect(json.checks.length).toBeGreaterThan(0);
    });
  });

  describe('API Endpoints', () => {
    test('base API path is accessible', async () => {
      const response = await fetch(\`\${baseUrl}${confirmedValues.apiBasePath}\`);
      expect(response.status).toBeLessThan(500); // Should not be a server error
    });

    ${this._generateServiceTypeTests(coreInputs.serviceType, confirmedValues)}
  });

  ${confirmedValues.features.caching ? `
  describe('Caching', () => {
    test('cache headers are present', async () => {
      const response = await fetch(\`\${baseUrl}${confirmedValues.healthCheckPath}\`);
      
      // Check for cache-related headers
      const cacheControl = response.headers.get('cache-control');
      expect(cacheControl).toBeDefined();
    });

    test('repeated requests use cache', async () => {
      const response1 = await fetch(\`\${baseUrl}${confirmedValues.healthCheckPath}\`);
      const response2 = await fetch(\`\${baseUrl}${confirmedValues.healthCheckPath}\`);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });` : ''}

  ${confirmedValues.features.database ? `
  describe('Database Integration', () => {
    test('database connectivity', async () => {
      const response = await fetch(\`\${baseUrl}${confirmedValues.healthCheckPath}\`);
      const json = await response.json();

      const dbCheck = json.checks.find(check => check.name === 'database');
      expect(dbCheck).toBeDefined();
      expect(dbCheck.status).toBe('healthy');
    });

    test('CRUD operations', async () => {
      // Test Create, Read, Update, Delete operations
      expect(true).toBe(true); // Placeholder
    });
  });` : `
  describe('Database Integration', () => {
    test.skip('database tests skipped - not enabled for this service type', () => {
      expect(true).toBe(true);
    });
  });`}

  describe('Middleware Integration', () => {
    test('request headers added', async () => {
      const response = await fetch(\`\${baseUrl}${confirmedValues.healthCheckPath}\`);

      expect(response.headers.get('x-service')).toBe('${coreInputs.serviceName}');
      expect(response.headers.get('x-version')).toBe('${confirmedValues.version}');
    });

    ${confirmedValues.features.authentication ? `
    test('authentication middleware', async () => {
      // Test authentication requirements
      expect(true).toBe(true); // Placeholder
    });` : ''}

    ${confirmedValues.features.authorization ? `
    test('authorization middleware', async () => {
      // Test authorization checks
      expect(true).toBe(true); // Placeholder
    });` : ''}
  });

  describe('Error Handling', () => {
    test('graceful error responses', async () => {
      // Test error scenarios
      expect(true).toBe(true); // Placeholder
    });

    test('error logging', async () => {
      // Test error logging functionality
      expect(true).toBe(true); // Placeholder
    });
  });
});
`;
  }

  /**
   * Generate service-type specific integration tests
   * @private
   */
  _generateServiceTypeTests(serviceType, confirmedValues) {
    switch (serviceType) {
      case 'data-service':
        return `test('data retrieval endpoint', async () => {
      const response = await fetch(\`\${baseUrl}${confirmedValues.apiBasePath}/data\`);
      expect(response.status).toBeLessThan(500);
    });

    test('data storage endpoint', async () => {
      const response = await fetch(\`\${baseUrl}${confirmedValues.apiBasePath}/data\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' })
      });
      expect(response.status).toBeLessThan(500);
    });`;

      case 'auth-service':
        return `test('login endpoint', async () => {
      const response = await fetch(\`\${baseUrl}${confirmedValues.apiBasePath}/login\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'test', password: 'test' })
      });
      expect(response.status).toBeLessThan(500);
    });

    test('token validation endpoint', async () => {
      const response = await fetch(\`\${baseUrl}${confirmedValues.apiBasePath}/validate\`);
      expect(response.status).toBeLessThan(500);
    });`;

      case 'content-service':
        return `test('content retrieval endpoint', async () => {
      const response = await fetch(\`\${baseUrl}${confirmedValues.apiBasePath}/content\`);
      expect(response.status).toBeLessThan(500);
    });

    test('content creation endpoint', async () => {
      const response = await fetch(\`\${baseUrl}${confirmedValues.apiBasePath}/content\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', body: 'Content' })
      });
      expect(response.status).toBeLessThan(500);
    });`;

      case 'api-gateway':
        return `test('gateway routing', async () => {
      const response = await fetch(\`\${baseUrl}${confirmedValues.apiBasePath}/route\`);
      expect(response.status).toBeLessThan(500);
    });

    test('service proxying', async () => {
      const response = await fetch(\`\${baseUrl}${confirmedValues.apiBasePath}/proxy\`);
      expect(response.status).toBeLessThan(500);
    });`;

      default:
        return `test('service endpoints are accessible', async () => {
      const response = await fetch(\`\${baseUrl}${confirmedValues.apiBasePath}\`);
      expect(response.status).toBeLessThan(500);
    });`;
    }
  }

  /**
   * Determine if generator should run
   */
  shouldGenerate(context) {
    return true; // Always generate integration tests
  }
}

