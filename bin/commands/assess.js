/**
 * Assess Command - Run intelligent capability assessment
 * Requires @tamyla/clodo-orchestration package for professional edition
 */

import chalk from 'chalk';
import { StandardOptions } from '../shared/utils/cli-options.js';
import { ConfigLoader } from '../shared/utils/config-loader.js';

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
        const output = new (await import('../shared/utils/output-formatter.js')).OutputFormatter(options);
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
        try {
          orchestrationModule = await import('@tamyla/clodo-orchestration');
        } catch (err) {
          output.error('❌ clodo-orchestration package not found');
          output.info('💡 Install with: npm install @tamyla/clodo-orchestration');
          process.exit(1);
        }

        const { 
          CapabilityAssessmentEngine, 
          ServiceAutoDiscovery,
          runAssessmentWorkflow 
        } = orchestrationModule;

        const targetPath = servicePath || process.cwd();
        output.section('Professional Capability Assessment');
        output.list([
          `Service Path: ${targetPath}`,
          mergedOptions.domain ? `Domain: ${mergedOptions.domain}` : null,
          mergedOptions.serviceType ? `Service Type: ${mergedOptions.serviceType}` : null
        ].filter(Boolean));

        // Use the assessment workflow
        const assessment = await runAssessmentWorkflow({
          servicePath: targetPath,
          domain: mergedOptions.domain,
          serviceType: mergedOptions.serviceType,
          token: mergedOptions.token || process.env.CLOUDFLARE_API_TOKEN
        });

        // Display results
        output.section('✅ Assessment Results');
        output.list([
          `Service Type: ${assessment.mergedInputs?.serviceType || assessment.serviceType || 'Not determined'}`,
          `Confidence: ${assessment.confidence}%`
        ]);
        
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
        const output = new (await import('../shared/utils/output-formatter.js')).OutputFormatter(options || {});
        output.error(`Assessment failed: ${error.message}`);
        if (process.env.DEBUG) {
          output.debug(error.stack);
        }
        process.exit(1);
      }
    });
}
