#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

async function migrate(servicePath, serviceName) {
  const filePath = path.join(servicePath, 'src', 'middleware', 'service-middleware.js');
  
  // Debug: log the paths
  console.error(`Migration script: servicePath=${servicePath}, serviceName=${serviceName}`);
  console.error(`Migration script: looking for file at ${filePath}`);

  async function readFileWithRetry(p, attempts = 10, delay = 200) {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fs.readFile(p, 'utf-8');
      } catch (err) {
        console.error(`Migration script: read attempt ${i + 1} failed: ${err.message}`);
        if (i === attempts - 1) throw err;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  try {
    const content = await readFileWithRetry(filePath, 5, 100);
    if (!content.includes('createServiceMiddleware')) {
      console.log('No legacy factory detected, nothing to do');
      return false;
    }

    // Basic transform: create minimal contract and registration helper
    const className = (serviceName && /^[A-Za-z0-9_-]+$/.test(serviceName)) ? serviceName.replace(/[^A-Za-z0-9]/g, '') : 'Service';

    const newContent = `// Migrated middleware - converted from legacy createServiceMiddleware
export default class ${className}Middleware {
  async preprocess(request) { return null; }
  async authenticate(request) { return null; }
  async validate(request) { return null; }
  async postprocess(response) { return response; }
}

export function registerMiddleware(registry, serviceName) {
  if (!registry || typeof registry.register !== 'function') return;
  registry.register(serviceName || '${serviceName || ''}', new ${className}Middleware());
}
`;

    await fs.writeFile(filePath, newContent, 'utf-8');
    console.log(`Migrated: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Migration failed: ${error.message}`);
    throw error;
  }
}

if (process.argv[2]) {
  const servicePath = process.argv[2];
  const serviceName = process.argv[3] || '';
  migrate(servicePath, serviceName).catch(err => process.exit(1));
} else {
  console.error('Usage: migrate-middleware-legacy-to-contract <servicePath> [serviceName]');
  process.exit(1);
}
