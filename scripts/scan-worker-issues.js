import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const incompatiblePatterns = [
  /import.*from.*['"]fs['"]/,
  /import.*from.*['"]path['"]/,
  /import.*from.*['"]child_process['"]/,
  /import.*from.*['"]os['"]/,
  /import.*from.*['"]https['"]/,
  /import.*from.*['"]http['"]/,
  /process\.cwd/,
  /__dirname/,
  /__filename/,
  /readFileSync|writeFileSync|existsSync|mkdirSync|readdirSync|statSync/
];

function scanDirectory(dir, results = []) {
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scanDirectory(fullPath, results);
      } else if (item.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const issues = [];
        for (const pattern of incompatiblePatterns) {
          const matches = content.match(pattern);
          if (matches) {
            issues.push(matches[0]);
          }
        }
        if (issues.length > 0) {
          results.push({ file: fullPath, issues });
        }
      }
    }
  } catch (e) {}
  return results;
}

const results = scanDirectory('src');
console.log('Files with Worker-incompatible code:');
results.forEach(r => {
  console.log(`\n${r.file}:`);
  r.issues.forEach(issue => console.log(`  - ${issue}`));
});