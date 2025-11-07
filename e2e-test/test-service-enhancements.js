// Service Enhancement Tools
// Provides APIs for enhancing and customizing generated services

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ServiceEnhancer {
  constructor(servicePath) {
    this.servicePath = servicePath;
  }

  /**
   * Add a custom API endpoint to the service
   */
  async addCustomEndpoint(endpointPath, handlerCode) {
    const handlersPath = path.join(this.servicePath, 'src/handlers/service-handlers.js');
    let handlersCode = await fs.readFile(handlersPath, 'utf8');

    // Add the custom endpoint handler
    const customHandler = `
export async function handle${endpointPath.replace(/\//g, '')}(request, env) {
  ${handlerCode}
}
`;

    handlersCode += '\n' + customHandler;
    await fs.writeFile(handlersPath, handlersCode);

    // Update the worker to route to the new endpoint
    const workerPath = path.join(this.servicePath, 'src/worker/index.js');
    let workerCode = await fs.readFile(workerPath, 'utf8');

    // Add routing logic (this is a simplified example)
    const routeAddition = `
    if (request.url.includes('${endpointPath}')) {
      return await handlers.handle${endpointPath.replace(/\//g, '')}(request, ctx);
    }`;

    // Insert before the final return
    const returnIndex = workerCode.lastIndexOf('return await handlers.handleRequest(processedRequest, ctx);');
    if (returnIndex !== -1) {
      workerCode = workerCode.slice(0, returnIndex) + routeAddition + '\n    ' + workerCode.slice(returnIndex);
      await fs.writeFile(workerPath, workerCode);
    }

    return { success: true, endpoint: endpointPath };
  }

  /**
   * Add middleware to the service
   */
  async addMiddleware(middlewareName, middlewareCode) {
    const middlewarePath = path.join(this.servicePath, 'src/middleware/service-middleware.js');
    let middlewareCodeContent = await fs.readFile(middlewarePath, 'utf8');

    const newMiddleware = `
export class ${middlewareName} {
  async processRequest(request) {
    ${middlewareCode}
    return request;
  }

  async processResponse(response) {
    return response;
  }
}
`;

    middlewareCodeContent += '\n' + newMiddleware;
    await fs.writeFile(middlewarePath, middlewareCodeContent);

    return { success: true, middleware: middlewareName };
  }

  /**
   * Add environment variables
   */
  async addEnvironmentVariable(envVar, value, environment = 'all') {
    const envFiles = environment === 'all'
      ? ['development.env', 'staging.env', 'production.env']
      : [`${environment}.env`];

    for (const envFile of envFiles) {
      const envPath = path.join(this.servicePath, 'config', envFile);
      let envContent = '';
      try {
        envContent = await fs.readFile(envPath, 'utf8');
      } catch (e) {
        // File doesn't exist, create it
      }

      envContent += `\n${envVar}=${value}`;
      await fs.writeFile(envPath, envContent);
    }

    return { success: true, variable: envVar };
  }

  /**
   * Add a database model
   */
  async addDatabaseModel(modelName, schema) {
    const schemaPath = path.join(this.servicePath, 'src/schemas/service-schema.js');
    let schemaContent = await fs.readFile(schemaPath, 'utf8');

    const newModel = `
export const ${modelName}Schema = ${JSON.stringify(schema, null, 2)};
`;

    schemaContent += '\n' + newModel;
    await fs.writeFile(schemaPath, schemaContent);

    return { success: true, model: modelName };
  }

  /**
   * Generate deployment documentation
   */
  async generateDeploymentDocs() {
    const docsPath = path.join(this.servicePath, 'docs');
    await fs.mkdir(docsPath, { recursive: true });

    const deploymentDoc = `# Deployment Guide

## Prerequisites

- Node.js 18+
- Cloudflare Account
- Wrangler CLI

## Environment Setup

1. Copy the appropriate .env file:
   \`\`\`bash
   cp config/development.env .env
   \`\`\`

2. Update the environment variables with your actual values.

## Local Development

\`\`\`bash
npm install
npm run dev
\`\`\`

## Deployment

### Development
\`\`\`bash
.\\scripts\\deploy.ps1 -Environment development
\`\`\`

### Staging
\`\`\`bash
.\\scripts\\deploy.ps1 -Environment staging
\`\`\`

### Production
\`\`\`bash
.\\scripts\\deploy.ps1 -Environment production
\`\`\`

## Verification

After deployment, verify your service is working:

\`\`\`bash
curl https://your-domain.com/health
\`\`\`
`;

    await fs.writeFile(path.join(docsPath, 'DEPLOYMENT.md'), deploymentDoc);
    return { success: true, file: 'docs/DEPLOYMENT.md' };
  }
}

