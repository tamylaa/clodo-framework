/**
 * Assess Command - Run intelligent capability assessment
 * Requires @tamyla/clodo-orchestration package for professional edition
 */

import chalk from 'chalk';
import { StandardOptions } from '../../lib/shared/utils/cli-options.js';
import { ConfigLoader } from '../../lib/shared/utils/config-loader.js';

export function registerAssessCommand(program) {
  const command = program
    .command('assess [service-path]')
    .description('Run intelligent capability assessment (requires @tamyla/clodo-orchestration)')
    .option('--export <file>', 'Export assessment results to JSON file')
    .option('--domain <domain>', 'Domain name for assessment')
    .option('--service-type <type>', 'Service type for assessment')
    .option('--token <token>', 'Cloudflare API token')
  
  // Add standard options (--verbose, --quiet, --json, --no-color, --config-file)
  StandardOptions.define(command)
    .action(async (servicePath, options) => {
      try {
        const output = new (await import('../lib/shared/utils/output-formatter.js')).OutputFormatter(options);
        const configLoader = new ConfigLoader({ verbose: options.verbose, quiet: options.quiet, json: options.json });

        // Load config from file if specified
        let configFileData = {};
        if (options.configFile) {
          configFileData = configLoader.loadSafe(options.configFile, {});
          if (options.verbose && !options.quiet) {
            output.info(`Loaded configuration from: ${options.configFile}`);
          }
        }

        // Substitute environment variables
        configFileData = configLoader.substituteEnvironmentVariables(configFileData);

        // Merge config file defaults with CLI options (CLI takes precedence)
        const mergedOptions = configLoader.merge(configFileData, options);

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

        let assessment;
        const targetPath = servicePath || process.cwd();
        
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
        const output = new (await import('../lib/shared/utils/output-formatter.js')).OutputFormatter(options || {});
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
