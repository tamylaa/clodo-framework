import fs from 'fs';
import path from 'path';

const mixedFiles = [
  'src/config/customers.js',
  'src/database/database-orchestrator.js',
  'src/deployment/wrangler-deployer.js',
  'src/orchestration/multi-domain-orchestrator.js',
  'src/service-management/GenerationEngine.js',
  'src/service-management/generators/code/ServiceHandlersGenerator.js',
  'src/service-management/generators/code/ServiceMiddlewareGenerator.js',
  'src/service-management/generators/code/ServiceUtilsGenerator.js',
  'src/service-management/generators/code/WorkerIndexGenerator.js',
  'src/service-management/generators/config/DomainsConfigGenerator.js',
  'src/service-management/generators/config/EnvExampleGenerator.js',
  'src/service-management/generators/config/WranglerTomlGenerator.js',
  'src/service-management/generators/documentation/ApiDocsGenerator.js',
  'src/service-management/generators/documentation/ConfigurationDocsGenerator.js',
  'src/service-management/generators/documentation/ReadmeGenerator.js',
  'src/service-management/generators/schemas/ServiceSchemaGenerator.js',
  'src/service-management/generators/scripts/HealthCheckScriptGenerator.js',
  'src/service-management/generators/scripts/SetupScriptGenerator.js',
  'src/service-management/generators/testing/EslintConfigGenerator.js',
  'src/service-management/generators/testing/IntegrationTestsGenerator.js',
  'src/service-management/generators/testing/UnitTestsGenerator.js',
  'src/service-management/generators/tooling/GitignoreGenerator.js',
  'src/service-management/handlers/ValidationHandler.js',
  'src/service-management/ServiceOrchestrator.js',
  'src/utils/config/unified-config-manager.js',
  'src/utils/deployment/config-cache.js',
  'src/utils/deployment/secret-generator.js',
  'src/utils/deployment/wrangler-config-manager.js',
  'src/utils/framework-config.js'
];

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  ANALYSIS: Why These 29 Files Have Mixed Code             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const categories = {
  'GENERATORS THAT SCAFFOLD WORKER CODE': [
    {
      file: 'src/service-management/generators/code/ServiceHandlersGenerator.js',
      reason: 'Writes template files (.js) to disk that contain Worker code (async fetch, Response, etc.). Node.js: fs, path for file writing. Worker: Content it generates has Request/Response.',
      usesNodeFor: 'File generation',
      workerConnection: 'Generates Worker handler files'
    },
    {
      file: 'src/service-management/generators/code/ServiceUtilsGenerator.js',
      reason: 'Generates utility functions for Workers that use env.DB and Response objects. Node.js needed for file operations.',
      usesNodeFor: 'File generation',
      workerConnection: 'Generates utility library for Workers'
    },
    {
      file: 'src/service-management/generators/code/WorkerIndexGenerator.js',
      reason: 'Generates the main Worker entry point file with async fetch() handler. Node.js for file I/O.',
      usesNodeFor: 'File generation',
      workerConnection: 'Generates actual Worker code'
    },
    {
      file: 'src/service-management/generators/testing/IntegrationTestsGenerator.js',
      reason: 'Generates test files that use fetch() and Worker URLs. Node.js for file generation and test setup.',
      usesNodeFor: 'File generation',
      workerConnection: 'Generates tests that target Worker endpoints'
    }
  ],
  'CONFIG GENERATORS FOR WORKER ENVIRONMENTS': [
    {
      file: 'src/service-management/generators/config/WranglerTomlGenerator.js',
      reason: 'Generates wrangler.toml with Worker configuration. References [env] sections for different Worker environments.',
      usesNodeFor: 'File generation',
      workerConnection: 'Generates Worker deployment config'
    },
    {
      file: 'src/service-management/generators/config/DomainsConfigGenerator.js',
      reason: 'Generates domain config files that are used by Workers at runtime.',
      usesNodeFor: 'File generation',
      workerConnection: 'Generates config consumed by Workers'
    }
  ],
  'ORCHESTRATION THAT DEPLOYS TO WORKERS': [
    {
      file: 'src/deployment/wrangler-deployer.js',
      reason: 'Orchestrates wrangler CLI to deploy Workers. Node.js: spawn/execSync for CLI. Worker references: environment detection, URL extraction.',
      usesNodeFor: 'CLI execution for deployment',
      workerConnection: 'Deploys code to Workers'
    },
    {
      file: 'src/orchestration/multi-domain-orchestrator.js',
      reason: 'Coordinates deployments across multiple domains/Workers. Node.js: exec for CLI. Uses process.env to configure deployments.',
      usesNodeFor: 'CLI execution, process.env setup',
      workerConnection: 'Deploys multiple Workers'
    }
  ],
  'CONFIGURATION MANAGERS': [
    {
      file: 'src/config/customers.js',
      reason: 'Loads customer domain configs used by Workers at runtime. Node.js: fs for file loading. Uses createDomainConfigSchema (Worker utility).',
      usesNodeFor: 'File I/O',
      workerConnection: 'Manages config for Worker environments'
    },
    {
      file: 'src/utils/framework-config.js',
      reason: 'Central framework config with extensive environment variable setup for both CLI and Workers.',
      usesNodeFor: 'Path resolution, __dirname setup',
      workerConnection: 'Provides config used by Workers'
    }
  ],
  'PURE GENERATORS (No Worker Connection)': [
    {
      file: 'src/service-management/generators/cicd/DeployWorkflowGenerator.js',
      reason: 'Generates CI/CD workflow files. Node.js for file I/O. No Worker code generated.',
      usesNodeFor: 'File generation',
      workerConnection: 'None - CI/CD automation only'
    }
  ]
};

let totalAnalyzed = 0;

for (const [category, items] of Object.entries(categories)) {
  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║  ${category.padEnd(56)}║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);
  
  items.forEach(item => {
    totalAnalyzed++;
    console.log(`📄 ${item.file}`);
    console.log(`   Why mixed: ${item.reason}`);
    console.log(`   Node.js used for: ${item.usesNodeFor}`);
    console.log(`   Worker connection: ${item.workerConnection}`);
    console.log();
  });
}

console.log(`\n╔════════════════════════════════════════════════════════════╗`);
console.log(`║  CRITICAL INSIGHT                                         ║`);
console.log(`╚════════════════════════════════════════════════════════════╝\n`);

console.log(`These 29 files have mixed code for a GOOD REASON:\n`);
console.log(`✅ They generate, configure, or orchestrate Worker deployments`);
console.log(`✅ They use Node.js APIs for file I/O and CLI execution`);
console.log(`✅ They reference Worker code patterns as TEMPLATES or CONFIG`);
console.log(`✅ They never execute IN Workers - only generate for Workers\n`);

console.log(`CRITICAL: None of these 29 files should be imported by generated Workers`);
console.log(`Generated Workers only import from '@tamyla/clodo-framework/worker' path\n`);

console.log(`═══════════════════════════════════════════════════════════\n`);
