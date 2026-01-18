# PCL Security Hardening Guide

## Overview

This document outlines the comprehensive security measures implemented in the PCL repository to protect against common threats and ensure compliance with security best practices.

## 🛡️ Security Layers

### 1. Repository Security

#### Code Owners (CODEOWNERS)

- **Purpose**: Enforce mandatory code reviews for critical files
- **Implementation**: `.github/CODEOWNERS`
- **Coverage**: Security files, governance docs, core compiler, registry system, build configs

#### Branch Protection

- **Status**: Requires GitHub Pro or public repository
- **Recommendations**:
  - Require pull request reviews before merging
  - Dismiss stale pull request approvals
  - Require status checks to pass
  - Require signed commits
  - Include administrators in restrictions

### 2. Dependency Security

#### Dependabot Configuration

- **Location**: `.github/dependabot.yml`
- **Features**:
  - Weekly dependency updates (Monday 9:00 UTC)
  - Separate PRs for security updates
  - Grouped minor/patch updates
  - GitHub Actions monitoring

#### Audit Commands

```bash
# Security audit
npm run security:audit

# Fix vulnerabilities automatically
npm run security:audit:fix

# Full security scan
npm run security:scan
```

### 3. Secret Scanning

#### Gitleaks Configuration

- **Location**: `.gitleaks.toml`
- **Coverage**:
  - API keys and tokens
  - Private keys and certificates
  - Database credentials
  - Environment variables
  - Custom PCL patterns

#### Run Locally

```bash
# Install gitleaks
# Windows: choco install gitleaks
# macOS: brew install gitleaks
# Linux: See https://github.com/gitleaks/gitleaks#installing

# Scan repository
npx gitleaks detect --source . -v

# Scan specific branch
npx gitleaks detect --source . --branch main
```

### 4. Automated Security Scanning

#### GitHub Actions Workflow

- **Location**: `.github/workflows/security.yml`
- **Schedule**: Daily at 2:00 AM UTC + on push/PR
- **Scans**:
  - Dependency review (Dependabot)
  - npm audit (vulnerabilities)
  - CodeQL analysis (code security)
  - Secret scanning (Gitleaks)
  - License compliance

### 5. Secure Coding Practices

#### .gitignore Hardening

Enhanced to exclude:

- Environment files (`.env*`)
- Credentials and keys (`*.pem`, `*.key`, `secrets.json`)
- Cloud provider configs (AWS, Azure, GCP)
- SSH keys
- API tokens

#### Input Validation

```typescript
// Example: Persona name validation
function validatePersonaName(name: string): boolean {
  return /^[a-zA-Z0-9_-]{1,50}$/.test(name);
}
```

#### Error Handling

```typescript
// Never expose sensitive information in errors
catch (error) {
  logger.error('Operation failed', {
    operation: 'parse',
    // DO NOT log: passwords, tokens, PII
  });
  throw new PCLError('Invalid input');
}
```

## 🚨 Vulnerability Reporting

### Private Reporting (Critical Issues)

**Email**: security@pcl-lang.org

**Include**:

- Detailed description
- Steps to reproduce
- Impact assessment
- Suggested fix (optional)

**Response SLA**:

- Acknowledgment: 48 hours
- Initial assessment: 7 days
- Fix timeline: Based on severity

### Public Reporting (Non-Critical)

- Use GitHub Security Advisory
- Use Issue Template: `.github/ISSUE_TEMPLATE/security_vulnerability.yml`

## 📋 Security Checklist for Contributors

### Before Committing

- [ ] No hardcoded secrets or credentials
- [ ] Input validation for all user inputs
- [ ] Error messages don't expose sensitive data
- [ ] Dependencies updated and scanned
- [ ] Run `npm run security:scan`

### Before Submitting PR

- [ ] All tests pass
- [ ] Security tests added for new features
- [ ] SECURITY_CHECKLIST.md reviewed
- [ ] PR template security section completed
- [ ] No security warnings in CI

## 🔐 Security Best Practices

### 1. Secrets Management

```bash
# ✅ GOOD: Use environment variables
export PCL_API_KEY=your-key-here
node app.js

# ❌ BAD: Hardcode in source
const apiKey = 'sk-1234567890'; // NEVER!
```

### 2. Dependency Management

```bash
# Check for outdated packages
npm outdated

# Update with caution
npm update

# Audit for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### 3. Code Review

- Review security impact of all changes
- Check for injection vulnerabilities
- Verify input validation
- Ensure least privilege principles
- Test error handling

### 4. Authentication & Authorization

```typescript
// Implement proper access controls
function checkPermission(user: User, resource: Resource): boolean {
  // Verify user identity
  // Check authorization rules
  // Apply least privilege
  // Log access attempts
}
```

## 🛠️ Security Tools & Resources

### Installed Tools

- **ESLint**: Static code analysis
- **TypeScript**: Type safety
- **Husky**: Pre-commit hooks
- **lint-staged**: Staged files linting

### Recommended Tools

- **Gitleaks**: Secret scanning
- **npm audit**: Dependency vulnerabilities
- **Snyk**: Continuous security monitoring
- **SonarQube**: Code quality & security

### External Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)

## 📊 Security Metrics

Track these metrics:

- Time to patch critical vulnerabilities: < 48 hours
- Dependency update frequency: Weekly
- Security scan frequency: Daily
- False positive rate: < 5%
- Test coverage: ≥ 80%

## 🔄 Security Update Process

1. **Detection**: Automated scanning identifies vulnerability
2. **Assessment**: Security team evaluates severity
3. **Patching**: Fix developed and tested
4. **Deployment**: Fix merged and released
5. **Notification**: Security advisory published (if needed)

## 📞 Security Contacts

- **Security Team**: security@pcl-lang.org
- **Governance**: governance@pcl-lang.org
- **Compliance**: compliance@pcl-lang.org
- **General**: info@pcl-lang.org

## 📚 Related Documentation

- [SECURITY.md](../SECURITY.md) - Security policy
- [PCL_SECURITY_MODEL.md](../GOVERNANCE/PCL_SECURITY_MODEL.md) - Security architecture
- [SECURITY_CHECKLIST.md](.github/SECURITY_CHECKLIST.md) - Contributor checklist
- [PCL_GOVERNANCE.md](../GOVERNANCE/PCL_GOVERNANCE.md) - Governance framework

---

**Last Updated**: January 2026
**Version**: 1.0
**Maintained By**: PCL Security Team
