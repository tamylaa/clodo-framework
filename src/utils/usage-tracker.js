/**
 * Clodo Framework - Usage Tracking & License Management
 *
 * Tracks usage for free tier limitations and validates paid subscriptions.
 * Free tier: 3 services max, development environment only.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export class UsageTracker {
  constructor() {
    this.configDir = path.join(os.homedir(), '.clodo-framework');
    this.usageFile = path.join(this.configDir, 'usage.json');
    this.licenseFile = path.join(this.configDir, 'license.json');
    this.ensureConfigDir();
  }

  ensureConfigDir() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  getUsage() {
    try {
      if (!fs.existsSync(this.usageFile)) {
        return this.getDefaultUsage();
      }
      const data = fs.readFileSync(this.usageFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('Warning: Could not read usage data, resetting to defaults');
      return this.getDefaultUsage();
    }
  }

  getDefaultUsage() {
    return {
      servicesCreated: 0,
      lastReset: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  saveUsage(usage) {
    try {
      fs.writeFileSync(this.usageFile, JSON.stringify(usage, null, 2));
    } catch (error) {
      console.warn('Warning: Could not save usage data');
    }
  }

  getLicense() {
    try {
      if (!fs.existsSync(this.licenseFile)) {
        return null;
      }
      const data = fs.readFileSync(this.licenseFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  saveLicense(license) {
    try {
      fs.writeFileSync(this.licenseFile, JSON.stringify(license, null, 2));
    } catch (error) {
      console.error('Error: Could not save license data');
    }
  }

  isPaidUser() {
    const license = this.getLicense();
    if (!license) return false;

    // Founder/Admin licenses are always valid (no expiry)
    if (license.plan === 'founder' || license.plan === 'admin') {
      return license.active;
    }

    // Check if regular license is valid and not expired
    const now = new Date();
    const expiry = new Date(license.expiry);

    return license.active && expiry > now;
  }

  getPlanLimits() {
    const license = this.getLicense();

    // Founder/Admin licenses have unlimited access
    if (license && (license.plan === 'founder' || license.plan === 'admin')) {
      return {
        maxServices: -1, // unlimited
        allowedEnvironments: ['development', 'staging', 'production'],
        premiumFeatures: true,
        prioritySupport: true,
        founderAccess: true
      };
    }

    if (this.isPaidUser()) {
      return {
        maxServices: -1, // unlimited
        allowedEnvironments: ['development', 'staging', 'production'],
        premiumFeatures: true,
        prioritySupport: true,
        founderAccess: false
      };
    }

    return {
      maxServices: 3,
      allowedEnvironments: ['development'],
      premiumFeatures: false,
      prioritySupport: false,
      founderAccess: false
    };
  }

  canCreateService(environment = 'development') {
    const limits = this.getPlanLimits();
    const usage = this.getUsage();

    // Check service count limit
    if (limits.maxServices !== -1 && usage.servicesCreated >= limits.maxServices) {
      return {
        allowed: false,
        reason: 'service_limit',
        message: `Free tier limited to ${limits.maxServices} services. Upgrade to create more!`
      };
    }

    // Check environment restriction
    if (!limits.allowedEnvironments.includes(environment)) {
      return {
        allowed: false,
        reason: 'environment_restricted',
        message: `Free tier only allows ${limits.allowedEnvironments.join(', ')} environments. Upgrade for all environments!`
      };
    }

    return { allowed: true };
  }

  recordServiceCreation(environment = 'development') {
    const usage = this.getUsage();
    usage.servicesCreated += 1;
    this.saveUsage(usage);
  }

  getUpgradeMessage(reason) {
    const baseMessage = `
🎉 Love Clodo Framework? Upgrade to unlock unlimited potential!

✨ Unlimited services across all environments
🚀 Premium templates & advanced features
🎯 Priority support & updates
💰 Consulting sessions at $69/hour

Choose your plan:
• Monthly: $19/month
• Annual: $189/year (save 17%)
• Lifetime: $999 (one-time payment)

Upgrade now: https://clodo-framework.com/pricing
Or run: clodo-service upgrade

Your current usage: ${this.getUsage().servicesCreated}/3 services created
`;

    return baseMessage;
  }

  showUpgradePrompt(reason) {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Clodo Framework - Upgrade Required');
    console.log('='.repeat(60));
    console.log(this.getUpgradeMessage(reason));
    console.log('='.repeat(60));
  }

  // For future use - validate license keys
  validateLicenseKey(key) {
    // This would validate against a server or use cryptography
    // For now, just check format
    return key && key.length === 32 && /^[a-f0-9]+$/.test(key);
  }

  // Generate founder/admin license (unlimited, never expires)
  generateFounderLicense(userEmail = 'founder', userName = 'Framework Builder') {
    const license = {
      id: crypto.randomUUID(),
      plan: 'founder',
      active: true,
      activated: new Date().toISOString(),
      expiry: '2099-12-31T23:59:59.999Z', // Far future date (never expires)
      userEmail: userEmail,
      userName: userName,
      specialAccess: true,
      generated: new Date().toISOString()
    };

    this.saveLicense(license);
    return license;
  }

  // Generate admin license for selected team members
  generateAdminLicense(userEmail, userName = 'Admin User') {
    const license = {
      id: crypto.randomUUID(),
      plan: 'admin',
      active: true,
      activated: new Date().toISOString(),
      expiry: '2099-12-31T23:59:59.999Z', // Far future date (never expires)
      userEmail: userEmail,
      userName: userName,
      specialAccess: true,
      generated: new Date().toISOString()
    };

    this.saveLicense(license);
    return license;
  }

  getExpiryDate(plan) {
    const now = new Date();

    switch (plan) {
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() + 1)).toISOString();
      case 'annual':
        return new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
      case 'lifetime':
        return new Date(now.setFullYear(now.getFullYear() + 100)).toISOString();
      default:
        return new Date(now.setMonth(now.getMonth() + 1)).toISOString();
    }
  }

  getUsageStats() {
    const usage = this.getUsage();
    const limits = this.getPlanLimits();
    const license = this.getLicense();

    return {
      currentUsage: usage.servicesCreated,
      limit: limits.maxServices,
      plan: this.isPaidUser() ? license.plan : 'free',
      environments: limits.allowedEnvironments,
      premiumFeatures: limits.premiumFeatures,
      daysUntilExpiry: license ? this.getDaysUntilExpiry(license.expiry) : null
    };
  }

  getDaysUntilExpiry(expiryDate) {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

// Export singleton instance
export const usageTracker = new UsageTracker();
