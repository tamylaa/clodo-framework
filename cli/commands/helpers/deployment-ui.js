/**
 * Deployment UI Helpers
 * Handles confirmation prompts and next steps display
 */

import chalk from 'chalk';

/**
 * Prompt user for deployment confirmation
 * @param {Object} options - CLI options
 * @returns {Promise<boolean>} Whether user confirmed
 */
export async function confirmDeployment(options) {
  // Skip confirmation if: --yes flag, --dry-run mode, or non-interactive terminal
  if (options.dryRun) {
    return true; // Dry run doesn't need confirmation
  }

  if (options.yes) {
    console.log(chalk.gray('\n⚡ Auto-confirming deployment (--yes flag)\n'));
    return true;
  }

  if (!process.stdin.isTTY) {
    console.log(chalk.yellow('\n⚠️  Non-interactive mode: proceeding without confirmation'));
    console.log(chalk.gray('💡 Tip: Use --yes to suppress this warning\n'));
    return true;
  }

  // Interactive confirmation
  console.log(''); // Blank line for spacing
  
  const { createPromptModule } = await import('inquirer');
  const prompt = createPromptModule();
  
  const { confirmed } = await prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: chalk.bold('Proceed with this deployment?'),
      default: false
    }
  ]);
  
  if (!confirmed) {
    console.log(chalk.yellow('\n❌ Deployment cancelled by user\n'));
    console.log(chalk.gray('💡 Tip: Use --dry-run to preview changes without deploying'));
    return false;
  }
  
  console.log(''); // Blank line before starting deployment
  return true;
}

/**
 * Display deployment results summary
 * @param {Object} resultData - Deployment result data
 */
export function displayDeploymentResults(resultData) {
  const { result, serviceName, serviceType, selectedDomain, environment } = resultData;

  console.log(chalk.green('\n✅ Deployment Completed Successfully!\n'));
  console.log(chalk.gray('─'.repeat(60)));

  // Display results from orchestrator
  if (result.url) {
    console.log(chalk.white(`🌐 Service URL:     ${chalk.bold(result.url)}`));
  }

  console.log(chalk.white(`📦 Service:         ${serviceName}`));
  console.log(chalk.white(`🔧 Type:            ${serviceType}`));
  console.log(chalk.white(`🌍 Domain:          ${selectedDomain}`));
  console.log(chalk.white(`🌎 Environment:     ${environment || 'production'}`));

  if (result.workerId) {
    console.log(chalk.white(`👤 Worker ID:       ${result.workerId}`));
  }

  if (result.deploymentId) {
    console.log(chalk.white(`📋 Deployment ID:   ${result.deploymentId}`));
  }

  if (result.status) {
    const statusColor = result.status.toLowerCase().includes('success') 
      ? chalk.green 
      : chalk.yellow;
    console.log(chalk.white(`📊 Status:          ${statusColor(result.status)}`));
  }

  // Display audit information if available
  if (result.auditLog) {
    console.log(chalk.cyan('\n📋 Deployment Audit:'));
    console.log(chalk.gray(`  Started:  ${result.auditLog.startTime}`));
    console.log(chalk.gray(`  Completed: ${result.auditLog.endTime}`));
    console.log(chalk.gray(`  Duration: ${result.auditLog.duration}ms`));
  }

  console.log(chalk.gray('─'.repeat(60)));
}

/**
 * Display next steps after deployment
 * @param {Object} stepsData - Next steps data
 */
export function displayNextSteps(stepsData) {
  const { result, selectedDomain, serviceName, dryRun } = stepsData;

  if (dryRun) {
    console.log(chalk.cyan('\n💡 Dry Run Complete'));
    console.log(chalk.white(`  • Review the plan above`));
    console.log(chalk.white(`  • Remove --dry-run to execute deployment\n`));
    return;
  }

  console.log(chalk.cyan('\n💡 Next Steps:\n'));
  
  // Show both URLs if worker deployed
  if (result.url) {
    console.log(chalk.white(`  🌐 Your service is live at:`));
    console.log(chalk.green(`     ${result.url}`));
    
    // Show custom domain if different from workers.dev
    if (selectedDomain !== 'workers.cloudflare.com' && !selectedDomain.includes('workers.dev')) {
      console.log(chalk.white(`\n  ⚠️  Custom domain requires DNS setup:`));
      console.log(chalk.yellow(`     Domain: ${selectedDomain}`));
      console.log(chalk.gray(`     Add CNAME record: ${selectedDomain} → workers.dev`));
      console.log(chalk.gray(`     Or add route in Cloudflare Dashboard`));
    }
  }
  
  console.log(chalk.white(`\n  📝 Testing:`));
  console.log(chalk.gray(`     curl ${result.url || `https://${selectedDomain}`}/health`));
  
  console.log(chalk.white(`\n  📊 Monitoring:`));
  console.log(chalk.gray(`     wrangler tail ${serviceName}`));
  console.log(chalk.gray(`     https://dash.cloudflare.com`));
  
  if (result.deploymentId) {
    console.log(chalk.white(`\n  🔄 Rollback (if needed):`));
    console.log(chalk.gray(`     clodo-service rollback ${result.deploymentId}`));
  }
  
  console.log(''); // Blank line at end
}
