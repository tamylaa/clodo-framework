#!/usr/bin/env node
/**
 * clodo add — Incremental enhancement command
 * 
 * Adds Cloudflare bindings, middleware, and features to an existing
 * Clodo-generated Worker project without regenerating from scratch.
 * 
 * Usage:
 *   npx clodo add ai              # Add Workers AI binding
 *   npx clodo add kv               # Add KV namespace
 *   npx clodo add kv:users         # Add KV with custom binding name
 *   npx clodo add d1               # Add D1 database
 *   npx clodo add r2               # Add R2 storage
 *   npx clodo add vectorize        # Add Vectorize index
 *   npx clodo add queues           # Add Queue producer/consumer
 *   npx clodo add cron             # Add scheduled handler
 *   npx clodo add auth:bearer      # Add bearer token middleware
 *   npx clodo add auth:apikey      # Add API key middleware
 *   npx clodo add email            # Add Email Workers
 *   npx clodo add hyperdrive       # Add Hyperdrive (Postgres)
 *   npx clodo add analytics        # Add Analytics Engine
 *   npx clodo add browser          # Add Browser Rendering
 * 
 * @module cli/commands/add
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

/**
 * TOML snippets for each feature binding
 */
const BINDING_TOML = {
  ai: `
# ═══ Workers AI ════════════════════════════════════════════════════
[ai]
binding = "AI"`,

  kv: (bindingName = 'KV') => `
# ═══ KV Namespace ══════════════════════════════════════════════════
[[kv_namespaces]]
binding = "${bindingName}"
id = ""`,

  d1: (dbName = 'my-db') => `
# ═══ D1 Database ═══════════════════════════════════════════════════
[[d1_databases]]
binding = "DB"
database_name = "${dbName}"
database_id = ""`,

  r2: (bucketName = 'my-storage') => `
# ═══ R2 Object Storage ═════════════════════════════════════════════
[[r2_buckets]]
binding = "R2_STORAGE"
bucket_name = "${bucketName}"`,

  vectorize: (indexName = 'my-index') => `
# ═══ Vectorize ═════════════════════════════════════════════════════
[[vectorize]]
binding = "VECTORIZE_INDEX"
index_name = "${indexName}"`,

  queues: (queueName = 'my-queue') => `
# ═══ Queues ════════════════════════════════════════════════════════
[[queues.producers]]
binding = "QUEUE"
queue = "${queueName}"

[[queues.consumers]]
queue = "${queueName}"
max_batch_size = 10
max_batch_timeout = 30
max_retries = 3`,

  cron: `
# ═══ Cron Triggers ═════════════════════════════════════════════════
[triggers]
crons = ["*/5 * * * *"]`,

  email: `
# ═══ Email Workers ═════════════════════════════════════════════════
[send_email]
binding = "EMAIL"`,

  hyperdrive: `
# ═══ Hyperdrive ════════════════════════════════════════════════════
[[hyperdrive]]
binding = "HYPERDRIVE"
id = ""`,

  analytics: (workerName = 'my-worker') => `
# ═══ Analytics Engine ══════════════════════════════════════════════
[[analytics_engine_datasets]]
binding = "ANALYTICS"
dataset = "${workerName}-analytics"`,

  browser: `
# ═══ Browser Rendering ═════════════════════════════════════════════
[browser]
binding = "BROWSER"`
};

/**
 * Import snippets to add to the worker entry point
 */
