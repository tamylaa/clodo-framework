import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(distDir)) {
  console.error('dist/ directory does not exist. Run npm run build first.');
  process.exit(1);
}

const files = fs.readdirSync(distDir);
if (files.length === 0) {
  console.error('dist/ directory is empty. Build may have failed.');
  process.exit(1);
}

console.log(`Bundle check passed: ${files.length} files in dist/`);
files.forEach(file => console.log(`- ${file}`));