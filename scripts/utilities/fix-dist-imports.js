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
 * 7. Files in dist/lib/shared/database|security|utils/ importing ../../utils/framework-config.js should be ../../../utils/framework-config.js
 * 8. Files in dist/index.js importing ../../../lib/shared/deployment/credential-collector should be ./lib/shared/deployment/credential-collector
 * 9. Files in dist/worker/integration.js importing ../../lib/shared/config/ConfigurationManager should be ../lib/shared/config/ConfigurationManager
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
        const normalizedRelPath = relPath.replace(/\\/g, '/');
        
        // Single minimal fix for wrapper re-exports: ../../../src/utils/ becomes ../../../utils/ in dist/
        // This handles the framework-config wrapper in lib/shared/utils/
        if (normalizedRelPath === 'dist/lib/shared/utils/framework-config.js') {
          content = content.replace(/from\s+['"]\.\.\/\.\.\/\.\.\/src\/utils\//g, "from '../../../utils/");
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