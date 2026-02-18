/**
 * Configuration File Schemas
 * Zod schemas for all CLI config file types (--config-file)
 * 
 * Builds on existing infrastructure:
 * - service-schema-config.js for canonical serviceTypes/features enums
 * - payloadValidation.js patterns for validation style
 * 
 * Supported config types:
 * - create: Service creation configuration
 * - deploy: Deployment configuration
 * - validate: Validation configuration
 * - update: Service update configuration
 */

import { z } from 'zod';
import { getConfig } from '../config/service-schema-config.js';

// ─── Reusable Schema Components ──────────────────────────────────────────────

const EnvironmentSchema = z.enum(['development', 'staging', 'production']).optional();

const CloudflareCredentialsSchema = z.object({
  token: z.string().optional(),
  accountId: z.string().optional(),
  zoneId: z.string().optional()
}).optional();

const DomainSchema = z.string()
  .regex(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/, 'Must be a valid domain name (e.g., api.example.com)')
  .optional();

// ─── Create Config Schema ────────────────────────────────────────────────────

export const CreateConfigSchema = z.object({
  // Core fields
  projectName: z.string().min(1, 'projectName is required').optional(),
  serviceName: z.string()
    .min(3, 'serviceName must be at least 3 characters')
    .max(50, 'serviceName must be at most 50 characters')
    .regex(/^[a-z0-9-]+$/, 'serviceName must be lowercase letters, numbers and hyphens only')
    .optional(),
  serviceType: z.string()
    .refine(v => getConfig().serviceTypes.includes(v), {
      message: `Invalid serviceType. Use one of: ${getConfig().serviceTypes.join(', ')}`
    })
    .optional(),
  description: z.string().max(500, 'description must be at most 500 characters').optional(),
  domain: DomainSchema,
  domainName: DomainSchema,

  // Environment and infrastructure
  environment: EnvironmentSchema,
  region: z.string().optional(),
  template: z.string().optional(),
  typescript: z.boolean().optional(),
  outputPath: z.string().optional(),
  templatePath: z.string().optional(),
  middlewareStrategy: z.enum(['contract', 'legacy']).optional(),

  // Features
  features: z.array(
    z.string().refine(v => getConfig().features.includes(v), {
      message: `Invalid feature. Use one of: ${getConfig().features.join(', ')}`
    })
  ).optional(),

  // Credentials
  cloudflareToken: z.string().optional(),
  cloudflareAccountId: z.string().optional(),
  cloudflareZoneId: z.string().optional(),

  // Advanced options
  advanced: z.object({
    customRoutes: z.boolean().optional(),
    workerType: z.string().optional(),
    compatibilityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format').optional(),
    compatibilityFlags: z.array(z.string()).optional()
  }).passthrough().optional(),

  // Metadata
  metadata: z.object({
    author: z.string().optional(),
    version: z.string().optional(),
    tags: z.array(z.string()).optional()
  }).passthrough().optional()
}).passthrough().describe('Configuration for clodo create command');

// ─── Deploy Config Schema ────────────────────────────────────────────────────

export const DeployConfigSchema = z.object({
  // Core fields
  domain: DomainSchema,
  serviceName: z.string().optional(),
  servicePath: z.string().optional(),
  environment: EnvironmentSchema,

  // Credentials (can also use env vars)
  cloudflareToken: z.string().optional(),
  cloudflareAccountId: z.string().optional(),
  cloudflareZoneId: z.string().optional(),
  token: z.string().optional(),
  accountId: z.string().optional(),
  zoneId: z.string().optional(),

  // Deployment options
  dryRun: z.boolean().optional(),
  force: z.boolean().optional(),
  skipDoctor: z.boolean().optional(),
  doctorStrict: z.boolean().optional(),

  // Deployment strategy
  deployment: z.object({
    strategy: z.enum(['direct', 'blue-green', 'canary', 'rolling']).optional(),
    replicas: z.number().int().min(1).max(100).optional(),
    timeout: z.number().int().min(1000).optional(),
    healthCheckPath: z.string().optional(),
    healthCheckTimeout: z.number().int().min(1000).optional()
  }).passthrough().optional(),

  // Routing configuration
  routing: z.object({
    customDomains: z.array(z.string()).optional(),
    routes: z.array(z.string()).optional(),
    fallback: z.string().optional()
  }).passthrough().optional(),

  // Monitoring
  monitoring: z.object({
    enabled: z.boolean().optional(),
    healthCheck: z.boolean().optional(),
    alerting: z.boolean().optional(),
    metricsEndpoint: z.string().optional()
  }).passthrough().optional(),

  // Security
  security: z.object({
    headers: z.record(z.string(), z.string()).optional(),
    cors: z.boolean().optional(),
    rateLimit: z.number().int().optional(),
    waf: z.boolean().optional()
  }).passthrough().optional()
}).passthrough().describe('Configuration for clodo deploy command');

