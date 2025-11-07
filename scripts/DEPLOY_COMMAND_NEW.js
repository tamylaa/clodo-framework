// Deploy command - Smart minimal input for service projects only
import { program } from 'commander';
import chalk from 'chalk';
import { join } from 'path';

program
  .command('deploy')
  .description('Deploy a Clodo Framework service to Cloudflare Workers')
  .option('-e, --env <environment>', 'Target environment (development, staging, production)')
  .option('--token <token>', 'Cloudflare API token (uses CLOUDFLARE_API_TOKEN env var if not provided)')
  .option('--account-id <id>', 'Cloudflare account ID (uses CLOUDFLARE_ACCOUNT_ID env var if not provided)')
  .option('--zone-id <id>', 'Cloudflare zone ID (auto-discovered if not provided)')
  .option('--dry-run', 'Simulate deployment without making changes')
  .action(async (options) => {
    try {
      const { readFileSync, existsSync } = await import('fs');
      
      console.log(chalk.cyan('\n🚀 Clodo Service Deployment'));
      console.log(chalk.gray('─'.repeat(60)));
      
      // ===== STEP 1: SERVICE DETECTION =====
      // Check if this is a Clodo service project (has clodo-service-manifest.json)
      const manifestPath = join(process.cwd(), 'clodo-service-manifest.json');
      
      if (!existsSync(manifestPath)) {
        console.error(chalk.red('\n❌ Not a Clodo Framework service project!\n'));
        console.error(chalk.white('This command must be run from within a service created by the framework.\n'));
        console.error(chalk.yellow('To create a new service:\n'));
        console.error(chalk.white('  npx @tamyla/clodo-framework create\n'));
        console.error(chalk.cyan('To deploy an existing service:\n'));
        console.error(chalk.white('  1. cd into your service project directory\n'));
        console.error(chalk.white('  2. Set Cloudflare credentials:\n'));
        console.error(chalk.white('     export CLOUDFLARE_API_TOKEN=your_token\n'));
        console.error(chalk.white('     export CLOUDFLARE_ACCOUNT_ID=your_account_id\n'));
        console.error(chalk.white('  3. Run: npx clodo-service deploy --env production\n'));
        process.exit(1);
      }
      
      let manifest;
      try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      } catch (err) {
        console.error(chalk.red(`\n❌ Invalid service manifest: ${err.message}\n`));
        process.exit(1);
      }
      
      console.log(chalk.green(`✅ Service detected: ${chalk.bold(manifest.serviceName)}`));
      console.log(chalk.white(`   Type:      ${manifest.serviceType}`));
      console.log(chalk.white(`   Framework: ${manifest.framework}\n`));
      
      // ===== STEP 2: SMART CREDENTIAL GATHERING =====
      // Gather credentials: from flags > env vars > ask if missing
      console.log(chalk.cyan('📋 Gathering Deployment Credentials'));
      console.log(chalk.gray('─'.repeat(60)));
      
      // Get environment: from flag > manifest > default to production
      const environment = options.env || manifest.configuration?.environment || 'production';
      console.log(chalk.white(`Target environment: ${chalk.bold(environment)}`));
      
      // Get Cloudflare token: from flag > env var
      let token = options.token || process.env.CLOUDFLARE_API_TOKEN;
      if (!token) {
        console.error(chalk.red('\n❌ Cloudflare API token required\n'));
        console.error(chalk.white('Provide via:\n'));
        console.error(chalk.white('  • Command: npx clodo-service deploy --token <token>\n'));
        console.error(chalk.white('  • Environment: export CLOUDFLARE_API_TOKEN=<token>\n'));
        process.exit(1);
      }
      console.log(chalk.green(`✅ Cloudflare token: ${token.substring(0, 20)}...`));
      
      // Get Cloudflare account ID: from flag > env var
      let accountId = options.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
      if (!accountId) {
        console.error(chalk.red('\n❌ Cloudflare account ID required\n'));
        console.error(chalk.white('Provide via:\n'));
        console.error(chalk.white('  • Command: npx clodo-service deploy --account-id <id>\n'));
        console.error(chalk.white('  • Environment: export CLOUDFLARE_ACCOUNT_ID=<id>\n'));
        process.exit(1);
      }
      console.log(chalk.green(`✅ Account ID: ${accountId.substring(0, 8)}...`));
      
      // Get Cloudflare zone ID: from flag > env var (can be auto-discovered later)
      let zoneId = options.zoneId || process.env.CLOUDFLARE_ZONE_ID;
      if (zoneId) {
        console.log(chalk.green(`✅ Zone ID: ${zoneId.substring(0, 8)}...`));
      } else {
        console.log(chalk.yellow('⚠️  Zone ID: Will be auto-discovered from domain'));
      }
      
      // Set environment variables for downstream components
      process.env.CLOUDFLARE_API_TOKEN = token;
      process.env.CLOUDFLARE_ACCOUNT_ID = accountId;
      if (zoneId) {
        process.env.CLOUDFLARE_ZONE_ID = zoneId;
      }
      
      console.log(chalk.gray('─'.repeat(60)));
      
      // ===== STEP 3: INTEGRATION WITH MODULAR DEPLOYER =====
      // TODO: Import and call ModularEnterpriseDeployer here
      // For now, show what would happen
      
      console.log(chalk.cyan('\n📋 Deployment Plan:'));
      console.log(chalk.white(`   Service:      ${manifest.serviceName}`));
      console.log(chalk.white(`   Type:         ${manifest.serviceType}`));
      console.log(chalk.white(`   Environment:  ${environment}`));
      console.log(chalk.white(`   Account:      ${accountId.substring(0, 8)}...`));
      
      if (options.dryRun) {
        console.log(chalk.yellow('\n✅ Dry run complete - deployment validated\n'));
      } else {
        console.log(chalk.yellow('\n⚠️  Deployment integration with modular deployer pending'));
        console.log(chalk.white('   See: DEPLOYMENT_SYSTEMS_ANALYSIS.md for architecture\n'));
      }
      
      console.log(chalk.green('✅ Deployment preparation complete\n'));
      
    } catch (error) {
      console.error(chalk.red(`\n❌ Deployment failed: ${error.message}\n`));
      
      if (process.env.DEBUG) {
        console.error(chalk.gray('Stack trace:'));
        console.error(chalk.gray(error.stack));
      }
      
      process.exit(1);
    }
  });
