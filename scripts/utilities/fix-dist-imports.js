import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '../..');

function fixDistImports(dir) {
  const fullDir = path.join(projectRoot, dir);
  const files = fs.readdirSync(fullDir, { recursive: true });
  files.forEach(file => {
    const filePath = path.join(fullDir, file);
    if (fs.statSync(filePath).isFile() && filePath.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      const original = content;
      content = content.replace(/\.\.\/\.\.\/src\//g, '../../');
      if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed dist import:', path.relative(projectRoot, filePath));
      }
    }
  });
}

fixDistImports('dist/bin');
console.log('Dist import path fixes completed');