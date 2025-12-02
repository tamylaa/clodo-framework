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
 * Only fix:
 * 1. CLI commands that reference ../lib/ instead of ../../lib/ (depth mismatch)
 * 2. CLI commands that reference ../config/ instead of ../../config/
 * 3. CLI commands that reference ../service-management/ instead of ../../service-management/
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
      
      if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log('✅ Fixed dist import:', relPath);
      }
    }
  });
}

// Only process dist/cli where the fixes are needed
fixDistImports('dist/cli');
console.log('✅ Dist import path fixes completed');