/**
 * API Token Manager
 * Secure management of external service API tokens (Cloudflare, etc.)
 * 
 * Features:
 * - Secure token storage with encryption
 * - Interactive token collection
 * - Token validation and testing
 * - Automatic token refresh and management
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { askUser, askPassword } from '../utils/interactive-prompts.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ApiTokenManager {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || join(__dirname, '..', '..');
    this.configPath = join(this.projectRoot, '.config-cache', 'api-tokens.json');
    this.encryptionKey = this.getOrCreateEncryptionKey();
    
    // Ensure config directory exists
    this.ensureDirectory(dirname(this.configPath));
    
    // Load existing tokens
    this.tokens = this.loadTokens();
    
    console.log('🔑 API Token Manager initialized');
    console.log(`📁 Config: ${this.configPath}`);
    console.log(`🔐 Encrypted storage: ${this.isEncrypted() ? 'Yes' : 'No'}`);
  }

  /**
   * Get or create encryption key for secure token storage
   */
  getOrCreateEncryptionKey() {
    const keyPath = join(this.projectRoot, '.config-cache', '.token-key');
    
    if (existsSync(keyPath)) {
      return readFileSync(keyPath, 'utf-8').trim();
    }
    
    // Generate new encryption key
    const key = randomBytes(32).toString('hex');
    this.ensureDirectory(dirname(keyPath));
    writeFileSync(keyPath, key, { mode: 0o600 }); // Secure file permissions
    
    return key;
  }

  /**
   * Load tokens from encrypted storage
   */
  loadTokens() {
    if (!existsSync(this.configPath)) {
      return {};
    }

    try {
      const data = readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(data);
      
      // Decrypt tokens if they're encrypted
      if (config.encrypted) {
        const decryptedTokens = {};
        for (const [service, encryptedToken] of Object.entries(config.tokens)) {
          try {
            decryptedTokens[service] = this.decryptToken(encryptedToken);
          } catch (error) {
            console.warn(`⚠️  Failed to decrypt token for ${service}`);
          }
        }
        return decryptedTokens;
      }
      
      return config.tokens || {};
    } catch (error) {
      console.warn('⚠️  Failed to load API tokens, starting fresh');
      return {};
    }
  }

  /**
   * Save tokens to encrypted storage
   */
  saveTokens() {
    try {
      const encryptedTokens = {};
      
      // Encrypt each token
      for (const [service, token] of Object.entries(this.tokens)) {
        encryptedTokens[service] = this.encryptToken(token);
      }

      const config = {
        encrypted: true,
        lastUpdated: new Date().toISOString(),
        services: Object.keys(this.tokens),
        tokens: encryptedTokens
      };

      writeFileSync(this.configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
      console.log(`✅ API tokens saved securely to ${this.configPath}`);
    } catch (error) {
      console.error('❌ Failed to save API tokens:', error.message);
      throw error;
    }
  }

  /**
   * Encrypt token for secure storage
   */
  encryptToken(token) {
    try {
      const algorithm = 'aes-256-cbc';
      const iv = randomBytes(16);
      const cipher = createCipheriv(algorithm, Buffer.from(this.encryptionKey, 'hex'), iv);
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.warn('⚠️  Token encryption failed, storing in plain text');
      return token;
    }
  }

  /**
   * Decrypt token from storage
   */
  decryptToken(encryptedToken) {
    try {
      const algorithm = 'aes-256-cbc';
      const parts = encryptedToken.split(':');
      if (parts.length !== 2) {
        // Old format or plain text, return as is
        return encryptedToken;
      }
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = createDecipheriv(algorithm, Buffer.from(this.encryptionKey, 'hex'), iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      // If decryption fails, assume it's plain text (backward compatibility)
      return encryptedToken;
    }
  }

  /**
   * Get API token for a service, prompting if not available
   */
  async getToken(service, options = {}) {
    const serviceName = service.toLowerCase();
    
    // Check if token already exists
    if (this.tokens[serviceName]) {
      console.log(`🔑 Using cached ${service} API token`);
      return this.tokens[serviceName];
    }

    // Prompt user for token
    console.log(`\\n🔑 ${service} API Token Required`);
    console.log('═'.repeat(40));
    
    if (options.description) {
      console.log(`📋 ${options.description}`);
    }
    
    if (options.instructions) {
      console.log('💡 Instructions:');
      options.instructions.forEach(instruction => {
        console.log(`   • ${instruction}`);
      });
    }
    
    const token = await askPassword(`Enter your ${service} API token:`);
    
    if (!token || token.trim() === '') {
      throw new Error(`${service} API token is required but not provided`);
    }

    // Validate token if validator provided
    if (options.validator) {
      console.log(`🔍 Validating ${service} API token...`);
      try {
        const isValid = await options.validator(token.trim());
        if (!isValid) {
          throw new Error(`Invalid ${service} API token`);
        }
        console.log(`✅ ${service} API token validated successfully`);
      } catch (error) {
        console.error(`❌ Token validation failed: ${error.message}`);
        throw error;
      }
    }

    // Store token
    this.tokens[serviceName] = token.trim();
    this.saveTokens();
    
    console.log(`✅ ${service} API token saved securely`);
    return this.tokens[serviceName];
  }

  /**
   * Check if token exists for a service
   */
  hasToken(service) {
    return !!this.tokens[service.toLowerCase()];
  }

  /**
   * Remove token for a service
   */
  removeToken(service) {
    const serviceName = service.toLowerCase();
    if (this.tokens[serviceName]) {
      delete this.tokens[serviceName];
      this.saveTokens();
      console.log(`🗑️  Removed ${service} API token`);
      return true;
    }
    return false;
  }

  /**
   * List available tokens (without revealing actual values)
   */
  listTokens() {
    const services = Object.keys(this.tokens);
    
    if (services.length === 0) {
      console.log('📝 No API tokens stored');
      return [];
    }

    console.log('🔑 Stored API tokens:');
    services.forEach(service => {
      const token = this.tokens[service];
      const preview = token.substring(0, 8) + '...';
      console.log(`   • ${service}: ${preview}`);
    });
    
    return services;
  }

  /**
   * Utility methods
   */
  isEncrypted() {
    return !!this.encryptionKey;
  }

  ensureDirectory(dirPath) {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true, mode: 0o700 });
    }
  }
}

/**
 * Cloudflare API Token Manager
 * Specialized manager for Cloudflare API tokens with validation
 */
export class CloudflareTokenManager extends ApiTokenManager {
  constructor(options = {}) {
    super(options);
  }

  /**
   * Get Cloudflare API token with validation
   */
  async getCloudflareToken() {
    return this.getToken('cloudflare', {
      description: 'Cloudflare API token is required for domain verification and deployment operations.',
      instructions: [
        'Go to Cloudflare Dashboard → My Profile → API Tokens',
        'Create a token with Zone:Read and Worker:Edit permissions',
        'Copy the token (it will only be shown once)'
      ],
      validator: this.validateCloudflareToken.bind(this)
    });
  }

  /**
   * Validate Cloudflare API token
   */
  async validateCloudflareToken(token) {
    try {
      const response = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      return response.ok && data.success;
    } catch (error) {
      console.warn('⚠️  Token validation failed (network error)');
      return false;
    }
  }
}

export default ApiTokenManager;