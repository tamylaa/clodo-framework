/**
 * Assess Command - Run intelligent capability assessment
 * Requires @tamyla/clodo-orchestration package for professional edition
 */

import chalk from 'chalk';
import path from 'path';
import { ServiceOrchestrator } from '../../src/service-management/ServiceOrchestrator.js';
import { StandardOptions } from '../../lib/shared/utils/cli-options.js';
import { ServiceConfigManager } from '../../lib/shared/utils/service-config-manager.js';

export function registerAssessCommand(program) {
  const command = program
    .command('assess [service-path]')
    .description('Run intelligent capability assessment (requires @tamyla/clodo-orchestration)')
    .option('--export <file>', 'Export assessment results to JSON file')
    .option('--domain <domain>', 'Domain name for assessment')
    .option('--service-type <type>', 'Service type for assessment')
    .option('--token <token>', 'Cloudflare API token')
    .option('--show-config-sources', 'Display all configuration sources and merged result')
  
  // Add standard options (--verbose, --quiet, --json, --no-color, --config-file)
  StandardOptions.define(command)
    .action(async (servicePath, options) => {
      try {
        const output = new (await import('../../lib/shared/utils/output-formatter.js')).OutputFormatter(options);
        const configManager = new ServiceConfigManager({
          verbose: options.verbose,
          quiet: options.quiet,
          json: options.json,
          showSources: options.showConfigSources
        });

        const orchestrator = new ServiceOrchestrator();
        const targetPath = servicePath || process.cwd();

        // Validate service path with better error handling
        try {
          servicePath = await configManager.validateServicePath(targetPath, orchestrator);
        } catch (error) {
          output.error(error.message);
          if (error.suggestions) {
            output.info('Suggestions:');
            output.list(error.suggestions);
          }
          process.exit(1);
        }

        // Load and merge all configurations
        const mergedOptions = await configManager.loadServiceConfig(servicePath, options, {
          export: null,
          domain: null,
          serviceType: null,
          token: null
        });

        let assessment; // Declare here so it's available in the entire scope

        // Try to load professional orchestration package
        let orchestrationModule;
        let hasEnterprisePackage = false;
        try {
          orchestrationModule = await import('@tamyla/clodo-orchestration');
          hasEnterprisePackage = true;
        } catch (err) {
          output.warning('⚠️  Enterprise orchestration package not found');
          output.info('💡 Using basic assessment capabilities');
          output.info('💡 For advanced assessment: npm install @tamyla/clodo-orchestration');
        }
        
        if (hasEnterprisePackage) {
          output.section('Professional Capability Assessment');
          output.list([
            `Service Path: ${targetPath}`,
            mergedOptions.domain ? `Domain: ${mergedOptions.domain}` : null,
            mergedOptions.serviceType ? `Service Type: ${mergedOptions.serviceType}` : null,
            'Enterprise Package: ✅ Available'
          ].filter(Boolean));
          
          // Use enterprise assessment
          const { 
            CapabilityAssessmentEngine, 
            ServiceAutoDiscovery,
            runAssessmentWorkflow 
          } = orchestrationModule;

          assessment = await runAssessmentWorkflow({
            servicePath: targetPath,
            domain: mergedOptions.domain,
            serviceType: mergedOptions.serviceType,
            token: mergedOptions.token || process.env.CLOUDFLARE_API_TOKEN
          });
        } else {
          output.section('Basic Capability Assessment');
          output.list([
            `Service Path: ${targetPath}`,
            mergedOptions.domain ? `Domain: ${mergedOptions.domain}` : null,
            mergedOptions.serviceType ? `Service Type: ${mergedOptions.serviceType}` : null,
            'Enterprise Package: ⚠️  Not Available (using basic checks)'
          ].filter(Boolean));
          
          // Use basic assessment with available testers
          assessment = await runBasicAssessment(targetPath, mergedOptions);
        }

        // Display results
        output.section('✅ Assessment Results');
        
        if (hasEnterprisePackage) {
          output.list([
            `Service Type: ${assessment.mergedInputs?.serviceType || assessment.serviceType || 'Not determined'}`,
            `Confidence: ${assessment.confidence}%`
          ]);
        } else {
          output.list([
            `Service Type: ${assessment.serviceType || 'Not determined'}`,
            `Confidence: ${assessment.confidence}%`,
            `Basic Checks: ${assessment.basicChecks?.length || 0} performed`
          ]);
          
          if (assessment.basicChecks && assessment.basicChecks.length > 0) {
            output.info('\n📋 Basic Checks:');
            assessment.basicChecks.forEach(check => output.info(`  ${check}`));
          }
          
          if (assessment.availableTesters && assessment.availableTesters.length > 0) {
            output.info(`\n✅ Available Testers: ${assessment.availableTesters.join(', ')}`);
          }
        }
        
        if (assessment.gapAnalysis?.missing) {
          if (assessment.gapAnalysis.missing.length > 0) {
            output.warning('⚠️  Missing Capabilities:');
            const missingItems = assessment.gapAnalysis.missing.map(gap => 
              `${gap.capability}: ${gap.reason || 'Not available'}`
            );
            output.list(missingItems);
          }
        }

        // Export results if requested
        if (mergedOptions.export) {
          const { writeFileSync } = await import('fs');
          writeFileSync(mergedOptions.export, JSON.stringify(assessment, null, 2));
          output.success(`📄 Results exported to: ${mergedOptions.export}`);
        }

      } catch (error) {
        const output = new (await import('../../lib/shared/utils/output-formatter.js')).OutputFormatter(options || {});
        output.error(`Assessment failed: ${error.message}`);
        if (process.env.DEBUG) {
          output.debug(error.stack);
        }
        process.exit(1);
      }
    });
}

