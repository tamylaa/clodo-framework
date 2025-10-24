# Configuration Generators

Generators for environment and configuration files.

## Generators in this directory

- **EnvFileGenerator** - Generates `.env.example`, `.env.production`, `.env.staging`, `.env.development`
- **GitignoreGenerator** - Generates `.gitignore` with Node.js and Cloudflare Workers defaults
- **DockerComposeGenerator** - Generates `docker-compose.yml` for local development

## Priority

**P1-P2 priority** - Important but can be extracted in parallel with static-site template work.

## Status

- [ ] EnvFileGenerator (REFACTOR-10)
- [ ] GitignoreGenerator (REFACTOR-11)
- [ ] DockerComposeGenerator (REFACTOR-12)
