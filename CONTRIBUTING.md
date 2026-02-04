# Contributing to Clodo Framework

Thank you for your interest in contributing to the Clodo Framework! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues
- **Bug Reports**: Use the GitHub issue template for bugs
- **Feature Requests**: Use the GitHub issue template for feature requests
- **Documentation**: Report documentation issues or suggest improvements

### Development Process
1. **Fork** the repository
2. **Create** a feature branch from `main`
3. **Make** your changes with appropriate tests
4. **Ensure** all tests pass
5. **Submit** a pull request

## 🏗️ Development Setup

### Prerequisites
- Node.js 18.0.0 or later
- npm 8.0.0 or later
- PowerShell 5.1+ (Windows) or PowerShell Core 7+ (cross-platform)
- Wrangler CLI installed and configured

### Local Development
```bash
# Clone the repository
git clone https://github.com/tamyla/clodo-framework.git
cd clodo-framework

# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint

# Build the framework
npm run build
```

### Testing Changes
```bash
# Test CLI tool
node bin/create-service.js test-service --type generic

# Test in local service
cd test-service
npm install
npm run dev
```

## 📝 Coding Standards

### JavaScript/Node.js
- Use ES6+ modules and modern JavaScript features
- Follow existing code style and patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### PowerShell Scripts
- Use approved PowerShell verbs
- Include parameter validation
- Use Write-Host for user feedback with appropriate colors
- Handle errors gracefully with try/catch blocks

### Documentation
- Update relevant documentation for any changes
- Include code examples for new features
- Use clear, concise language
- Follow existing documentation structure

## 🧪 Testing Guidelines

### Unit Tests
- Write tests for all new functionality
- Maintain or improve code coverage
- Use descriptive test names
- Mock external dependencies appropriately

### Integration Tests
- Test service generation end-to-end
- Verify deployment scripts work correctly
- Test multi-domain functionality
- Validate feature flag behavior

### Documentation Tests
- Ensure all code examples work as documented
- Test getting started guide steps
- Validate API documentation accuracy

## 📦 Pull Request Process

### Before Submitting
1. **Update Documentation**: Ensure docs reflect your changes
2. **Run Tests**: All tests must pass
3. **Check Linting**: Code must pass linting rules
4. **Test Locally**: Verify changes work in practice

### PR Guidelines
- **Clear Description**: Explain what and why you changed
- **Link Issues**: Reference related issues
- **Small PRs**: Keep changes focused and reviewable
- **Update Changelog**: Add entry for significant changes

### Review Process
- Maintainers will review PRs within 1-2 business days
- Address feedback promptly
- Be open to suggestions and improvements
- Squash commits before merging if requested

## 🎯 Areas for Contribution

### High Priority
- **Performance Optimizations**: Reduce framework overhead
- **Documentation Improvements**: Examples, tutorials, guides
- **Testing**: Increase test coverage and reliability
- **Security**: Authentication patterns and best practices

### Medium Priority
- **New Service Templates**: Additional service types
- **Integration Examples**: External service patterns
- **Developer Tools**: Better debugging and development experience
- **Error Handling**: Improved error messages and recovery

### Future Features
- **Advanced Schema Management**: Version control and migrations
- **Real-time Capabilities**: WebSocket and SSE support
- **Plugin System**: Extensible architecture
- **Monitoring Integration**: Built-in observability

## 🐛 Bug Report Template

```markdown
**Bug Description**
A clear and concise description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: [e.g. Windows 11, macOS 13]
- Node.js Version: [e.g. 18.17.0]
- Framework Version: [e.g. 1.0.0]
- Wrangler Version: [e.g. 3.10.0]

**Additional Context**
Add any other context about the problem here.
```

## 💡 Feature Request Template

```markdown
**Feature Description**
A clear and concise description of the feature you'd like to see.

**Problem Statement**
What problem does this feature solve?

**Proposed Solution**
How would you like to see this implemented?

**Alternatives Considered**
What other approaches have you considered?

**Additional Context**
Add any other context or screenshots about the feature request.
```

## 📋 Code of Conduct

### Our Pledge
We are committed to making participation in this project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards
Examples of behavior that contributes to creating a positive environment include:
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Enforcement
Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team. All complaints will be reviewed and investigated promptly and fairly.

## 📞 Getting Help

- **Documentation**: Check the [docs](./docs/README.md) first
- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and community support
- **Email**: `product@clodo.dev` — for product support, feedback, or security issues (we aim to respond within 2 business days)
- **Twitter**: [@clodoframework](https://twitter.com/clodoframework) — follow for releases and updates

**Want to show appreciation?** Star the repository and leave a short note via an Issue or tweet — we read and appreciate every mention.

## 🏷️ Release Process

### Versioning
We use [Semantic Versioning](https://semver.org/):
- **MAJOR**: Incompatible API changes
- **MINOR**: New functionality (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist
1. Update version in package.json
2. Update CHANGELOG.md
3. Run full test suite
4. Create and test release candidate
5. Tag release and push to GitHub
6. Publish to npm registry
7. Update documentation

## 🙏 Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project README
- Special thanks for significant contributions

Thank you for helping make the Clodo Framework better! 🚀