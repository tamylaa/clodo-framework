/**
 * Secure Token Manager
 * Implements secure token storage, rotation, and access control
 */

import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);

export class SecureTokenManager {
  constructor(options = {}) {
    this.config = {
      tokenDir: options.tokenDir || '.secure-tokens',
      encryptionKey: options.encryptionKey || this.generateEncryptionKey(),
      tokenRotationInterval: options.tokenRotationInterval || 24 * 60 * 60 * 1000, // 24 hours
      maxTokensPerService: options.maxTokensPerService || 3,
      enableAudit: options.enableAudit !== false,
      auditLogPath: options.auditLogPath || 'token-audit.log',
      ...options
    };

    this.tokens = new Map(); // service -> token data
    this.auditLog = [];
  }

  /**
   * Initialize the token manager
   */
  async initialize() {
    await this.ensureSecureDirectory();
    await this.loadTokens();
    await this.rotateExpiredTokens();

    if (this.config.enableAudit) {
      this.logAuditEvent('TOKEN_MANAGER_INITIALIZED', { timestamp: new Date() });
    }
  }

  /**
   * Store a token securely
   */
  async storeToken(service, token, metadata = {}) {
    const tokenData = {
      service,
      token: this.encrypt(token),
      created: new Date(),
      expires: new Date(Date.now() + this.config.tokenRotationInterval),
      metadata: {
        ...metadata,
        permissions: metadata.permissions || ['read'],
        environment: metadata.environment || 'production'
      },
      fingerprint: this.generateFingerprint(token)
    };

    // Check token limits
    const serviceTokens = this.getServiceTokens(service);
    if (serviceTokens.length >= this.config.maxTokensPerService) {
      // Remove oldest token
      const oldestToken = serviceTokens.sort((a, b) => a.created - b.created)[0];
      await this.revokeToken(service, oldestToken.fingerprint);
    }

    this.tokens.set(`${service}_${tokenData.fingerprint}`, tokenData);
    await this.saveTokens();

    if (this.config.enableAudit) {
      this.logAuditEvent('TOKEN_STORED', {
        service,
        fingerprint: tokenData.fingerprint,
        permissions: tokenData.metadata.permissions
      });
    }

    return tokenData.fingerprint;
  }

  /**
   * Retrieve a token securely
   */
  async retrieveToken(service, fingerprint, requiredPermissions = []) {
    const tokenKey = `${service}_${fingerprint}`;
    const tokenData = this.tokens.get(tokenKey);

    if (!tokenData) {
      throw new Error(`Token not found for service: ${service}`);
    }

    // Check expiration
    if (new Date() > tokenData.expires) {
      await this.revokeToken(service, fingerprint);
      throw new Error(`Token expired for service: ${service}`);
    }

    // Check permissions
    if (requiredPermissions.length > 0) {
      const hasPermissions = requiredPermissions.every(perm =>
        tokenData.metadata.permissions.includes(perm)
      );
      if (!hasPermissions) {
        if (this.config.enableAudit) {
          this.logAuditEvent('TOKEN_ACCESS_DENIED', {
            service,
            fingerprint,
            requiredPermissions,
            tokenPermissions: tokenData.metadata.permissions
          });
        }
        throw new Error(`Insufficient permissions for token access`);
      }
    }

    if (this.config.enableAudit) {
      this.logAuditEvent('TOKEN_RETRIEVED', {
        service,
        fingerprint,
        permissions: tokenData.metadata.permissions
      });
    }

    return this.decrypt(tokenData.token);
  }

  /**
   * Rotate a token
   */
  async rotateToken(service, fingerprint, newToken) {
    const tokenKey = `${service}_${fingerprint}`;
    const tokenData = this.tokens.get(tokenKey);

    if (!tokenData) {
      throw new Error(`Token not found for rotation: ${service}`);
    }

    const newFingerprint = this.generateFingerprint(newToken);
    const rotatedTokenData = {
      ...tokenData,
      token: this.encrypt(newToken),
      created: new Date(),
      expires: new Date(Date.now() + this.config.tokenRotationInterval),
      fingerprint: newFingerprint,
      rotatedFrom: fingerprint
    };

    // Remove old token
    this.tokens.delete(tokenKey);

    // Store new token
    this.tokens.set(`${service}_${newFingerprint}`, rotatedTokenData);
    await this.saveTokens();

    if (this.config.enableAudit) {
      this.logAuditEvent('TOKEN_ROTATED', {
        service,
        oldFingerprint: fingerprint,
        newFingerprint: newFingerprint
      });
    }

    return newFingerprint;
  }

