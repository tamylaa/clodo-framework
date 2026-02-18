/**
 * Clodo Framework - Secrets Manager
 *
 * Provides scanning, baseline management, and validation for secret leakage prevention.
 * Extracted from ValidationHandler and enhanced with baseline update/show/validate flows.
 *
 * Usage:
 *   import { SecretsManager } from './SecretsManager.js';
 *   const mgr = new SecretsManager();
 *   const results = await mgr.scan('/path/to/service');
 *   const validation = await mgr.validate('/path/to/service');
 *   await mgr.baselineUpdate('/path/to/service');
 */

import fs from 'fs/promises';
import path from 'path';
import { SecretGenerator } from './SecretGenerator.js';

/**
 * Default secret detection patterns
 */
const SECRET_PATTERNS = [
  { name: 'api_key', pattern: /(api[_-]?key|apikey)\s*[=:]\s*['"]([^'"]{20,})['"]/gi, severity: 'high' },
  { name: 'secret', pattern: /(secret|token)\s*[=:]\s*['"]([^'"]{20,})['"]/gi, severity: 'high' },
  { name: 'password', pattern: /(password|passwd|pwd)\s*[=:]\s*['"]([^'"]{8,})['"]/gi, severity: 'critical' },
  { name: 'private_key', pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi, severity: 'critical' },
  { name: 'aws_access_key', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'critical' },
  { name: 'cloudflare_token', pattern: /(?:cloudflare|cf)[_-]?(?:api[_-]?)?token\s*[=:]\s*['"]([^'"]{40,})['"]/gi, severity: 'high' },
  { name: 'jwt_secret', pattern: /(?:jwt|json[_-]?web[_-]?token)[_-]?secret\s*[=:]\s*['"]([^'"]{20,})['"]/gi, severity: 'high' },
  { name: 'database_url', pattern: /(?:database|db)[_-]?url\s*[=:]\s*['"]([^'"]*password[^'"]*)['"]/gi, severity: 'high' },
  { name: 'stripe_key', pattern: /(sk|pk)_(?:test|live)_[0-9a-zA-Z]{20,}/g, severity: 'critical' },
  { name: 'github_token', pattern: /gh[ps]_[A-Za-z0-9_]{36,}/g, severity: 'critical' },
  { name: 'slack_token', pattern: /xox[baprs]-[0-9A-Za-z-]{10,}/g, severity: 'high' },
  { name: 'generic_secret', pattern: /(?:auth|bearer)\s*[=:]\s*['"]([^'"]{30,})['"]/gi, severity: 'medium' }
];

/**
 * File extensions to scan
 */
const SCAN_EXTENSIONS = ['.js', '.ts', '.json', '.toml', '.env', '.md', '.txt', '.yaml', '.yml', '.cfg', '.ini'];

/**
 * Directories to skip during scanning
 */
const SKIP_DIRECTORIES = ['node_modules', '.git', 'dist', 'build', 'coverage', 'logs', '.wrangler', '.cache'];

/**
 * Words that indicate a value is clearly a test/example (case-insensitive)
 */
const FALSE_POSITIVE_INDICATORS = ['example', 'test', 'fake', 'placeholder', 'dummy', 'sample', 'your-', 'xxx', 'changeme', 'todo', 'fixme'];

export class SecretsManager {
  /**
   * @param {Object} options
   * @param {Array} options.patterns - Custom patterns (defaults to SECRET_PATTERNS)
   * @param {Array} options.extensions - File extensions to scan (defaults to SCAN_EXTENSIONS)
   * @param {Array} options.skipDirs - Directories to skip (defaults to SKIP_DIRECTORIES)
   * @param {boolean} options.includeTests - Include test/example content (default: false)
   */
  constructor(options = {}) {
    this.patterns = options.patterns || SECRET_PATTERNS;
    this.extensions = options.extensions || SCAN_EXTENSIONS;
    this.skipDirs = options.skipDirs || SKIP_DIRECTORIES;
    this.includeTests = options.includeTests || false;
  }

  /**
   * Scan a directory for potential secrets
   * @param {string} servicePath - Root path to scan
   * @returns {Promise<Array<SecretFinding>>} Array of findings
   */
  async scan(servicePath) {
    const resolvedPath = path.resolve(servicePath);
    const files = await this.getFilesToScan(resolvedPath);
    const findings = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n');
        const relativePath = path.relative(resolvedPath, file);

        lines.forEach((line, index) => {
          for (const { name, pattern, severity } of this.patterns) {
            // Reset regex lastIndex for global patterns
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(line)) !== null) {
              // Skip false positives unless includeTests is set
              if (!this.includeTests && this._isFalsePositive(line)) {
                continue;
              }

              findings.push({
                file: relativePath,
                line: index + 1,
                pattern: name,
                severity,
                match: this._truncateMatch(match[0]),
                column: match.index + 1
              });
            }
          }
        });
      } catch {
        // Skip files that can't be read
        continue;
      }
    }

    return findings;
  }

  /**
   * Validate: scan and compare against baseline, return pass/fail
   * @param {string} servicePath - Root path to scan
   * @returns {Promise<ValidationResult>}
   */
  async validate(servicePath) {
    const resolvedPath = path.resolve(servicePath);
    const findings = await this.scan(resolvedPath);
    const baseline = await this.loadBaseline(resolvedPath);

    const newFindings = findings.filter(f => !this._isInBaseline(f, baseline));
    const removedFromBaseline = baseline.filter(b => !findings.some(f =>
      f.file === b.file && f.line === b.line && f.pattern === b.pattern
    ));

    const passed = newFindings.length === 0;

    return {
      passed,
      totalFindings: findings.length,
      baselineCount: baseline.length,
      newFindings,
      removedFromBaseline,
      message: passed
        ? (findings.length === 0
          ? 'No potential secrets found'
          : `All ${findings.length} findings are in the baseline`)
        : `Found ${newFindings.length} new potential secret(s) not in baseline`
    };
  }

  /**
   * Update the baseline file with current findings
   * @param {string} servicePath - Root path to scan
   * @param {Object} options
   * @param {boolean} options.addAll - Add all new findings without prompting
   * @param {boolean} options.prune - Remove stale entries no longer detected
   * @param {string} options.reason - Reason for adding (for audit trail)
   * @returns {Promise<BaselineUpdateResult>}
   */
  async baselineUpdate(servicePath, options = {}) {
    const resolvedPath = path.resolve(servicePath);
    const findings = await this.scan(resolvedPath);
    const baseline = await this.loadBaseline(resolvedPath);

    const newFindings = findings.filter(f => !this._isInBaseline(f, baseline));
    const staleEntries = baseline.filter(b => !findings.some(f =>
      f.file === b.file && f.line === b.line && f.pattern === b.pattern
    ));

    let updatedBaseline = [...baseline];
    let added = 0;
    let pruned = 0;

    // Add new findings
    if (options.addAll && newFindings.length > 0) {
      const timestamp = new Date().toISOString();
      const newEntries = newFindings.map(f => ({
        file: f.file,
        line: f.line,
        pattern: f.pattern,
        match: f.match,
        severity: f.severity,
        addedAt: timestamp,
        reason: options.reason || 'bulk-update'
      }));
      updatedBaseline = [...updatedBaseline, ...newEntries];
      added = newEntries.length;
    }

    // Prune stale entries
    if (options.prune && staleEntries.length > 0) {
      updatedBaseline = updatedBaseline.filter(b =>
        !staleEntries.some(s =>
          s.file === b.file && s.line === b.line && s.pattern === b.pattern
        )
      );
      pruned = staleEntries.length;
    }

    // Sort by file then line
    updatedBaseline.sort((a, b) => {
      const fileCompare = a.file.localeCompare(b.file);
      return fileCompare !== 0 ? fileCompare : a.line - b.line;
    });

    // Write baseline
    await this.saveBaseline(resolvedPath, updatedBaseline);

    return {
      added,
      pruned,
      total: updatedBaseline.length,
      staleEntries: staleEntries.length,
      newFindings: newFindings.length,
      baselinePath: this._getBaselinePath(resolvedPath)
    };
  }

  /**
   * Get current baseline contents
   * @param {string} servicePath - Root path
   * @returns {Promise<Array>} Current baseline entries
   */
  async baselineShow(servicePath) {
    const resolvedPath = path.resolve(servicePath);
    return await this.loadBaseline(resolvedPath);
  }

  /**
   * Load the .secrets.baseline file
   * @param {string} servicePath
   * @returns {Promise<Array>}
   */
  async loadBaseline(servicePath) {
    const baselinePath = this._getBaselinePath(servicePath);
    try {
      const content = await fs.readFile(baselinePath, 'utf8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  /**
   * Save the baseline file
   * @param {string} servicePath
   * @param {Array} baseline
   */
  async saveBaseline(servicePath, baseline) {
    const baselinePath = this._getBaselinePath(servicePath);
    await fs.writeFile(baselinePath, JSON.stringify(baseline, null, 2) + '\n', 'utf8');
  }

  /**
   * Get all files to scan in a directory tree
   * @param {string} dir - Root directory
   * @returns {Promise<string[]>}
   */
  async getFilesToScan(dir) {
    const files = [];

    const scanDir = async (currentDir) => {
      let entries;
      try {
        entries = await fs.readdir(currentDir, { withFileTypes: true });
      } catch {
        return; // Skip unreadable directories
      }

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          if (!this.skipDirs.includes(entry.name)) {
            await scanDir(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (this.extensions.includes(ext) || entry.name.startsWith('.env')) {
            files.push(fullPath);
          }
        }
      }
    };

    await scanDir(dir);
    return files;
  }

  /**
   * Get the configured secret patterns
   * @returns {Array} Pattern definitions
   */
  getPatterns() {
    return this.patterns.map(({ name, severity }) => ({ name, severity }));
  }

  /**
   * Generate a secure replacement value for a detected secret.
   * Delegates to SecretGenerator for cryptographically safe key generation.
   * @param {string} patternName - The detected pattern type (api_key, jwt_secret, password, etc.)
   * @param {Object} options
   * @param {number} options.length - Key length in bytes (default: 32)
   * @param {string} options.prefix - Optional key prefix
   * @returns {Object} Generated key with metadata
   */
  generateReplacement(patternName, options = {}) {
    const { length = 32, prefix = '' } = options;

    switch (patternName) {
      case 'jwt_secret':
        return SecretGenerator.generateKeyWithMetadata('jwt', length || 64);
      case 'api_key':
      case 'cloudflare_token':
      case 'github_token':
      case 'slack_token':
        return SecretGenerator.generateKeyWithMetadata(prefix || patternName, length);
      default:
        return SecretGenerator.generateKeyWithMetadata(prefix, length);
    }
  }

  /**
   * Validate the strength of a secret value using SecretGenerator's entropy analysis
   * @param {string} key - The secret value to validate
   * @param {Object} requirements - Strength requirements
   * @returns {Object} Validation result with { valid, issues }
   */
  validateKeyStrength(key, requirements = {}) {
    return SecretGenerator.validateKeyStrength(key, requirements);
  }

  // ─── Private helpers ──────────────────────────────────────────

  _getBaselinePath(servicePath) {
    return path.join(servicePath, '.secrets.baseline');
  }

  _isInBaseline(finding, baseline) {
    return baseline.some(b =>
      b.file === finding.file &&
      b.line === finding.line &&
      b.pattern === finding.pattern
    );
  }

  _isFalsePositive(line) {
    const lower = line.toLowerCase();
    return FALSE_POSITIVE_INDICATORS.some(indicator => lower.includes(indicator));
  }

  _truncateMatch(matchStr) {
    const maxLen = 50;
    if (matchStr.length <= maxLen) {
      return matchStr + '...';
    }
    return matchStr.substring(0, maxLen) + '...';
  }
}

/**
 * @typedef {Object} SecretFinding
 * @property {string} file - Relative file path
 * @property {number} line - Line number (1-based)
 * @property {string} pattern - Pattern name that matched
 * @property {string} severity - critical|high|medium
 * @property {string} match - Truncated match string
 * @property {number} column - Column position
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} passed - Whether validation passed
 * @property {number} totalFindings - Total secrets found
 * @property {number} baselineCount - Baseline entries count
 * @property {Array<SecretFinding>} newFindings - Secrets not in baseline
 * @property {Array} removedFromBaseline - Stale baseline entries
 * @property {string} message - Human-readable summary
 */

/**
 * @typedef {Object} BaselineUpdateResult
 * @property {number} added - New entries added
 * @property {number} pruned - Stale entries removed
 * @property {number} total - Total baseline entries
 * @property {number} staleEntries - Stale entries found
 * @property {number} newFindings - New findings found
 * @property {string} baselinePath - Path to baseline file
 */
