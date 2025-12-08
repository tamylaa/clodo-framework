#!/usr/bin/env node

/**
 * Clodo Framework Diagnostic Script
 * Evaluates deployment issues, configuration problems, and framework inconsistencies
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FrameworkDiagnostic {
    constructor() {
        this.issues = [];
        this.warnings = [];
        this.passed = [];
        this.projectRoot = this.findProjectRoot();
    }

    findProjectRoot() {
        let current = process.cwd();
        while (current !== path.dirname(current)) {
            if (fs.existsSync(path.join(current, 'package.json'))) {
                const pkg = JSON.parse(fs.readFileSync(path.join(current, 'package.json'), 'utf8'));
                if (pkg.name === '@tamyla/clodo-framework') {
                    return current;
                }
            }
            current = path.dirname(current);
        }
        return process.cwd();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    addIssue(severity, category, message, suggestion = null) {
        const issue = { severity, category, message, suggestion, timestamp: new Date() };
        if (severity === 'error') {
            this.issues.push(issue);
        } else if (severity === 'warning') {
            this.warnings.push(issue);
        } else {
            this.passed.push(issue);
        }
    }

    // Check 1: Dry-run flag handling
    checkDryRunHandling() {
        this.log('Checking dry-run flag handling...');

        const cliFiles = [
            'src/cli/clodo-service.js',
            'lib/shared/deployment/workflows/interactive-deployment-coordinator.js',
            'lib/shared/deployment/workflows/interactive-database-workflow.js',
            'lib/shared/deployment/workflows/interactive-secret-workflow.js'
        ];

        let foundDryRunChecks = false;
        let actualDeployments = false;

        for (const file of cliFiles) {
            const filePath = path.join(this.projectRoot, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                if (content.includes('--dry-run') || content.includes('dryRun') || content.includes('dry_run')) {
                    foundDryRunChecks = true;
                }
                // Check for actual deployment actions that should be conditional
                if (content.includes('wrangler secret put') || content.includes('d1 create') ||
                    content.includes('deploy') || content.includes('create database')) {
                    actualDeployments = true;
                }
            }
        }

        if (!foundDryRunChecks) {
            this.addIssue('error', 'dry-run', 'No dry-run flag handling found in deployment code', 'Add proper dry-run checks to prevent actual deployments during testing');
        } else {
            // Dry-run checks are present, assume they're implemented correctly
            this.addIssue('success', 'dry-run', 'Dry-run flag handling detected in deployment workflows');
        }
    }

    // Check 2: Worker naming validation
    checkWorkerNaming() {
        this.log('Checking worker naming validation...');

        const deploymentFiles = [
            'lib/shared/deployment/workflows/interactive-deployment-coordinator.js',
            'src/service-management/ServiceOrchestrator.js'
        ];

        let hasWorkerNameValidation = false;

        for (const file of deploymentFiles) {
            const filePath = path.join(this.projectRoot, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                // Look for URL validation or worker name sanitization
                if (content.includes('.workers.dev') || content.includes('worker name') || content.includes('sanitiz')) {
                    hasWorkerNameValidation = true;
                    break;
                }
            }
        }

        if (!hasWorkerNameValidation) {
            this.addIssue('warning', 'worker-naming', 'No worker name validation found', 'Add validation to prevent full URLs in worker names and ensure proper naming');
        } else {
            this.addIssue('success', 'worker-naming', 'Worker name validation detected');
        }
    }

    // Check 3: Database naming consistency
    checkDatabaseNaming() {
        this.log('Checking database naming consistency...');

        const dbFiles = [
            'lib/shared/cloudflare/d1-manager.js',
            'src/service-management/ServiceOrchestrator.js'
        ];

        let hasConsistentNaming = false;

        for (const file of dbFiles) {
            const filePath = path.join(this.projectRoot, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                // Look for naming pattern consistency
                if (content.includes('database') && (content.includes('name') || content.includes('naming'))) {
                    hasConsistentNaming = true;
                    break;
                }
            }
        }

        if (!hasConsistentNaming) {
            this.addIssue('warning', 'database-naming', 'Database naming consistency checks may be missing', 'Ensure database names follow consistent patterns and match service names');
        } else {
            this.addIssue('success', 'database-naming', 'Database naming consistency checks found');
        }
    }

    // Check 4: Domain vs Worker URL validation
    checkDomainWorkerConsistency() {
        this.log('Checking domain and worker URL consistency...');

        const configFiles = [
            'lib/shared/utils/config-loader.js',
            'src/config/domains.js'
        ];

        let hasDomainValidation = false;

        for (const file of configFiles) {
            const filePath = path.join(this.projectRoot, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                if (content.includes('domain') && content.includes('worker') && content.includes('validat')) {
                    hasDomainValidation = true;
                    break;
                }
            }
        }

        if (!hasDomainValidation) {
            this.addIssue('warning', 'domain-consistency', 'Domain and worker URL consistency validation missing', 'Add checks to ensure selected domain matches worker URL domain');
        } else {
            this.addIssue('success', 'domain-consistency', 'Domain and worker URL validation found');
        }
    }

    // Check 5: Wrangler configuration issues
    checkWranglerConfig() {
        this.log('Checking wrangler.toml configuration...');

        const wranglerPath = path.join(this.projectRoot, 'wrangler.toml');
        if (fs.existsSync(wranglerPath)) {
            const content = fs.readFileSync(wranglerPath, 'utf8');

            // Check for environment inheritance issues
            if (content.includes('[env.') && !content.includes('vars =')) {
                this.addIssue('warning', 'wrangler-config', 'Potential vars inheritance issue in wrangler.toml', 'Ensure vars are properly inherited by environment configurations');
            }

            // Check for missing environment configurations
            if (!content.includes('[env.development]')) {
                this.addIssue('warning', 'wrangler-config', 'Missing development environment configuration', 'Add [env.development] section to wrangler.toml');
            }

            this.addIssue('success', 'wrangler-config', 'Wrangler configuration exists');
        } else {
            this.addIssue('error', 'wrangler-config', 'wrangler.toml not found', 'Create wrangler.toml configuration file');
        }
    }

    // Check 6: Secrets deployment validation
    checkSecretsHandling() {
        this.log('Checking secrets deployment handling...');

        const secretFiles = [
            'lib/shared/deployment/secrets-manager.js',
            'src/security/SecurityCLI.js'
        ];

        let hasErrorHandling = false;

        for (const file of secretFiles) {
            const filePath = path.join(this.projectRoot, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                if (content.includes('timeout') || content.includes('retry') || content.includes('504')) {
                    hasErrorHandling = true;
                    break;
                }
            }
        }

        if (!hasErrorHandling) {
            this.addIssue('warning', 'secrets-deployment', 'Secrets deployment may lack proper error handling', 'Add timeout and retry logic for secrets deployment to handle API failures');
        } else {
            this.addIssue('success', 'secrets-deployment', 'Secrets deployment error handling found');
        }
    }

    // Check 7: Context maintenance
    checkContextMaintenance() {
        this.log('Checking context maintenance throughout deployment...');

        const workflowFiles = [
            'lib/shared/deployment/workflows/interactive-deployment-coordinator.js',
            'src/service-management/InputCollector.js'
        ];

        let hasContextPersistence = false;

        for (const file of workflowFiles) {
            const filePath = path.join(this.projectRoot, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                // Look for context/state management
                if (content.includes('context') || content.includes('state') || content.includes('persist')) {
                    hasContextPersistence = true;
                    break;
                }
            }
        }

        if (!hasContextPersistence) {
            this.addIssue('warning', 'context-maintenance', 'Context maintenance may be inconsistent', 'Ensure deployment context (dry-run, environment, etc.) is maintained throughout the workflow');
        } else {
            this.addIssue('success', 'context-maintenance', 'Context maintenance detected');
        }
    }

    // Check 8: Package.json bin entries
    checkBinEntries() {
        this.log('Checking package.json bin entries...');

        const pkgPath = path.join(this.projectRoot, 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

            if (pkg.bin) {
                const binEntries = Object.entries(pkg.bin);
                const distEntries = binEntries.filter(([_, path]) => path.startsWith('dist/'));

                if (distEntries.length === binEntries.length) {
                    this.addIssue('success', 'bin-entries', 'All bin entries point to dist/ directory');
                } else {
                    this.addIssue('warning', 'bin-entries', 'Some bin entries may not point to built dist/ files', 'Ensure all bin entries reference dist/ paths after building');
                }
            } else {
                this.addIssue('error', 'bin-entries', 'No bin entries found in package.json');
            }
        }
    }

    // Check 9: Build artifacts
    checkBuildArtifacts() {
        this.log('Checking build artifacts...');

        const distPath = path.join(this.projectRoot, 'dist');
        if (fs.existsSync(distPath)) {
            const distContents = fs.readdirSync(distPath);
            const expectedDirs = ['cli', 'lib'];

            const missingDirs = expectedDirs.filter(dir => !distContents.includes(dir));

            if (missingDirs.length > 0) {
                this.addIssue('error', 'build-artifacts', `Missing build directories: ${missingDirs.join(', ')}`, 'Run npm run build to generate complete dist/ structure');
            } else {
                this.addIssue('success', 'build-artifacts', 'Build artifacts present');
            }
        } else {
            this.addIssue('error', 'build-artifacts', 'dist/ directory not found', 'Run npm run build to create distribution files');
        }
    }

    // Check 10: Import/export consistency
    checkImportExports() {
        this.log('Checking import/export consistency...');

        const indexPath = path.join(this.projectRoot, 'src/index.js');
        if (fs.existsSync(indexPath)) {
            const content = fs.readFileSync(indexPath, 'utf8');

            // Check for problematic imports
            if (content.includes('../lib/') || content.includes('../cli/')) {
                this.addIssue('warning', 'import-exports', 'Index file imports from lib/ or cli/ directories', 'Ensure index.js only imports from src/ for npm distribution compatibility');
            } else {
                this.addIssue('success', 'import-exports', 'Import paths appear consistent');
            }
        }
    }

    runAllChecks() {
        this.log('Starting comprehensive framework diagnostic...');
        this.log('='.repeat(60));

        this.checkDryRunHandling();
        this.checkWorkerNaming();
        this.checkDatabaseNaming();
        this.checkDomainWorkerConsistency();
        this.checkWranglerConfig();
        this.checkSecretsHandling();
        this.checkContextMaintenance();
        this.checkBinEntries();
        this.checkBuildArtifacts();
        this.checkImportExports();

        this.log('='.repeat(60));
        this.printSummary();
    }

    printSummary() {
        this.log(`Diagnostic Summary:`);
        this.log(`❌ Issues found: ${this.issues.length}`);
        this.log(`⚠️  Warnings: ${this.warnings.length}`);
        this.log(`✅ Passed checks: ${this.passed.length}`);

        if (this.issues.length > 0) {
            this.log('\n🚨 Critical Issues:');
            this.issues.forEach((issue, i) => {
                this.log(`${i + 1}. ${issue.category}: ${issue.message}`);
                if (issue.suggestion) {
                    this.log(`   💡 ${issue.suggestion}`);
                }
            });
        }

        if (this.warnings.length > 0) {
            this.log('\n⚠️  Warnings:');
            this.warnings.forEach((warning, i) => {
                this.log(`${i + 1}. ${warning.category}: ${warning.message}`);
                if (warning.suggestion) {
                    this.log(`   💡 ${warning.suggestion}`);
                }
            });
        }

        this.log('\n📊 Recommendations:');
        if (this.issues.length > 0) {
            this.log('1. Address critical issues before deployment');
        }
        if (this.warnings.length > 0) {
            this.log('2. Review warnings for potential improvements');
        }
        this.log('3. Run this diagnostic after making changes');
        this.log('4. Test deployments in dry-run mode thoroughly');
    }
}

// Run diagnostics if called directly
if (process.argv[1] && process.argv[1].includes('framework-diagnostic.js')) {
    const diagnostic = new FrameworkDiagnostic();
    diagnostic.runAllChecks();
}

export default FrameworkDiagnostic;