/**
 * Deployment Credential Collector
 * 
 * Smart credential collection for deployment:
 * - Priority: flags → env vars → prompt → validate & auto-fetch
 * - Uses ApiTokenManager for secure token storage
 * - Uses CloudflareAPI for token validation and domain/zone discovery
 * - Derives missing credentials from valid token
 */

import chalk from 'chalk';
import { askUser, askPassword, askChoice, closePrompts } from '../utils/interactive-prompts.js';
import { ApiTokenManager } from '../security/api-token-manager.js';
import { CloudflareAPI } from '../../../src/utils/cloudflare/api.js';

export class DeploymentCredentialCollector {
  constructor(options = {}) {
    this.servicePath = options.servicePath || '.';
    this.quiet = options.quiet || false;
    this.tokenManager = new ApiTokenManager();
  }

  /**
   * Collect all deployment credentials intelligently
   * 
   * Strategy:
   * 1. Check for flags/env vars for all 3 credentials
   * 2. If any missing, prompt for API token first
   * 3. Validate API token and use it to fetch missing credentials
   * 4. Return complete credential set
   */
  async collectCredentials(options = {}) {
    const startCredentials = {
      token: options.token || process.env.CLOUDFLARE_API_TOKEN || null,
      accountId: options.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || null,
      zoneId: options.zoneId || process.env.CLOUDFLARE_ZONE_ID || null,
      zoneName: null // Will be populated when fetching zone
    };

    // All credentials provided - quick path
    if (startCredentials.token && startCredentials.accountId && startCredentials.zoneId) {
      if (!this.quiet) {
        const tokenSource = options.token ? '--token flag' : 'environment variable';
        console.log(chalk.blue(`\nℹ️  Using credentials from: ${tokenSource}`));
        console.log(chalk.green('✅ All credentials provided via flags or environment variables'));
      }
      return startCredentials;
    }

    // Need to collect interactively
    if (!this.quiet) {
      console.log(chalk.cyan('\n🔐 Deployment Credentials\n'));
      console.log(chalk.white('Clodo uses a smart credential collection strategy:'));
      console.log(chalk.gray('1. Use provided credentials if available'));
      console.log(chalk.gray('2. Prompt for Cloudflare API token'));
      console.log(chalk.gray('3. Auto-fetch account ID and zone ID from token'));
      console.log(chalk.gray('4. Validate and cache credentials\n'));
    }

    // Step 1: Get/prompt for API token
    let token = startCredentials.token;
    if (!token) {
      token = await this.promptForToken();
    }

    // Step 2: Validate token and get credential options
    if (!this.quiet) {
      console.log(chalk.cyan('\n🔍 Validating Cloudflare API token...\n'));
    }

    let accountId = startCredentials.accountId;
    let zoneId = startCredentials.zoneId;
    let zoneName = startCredentials.zoneName;

    try {
      const cloudflareAPI = new CloudflareAPI(token);
      
      // Verify token is valid
      const verification = await cloudflareAPI.verifyToken();
      if (!verification.valid) {
        console.error(chalk.red(`\n❌ Invalid Cloudflare API token`));
        console.error(chalk.yellow(verification.error));
        process.exit(1);
      }

      if (!this.quiet) {
        console.log(chalk.green('✅ API token verified\n'));
      }

      // If account ID not provided, fetch from Cloudflare
      if (!accountId) {
        accountId = await this.fetchAccountId(cloudflareAPI);
      }

      // If zone ID not provided, fetch from Cloudflare
      if (!zoneId) {
        const zoneInfo = await this.fetchZoneId(cloudflareAPI);
        zoneId = zoneInfo.id;
        zoneName = zoneInfo.name;
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Credential validation failed:`));
      console.error(chalk.yellow(error.message));
      process.exit(1);
    }

    if (!this.quiet) {
      console.log(chalk.green('\n✅ All credentials collected and validated\n'));
    }

    // Return structured Cloudflare settings object
    // This encapsulates all zone-specific configuration for multi-domain deployments
    return { 
      token, 
      accountId, 
      zoneId, 
      zoneName,
      // Convenience: cloudflareSettings object for passing to orchestrators
      cloudflareSettings: {
        token,
        accountId,
        zoneId,
        zoneName
      }
    };
  }

  /**
   * Prompt user for Cloudflare API token
   */
  async promptForToken() {
    console.log(chalk.cyan('🔑 Cloudflare API Token\n'));
    
    console.log(chalk.white('Your API token is used to:'));
    console.log(chalk.gray('  • Verify your Cloudflare account'));
    console.log(chalk.gray('  • Fetch your account ID and domains'));
    console.log(chalk.gray('  • Deploy your service\n'));

    console.log(chalk.cyan('💡 How to get your API token:'));
    console.log(chalk.white('  1. Go to: https://dash.cloudflare.com/profile/api-tokens'));
    console.log(chalk.white('  2. Click "Create Token"'));
    console.log(chalk.white('  3. Use "Edit Cloudflare Workers" template'));
    console.log(chalk.white('  4. Copy the token and paste it below\n'));

    // Check if token exists in cache
    if (this.tokenManager.hasToken('cloudflare')) {
      const cached = await askUser(
        'Use cached Cloudflare API token? (yes/no)',
        'yes'
      );
      
      if (cached.toLowerCase() === 'yes' || cached.toLowerCase() === 'y') {
        return this.tokenManager.tokens.cloudflare;
      }
    }

    // Prompt for new token
    const token = await askPassword('Enter your Cloudflare API token');
    
    if (!token || token.trim() === '') {
      console.error(chalk.red('❌ API token is required'));
      process.exit(1);
    }

    // Cache the token for future use
    this.tokenManager.tokens.cloudflare = token.trim();
    this.tokenManager.saveTokens();

    return token.trim();
  }

  /**
   * Fetch account ID from Cloudflare API
   */
  async fetchAccountId(cloudflareAPI) {
    try {
      if (!this.quiet) {
        console.log(chalk.cyan('📋 Fetching your Cloudflare account ID...\n'));
      }

      const response = await cloudflareAPI.request('/accounts?per_page=100');
      const accounts = response.result || [];

      if (accounts.length === 0) {
        console.error(chalk.red('❌ No Cloudflare accounts found'));
        process.exit(1);
      }

      if (accounts.length === 1) {
        if (!this.quiet) {
          console.log(chalk.green(`✅ Found account: ${accounts[0].name}\n`));
        }
        return accounts[0].id;
      }

      // Multiple accounts - let user choose
      if (!this.quiet) {
        console.log(chalk.white('Found multiple accounts:\n'));
      }

      const choices = accounts.map((acc, idx) => `${acc.name} (${acc.id})`);
      const selectedIndex = await askChoice(
        'Select account:',
        choices,
        0
      );

      const selectedAccount = accounts[selectedIndex];

      if (!this.quiet) {
        console.log(chalk.green(`✅ Selected: ${selectedAccount.name}\n`));
      }

      return selectedAccount.id;
    } catch (error) {
      console.error(chalk.red('❌ Failed to fetch account ID:'));
      console.error(chalk.yellow(error.message));
      process.exit(1);
    }
  }

  /**
   * Fetch zone ID from Cloudflare API
   */
  async fetchZoneId(cloudflareAPI) {
    try {
      if (!this.quiet) {
        console.log(chalk.cyan('🌐 Fetching your Cloudflare domains...\n'));
      }

      const response = await cloudflareAPI.request('/zones?per_page=100');
      const zones = response.result || [];

      if (zones.length === 0) {
        console.error(chalk.red('❌ No Cloudflare domains found'));
        console.error(chalk.yellow('Please add a domain to your Cloudflare account first'));
        process.exit(1);
      }

      if (zones.length === 1) {
        if (!this.quiet) {
          console.log(chalk.green(`✅ Found domain: ${zones[0].name}\n`));
        }
        return { id: zones[0].id, name: zones[0].name };
      }

      // Multiple zones - let user choose
      if (!this.quiet) {
        console.log(chalk.white('Found multiple domains:\n'));
      }

      const choices = zones.map((zone, idx) => 
        `${zone.name} (Status: ${zone.status})`
      );
      const selectedIndex = await askChoice(
        'Select domain for deployment:',
        choices,
        0
      );

      const selectedZone = zones[selectedIndex];

      if (!this.quiet) {
        console.log(chalk.green(`✅ Selected: ${selectedZone.name}\n`));
      }

      return { id: selectedZone.id, name: selectedZone.name };
    } catch (error) {
      console.error(chalk.red('❌ Failed to fetch domains:'));
      console.error(chalk.yellow(error.message));
      process.exit(1);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    closePrompts();
  }
}

export default DeploymentCredentialCollector;
