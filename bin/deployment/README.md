# Deployment Tools

Enterprise deployment and orchestration tools for Lego Framework services.

## Tools

### enterprise-deploy.js
Advanced enterprise deployment CLI with comprehensive features.

**Features:**
- Multi-domain deployment orchestration
- Automated configuration discovery
- Advanced validation and testing pipelines
- Rollback and recovery management
- Comprehensive audit and reporting
- CI/CD integration support
- Batch operations and automation
- Performance monitoring and analytics
- Compliance and security features

**Usage:**
```bash
node bin/deployment/enterprise-deploy.js deploy --service my-service --environment production
```

**Commands:**
- `deploy` - Deploy services
- `rollback` - Rollback deployments
- `validate` - Validate deployment configurations
- `audit` - View deployment audit logs
- `monitor` - Monitor deployment status

### master-deploy.js
Master deployment orchestration for complex multi-service deployments.

**Features:**
- Portfolio-wide deployment coordination
- Dependency management between services
- Parallel deployment execution
- Health checking and verification
- Automated rollback on failures
- Deployment pipeline management

**Usage:**
```bash
node bin/deployment/master-deploy.js --portfolio my-portfolio --environment production
```

**Options:**
- `--portfolio <name>` - Portfolio to deploy
- `--environment <env>` - Target environment
- `--parallel` - Enable parallel deployment
- `--skip-health-checks` - Skip post-deployment health checks