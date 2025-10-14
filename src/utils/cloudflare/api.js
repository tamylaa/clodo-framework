/**
 * Cloudflare API Client
 * Simple client for fetching zone information and verifying API tokens
 * 
 * Used by InputCollector for new deployment flow to:
 * 1. Verify API token is valid
 * 2. Fetch list of user's domains
 * 3. Get zone details (zone_id, account_id, name servers, etc.)
 */

export class CloudflareAPI {
  constructor(apiToken) {
    if (!apiToken) {
      throw new Error('Cloudflare API token is required');
    }
    this.apiToken = apiToken;
    this.baseUrl = 'https://api.cloudflare.com/client/v4';
  }

  /**
   * Make authenticated request to Cloudflare API
   * @private
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.errors?.[0]?.message || 'Unknown error';
      throw new Error(`Cloudflare API error: ${errorMsg} (${response.status})`);
    }

    if (!data.success) {
      const errorMsg = data.errors?.[0]?.message || 'Request failed';
      throw new Error(`Cloudflare API error: ${errorMsg}`);
    }

    return data;
  }

  /**
   * Verify that the API token is valid
   * @returns {Promise<Object>} Token verification result
   */
  async verifyToken() {
    try {
      const data = await this.request('/user/tokens/verify');
      return {
        valid: true,
        id: data.result.id,
        status: data.result.status,
        expiresOn: data.result.expires_on,
        notBefore: data.result.not_before
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * List all zones (domains) accessible with this API token
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of zone objects
   */
  async listZones(options = {}) {
    const params = new URLSearchParams({
      page: options.page || 1,
      per_page: options.perPage || 50,
      ...(options.name && { name: options.name }),
      ...(options.status && { status: options.status }),
      ...(options.accountId && { 'account.id': options.accountId })
    });

    const data = await this.request(`/zones?${params}`);
    
    return data.result.map(zone => ({
      id: zone.id,
      name: zone.name,
      status: zone.status,
      accountId: zone.account.id,
      accountName: zone.account.name,
      nameServers: zone.name_servers,
      originalNameServers: zone.original_name_servers,
      type: zone.type,
      planName: zone.plan.name,
      createdOn: zone.created_on,
      modifiedOn: zone.modified_on
    }));
  }

  /**
   * Get detailed information about a specific zone
   * @param {string} zoneId - Zone ID
   * @returns {Promise<Object>} Zone details
   */
  async getZoneDetails(zoneId) {
    const data = await this.request(`/zones/${zoneId}`);
    const zone = data.result;

    return {
      id: zone.id,
      name: zone.name,
      status: zone.status,
      accountId: zone.account.id,
      accountName: zone.account.name,
      nameServers: zone.name_servers,
      originalNameServers: zone.original_name_servers,
      type: zone.type,
      planName: zone.plan.name,
      planId: zone.plan.id,
      createdOn: zone.created_on,
      modifiedOn: zone.modified_on,
      activatedOn: zone.activated_on,
      meta: {
        step: zone.meta.step,
        customCertificateQuota: zone.meta.custom_certificate_quota,
        pageRuleQuota: zone.meta.page_rule_quota,
        phishingDetected: zone.meta.phishing_detected,
        multipleRailgunsAllowed: zone.meta.multiple_railguns_allowed
      },
      owner: {
        id: zone.owner.id,
        type: zone.owner.type,
        email: zone.owner.email
      }
    };
  }

  /**
   * Get DNS records for a zone
   * @param {string} zoneId - Zone ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of DNS records
   */
  async listDNSRecords(zoneId, options = {}) {
    const params = new URLSearchParams({
      page: options.page || 1,
      per_page: options.perPage || 100,
      ...(options.type && { type: options.type }),
      ...(options.name && { name: options.name })
    });

    const data = await this.request(`/zones/${zoneId}/dns_records?${params}`);
    
    return data.result.map(record => ({
      id: record.id,
      type: record.type,
      name: record.name,
      content: record.content,
      proxied: record.proxied,
      ttl: record.ttl,
      priority: record.priority,
      createdOn: record.created_on,
      modifiedOn: record.modified_on
    }));
  }

  /**
   * Get account information
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Account details
   */
  async getAccountDetails(accountId) {
    const data = await this.request(`/accounts/${accountId}`);
    const account = data.result;

    return {
      id: account.id,
      name: account.name,
      type: account.type,
      settings: account.settings,
      createdOn: account.created_on
    };
  }

  /**
   * List all workers for an account
   * @param {string} accountId - Account ID
   * @returns {Promise<Array>} Array of worker scripts
   */
  async listWorkers(accountId) {
    const data = await this.request(`/accounts/${accountId}/workers/scripts`);
    
    return data.result.map(worker => ({
      id: worker.id,
      name: worker.id, // Worker name is the ID
      createdOn: worker.created_on,
      modifiedOn: worker.modified_on,
      etag: worker.etag
    }));
  }

  /**
   * List D1 databases for an account
   * @param {string} accountId - Account ID
   * @returns {Promise<Array>} Array of D1 databases
   */
  async listD1Databases(accountId) {
    try {
      const data = await this.request(`/accounts/${accountId}/d1/database`);
      
      return data.result.map(db => ({
        uuid: db.uuid,
        name: db.name,
        version: db.version,
        createdAt: db.created_at,
        numTables: db.num_tables,
        fileSize: db.file_size
      }));
    } catch (error) {
      // D1 might not be available on all plans
      if (error.message.includes('not found') || error.message.includes('403')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Create a D1 database
   * @param {string} accountId - Account ID
   * @param {string} name - Database name
   * @returns {Promise<Object>} Created database info
   */
  async createD1Database(accountId, name) {
    const data = await this.request(`/accounts/${accountId}/d1/database`, {
      method: 'POST',
      body: JSON.stringify({ name })
    });

    return {
      uuid: data.result.uuid,
      name: data.result.name,
      version: data.result.version,
      createdAt: data.result.created_at
    };
  }

  /**
   * Check if a D1 database exists
   * @param {string} accountId - Account ID
   * @param {string} name - Database name
   * @returns {Promise<boolean>} True if database exists
   */
  async d1DatabaseExists(accountId, name) {
    try {
      const databases = await this.listD1Databases(accountId);
      return databases.some(db => db.name === name);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get D1 database by name
   * @param {string} accountId - Account ID
   * @param {string} name - Database name
   * @returns {Promise<Object|null>} Database info or null if not found
   */
  async getD1Database(accountId, name) {
    try {
      const databases = await this.listD1Databases(accountId);
      return databases.find(db => db.name === name) || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Helper: Get complete deployment info for a zone
   * This combines zone details with useful metadata for deployment
   * @param {string} zoneId - Zone ID
   * @returns {Promise<Object>} Complete deployment info
   */
  async getDeploymentInfo(zoneId) {
    const zone = await this.getZoneDetails(zoneId);
    const dnsRecords = await this.listDNSRecords(zoneId);
    
    // Try to get D1 databases (might fail if not available)
    let databases = [];
    try {
      databases = await this.listD1Databases(zone.accountId);
    } catch (error) {
      // Ignore if D1 not available
    }

    return {
      // Core deployment info (the 6 pieces)
      accountId: zone.accountId,
      zoneId: zone.id,
      domain: zone.name,
      
      // Additional useful info
      accountName: zone.accountName,
      status: zone.status,
      nameServers: zone.nameServers,
      planName: zone.planName,
      
      // DNS records (for reference)
      dnsRecords: dnsRecords.slice(0, 10), // First 10 records
      
      // Available databases
      databases,
      
      // Metadata
      createdOn: zone.createdOn,
      owner: zone.owner
    };
  }
}

/**
 * Helper function to format zones for display in prompts
 * @param {Array} zones - Array of zone objects from listZones()
 * @returns {Array<string>} Array of formatted strings for askChoice()
 */
export function formatZonesForDisplay(zones) {
  return zones.map(zone => {
    const status = zone.status === 'active' ? '✅' : '⚠️';
    const plan = zone.planName === 'Free' ? '(Free)' : `(${zone.planName})`;
    return `${status} ${zone.name} ${plan} - Account: ${zone.accountName}`;
  });
}

/**
 * Helper function to validate zone selection and get index
 * @param {string} selection - User's selection string
 * @param {Array} zones - Array of zones
 * @returns {number} Index of selected zone, or -1 if invalid
 */
export function parseZoneSelection(selection, zones) {
  const index = parseInt(selection) - 1;
  if (isNaN(index) || index < 0 || index >= zones.length) {
    return -1;
  }
  return index;
}
