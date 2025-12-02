/**
 * Cloudflare Domain & Service Manager
 * Comprehensive domain verification and service status management
 * 
 * Handles:
 * 1. Cloudflare authentication verification
 * 2. Domain availability checking  
 * 3. Existing service discovery and matching
 * 4. Service status verification
 * 5. Deployment permission management
 */

import { execSync } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import { askChoice, askYesNo } from '../utils/interactive-prompts.js';
import { DomainDiscovery } from './domain-discovery.js';
import { MultiDomainOrchestrator } from '../deployment/index.js';
import { getCommandConfig } from '../config/command-config-manager.js';
import { CloudflareTokenManager } from '../security/api-token-manager.js';

const execAsync = promisify(exec);

export class CloudflareDomainManager {
  constructor(options = {}) {
    this.apiToken = options.apiToken;
    this.accountId = options.accountId;
    this.isAuthenticated = false;
    this.availableDomains = [];
    this.deployedServices = [];
    
    // Initialize command configuration
    this.cmdConfig = getCommandConfig();
    
    // Initialize API token manager
    this.tokenManager = new CloudflareTokenManager();
    
    // Initialize existing modules
    this.domainDiscovery = new DomainDiscovery({
      apiToken: this.apiToken,
      enableCaching: true
    });
    
    this.orchestrator = new MultiDomainOrchestrator({
      maxConcurrentDeployments: 1,
      timeout: 300000
    });
  }

  /**
   * Step 1: Verify Cloudflare authentication
   */
  async verifyAuthentication() {
    console.log('🔐 Verifying Cloudflare authentication...');
    
    try {
      const whoamiCmd = this.cmdConfig.getCloudflareCommand('whoami');
      const { stdout } = await execAsync(whoamiCmd);
      
      if (stdout.includes('You are not authenticated') || stdout.includes('not logged in')) {
        return await this.handleAuthenticationRequired();
      }
      
      // Extract and display account information
      const accountInfo = this.parseAccountInfo(stdout);
      console.log('   ✅ Cloudflare: authenticated');
      if (accountInfo.email) {
        console.log(`   📧 Account: ${accountInfo.email}`);
      }
      if (accountInfo.accountId) {
        console.log(`   🆔 Account ID: ${accountInfo.accountId}`);
        this.accountId = accountInfo.accountId;
      }
      if (accountInfo.accountName) {
        console.log(`   🏢 Account Name: ${accountInfo.accountName}`);
      }
      
      this.isAuthenticated = true;
      return true;
      
    } catch (error) {
      return await this.handleAuthenticationRequired();
    }
  }

  /**
   * Handle authentication requirement
   */
  async handleAuthenticationRequired() {
    console.log('   ❌ Cloudflare authentication required');
    
    const authChoice = await askChoice(
      'Cloudflare authentication needed. What would you like to do?',
      [
        'Login to Cloudflare now',
        'Provide API token manually', 
        'Skip Cloudflare verification (limited features)',
        'Cancel deployment'
      ],
      0
    );

    switch (authChoice) {
      case 0:
        return await this.performCloudflareLogin();
      case 1:
        return await this.setApiToken();
      case 2:
        console.log('   ⚠️ Skipping Cloudflare verification - some features unavailable');
        return false;
      case 3:
        throw new Error('Deployment cancelled - authentication required');
    }
  }

