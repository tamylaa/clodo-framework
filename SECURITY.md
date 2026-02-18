# Security Policy

We take security seriously. If you believe you have found a security vulnerability, please follow these steps:

1. **Email:** product@clodo.dev with subject `SECURITY REPORT: <short description>` including steps to reproduce and impact.
2. **Acknowledge:** We aim to acknowledge all security reports within 1 business day.
3. **Follow-up:** We will provide a remediation plan within 3 business days and keep you updated until a fix is released.

If you prefer, you may also open an issue and mark it private/secure (or include `SECURITY:` in the title) — but email is preferred for confidential reports.

We do not accept unsolicited code changes submitted in pull requests for reported vulnerabilities; we will coordinate remediation privately as needed.

## Built-in Security Features

The Clodo Framework includes several security tools to help prevent common issues:

### Secret Scanning (`clodo-service secrets`)
Detects leaked secrets in your source code before they reach version control. Supports 15+ built-in patterns including AWS keys, Stripe keys, GitHub tokens, JWT secrets, and more.

```bash
clodo-service secrets scan         # Scan for leaked secrets
clodo-service secrets validate     # Validate against baseline
clodo-service secrets baseline show    # View current baseline
clodo-service secrets baseline update  # Update baseline after review
```

The `SecretsManager` class is also available as a programmatic API for integration into CI/CD pipelines.

### Preflight Security Checks (`clodo-service doctor`)
Automated environment and configuration validation before deployment, including security-related checks for environment variables, API connectivity, and config file integrity.

### Config Schema Validation (`clodo-service config-schema`)
Validates CLI config files against Zod schemas. Detects semantic issues like environment variable placeholders left in production configs, missing security features, and insecure configurations.

### Security Validation Framework
Automatic pre-deployment validation that blocks deployment of dummy API keys, weak secrets, insecure URLs, and other security anti-patterns. See the main [README](README.md) for details.