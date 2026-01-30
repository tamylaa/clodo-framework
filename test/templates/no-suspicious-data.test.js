import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Templates should not contain suspicious test data', () => {
  // Use process.cwd() so tests work in ESM/Jest environments where __dirname may be unavailable
  const templatesDir = join(process.cwd(), 'templates');
  const suspiciousPatterns = [
    /test-service/i,
    /test\.example\.com/i,
    /testcorp/i,
    /test-worker/i,
    /SERVICE_DOMAIN\s*=\s*"test/i,
    /secrets/i,
    /-secrets\.json/i
  ];

  function walk(dir) {
    const files = [];
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        files.push(...walk(full));
      } else {
        files.push(full);
      }
    }
    return files;
  }

  it('has no suspicious patterns in templates', () => {
    const files = walk(templatesDir);
    const found = [];

    for (const f of files) {
      try {
        const content = readFileSync(f, 'utf8');
        for (const pat of suspiciousPatterns) {
          if (pat.test(content)) {
            found.push(`${f} -> ${pat}`);
          }
        }
      } catch (err) {
        // ignore binary/invalid files
      }
    }

    expect(found).toEqual([]);
  });
});