  /**
   * Perform Cloudflare login
   */
  async performCloudflareLogin() {
    try {
      console.log('🔑 Opening Cloudflare authentication...');
      const authCmd = this.cmdConfig.getCloudflareCommand('auth_login');
      await execAsync(authCmd, { stdio: 'inherit' });
      
      // Verify login worked
      const whoamiCmd = this.cmdConfig.getCloudflareCommand('whoami');
      const { stdout } = await execAsync(whoamiCmd);
      if (!stdout.includes('You are not authenticated')) {
        console.log('   ✅ Cloudflare authentication successful');
        this.isAuthenticated = true;
        return true;
      } else {
        throw new Error('Authentication verification failed');
      }
    } catch (error) {
      console.log(`   ❌ Authentication failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Set API token manually
   */
  async setApiToken() {
    const { askUser } = await import('../utils/interactive-prompts.js');
    
    const token = await askUser('Enter your Cloudflare API Token:');
    if (!token || token.trim() === '') {
      console.log('   ❌ API token is required');
      return false;
    }

    // Test the token
    try {
      const whoamiCmd = this.cmdConfig.getCloudflareCommand('whoami');
      const { stdout } = await execAsync(`CLOUDFLARE_API_TOKEN=${token} ${whoamiCmd}`);
      console.log('   ✅ API token verified successfully');
      this.apiToken = token;
      this.isAuthenticated = true;
      return true;
    } catch (error) {
      console.log('   ❌ Invalid API token');
      return false;
    }
  }

  /**
   * Step 2: Get available domains from Cloudflare using existing domain discovery
   */
  async getAvailableDomains() {
    if (!this.isAuthenticated) {
      console.log('   ⚠️ Skipping domain discovery - not authenticated');
      return [];
    }

    console.log('🌐 Discovering available domains from Cloudflare...');
    
    try {
      // Use existing domain discovery module
      await this.domainDiscovery.initializeDiscovery();
      
      // Get domains from wrangler deployments (updated command)
      let services = [];
      try {
        const deploymentsCmd = this.cmdConfig.getCloudflareCommand('deployments_list');
        const { stdout } = await execAsync(deploymentsCmd);
        services = this.parseWranglerDeployments(stdout);
      } catch (error) {
        // Fallback: try to get workers list
        try {
          const listWorkersCmd = this.cmdConfig.getCloudflareCommand('list_workers');
          const { stdout: workersOutput } = await execAsync(listWorkersCmd);
          // If wrangler dev works, try alternate commands
          console.log('   📋 Using alternative service discovery...');
        } catch {
          console.log('   📋 No existing deployments found');
        }
      }
      
      // Extract unique domains from services
      const serviceDomains = [...new Set(services.map(s => s.domain).filter(Boolean))];
      
      // Try to get additional domains from orchestrator
      let orchestratorDomains = [];
      try {
        const portfolioInfo = await this.orchestrator.getPortfolioStatus();
        orchestratorDomains = portfolioInfo.domains || [];
      } catch (error) {
        // Orchestrator domains not available, continue with service domains
      }
      
      // Combine and deduplicate domains
      const allDomains = [...new Set([...serviceDomains, ...orchestratorDomains])];
      this.availableDomains = allDomains;
      
      console.log(`   📋 Found ${allDomains.length} available domains`);
      allDomains.forEach(domain => console.log(`     - ${domain}`));
      
      return allDomains;
    } catch (error) {
      console.log(`   ⚠️ Could not retrieve domains: ${error.message}`);
      return [];
    }
  }

  /**
   * Step 3: Verify domain availability and match existing services
   */
  async verifyDomainAndMatchServices(requestedDomain) {
    console.log(`🔍 Verifying domain: ${requestedDomain}`);
    
    // Check if domain exists in Cloudflare (with root domain analysis)
    const domainCheck = await this.checkDomainInCloudflare(requestedDomain);
    
    if (!domainCheck.found) {
      return await this.handleNewDomain(requestedDomain, domainCheck);
    }

    // Domain/root domain exists - check for existing services
    if (domainCheck.isSubdomain) {
      console.log('   ✅ Root domain exists - service subdomain can be deployed');
    } else {
      console.log('   ✅ Domain found in Cloudflare');
    }
    
    return await this.checkExistingServices(requestedDomain, domainCheck);
  }

  /**
   * Handle completely new domain or missing root domain
   */
  async handleNewDomain(domain, domainCheck) {
    if (domainCheck.isSubdomain) {
      console.log('   ❌ Root domain not found in Cloudflare account');
      console.log(`   ⚠️  Cannot deploy ${domain} because ${domainCheck.rootDomain} is not managed in this account`);
      
      // Show what domains ARE available in this account
      await this.showAvailableDomainsInAccount();
      
      // Generate domain suggestions
      await this.showDomainSuggestions(domain, domainCheck);
    } else {
      console.log('   🆕 This is a new root domain - ready for first deployment');
      console.log('   💡 This is normal for newly created domains');
    }
    
    // Show account context for troubleshooting
    console.log('   📋 Account Context:');
    const accountDetails = await this.getAccountDetails();
    
    if (accountDetails.error) {
      console.log(`   ⚠️  Could not fetch account details: ${accountDetails.error}`);
    } else {
      if (accountDetails.accountId) {
        console.log(`   🆔 Account ID: ${accountDetails.accountId}`);
      }
      if (accountDetails.totalZones !== undefined) {
        console.log(`   🌐 Total zones in account: ${accountDetails.totalZones}`);
        if (accountDetails.zones && accountDetails.zones.length > 0) {
          console.log(`   📄 Sample zones: ${accountDetails.zones.slice(0, 3).join(', ')}${accountDetails.totalZones > 3 ? '...' : ''}`);
        }
      }
    }
    
    // Different choices based on domain type
    let choicePrompt, choiceOptions;
    
    if (domainCheck.isSubdomain) {
      choicePrompt = `Root domain ${domainCheck.rootDomain} not found. What would you like to do?`;
      choiceOptions = [
        'Choose a different service name with an available root domain',
        'View available domains in your account',
        'Cancel deployment (add root domain to Cloudflare first)'
      ];
    } else {
      choicePrompt = `Ready to deploy new root domain ${domain}?`;
      choiceOptions = [
        'Yes, proceed with first deployment',
        'Choose a different domain from available list', 
        'Cancel deployment'
      ];
    }
    
    const choice = await askChoice(choicePrompt, choiceOptions, 0);

    switch (choice) {
      case 0:
        console.log('   ✅ Proceeding with first deployment');
        return { status: 'new', action: 'deploy', services: [] };
      case 1:
        throw new Error('CHOOSE_DIFFERENT_DOMAIN');
      case 2:
        throw new Error('DEPLOYMENT_CANCELLED');
    }
  }

  /**
   * Check for existing services on domain using orchestrator
   */
  async checkExistingServices(domain, domainCheck = null) {
    console.log('   🔍 Checking for existing services...');
    
    try {
      // Use orchestrator to get comprehensive service info
      let domainServices = [];
      
      try {
        const portfolioStatus = await this.orchestrator.getPortfolioStatus();
        const domainInfo = portfolioStatus.domainDetails?.find(d => d.domain === domain);
        
        if (domainInfo && domainInfo.services) {
          domainServices = domainInfo.services.map(s => ({
            name: s.name,
            status: s.status || 'unknown',
            domain: domain,
            lastDeployed: s.lastDeployed,
            health: s.health
          }));
        }
      } catch (orchestratorError) {
        // Fallback to wrangler deployments
        console.log('   📋 Using fallback service discovery...');
        try {
          const deploymentsCmd = this.cmdConfig.getCloudflareCommand('deployments_list');
          const { stdout } = await execAsync(deploymentsCmd);
          const services = this.parseWranglerDeployments(stdout);
          domainServices = services.filter(s => s.domain === domain);
        } catch (fallbackError) {
          console.log('   📝 No deployment history found - treating as new domain');
          domainServices = [];
        }
      }
      
      if (domainServices.length === 0) {
        console.log('   📝 No existing services found - fresh deployment');
        return { status: 'available', action: 'deploy', services: [] };
      }

      console.log(`   📋 Found ${domainServices.length} existing service(s):`);
      domainServices.forEach(service => {
        const healthInfo = service.health ? ` (${service.health})` : '';
        const deployedInfo = service.lastDeployed ? ` - Last deployed: ${service.lastDeployed}` : '';
        console.log(`     - ${service.name} (${service.status})${healthInfo}${deployedInfo}`);
      });

      return await this.handleExistingServices(domain, domainServices);
      
    } catch (error) {
      console.log(`   ⚠️ Could not check services: ${error.message}`);
      return { status: 'unknown', action: 'deploy', services: [] };
    }
  }

  /**
   * Handle existing services - ask for permission
   */
  async handleExistingServices(domain, services) {
    const activeServices = services.filter(s => s.status === 'active' || s.status === 'deployed');
    
    if (activeServices.length > 0) {
      console.log('   ⚠️ Active services detected on this domain');
      
      const updateConfirm = await askYesNo(
        `Update/overwrite ${activeServices.length} active service(s) on ${domain}?`
      );
      
      if (!updateConfirm) {
        throw new Error('DEPLOYMENT_CANCELLED - User declined to update active services');
      }
      
      console.log('   ✅ Permission granted to update existing services');
      return { status: 'update', action: 'update', services: activeServices };
    }

    console.log('   ✅ Existing services are inactive - safe to deploy');
    return { status: 'replace', action: 'deploy', services };
  }

  /**
   * Parse wrangler deployments list output
   */
  parseWranglerDeployments(stdout) {
    // Handle new wrangler deployments format
    const lines = stdout.split('\n').filter(line => line.trim());
    const services = [];
    
    for (const line of lines) {
      if (line.includes('worker') || line.includes('deployment')) {
        // Extract service info from deployment output
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          services.push({
            name: parts[0] || 'unknown',
            status: 'deployed',
            domain: this.extractDomainFromService(parts[0]),
            lastDeployed: parts[1] || 'unknown'
          });
        }
      }
    }
    
    return services;
  }

  /**
   * Parse wrangler list output (legacy - keep for fallback)
   */
  parseWranglerList(stdout) {
    const lines = stdout.split('\\n').filter(line => line.trim());
    const services = [];
    
    // Skip header lines
    const dataLines = lines.slice(2);
    
    for (const line of dataLines) {
      if (line.trim()) {
        const parts = line.split(/\\s+/);
        if (parts.length >= 2) {
          services.push({
            name: parts[0],
            status: parts[1] || 'unknown',
            domain: this.extractDomainFromService(parts[0]),
          });
        }
      }
    }
    
    return services;
  }

  /**
   * Extract domain from service name (basic heuristic)
   */
  extractDomainFromService(serviceName) {
    // Try to extract domain from service name patterns
    // This is a heuristic - may need refinement based on naming conventions
    if (serviceName.includes('.')) {
      return serviceName.split('-')[0] || serviceName;
    }
    return null;
  }

  /**
   * Parse account information from wrangler whoami output
   */
  parseAccountInfo(stdout) {
    const accountInfo = {
      email: null,
      accountId: null,
      accountName: null
    };

    const lines = stdout.split('\n');
    let inAccountTable = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Extract email from OAuth message
      if (trimmedLine.includes('associated with the email')) {
        const emailMatch = trimmedLine.match(/associated with the email (.+@.+?)\.?$/);
        if (emailMatch) {
          accountInfo.email = emailMatch[1].trim();
        }
      }
      
      // Detect account table start
      if (trimmedLine.includes('Account Name') && trimmedLine.includes('Account ID')) {
        inAccountTable = true;
        continue;
      }
      
      // Extract from account table
      if (inAccountTable && trimmedLine.includes('│') && !trimmedLine.includes('Account Name')) {
        // Stop at table end
        if (trimmedLine.startsWith('└')) {
          inAccountTable = false;
          continue;
        }
        
        // Skip separator line
        if (trimmedLine.includes('├') || trimmedLine.includes('─')) {
          continue;
        }
        
        // Parse account data line: │ Account Name │ Account ID │
        const parts = trimmedLine.split('│');
        if (parts.length >= 3) {
          const name = parts[1]?.trim();
          const id = parts[2]?.trim();
          
          if (name && name !== 'Account Name') {
            accountInfo.accountName = name;
          }
          
          if (id && id !== 'Account ID' && id.length >= 30) {
            accountInfo.accountId = id;
          }
        }
      }
    }

    return accountInfo;
  }

  /**
   * Extract root domain from service subdomain
   * Handles cases where www.domain.com is the root, not domain.com
   * e.g., data-service.greatidude.com -> check both www.greatidude.com AND greatidude.com
   */
  extractRootDomain(fullDomain) {
    const parts = fullDomain.split('.');
    
    if (parts.length >= 3) {
      // For service subdomains like data-service.greatidude.com
      // We need to check if www.greatidude.com exists (not just greatidude.com)
      const domainWithoutService = parts.slice(1).join('.'); // greatidude.com
      const wwwDomain = `www.${domainWithoutService}`; // www.greatidude.com
      
      return {
        bareRoot: domainWithoutService,     // greatidude.com
        wwwRoot: wwwDomain,                 // www.greatidude.com
        domainsToCheck: [wwwDomain, domainWithoutService],
        needsBothChecks: true
      };
    } else if (parts.length === 3 && parts[0] === 'www') {
      // For www.greatidude.com - this IS the root domain
      const bareRoot = parts.slice(1).join('.'); // greatidude.com
      return {
        bareRoot: bareRoot,
        wwwRoot: fullDomain,  // www.greatidude.com
        domainsToCheck: [fullDomain, bareRoot],
        isWwwRoot: true,
        needsBothChecks: false
      };
    } else if (parts.length === 2) {
      // For greatidude.com - check both bare and www
      const wwwDomain = `www.${fullDomain}`;
      return {
        bareRoot: fullDomain,    // greatidude.com
        wwwRoot: wwwDomain,      // www.greatidude.com
        domainsToCheck: [wwwDomain, fullDomain],
        needsBothChecks: true
      };
    }
    
    return {
      bareRoot: fullDomain,
      wwwRoot: fullDomain,
      domainsToCheck: [fullDomain],
      needsBothChecks: false
    };
  }

  /**
   * Ensure API token is available for domain verification
   */
  async ensureApiToken() {
    if (!this.apiToken) {
      try {
        console.log('   🔑 API token required for domain verification');
        this.apiToken = await this.tokenManager.getCloudflareToken();
        
        // Also set it in domain discovery
        this.domainDiscovery.apiToken = this.apiToken;
        
        return true;
      } catch (error) {
        console.log(`   ❌ Failed to get API token: ${error.message}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Check if domain exists in Cloudflare zones using domain discovery
   * Handles both www.domain.com and domain.com as potential roots
   */
  async checkDomainInCloudflare(domain) {
    if (!this.isAuthenticated) return false;
    
    const rootInfo = this.extractRootDomain(domain);
    const isServiceSubdomain = rootInfo.needsBothChecks || rootInfo.isWwwRoot === undefined;
    
    console.log(`   🔍 Analyzing domain structure:`);
    if (isServiceSubdomain && !rootInfo.isWwwRoot) {
      console.log(`   📍 Service subdomain: ${domain}`);
      console.log(`   🔍 Checking potential root domains:`);
      console.log(`      • www root: ${rootInfo.wwwRoot}`);
      console.log(`      • bare root: ${rootInfo.bareRoot}`);
    } else if (rootInfo.isWwwRoot) {
      console.log(`   🌐 WWW root domain: ${domain}`);
    } else {
      console.log(`   🌐 Domain: ${domain}`);
    }
    
    // Try to find which root domain exists
    let foundDomain = null;
    let domainConfig = null;
    
    try {
      // First try www version if it's different
      if (rootInfo.wwwRoot !== rootInfo.bareRoot) {
        try {
          console.log(`   🔍 Checking: ${rootInfo.wwwRoot}...`);
          domainConfig = await this.domainDiscovery.discoverDomainConfig(rootInfo.wwwRoot, this.apiToken);
          if (domainConfig && domainConfig.zoneId) {
            foundDomain = rootInfo.wwwRoot;
            console.log(`   ✅ Found www root: ${rootInfo.wwwRoot} (Zone: ${domainConfig.zoneId})`);
          }
        } catch (wwwError) {
          if (wwwError.message.includes('API token is required')) {
            console.log(`   🔑 API token required to verify ${rootInfo.wwwRoot}`);
            
            // Automatically attempt to get API token
            const tokenObtained = await this.ensureApiToken();
            if (tokenObtained) {
              console.log(`   🔄 Retrying www verification with API token...`);
              try {
                domainConfig = await this.domainDiscovery.discoverDomainConfig(rootInfo.wwwRoot, this.apiToken);
                if (domainConfig && domainConfig.zoneId) {
                  foundDomain = rootInfo.wwwRoot;
                  console.log(`   ✅ Found www root: ${rootInfo.wwwRoot} (Zone: ${domainConfig.zoneId})`);
                }
              } catch (retryError) {
                console.log(`   📝 WWW root ${rootInfo.wwwRoot} not found after token verification`);
              }
            }
          } else {
            console.log(`   📝 WWW root ${rootInfo.wwwRoot} not found`);
          }
        }
      }
      
      // If www not found, try bare domain
      if (!foundDomain) {
        try {
          console.log(`   🔍 Checking: ${rootInfo.bareRoot}...`);
          domainConfig = await this.domainDiscovery.discoverDomainConfig(rootInfo.bareRoot, this.apiToken);
          if (domainConfig && domainConfig.zoneId) {
            foundDomain = rootInfo.bareRoot;
            console.log(`   ✅ Found bare root: ${rootInfo.bareRoot} (Zone: ${domainConfig.zoneId})`);
          }
        } catch (bareError) {
          if (bareError.message.includes('API token is required')) {
            console.log(`   🔑 API token required to verify ${rootInfo.bareRoot}`);
            
            // Automatically attempt to get API token
            const tokenObtained = await this.ensureApiToken();
            if (tokenObtained) {
              console.log(`   🔄 Retrying verification with API token...`);
              try {
                domainConfig = await this.domainDiscovery.discoverDomainConfig(rootInfo.bareRoot, this.apiToken);
                if (domainConfig && domainConfig.zoneId) {
                  foundDomain = rootInfo.bareRoot;
                  console.log(`   ✅ Found bare root: ${rootInfo.bareRoot} (Zone: ${domainConfig.zoneId})`);
                }
              } catch (retryError) {
                console.log(`   📝 Bare root ${rootInfo.bareRoot} not found after token verification`);
              }
            }
          } else {
            console.log(`   📝 Bare root ${rootInfo.bareRoot} not found`);
          }
        }
      }
      
      if (foundDomain && domainConfig) {
        if (isServiceSubdomain && !rootInfo.isWwwRoot) {
          console.log(`   📋 Service ${domain} can be deployed to zone: ${foundDomain}`);
        }
        
        if (this.accountId) {
          console.log(`   🔗 Checked in account: ${this.accountId}`);
        }
        
        return { 
          found: true, 
          rootDomain: foundDomain,
          actualRootFound: foundDomain,
          zoneId: domainConfig.zoneId,
          isSubdomain: isServiceSubdomain,
          serviceDomain: domain
        };
      }
      
      // Neither root found - but this might be due to API token limitation
      console.log(`   ⚠️  Cannot verify domain via API (requires explicit API token)`);
      console.log(`   🔍 OAuth authentication doesn't support direct domain verification`);
      console.log(`   💡 Domains checked: ${rootInfo.wwwRoot}, ${rootInfo.bareRoot}`);
      if (this.accountId) {
        console.log(`   🔍 Account: ${this.accountId}`);
      }
      
      console.log(`   📋 To verify if domain exists:`);
      console.log(`      → Check Cloudflare Dashboard: https://dash.cloudflare.com`);
      console.log(`      → Look for ${rootInfo.bareRoot} or ${rootInfo.wwwRoot} in your domains`);
      
      return { 
        found: false, 
        rootDomain: rootInfo.bareRoot,
        alternateRoot: rootInfo.wwwRoot,
        isSubdomain: isServiceSubdomain,
        serviceDomain: domain,
        requiresApiToken: true
      };
      
    } catch (error) {
      console.log(`   ❌ Error checking domains: ${error.message}`);
      return { 
        found: false, 
        rootDomain: rootInfo.wwwRoot,
        alternateRoot: rootInfo.bareRoot,
        isSubdomain: isServiceSubdomain,
        serviceDomain: domain,
        error: error.message
      };
    }
  }

  /**
   * Complete domain verification workflow
   */
  async verifyDomainWorkflow(requestedDomain) {
    try {
      // Step 1: Verify authentication
      const authSuccess = await this.verifyAuthentication();
      
      // Step 2: Get available domains (if authenticated)
      if (authSuccess) {
        await this.getAvailableDomains();
      }
      
      // Step 3: Verify domain and check services
      const result = await this.verifyDomainAndMatchServices(requestedDomain);
      
      return {
        authenticated: this.isAuthenticated,
        domainStatus: result.status,
        recommendedAction: result.action,
        existingServices: result.services,
        availableDomains: this.availableDomains
      };
      
    } catch (error) {
      if (error.message.includes('CHOOSE_DIFFERENT_DOMAIN')) {
        return { action: 'choose_different', availableDomains: this.availableDomains };
      }
      throw error;
    }
  }

  /**
   * Get comprehensive account details for troubleshooting
   */
  async getAccountDetails() {
    if (!this.isAuthenticated) {
      return { error: 'Not authenticated' };
    }

    try {
      const details = {
        accountId: this.accountId,
        authenticated: this.isAuthenticated,
        zones: [],
        totalZones: 0
      };

      // Try to get zone information using the working API method
      try {
        const zones = await this.fetchAccountZonesViaAPI();
        details.zones = zones.map(z => z.name);
        details.totalZones = zones.length;
        details.zoneListUnavailable = false;
        
      } catch (zoneError) {
        details.zoneError = 'Could not fetch zone information';
        details.zoneListUnavailable = true;
      }

      return details;
      
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Parse zone list output for account context
   * Falls back to alternative methods if direct zone listing not available
   */
  parseZoneList(stdout) {
    const zones = [];
    let totalZones = 0;

    try {
      // Check if zone listing is not available
      if (stdout.includes('Zone listing not available') || stdout.includes('Unknown arguments')) {
        return { zones: [], totalZones: 0, unavailable: true };
      }

      const lines = stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        // Look for zone entries (domain names)
        if (line.includes('.') && !line.includes('│') && !line.toLowerCase().includes('zone')) {
          const parts = line.trim().split(/\s+/);
          if (parts.length > 0 && parts[0].includes('.')) {
            zones.push(parts[0]);
            totalZones++;
          }
        }
        
        // Also check for table format
        if (line.includes('│') && line.includes('.')) {
          const match = line.match(/│\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*│/);
          if (match && !zones.includes(match[1])) {
            zones.push(match[1]);
            totalZones++;
          }
        }
      }

    } catch (error) {
      // Ignore parsing errors
    }

    return { zones: zones.slice(0, 5), totalZones }; // Limit to first 5 zones
  }

  /**
   * Fetch account zones using Cloudflare API (the working method!)
   */
  async fetchAccountZonesViaAPI() {
    if (!this.accountId) {
      throw new Error('Account ID not available');
    }

    // Use the domain discovery module's API method since it works
    try {
      const zones = await this.domainDiscovery.fetchAccountZones(this.accountId, this.apiToken);
      return zones || [];
    } catch (error) {
      // Fallback: try without explicit API token (use wrangler's auth)
      try {
        const response = await this.domainDiscovery.makeCloudflareRequest(
          `https://api.cloudflare.com/client/v4/zones?account.id=${this.accountId}`,
          null // Let it use default auth
        );
        
        if (response.success) {
          return response.result || [];
        }
      } catch (fallbackError) {
        // If all else fails, return empty array
      }
      
      throw error;
    }
  }

  /**
   * Show what domains are actually available in the Cloudflare account
   */
  async showAvailableDomainsInAccount() {
    console.log('');
    console.log('   📋 Domains found in your Cloudflare account:');
    
    const accountDetails = await this.getAccountDetails();
    
    if (accountDetails.error) {
      console.log('   ⚠️  Could not fetch account domains');
      return;
    }
    
    if (accountDetails.zoneListUnavailable && accountDetails.zoneError) {
      console.log('   ⚠️  API-based domain listing requires explicit API token');
      console.log('   🔍 Using OAuth authentication - cannot directly list zones');
      console.log('   💡 To check your domains:');
      console.log('      → Visit Cloudflare Dashboard: https://dash.cloudflare.com');
      console.log('      → Check the "Websites" section for your domains');
      console.log('   📧 Account: ' + (this.accountId || 'Unknown'));
    } else if (accountDetails.totalZones === 0) {
      console.log('   📝 No domains found in this Cloudflare account');
      console.log('   💡 This account has no DNS zones configured');
      console.log('   🌐 To add a domain:');
      console.log('      → Go to Cloudflare Dashboard → Add a Site');
    } else {
      console.log(`   🌐 Found ${accountDetails.totalZones} domain(s):`);
      
      if (accountDetails.zones && accountDetails.zones.length > 0) {
        accountDetails.zones.forEach((zone, index) => {
          console.log(`      ${index + 1}. ${zone}`);
        });
        
        if (accountDetails.totalZones > accountDetails.zones.length) {
          console.log(`      ... and ${accountDetails.totalZones - accountDetails.zones.length} more`);
        }
      }
    }
  }

  /**
   * Show actionable domain suggestions based on account status
   */
  async showDomainSuggestions(serviceDomain, domainCheck) {
    console.log('   💡 Solutions:');
    
    const accountDetails = await this.getAccountDetails();
    
    if (accountDetails.totalZones > 0) {
      console.log(`      1. 🔄 Use an existing domain from your account:`);
      accountDetails.zones.forEach(zone => {
        const suggestedService = serviceDomain.replace(domainCheck.rootDomain, zone);
        console.log(`         → ${suggestedService}`);
      });
      console.log(`      2. ➕ Add ${domainCheck.rootDomain} to your Cloudflare account`);
      console.log(`      3. 🌐 Transfer ${domainCheck.rootDomain} DNS to Cloudflare`);
    } else {
      console.log(`      1. ➕ Add ${domainCheck.rootDomain} to your Cloudflare account first`);
      console.log(`      2. 🌐 Set up DNS for ${domainCheck.rootDomain} in Cloudflare`);
      console.log(`      3. 🔄 Or use a different domain that you own`);
    }
    
    console.log('');
    console.log('   📚 How to add a domain to Cloudflare:');
    console.log('      → Go to Cloudflare Dashboard → Add Site → Enter your domain');
    console.log('      → Update nameservers at your domain registrar');
    console.log('      → Wait for DNS propagation (usually 24-48 hours)');
  }
}