// ─── Validate Config Schema ─────────────────────────────────────────────────

export const ValidateConfigSchema = z.object({
  // Core fields
  environment: EnvironmentSchema,
  servicePath: z.string().optional(),
  deepScan: z.boolean().optional(),
  exportReport: z.string().optional(),

  // Checks to run
  checks: z.object({
    structure: z.boolean().optional(),
    configuration: z.boolean().optional(),
    dependencies: z.boolean().optional(),
    security: z.boolean().optional(),
    performance: z.boolean().optional()
  }).passthrough().optional(),

  // Validation rules
  validation: z.object({
    strictMode: z.boolean().optional(),
    ignoreWarnings: z.boolean().optional(),
    customRules: z.array(z.string()).optional(),
    excludePaths: z.array(z.string()).optional()
  }).passthrough().optional(),

  // Requirements
  requirements: z.object({
    minNodeVersion: z.string().optional(),
    requiredFiles: z.array(z.string()).optional(),
    requiredDependencies: z.array(z.string()).optional()
  }).passthrough().optional(),

  // Reporting
  reporting: z.object({
    format: z.enum(['json', 'text', 'html', 'markdown']).optional(),
    outputFile: z.string().optional(),
    verbose: z.boolean().optional(),
    includeTimestamps: z.boolean().optional()
  }).passthrough().optional()
}).passthrough().describe('Configuration for clodo validate command');

// ─── Update Config Schema ────────────────────────────────────────────────────

export const UpdateConfigSchema = z.object({
  // Core fields
  domain: DomainSchema,
  environment: EnvironmentSchema,
  cloudflareToken: z.string().optional(),
  servicePath: z.string().optional(),

  // Behavior flags
  preview: z.boolean().optional(),
  force: z.boolean().optional(),
  interactive: z.boolean().optional(),

  // What to update
  updates: z.object({
    updateDependencies: z.boolean().optional(),
    updateConfiguration: z.boolean().optional(),
    updateScripts: z.boolean().optional(),
    updateWorkerConfig: z.boolean().optional()
  }).passthrough().optional(),

  // Migration settings
  migration: z.object({
    runMigrations: z.boolean().optional(),
    backupBeforeUpdate: z.boolean().optional(),
    backupLocation: z.string().optional(),
    rollbackOnError: z.boolean().optional()
  }).passthrough().optional(),

  // Validation settings
  validation: z.object({
    validateBeforeUpdate: z.boolean().optional(),
    validateAfterUpdate: z.boolean().optional(),
    runTests: z.boolean().optional()
  }).passthrough().optional(),

  // Notification settings
  notification: z.object({
    notifyOnStart: z.boolean().optional(),
    notifyOnComplete: z.boolean().optional(),
    notifyEmail: z.string().email('Must be a valid email address').optional(),
    notifySlack: z.boolean().optional(),
    slackWebhook: z.union([z.string().url('Must be a valid URL'), z.literal('')]).optional()
  }).passthrough().optional(),

  // Performance settings
  performance: z.object({
    parallelUpdates: z.number().int().min(1).max(10).optional(),
    timeout: z.number().int().min(1000).optional(),
    retryOnFailure: z.boolean().optional(),
    maxRetries: z.number().int().min(0).max(10).optional()
  }).passthrough().optional()
}).passthrough().describe('Configuration for clodo update command');

// ─── Schema Registry ─────────────────────────────────────────────────────────

/**
 * Registry mapping command types to their Zod schemas
 */
export const CONFIG_SCHEMAS = {
  create: CreateConfigSchema,
  deploy: DeployConfigSchema,
  validate: ValidateConfigSchema,
  update: UpdateConfigSchema
};

/**
 * Get the schema for a given command type
 * @param {string} commandType - Command type (create, deploy, validate, update)
 * @returns {z.ZodObject|null} Zod schema or null if not found
 */
export function getConfigSchema(commandType) {
  return CONFIG_SCHEMAS[commandType] || null;
}

/**
 * Get all registered command types
 * @returns {string[]} Array of command type names
 */
export function getRegisteredConfigTypes() {
  return Object.keys(CONFIG_SCHEMAS);
}