/**
 * Run basic assessment using available framework capabilities
 * @param {string} servicePath - Path to the service
 * @param {Object} options - Assessment options
 * @returns {Promise<Object>} Basic assessment results
 */
async function runBasicAssessment(servicePath, options) {
  const { existsSync, readFileSync } = await import('fs');
  const { join } = await import('path');
  
  const results = {
    serviceType: 'unknown',
    confidence: 0,
    mergedInputs: {},
    gapAnalysis: { missing: [] },
    basicChecks: []
  };

  // Check package.json for service type
  const packagePath = join(servicePath, 'package.json');
  if (existsSync(packagePath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      results.serviceType = packageJson.name?.includes('data') ? 'data-service' : 
                           packageJson.name?.includes('auth') ? 'auth-service' : 'generic';
      results.confidence = 60;
      results.basicChecks.push('✅ Package.json found and parsed');
    } catch (error) {
      results.basicChecks.push('❌ Package.json parsing failed');
    }
  }

  // Check for required files
  const requiredFiles = ['wrangler.toml', 'src/config/domains.js', 'src/worker/index.js'];
  for (const file of requiredFiles) {
    const filePath = join(servicePath, file);
    if (existsSync(filePath)) {
      results.basicChecks.push(`✅ ${file} found`);
      results.confidence += 10;
    } else {
      results.basicChecks.push(`❌ ${file} missing`);
      results.gapAnalysis.missing.push({
        capability: file,
        reason: 'Required file not found'
      });
    }
  }

  // Check for available testers
  const testers = ['api-tester', 'auth-tester', 'database-tester'];
  results.availableTesters = [];
  for (const tester of testers) {
    try {
      await import(`../lib/shared/production-tester/${tester}.js`);
      results.availableTesters.push(tester);
      results.basicChecks.push(`✅ ${tester} available`);
    } catch (error) {
      results.basicChecks.push(`⚠️  ${tester} not available`);
    }
  }

  results.confidence = Math.min(results.confidence, 85); // Cap at 85% for basic assessment
  
  return results;
}
