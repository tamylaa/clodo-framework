import { BaseGenerator } from '../BaseGenerator.js';
import { join } from 'path';

/**
 * WranglerTomlGenerator (v4.4.1+)
 * 
 * Generates wrangler.toml configuration files for Cloudflare Workers.
 * 
 * v4.4.1 changes:
 * - Supports ALL modern Cloudflare bindings: D1, KV, R2, AI, Vectorize,
 *   Queues, Email, Hyperdrive, Browser, Durable Objects, Analytics Engine
 * - Uses RECOMMENDED_COMPATIBILITY_DATE from framework
 * - Generates empty IDs for auto-provisioning in local dev (Wrangler 3.91+)
 * - Includes [observability] defaults
 * - Clean comments explaining each binding
 */
export class WranglerTomlGenerator extends BaseGenerator {
  constructor(options = {}) {
    super({
      name: 'WranglerTomlGenerator',
      description: 'Generates wrangler.toml configuration for Cloudflare Workers',
      outputPath: 'wrangler.toml',
      ...options
    });

    this.routeGenerator = options.routeGenerator;
    this.siteConfigGenerator = options.siteConfigGenerator;
  }

  /**
   * Always generate wrangler.toml
   */
  shouldGenerate(context) {
    return true;
  }

  /**
   * Generate wrangler.toml content
   */
  async generate(context) {
    // Support both new structured format and legacy flat format
    const coreInputs = context.coreInputs || context;
    const confirmedValues = context.confirmedValues || context;
    const servicePath = context.servicePath || context.outputDir;

    this.setContext({ coreInputs, confirmedValues, servicePath });

    // Generate routes configuration
    const routesConfig = await this._generateRoutesConfig(coreInputs, confirmedValues);

    // Generate Workers Sites configuration (static-site only)
    const siteConfig = await this._generateSiteConfig(coreInputs);

    // Build wrangler.toml content
    const content = await this._buildWranglerToml(coreInputs, confirmedValues, routesConfig, siteConfig);

    // Write file
    await this.writeFile('wrangler.toml', content);

    // Return full path for backward compatibility
    return join(servicePath, 'wrangler.toml');
  }

  /**
   * Generate routes configuration using RouteGenerator
   */
  async _generateRoutesConfig(coreInputs, confirmedValues) {
    if (!this.routeGenerator) {
      console.warn('⚠️  RouteGenerator not available. Routes will need to be configured manually.');
      return '# Routes will be configured during deployment\n';
    }

    try {
      const routesConfig = this.routeGenerator.generateRoutes(
        coreInputs,
        confirmedValues,
        { includeComments: true, includeZoneId: true }
      );
      return routesConfig;
    } catch (error) {
      console.warn(`⚠️  Could not generate routes: ${error.message}`);
      console.warn('   Continuing without automatic routes. You can add them manually later.');
      return '# Routes will be configured during deployment\n';
    }
  }

  /**
   * Generate Workers Sites configuration using SiteConfigGenerator
   */
  async _generateSiteConfig(coreInputs) {
    if (!this.siteConfigGenerator) {
      return '';
    }

    // Only generate site config for static-site service type
    if (coreInputs.serviceType !== 'static-site') {
      return '';
    }

    try {
      const siteConfig = await this.siteConfigGenerator.generate({
        coreInputs,
        siteConfig: coreInputs.siteConfig || {}
      });
      return siteConfig;
    } catch (error) {
      console.warn(`⚠️  Could not generate Workers Sites config: ${error.message}`);
      return '';
    }
  }

