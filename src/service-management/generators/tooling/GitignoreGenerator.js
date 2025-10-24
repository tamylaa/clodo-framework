import { BaseGenerator } from '../BaseGenerator.js';
import { join } from 'path';
import { writeFileSync } from 'fs';

/**
 * Gitignore Generator
 * Generates comprehensive .gitignore file for Cloudflare Workers projects
 */
export class GitignoreGenerator extends BaseGenerator {
  /**
   * Generate .gitignore file
   * @param {Object} context - Generation context
   * @returns {Promise<string>} Path to generated .gitignore file
   */
  async generate(context) {
    const { coreInputs, confirmedValues, servicePath } = this.extractContext(context);
    
    if (!this.shouldGenerate(context)) {
      return null;
    }

    const gitignoreContent = this._generateGitignoreContent(coreInputs, confirmedValues);
    
    const filePath = join(servicePath, '.gitignore');
    writeFileSync(filePath, gitignoreContent, 'utf8');
    return filePath;
  }

  /**
   * Generate .gitignore content
   * @private
   */
  _generateGitignoreContent(coreInputs, confirmedValues) {
    return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
coverage/

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output/

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build / generate output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Cloudflare
.wrangler/
`;
  }

  /**
   * Determine if generator should run
   */
  shouldGenerate(context) {
    return true; // Always generate .gitignore
  }
}
