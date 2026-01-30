#!/usr/bin/env node
/*
  Lightweight template scanner to detect suspicious/example/test artifacts in templates/
  Exits with code 1 if any checks fail.
*/
import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const templatesDir = path.join(repoRoot, 'templates');
const gitignorePath = path.join(repoRoot, '.gitignore');

const suspiciousPatterns = [
  {name: 'test-service', re: /\btest-service\b/i},
  {name: 'test.example.com', re: /test\.example\.com/i},
  {name: 'testcorp', re: /\btestcorp\b/i},
  {name: 'test-worker', re: /\btest-worker\b/i},
  {name: 'SERVICE_DOMAIN assignment', re: /SERVICE_DOMAIN\s*=\s*/i},
  {name: 'secrets JSON filename', re: /-secrets\.json\b/i},
  {name: 'secrets reference', re: /\bsecrets\b/i},
  {name: 'example domain', re: /example\.(com|org|net)/i}
];

let failures = [];

function checkGitignore() {
  if (!fs.existsSync(gitignorePath)) {
    failures.push('.gitignore is missing');
    return;
  }
  const gitignore = fs.readFileSync(gitignorePath, 'utf8');
  if (!/\.clodo-cache\/?/m.test(gitignore)) {
    failures.push("'.clodo-cache/' not found in .gitignore - add it to avoid committing generated caches or secrets");
  }
}

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      cb(full, true);
      walk(full, cb);
    } else if (e.isFile()) {
      cb(full, false);
    }
  }
}

function scanTemplates() {
  if (!fs.existsSync(templatesDir)) {
    console.log('No templates/ directory present; skipping template scans.');
    return;
  }

  // Warn if config/ or secrets/ subdirectories exist in templates
  // Allow config/ directories that are explicitly marked as examples via a marker file ('.config-is-sample')
  walk(templatesDir, (p, isDir) => {
    const rel = path.relative(templatesDir, p);
    const parts = rel.split(path.sep);
    if (!isDir) return;
    if (parts.includes('secrets')) {
      failures.push(`templates contains a 'secrets' directory at: templates/${rel}`);
      return;
    }
    if (parts.includes('config')) {
      // Check for an explicit marker file indicating this config is intentionally an example
      const marker1 = path.join(p, '.config-is-sample');
      const marker2 = path.join(p, 'README');
      const isMarked = fs.existsSync(marker1) || (fs.existsSync(marker2) && fs.readFileSync(marker2, 'utf8').toLowerCase().includes('sample'));
      if (!isMarked) {
        failures.push(`templates contains a 'config' directory at: templates/${rel}`);
      }
    }
  });

  // Scan files for suspicious content
  walk(templatesDir, (p, isDir) => {
    if (isDir) return;
    const rel = path.relative(templatesDir, p);
    const content = fs.readFileSync(p, 'utf8');
    for (const pat of suspiciousPatterns) {
      if (pat.re.test(content)) {
        failures.push(`Found '${pat.name}' in templates/${rel}`);
      }
    }
  });
}

function main() {
  console.log('Running template and repo hygiene checks...');
  checkGitignore();
  scanTemplates();

  if (failures.length) {
    console.error('\nErrors found:');
    for (const f of failures) console.error(' -', f);
    process.exitCode = 1;
    process.exit(1);
  }

  console.log('All checks passed ✅');
}

main();