  /**
   * Build the complete wrangler.toml content (v4.4.1+)
   * Supports all modern Cloudflare bindings.
   */
  async _buildWranglerToml(coreInputs, confirmedValues, routesConfig, siteConfig) {
    const compatDate = '2024-12-01'; // Framework recommended compatibility date

    const features = confirmedValues.features || {};
    const workerName = confirmedValues.workerName || coreInputs.serviceName;

    // ── Binding blocks based on features ──────────────────────────────

    const bindingBlocks = [];

    if (features.d1 || features.database) {
      bindingBlocks.push(`
# ═══ D1 Database ═══════════════════════════════════════════════════
# Local: Leave database_id empty for auto-provisioned SQLite
# Production: Run \`wrangler d1 create ${confirmedValues.databaseName || workerName + '-db'}\` and paste ID
[[d1_databases]]
binding = "DB"
database_name = "${confirmedValues.databaseName || workerName + '-db'}"
database_id = ""`);
    }

    if (features.kv || features.upstash) {
      bindingBlocks.push(`
# ═══ KV Namespace ══════════════════════════════════════════════════
# Local: Leave id empty for auto-provisioned local KV
# Production: Run \`wrangler kv namespace create KV\` and paste ID
[[kv_namespaces]]
binding = "KV"
id = ""`);
    }

    if (features.r2) {
      bindingBlocks.push(`
# ═══ R2 Object Storage ═════════════════════════════════════════════
# Production: Run \`wrangler r2 bucket create ${workerName}-storage\`
[[r2_buckets]]
binding = "R2_STORAGE"
bucket_name = "${confirmedValues.bucketName || workerName + '-storage'}"`);
    }

    if (features.ai) {
      bindingBlocks.push(`
# ═══ Workers AI ════════════════════════════════════════════════════
[ai]
binding = "AI"`);
    }

    if (features.vectorize) {
      bindingBlocks.push(`
# ═══ Vectorize (Vector Database) ═══════════════════════════════════
# Production: Run \`wrangler vectorize create ${workerName}-index --dimensions 768 --metric cosine\`
[[vectorize]]
binding = "VECTORIZE_INDEX"
index_name = "${workerName}-index"`);
    }

    if (features.queues) {
      bindingBlocks.push(`
# ═══ Queues ════════════════════════════════════════════════════════
[[queues.producers]]
binding = "QUEUE"
queue = "${workerName}-queue"

[[queues.consumers]]
queue = "${workerName}-queue"
max_batch_size = 10
max_batch_timeout = 30
max_retries = 3
dead_letter_queue = "${workerName}-queue-dlq"`);
    }

    if (features.email) {
      bindingBlocks.push(`
# ═══ Email Workers ═════════════════════════════════════════════════
[send_email]
binding = "EMAIL"`);
    }

    if (features.hyperdrive) {
      bindingBlocks.push(`
# ═══ Hyperdrive (Postgres Connection Pool) ═════════════════════════
# Production: Run \`wrangler hyperdrive create ${workerName}-db --connection-string "postgres://..."\`
[[hyperdrive]]
binding = "HYPERDRIVE"
id = ""`);
    }

    if (features.browser) {
      bindingBlocks.push(`
# ═══ Browser Rendering ═════════════════════════════════════════════
[browser]
binding = "BROWSER"`);
    }

    if (features.durableObject || features.durableObjects) {
      bindingBlocks.push(`
# ═══ Durable Objects ══════════════════════════════════════════════
[[durable_objects.bindings]]
name = "DURABLE_OBJECT"
class_name = "MyDurableObject"

[[migrations]]
tag = "v1"
new_classes = ["MyDurableObject"]`);
    }

    if (features.analytics) {
      bindingBlocks.push(`
# ═══ Analytics Engine ══════════════════════════════════════════════
[[analytics_engine_datasets]]
binding = "ANALYTICS"
dataset = "${workerName}-analytics"`);
    }

    // ── Cron triggers ─────────────────────────────────────────────────
    const cronBlock = features.cron ? `
# ═══ Cron Triggers ═════════════════════════════════════════════════
[triggers]
crons = ["*/5 * * * *"]  # Every 5 minutes — customize as needed
` : '';

    return `# ═══════════════════════════════════════════════════════════════════
# ${confirmedValues.displayName} — Cloudflare Worker Configuration
# Generated by Clodo Framework v4.4.1
# ═══════════════════════════════════════════════════════════════════
name = "${workerName}"
main = "src/worker/index.js"
compatibility_date = "${compatDate}"
compatibility_flags = ["nodejs_compat"]

# Account configuration
account_id = "${coreInputs.cloudflareAccountId || ''}"

${routesConfig}${siteConfig ? '\n' + siteConfig : ''}
# ═══ Environment configurations ════════════════════════════════════
[env.development]
name = "${workerName}-dev"

[env.staging]
name = "${workerName}-staging"

[env.production]
name = "${workerName}"
${bindingBlocks.join('\n')}
${cronBlock}
# ═══ Environment variables ═════════════════════════════════════════
[vars]
SERVICE_NAME = "${coreInputs.serviceName}"
SERVICE_TYPE = "${coreInputs.serviceType}"

# ═══ Observability ═════════════════════════════════════════════════
[observability]
enabled = true

[observability.logs]
enabled = true
invocation_logs = true
# head_sampling_rate = 0.01  # Uncomment in production
`;
  }

  /**
   * Generate feature flags section
   */
  _generateFeatureFlags(features) {
    if (!features || typeof features !== 'object') {
      return '# No feature flags configured';
    }

    const flagEntries = Object.entries(features)
      .filter(([, enabled]) => enabled)
      .map(([feature, enabled]) => `FEATURE_${feature.toUpperCase()} = ${enabled}`);

    return flagEntries.length > 0 
      ? flagEntries.join('\n')
      : '# No feature flags configured';
  }

  /**
   * Validate context has required fields
   */
  validateContext(context) {
    const coreInputs = context.coreInputs || context;
    const confirmedValues = context.confirmedValues || context;

    const required = [
      { field: 'cloudflareAccountId', source: coreInputs },
      { field: 'serviceName', source: coreInputs },
      { field: 'serviceType', source: coreInputs },
      { field: 'domainName', source: coreInputs },
      { field: 'environment', source: coreInputs },
      { field: 'workerName', source: confirmedValues },
      { field: 'displayName', source: confirmedValues },
      { field: 'databaseName', source: confirmedValues },
      { field: 'apiBasePath', source: confirmedValues },
      { field: 'healthCheckPath', source: confirmedValues },
      { field: 'productionUrl', source: confirmedValues },
      { field: 'stagingUrl', source: confirmedValues },
      { field: 'developmentUrl', source: confirmedValues }
    ];

    const missing = required
      .filter(({ field, source }) => !source || !source[field])
      .map(({ field }) => field);

    if (missing.length > 0) {
      throw new Error(
        `WranglerTomlGenerator: Missing required fields: ${missing.join(', ')}`
      );
    }

    return true;
  }
}