const IMPORT_SNIPPETS = {
  ai: {
    framework: [],
    utilities: ['runAIModel', 'streamAIResponse'],
    envBinding: 'AI'
  },
  kv: {
    framework: [],
    utilities: ['getKV', 'putKV', 'listKV', 'deleteKV'],
    envBinding: 'KV'
  },
  d1: {
    framework: [],
    utilities: [],
    envBinding: 'DB'
  },
  r2: {
    framework: [],
    utilities: ['putR2Object', 'getR2Object'],
    envBinding: 'R2_STORAGE'
  },
  vectorize: {
    framework: [],
    utilities: ['queryVectors', 'upsertVectors'],
    envBinding: 'VECTORIZE_INDEX'
  },
  queues: {
    framework: [],
    utilities: [],
    envBinding: 'QUEUE'
  },
  'auth:bearer': {
    framework: ['createBearerAuth'],
    utilities: [],
    envBinding: null
  },
  'auth:apikey': {
    framework: ['createApiKeyAuth'],
    utilities: [],
    envBinding: null
  },
  email: {
    framework: [],
    utilities: ['sendEmail'],
    envBinding: 'EMAIL'
  },
  hyperdrive: {
    framework: [],
    utilities: [],
    envBinding: 'HYPERDRIVE'
  },
  analytics: {
    framework: [],
    utilities: [],
    envBinding: 'ANALYTICS'
  },
  browser: {
    framework: [],
    utilities: [],
    envBinding: 'BROWSER'
  }
};

/**
 * Parse feature argument (e.g., "kv:users" → { feature: "kv", name: "users" })
 */
function parseFeatureArg(arg) {
  const [feature, name] = arg.split(':');
  return { feature: feature.toLowerCase(), name };
}

/**
 * Add a feature to an existing project
 */
export async function addFeature(featureArg, options = {}) {
  const cwd = options.cwd || process.cwd();
  const { feature, name } = parseFeatureArg(featureArg);
  
  const results = {
    feature,
    wranglerUpdated: false,
    envGuardUpdated: false,
    importsAdded: [],
    instructions: []
  };

  // 1. Update wrangler.toml
  const wranglerPath = join(cwd, 'wrangler.toml');
  if (existsSync(wranglerPath)) {
    const wranglerContent = readFileSync(wranglerPath, 'utf8');
    
    // Check if binding already exists
    const bindingCheck = {
      ai: '[ai]',
      kv: '[[kv_namespaces]]',
      d1: '[[d1_databases]]',
      r2: '[[r2_buckets]]',
      vectorize: '[[vectorize]]',
      queues: '[[queues.',
      cron: '[triggers]',
      email: '[send_email]',
      hyperdrive: '[[hyperdrive]]',
      analytics: '[[analytics_engine_datasets]]',
      browser: '[browser]'
    };

    const baseFeature = feature.includes(':') ? feature.split(':')[0] : feature;
    
    if (bindingCheck[baseFeature] && wranglerContent.includes(bindingCheck[baseFeature])) {
      results.instructions.push(`⚠️  ${baseFeature} binding already exists in wrangler.toml`);
    } else {
      const tomlSnippet = typeof BINDING_TOML[baseFeature] === 'function'
        ? BINDING_TOML[baseFeature](name || undefined)
        : BINDING_TOML[baseFeature];

      if (tomlSnippet) {
        writeFileSync(wranglerPath, wranglerContent.trimEnd() + '\n' + tomlSnippet + '\n', 'utf8');
        results.wranglerUpdated = true;
        results.instructions.push(`✅ Added ${baseFeature} binding to wrangler.toml`);
      }
    }
  } else {
    results.instructions.push('⚠️  No wrangler.toml found. Create one first with: npx clodo create');
  }

  // 2. Show import suggestions
  const importInfo = IMPORT_SNIPPETS[feature] || IMPORT_SNIPPETS[feature.split(':')[0]];
  if (importInfo) {
    if (importInfo.framework.length > 0) {
      results.importsAdded.push(`import { ${importInfo.framework.join(', ')} } from '@tamyla/clodo-framework';`);
      results.instructions.push(`📦 Add to your worker: import { ${importInfo.framework.join(', ')} } from '@tamyla/clodo-framework';`);
    }
    if (importInfo.utilities.length > 0) {
      results.importsAdded.push(`import { ${importInfo.utilities.join(', ')} } from '@tamyla/clodo-framework/utilities';`);
      results.instructions.push(`📦 Add to your worker: import { ${importInfo.utilities.join(', ')} } from '@tamyla/clodo-framework/utilities';`);
    }
    if (importInfo.envBinding) {
      results.instructions.push(`🔧 Add '${importInfo.envBinding}' to your createEnvironmentGuard({ required: [...] })`);
    }
  }

  // 3. Feature-specific setup instructions
  const setupInstructions = {
    ai: '🚀 Workers AI is ready! Use env.AI.run(model, options) in your handler.',
    kv: `🚀 Run: wrangler kv namespace create "${name || 'KV'}" to create the namespace, then paste the ID.`,
    d1: `🚀 Run: wrangler d1 create "${name || 'my-db'}" to create the database.`,
    r2: `🚀 Run: wrangler r2 bucket create "${name || 'my-storage'}" to create the bucket.`,
    vectorize: `🚀 Run: wrangler vectorize create "${name || 'my-index'}" --dimensions 768 --metric cosine`,
    queues: `🚀 Queue "${name || 'my-queue'}" will be auto-created on first deploy.`,
    cron: '🚀 Cron trigger added. Implement the scheduled() handler in your worker.',
    'auth:bearer': '🔐 Add createBearerAuth({ token: env.SECRET_KEY }) to your middleware stack.',
    'auth:apikey': '🔐 Add createApiKeyAuth({ keys: [env.API_KEY] }) to your middleware stack.',
    email: '🚀 Email binding ready. Use env.EMAIL.send() in your handler.',
    hyperdrive: '🚀 Run: wrangler hyperdrive create <name> --connection-string "postgres://..."',
    analytics: '🚀 Analytics Engine ready. Use env.ANALYTICS.writeDataPoint() in your handler.',
    browser: '🚀 Browser Rendering ready. Use env.BROWSER in your handler.'
  };

  if (setupInstructions[feature]) {
    results.instructions.push(setupInstructions[feature]);
  }

  return results;
}