  /**
   * Revoke a token
   */
  async revokeToken(service, fingerprint) {
    const tokenKey = `${service}_${fingerprint}`;
    const tokenData = this.tokens.get(tokenKey);

    if (tokenData) {
      this.tokens.delete(tokenKey);
      await this.saveTokens();

      if (this.config.enableAudit) {
        this.logAuditEvent('TOKEN_REVOKED', {
          service,
          fingerprint,
          reason: 'manual_revoke'
        });
      }
    }
  }

  /**
   * List tokens for a service
   */
  listTokens(service) {
    const serviceTokens = [];
    for (const [key, tokenData] of this.tokens) {
      if (key.startsWith(`${service}_`)) {
        serviceTokens.push({
          fingerprint: tokenData.fingerprint,
          created: tokenData.created,
          expires: tokenData.expires,
          permissions: tokenData.metadata.permissions,
          environment: tokenData.metadata.environment
        });
      }
    }
    return serviceTokens;
  }

  /**
   * Get service tokens
   */
  getServiceTokens(service) {
    const serviceTokens = [];
    for (const [key, tokenData] of this.tokens) {
      if (key.startsWith(`${service}_`)) {
        serviceTokens.push(tokenData);
      }
    }
    return serviceTokens;
  }

  /**
   * Rotate expired tokens
   */
  async rotateExpiredTokens() {
    const now = new Date();
    const expiredTokens = [];

    for (const [key, tokenData] of this.tokens) {
      if (now > tokenData.expires) {
        expiredTokens.push({ key, tokenData });
      }
    }

    for (const { key, tokenData } of expiredTokens) {
      this.tokens.delete(key);
      if (this.config.enableAudit) {
        this.logAuditEvent('TOKEN_EXPIRED', {
          service: tokenData.service,
          fingerprint: tokenData.fingerprint
        });
      }
    }

    if (expiredTokens.length > 0) {
      await this.saveTokens();
    }
  }

  /**
   * Encrypt token data
   */
  encrypt(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.config.encryptionKey);
    cipher.setIV(iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt token data
   */
  decrypt(encryptedData) {
    const decipher = crypto.createDecipher('aes-256-gcm', this.config.encryptionKey);
    decipher.setIV(Buffer.from(encryptedData.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate encryption key
   */
  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate token fingerprint
   */
  generateFingerprint(token) {
    return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
  }

  /**
   * Ensure secure directory exists
   */
  async ensureSecureDirectory() {
    try {
      await access(this.config.tokenDir);
    } catch {
      await mkdir(this.config.tokenDir, { mode: 0o700 }); // Secure permissions
    }
  }

  /**
   * Save tokens to disk
   */
  async saveTokens() {
    const tokenFile = join(this.config.tokenDir, 'tokens.json');
    const tokenData = {};

    for (const [key, token] of this.tokens) {
      tokenData[key] = token;
    }

    await writeFile(tokenFile, JSON.stringify(tokenData, null, 2));
  }

  /**
   * Load tokens from disk
   */
  async loadTokens() {
    try {
      const tokenFile = join(this.config.tokenDir, 'tokens.json');
      const data = await readFile(tokenFile, 'utf8');
      const tokenData = JSON.parse(data);

      for (const [key, token] of Object.entries(tokenData)) {
        // Convert date strings back to Date objects
        token.created = new Date(token.created);
        token.expires = new Date(token.expires);
        this.tokens.set(key, token);
      }
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
      this.tokens.clear();
    }
  }

  /**
   * Log audit event
   */
  logAuditEvent(event, details) {
    const auditEntry = {
      timestamp: new Date(),
      event,
      details
    };

    this.auditLog.push(auditEntry);

    // Keep only last 1000 entries in memory
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }

    // In a real implementation, you'd write to a secure audit log
    console.log(`[TOKEN_AUDIT] ${event}:`, details);
  }

  /**
   * Get audit log
   */
  getAuditLog(limit = 100) {
    return this.auditLog.slice(-limit);
  }

  /**
   * Validate token permissions
   */
  validatePermissions(tokenPermissions, requiredPermissions) {
    return requiredPermissions.every(perm => tokenPermissions.includes(perm));
  }
}