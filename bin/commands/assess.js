/**
 * Assess Command - Run intelligent capability assessment
 * Requires @tamyla/clodo-orchestration package for professional edition
 */

import chalk from 'chalk';

export function registerAssessCommand(program) {
  program
    .command('assess [service-path]')
    .description('Run intelligent capability assessment (requires @tamyla/clodo-orchestration)')
    .option('--export <file>', 'Export assessment results to JSON file')
    .option('--domain <domain>', 'Domain name for assessment')
    .option('--service-type <type>', 'Service type for assessment')
    .option('--token <token>', 'Cloudflare API token')
    .action(async (servicePath, options) => {
      try {
        // Try to load professional orchestration package
        let orchestrationModule;
        try {
          orchestrationModule = await import('@tamyla/clodo-orchestration');
        } catch (err) {
          console.error(chalk.red('❌ clodo-orchestration package not found'));
          console.error(chalk.yellow('💡 Install with: npm install @tamyla/clodo-orchestration'));
          process.exit(1);
        }

        const { 
          CapabilityAssessmentEngine, 
          ServiceAutoDiscovery,
          runAssessmentWorkflow 
        } = orchestrationModule;

        const targetPath = servicePath || process.cwd();
        console.log(chalk.cyan('\n🧠 Professional Capability Assessment'));
        console.log(chalk.gray('─'.repeat(60)));
        console.log(chalk.white(`Service Path: ${targetPath}`));
        
        if (options.domain) {
          console.log(chalk.white(`Domain: ${options.domain}`));
        }
        if (options.serviceType) {
          console.log(chalk.white(`Service Type: ${options.serviceType}`));
        }
        console.log(chalk.gray('─'.repeat(60)));

        // Use the assessment workflow
        const assessment = await runAssessmentWorkflow({
          servicePath: targetPath,
          domain: options.domain,
          serviceType: options.serviceType,
          token: options.token || process.env.CLOUDFLARE_API_TOKEN
        });

        // Display results
        console.log(chalk.cyan('\n✅ Assessment Results'));
        console.log(chalk.gray('─'.repeat(60)));
        console.log(chalk.white(`Service Type: ${assessment.mergedInputs?.serviceType || assessment.serviceType || 'Not determined'}`));
        console.log(chalk.white(`Confidence: ${assessment.confidence}%`));
        
        if (assessment.gapAnalysis?.missing) {
          console.log(chalk.white(`Missing Capabilities: ${assessment.gapAnalysis.missing.length}`));
          if (assessment.gapAnalysis.missing.length > 0) {
            console.log(chalk.yellow('\n⚠️  Missing:'));
            assessment.gapAnalysis.missing.forEach(gap => {
              console.log(chalk.yellow(`   • ${gap.capability}: ${gap.reason || 'Not available'}`));
            });
          }
        }

        console.log(chalk.gray('─'.repeat(60)));

        // Export results if requested
        if (options.export) {
          const { writeFileSync } = await import('fs');
          writeFileSync(options.export, JSON.stringify(assessment, null, 2));
          console.log(chalk.green(`\n📄 Results exported to: ${options.export}`));
        }

      } catch (error) {
        console.error(chalk.red(`Assessment failed: ${error.message}`));
        if (process.env.DEBUG) {
          console.error(chalk.gray(error.stack));
        }
        process.exit(1);
      }
    });
}