/**
 * CLI entry point for `clodo add`
 */
export function registerAddCommand(program) {
  program
    .command('add <feature>')
    .description('Add a Cloudflare binding or feature to your existing Worker project')
    .option('-d, --dir <path>', 'Project directory', '.')
    .option('--dry-run', 'Show what would change without modifying files')
    .action(async (feature, options) => {
      console.log(`\n🔧 Adding "${feature}" to your Worker project...\n`);

      const results = await addFeature(feature, { 
        cwd: resolve(options.dir),
        dryRun: options.dryRun 
      });

      for (const instruction of results.instructions) {
        console.log(`  ${instruction}`);
      }

      console.log('');
    });
}

/**
 * List all available features for `clodo add`
 */
export function listAvailableFeatures() {
  return [
    { name: 'ai', description: 'Workers AI (text generation, embeddings, etc.)' },
    { name: 'kv', description: 'KV Namespace (key-value storage)', syntax: 'kv[:binding_name]' },
    { name: 'd1', description: 'D1 Database (SQLite)', syntax: 'd1[:db_name]' },
    { name: 'r2', description: 'R2 Object Storage', syntax: 'r2[:bucket_name]' },
    { name: 'vectorize', description: 'Vectorize (vector database)', syntax: 'vectorize[:index_name]' },
    { name: 'queues', description: 'Queues (message queue)', syntax: 'queues[:queue_name]' },
    { name: 'cron', description: 'Cron Triggers (scheduled jobs)' },
    { name: 'auth:bearer', description: 'Bearer token authentication middleware' },
    { name: 'auth:apikey', description: 'API key authentication middleware' },
    { name: 'email', description: 'Email Workers (send email)' },
    { name: 'hyperdrive', description: 'Hyperdrive (Postgres connection pool)' },
    { name: 'analytics', description: 'Analytics Engine (custom metrics)' },
    { name: 'browser', description: 'Browser Rendering API' }
  ];
}
