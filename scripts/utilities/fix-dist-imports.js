import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '../..');

function fixDistImports(dir) {
  const fullDir = path.join(projectRoot, dir);
  if (!fs.existsSync(fullDir)) return;
  
  const files = fs.readdirSync(fullDir, { recursive: true });
  files.forEach(file => {
    const filePath = path.join(fullDir, file);
    if (fs.statSync(filePath).isFile() && filePath.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      const original = content;
      content = content.replace(/\.\.\/\.\.\/src\//g, '../../');
      // Don't change lib/ imports to database/ - lib files stay in lib/
      // content = content.replace(/\.\.\/\.\.\/lib\/database\//g, '../../database/');
      // content = content.replace(/\.\.\/\.\.\/lib\/deployment\//g, '../../deployment/');
      // Fix incorrect service-management imports in CLI to point to src/
      content = content.replace(/\.\.\/\.\.\/src\/service-management\//g, '../../service-management/');
      
      // General fix: for files in subdirectories of dist/, fix ../../lib/ to ../lib/
      if (dir !== 'dist') {
        content = content.replace(/\.\.\/\.\.\/lib\//g, '../lib/');
        content = content.replace(/\.\.\/\.\.\/database\//g, '../database/');
        content = content.replace(/\.\.\/\.\.\/deployment\//g, '../deployment/');
        content = content.replace(/\.\.\/\.\.\/config\//g, '../config/');
        content = content.replace(/\.\.\/\.\.\/schema\//g, '../schema/');
        content = content.replace(/\.\.\/\.\.\/security\//g, '../security/');
        content = content.replace(/\.\.\/\.\.\/service-management\//g, '../service-management/');
        content = content.replace(/\.\.\/\.\.\/services\//g, '../services/');
        // Don't change utils imports in service-management - they should stay ../../utils/
        if (dir !== 'dist/service-management') {
          content = content.replace(/\.\.\/\.\.\/utils\//g, '../utils/');
        }
        content = content.replace(/\.\.\/\.\.\/migration\//g, '../migration/');
        content = content.replace(/\.\.\/\.\.\/modules\//g, '../modules/');
        content = content.replace(/\.\.\/\.\.\/orchestration\//g, '../orchestration/');
        content = content.replace(/\.\.\/\.\.\/routing\//g, '../routing/');
        content = content.replace(/\.\.\/\.\.\/handlers\//g, '../handlers/');
        content = content.replace(/\.\.\/\.\.\/version\//g, '../version/');
        content = content.replace(/\.\.\/\.\.\/worker\//g, '../worker/');
        content = content.replace(/\.\.\/\.\.\/ui-structures\//g, '../ui-structures/');
      }
      
      // Fix CLI imports from ../lib/ to ../../lib/
      if (dir === 'dist/cli') {
        // CLI imports are now correctly set to ../../lib/ and ../../../service-management/
        // No additional fixing needed
        // content = content.replace(/\.\.\/lib\//g, '../../lib/');
      }
      // Fix utils imports from ../../lib/ to ../lib/
      if (dir === 'dist/utils') {
        content = content.replace(/\.\.\/\.\.\/lib\//g, '../lib/');
      }
      // Fix CLI imports from ../src/ to ../
      if (dir === 'dist/cli') {
        content = content.replace(/\.\.\/src\//g, '../');
      }
      if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed dist import:', path.relative(projectRoot, filePath));
      }
    }
  });
}

// Fix all dist directories
const distDirs = [
  'dist/cli',
  'dist/lib', 
  'dist/utils',
  'dist/worker',
  'dist/config',
  'dist/database',
  'dist/deployment',
  'dist/handlers',
  'dist/migration',
  'dist/modules',
  'dist/orchestration',
  'dist/routing',
  'dist/schema',
  'dist/security',
  'dist/service-management',
  'dist/services',
  'dist/ui-structures',
  'dist/version'
];

distDirs.forEach(dir => fixDistImports(dir));
console.log('Dist import path fixes completed');