#!/usr/bin/env node

/**
 * Check Dist Imports
 *
 * Validates that all relative imports in `dist/` resolve to paths inside `dist/`.
 * This prevents published packages from including relative imports that escape
 * the `dist/` tree and point to non-existent files at package root.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '../../');
const distRoot = path.join(projectRoot, 'dist');

if (!fs.existsSync(distRoot)) {
  console.error('dist/ directory not found. Run: npm run build');
  process.exit(1);
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else if (e.isFile() && full.endsWith('.js')) files.push(full);
  }
  return files;
}

const importRegex = /(?:from\s+['"]([^'"\n]+)['"])|(?:import\(['"]([^'"\n]+)['"]\))/g;
let failures = [];
const files = walk(distRoot);
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = importRegex.exec(content)) !== null) {
    const imp = m[1] || m[2];
    if (!imp) continue;
    // only check relative imports
    if (!imp.startsWith('.')) continue;

    // Resolve the import target
    const resolved = path.resolve(path.dirname(file), imp);
    const normalizedDist = path.resolve(distRoot) + path.sep;
    if (!resolved.startsWith(normalizedDist)) {
      failures.push({ file, imp, resolved });
    }
  }
}

if (failures.length > 0) {
  console.error('\n❌ Dist import validation failed. The following relative imports resolve outside dist/:\n');
  for (const f of failures) {
    console.error(` - ${path.relative(projectRoot, f.file)} imports '${f.imp}' → resolves to ${f.resolved}`);
  }
  console.error(`\nRecommendation: adjust relative imports so they point into 'dist/' (e.g. '../lib/...' from dist/<subdir>/ files).`);
  process.exit(1);
}

console.log('\n✅ All relative imports in dist/ resolve inside dist/.');
process.exit(0);
