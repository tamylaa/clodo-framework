#!/usr/bin/env node

/**
 * Enterprise Module Extractor
 *
 * Utility to extract and package enterprise modules for distribution
 * or integration into other projects.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

class EnterpriseModuleExtractor {
  constructor() {
    this.modules = [
      {
        name: 'DeploymentAuditor',
        path: '../shared/deployment/auditor.js',
        description: 'Advanced audit and logging system'
      },
      {
        name: 'ProductionTester',
        path: '../shared/production-tester/index.js',
        description: 'Comprehensive production testing suite'
      },
      {
        name: 'RollbackManager',
        path: '../shared/deployment/rollback-manager.js',
        description: 'Enterprise rollback management'
      },
      {
        name: 'ConfigurationCacheManager',
        path: '../shared/config/cache.js',
        description: 'Smart configuration caching'
      },
      {
        name: 'CrossDomainCoordinator',
        path: '../../src/orchestration/cross-domain-coordinator.js',
        description: 'Cross-domain coordination system'
      },
      {
        name: 'DomainDiscovery',
        path: '../shared/cloudflare/domain-discovery.js',
        description: 'Domain configuration discovery'
      },
      {
        name: 'EnhancedSecretManager',
        path: '../shared/security/secret-generator.js',
        description: 'Enhanced secret management'
      }
    ];
  }

  /**
   * Extract enterprise modules to a distribution package
   */
  async extractToPackage(outputDir = './enterprise-modules') {
    console.log('🔧 Extracting Enterprise Modules...');

    // Create output directory
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Extract each module
    for (const module of this.modules) {
      try {
        const sourcePath = join(dirname(new URL(import.meta.url).pathname), module.path);
        const targetPath = join(outputDir, `${module.name.toLowerCase()}.js`);

        if (existsSync(sourcePath)) {
          const content = readFileSync(sourcePath, 'utf8');
          writeFileSync(targetPath, content);
          console.log(`   ✅ ${module.name}: ${module.description}`);
        } else {
          console.log(`   ⚠️  ${module.name}: Source not found at ${sourcePath}`);
        }
      } catch (error) {
        console.log(`   ❌ ${module.name}: Extraction failed - ${error.message}`);
      }
    }

    // Create package.json for the extracted modules
    const packageJson = {
      name: 'clodo-enterprise-modules',
      version: '1.0.0',
      description: 'Extracted enterprise modules from Clodo Framework',
      main: 'index.js',
      exports: this.modules.reduce((acc, module) => {
        acc[`./${module.name.toLowerCase()}`] = `./${module.name.toLowerCase()}.js`;
        return acc;
      }, {}),
      keywords: ['enterprise', 'deployment', 'auditing', 'testing', 'rollback'],
      author: 'Clodo Framework Team',
      license: 'MIT'
    };

    writeFileSync(join(outputDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Create index.js that exports all modules
    const indexContent = this.modules.map(module =>
      `export { ${module.name} } from './${module.name.toLowerCase()}.js';`
    ).join('\n');

    writeFileSync(join(outputDir, 'index.js'), indexContent);

    console.log(`\\n✅ Enterprise modules extracted to: ${outputDir}`);
    console.log('   Use: npm install ./enterprise-modules');
  }

  /**
   * List available enterprise modules
   */
  listModules() {
    console.log('🏢 Available Enterprise Modules:');
    console.log('================================');

    this.modules.forEach((module, index) => {
      console.log(`${index + 1}. ${module.name}`);
      console.log(`   ${module.description}`);
      console.log(`   Path: ${module.path}`);
      console.log('');
    });
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

const extractor = new EnterpriseModuleExtractor();

if (command === 'extract') {
  const outputDir = args[1] || './enterprise-modules';
  extractor.extractToPackage(outputDir);
} else if (command === 'list') {
  extractor.listModules();
} else {
  console.log('Enterprise Module Extractor');
  console.log('');
  console.log('Usage:');
  console.log('  node extract-enterprise-modules.js list          # List available modules');
  console.log('  node extract-enterprise-modules.js extract [dir]  # Extract modules to package');
  console.log('');
  console.log('Examples:');
  console.log('  node extract-enterprise-modules.js list');
  console.log('  node extract-enterprise-modules.js extract');
  console.log('  node extract-enterprise-modules.js extract ./my-enterprise-package');
}