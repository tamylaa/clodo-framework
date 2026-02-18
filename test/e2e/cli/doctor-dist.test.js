import { describe, test, expect } from '@jest/globals';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

describe('Doctor CLI (compiled /dist) — regression tests', () => {
  test('dist CLI should list `doctor` in help output', () => {
    // ensure dist CLI exists (build step may be required in CI)
    if (!existsSync('dist/cli/clodo-service.js')) {
      execSync('npm run build --silent', { stdio: 'inherit' });
    }

    const help = execSync('node dist/cli/clodo-service.js --help', { encoding: 'utf8', timeout: 20000 });
    expect(help).toMatch(/doctor/);
    expect(help).toMatch(/secrets/);
  }, 30000);

  test('dist CLI should execute `doctor --json` and output JSON structure', () => {
    if (!existsSync('dist/cli/clodo-service.js')) {
      execSync('npm run build --silent', { stdio: 'inherit' });
    }

    // `doctor` may exit non-zero in test env — capture stdout/stderr and parse JSON
    let out = '';
    try {
      out = execSync('node dist/cli/clodo-service.js doctor --json', { encoding: 'utf8', timeout: 20000 });
    } catch (err) {
      // command may exit non-zero — but still produce JSON on stdout
      out = (err.stdout || '') + (err.stderr || '');
    }

    const jsonMatch = out.match(/\{[\s\S]*"timestamp"[\s\S]*\}/);
    expect(jsonMatch).toBeTruthy();

    const parsed = JSON.parse(jsonMatch[0]);
    expect(parsed).toHaveProperty('timestamp');
    expect(parsed).toHaveProperty('checks');
    expect(Array.isArray(parsed.checks)).toBe(true);
    expect(parsed).toHaveProperty('summary');
  }, 30000);
});
