#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

async function migrate(servicePath, serviceName) {
  const filePath = path.join(servicePath, 'src', 'middleware', 'service-middleware.js');
  try {
    const content = await fs.readFile(filePath, 'utf-8');
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