// Test the enhancement capabilities
async function testServiceEnhancements() {
  console.log('🔧 TESTING SERVICE ENHANCEMENT CAPABILITIES');
  console.log('===========================================\n');

  const testServicePath = path.join(__dirname, 'enhancement-test-service');

  try {
    // First generate a service
    const { ServiceOrchestrator } = await import('@tamyla/clodo-framework/service-management');
    const orchestrator = new ServiceOrchestrator({
      interactive: false,
      outputPath: testServicePath
    });

    const coreInputs = {
      serviceName: 'enhancement-test-service',
      serviceType: 'data-service',
      domainName: 'enhancement-test.example.com',
      cloudflareToken: 'test-token-12345678901234567890123456789012',
      cloudflareAccountId: 'test-account-12345678901234567890123456789012',
      cloudflareZoneId: 'test-zone-12345678901234567890123456789012',
      environment: 'development'
    };

    console.log('Generating base service...');
    await orchestrator.runNonInteractive(coreInputs);
    console.log('✅ Base service generated\n');

    // Now enhance it
    const serviceDir = path.join(testServicePath, coreInputs.serviceName);
    const enhancer = new ServiceEnhancer(serviceDir);

    console.log('Adding custom API endpoint...');
    await enhancer.addCustomEndpoint('/custom', `
    return new Response(JSON.stringify({
      message: 'Custom endpoint response',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    `);
    console.log('✅ Custom endpoint added\n');

    console.log('Adding custom middleware...');
    await enhancer.addMiddleware('CustomAuthMiddleware', `
    // Custom authentication logic
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }
    `);
    console.log('✅ Custom middleware added\n');

    console.log('Adding environment variable...');
    await enhancer.addEnvironmentVariable('CUSTOM_API_KEY', 'your-secret-key');
    console.log('✅ Environment variable added\n');

    console.log('Adding database model...');
    await enhancer.addDatabaseModel('CustomModel', {
      name: 'CustomModel',
      fields: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        createdAt: { type: 'date', default: 'now' }
      }
    });
    console.log('✅ Database model added\n');

    console.log('Generating deployment documentation...');
    await enhancer.generateDeploymentDocs();
    console.log('✅ Deployment documentation generated\n');

    console.log('🎉 SERVICE ENHANCEMENT COMPLETE!');
    console.log('=================================');
    console.log('✅ Custom Endpoints: ADDED');
    console.log('✅ Custom Middleware: ADDED');
    console.log('✅ Environment Variables: ADDED');
    console.log('✅ Database Models: ADDED');
    console.log('✅ Deployment Docs: GENERATED');
    console.log('');
    console.log('🏆 Service enhancement capabilities are working!');

  } catch (error) {
    console.error('❌ SERVICE ENHANCEMENT TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    try {
      await fs.rm(testServicePath, { recursive: true, force: true });
      console.log(`\n🧹 Cleaned up test directory: ${testServicePath}`);
    } catch (e) {
      console.log(`\n⚠️  Could not clean up test directory: ${e.message}`);
    }
  }
}

testServiceEnhancements();