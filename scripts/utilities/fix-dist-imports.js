import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '../..');

/**
 * Minimal import path fix for dist/ after Babel compilation
 * 
 * NOTE: This script should do MINIMAL changes. Babel preserves relative imports
 * from source files, so most imports are already correct.
 * 
 * Fix:
 * 1. CLI commands that reference ../lib/ instead of ../../lib/ (depth mismatch)
 * 2. CLI commands that reference ../config/ instead of ../../config/
 * 3. CLI commands that reference ../service-management/ instead of ../../service-management/
 * 4. Files importing ../../../dist/utils/ should be ../../../utils/
 * 5. Files in dist/utils/ importing ../../../lib/shared/ should be ../../lib/shared/
 * 6. Files in dist/lib/shared/ importing ../../../src/utils/ should be ../../utils/
 * 
 * DO NOT apply aggressive global replacements - they break things!
 */
function fixDistImports(dir) {
  const fullDir = path.join(projectRoot, dir);
  if (!fs.existsSync(fullDir)) return;
  
  const files = fs.readdirSync(fullDir, { recursive: true });
  files.forEach(file => {
    const filePath = path.join(fullDir, file);
    if (fs.statSync(filePath).isFile() && filePath.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      const original = content;
      const relPath = path.relative(projectRoot, filePath);
      
      // Only fix CLI command imports
      // Files in dist/cli/commands/ are 2 levels deep and need ../../ to reach dist root
      if (relPath.startsWith('dist/cli/commands/')) {
        // Fix imports that incorrectly have ../lib/ instead of ../../lib/
        content = content.replace(/from\s+['"]\.\.\/lib\//g, "from '../../lib/");
        // Fix imports that incorrectly have ../config/ instead of ../../config/
        content = content.replace(/from\s+['"]\.\.\/config\//g, "from '../../config/");
        // Fix imports that incorrectly have ../service-management/ instead of ../../service-management/
        content = content.replace(/from\s+['"]\.\.\/service-management\//g, "from '../../service-management/");
        
        // Also fix dynamic imports with import()
        content = content.replace(/import\(['"]\.\.\/lib\//g, "import('../../lib/");
        content = content.replace(/import\(['"]\.\.\/config\//g, "import('../../config/");
        content = content.replace(/import\(['"]\.\.\/service-management\//g, "import('../../service-management/");
      }
      
      // Fix imports in all dist/ files
      if (relPath.startsWith('dist')) {
        // Fix ../../../src/utils/ to ../../utils/ for files in dist/lib/shared/
        if (relPath.includes('dist/lib/shared/') || relPath.includes('dist\\lib\\shared\\')) {
          content = content.replace(/\.\.\/\.\.\/\.\.\/src\/utils\//g, "../../utils/");
        }
        
        const normalizedRelPath = relPath.replace(/\\/g, '/');
        const pathDepth = normalizedRelPath.split('/').length;
        
        // Fix ../../lib/shared/ to ../lib/shared/ for files at depth 2: dist/<dir>/<file>.js
        // Example: dist/database/database-orchestrator.js importing ../../lib/shared/utils/framework-config.js
        // Should become: ../lib/shared/utils/framework-config.js
        if (pathDepth === 3 && normalizedRelPath.match(/^dist\/[^\/]+\/[^\/]+\.js$/)) {
          // File is at depth 2: dist/<dir>/<file>.js
          // Fix specific shared lib imports
          content = content.replace(/from\s+(['"])\.\.\/\.\.\/lib\/shared\//g, "from $1../lib/shared/");
          content = content.replace(/import\s*\(\s*(['"])\.\.\/\.\.\/lib\/shared\//g, "import($1../lib/shared/");
          // Fix generic lib imports (e.g. ../../lib/database/.. -> ../lib/database/...)
          content = content.replace(/from\s+(['"])\.\.\/\.\.\/lib\//g, "from $1../lib/");
          content = content.replace(/import\s*\(\s*(['"])\.\.\/\.\.\/lib\//g, "import($1../lib/");
        }
        
        // Fix ../../../lib/shared/ to ../../lib/shared/ for files at depth 3: dist/<dir>/<subdir>/<file>.js
        // Example: dist/deployment/orchestration/BaseDeploymentOrchestrator.js importing ../../../lib/shared/utils/ErrorHandler.js
        // Should become: ../../lib/shared/utils/ErrorHandler.js
        if (pathDepth === 4 && normalizedRelPath.match(/^dist\/[^\/]+\/[^\/]+\/[^\/]+\.js$/)) {
          // File is at depth 3: dist/<dir>/<subdir>/<file>.js
          content = content.replace(/from\s+(['"])\.\.\/\.\.\/\.\.\/lib\/shared\//g, "from $1../../lib/shared/");
          content = content.replace(/import\s*\(\s*(['"])\.\.\/\.\.\/\.\.\/lib\/shared\//g, "import($1../../lib/shared/");
        }
        
        // Fix ../../../lib/shared/ to ../../lib/shared/ for files in dist/utils/ subdirectories
        // Example: dist/utils/deployment/config-cache.js importing ../../../lib/shared/utils/framework-config.js
        // Should become: ../../lib/shared/utils/framework-config.js
        if (normalizedRelPath.match(/^dist\/utils\/[^\/]+\/[^\/]+\.js$/)) {
          // File is at depth 3: dist/utils/<subdir>/<file>.js
          content = content.replace(/from\s+(['"])\.\.\/\.\.\/\.\.\/lib\/shared\//g, "from $1../../lib/shared/");
          content = content.replace(/import\s*\(\s*(['"])\.\.\/\.\.\/\.\.\/lib\/shared\//g, "import($1../../lib/shared/");
        }
        
        // Fix ../../../lib/shared/ to ../../lib/shared/ for files in dist/service-management/ subdirectories
        if (normalizedRelPath.match(/^dist\/service-management\/[^\/]+\/[^\/]+\.js$/)) {
          content = content.replace(/from\s+(['"])\.\.\/\.\.\/\.\.\/lib\/shared\//g, "from $1../../lib/shared/");
          content = content.replace(/import\s*\(\s*(['"])\.\.\/\.\.\/\.\.\/lib\/shared\//g, "import($1../../lib/shared/");
        }
        
        // Fix ../lib/ to ./lib/ for files directly in dist/ root (like index.js)
        if (normalizedRelPath.startsWith('dist/') && pathDepth === 2 && normalizedRelPath.endsWith('.js')) {
          content = content.replace(/\.\.\/lib\//g, "./lib/");
        }
      }
      
      if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log('✅ Fixed dist import:', relPath);
      }
    }
  });
}

// Process all dist/ where the fixes are needed
fixDistImports('dist');
console.log('✅ Dist import path fixes completed');