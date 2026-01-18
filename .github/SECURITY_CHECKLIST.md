# Security Policy Checklist for PCL Contributors

## Pre-Commit Security Checks

Before committing code, ensure:

- [ ] **No Secrets in Code**: No API keys, passwords, or tokens in source files
- [ ] **No Personal Data**: No PII or sensitive user data in code or tests
- [ ] **Dependencies Updated**: All dependencies are up-to-date and patched
- [ ] **Input Validation**: All user inputs are validated and sanitized
- [ ] **Error Handling**: Sensitive information not exposed in error messages
- [ ] **Security Tests**: Security-related tests added for new features

## Code Review Security Checks

Reviewers should verify:

- [ ] **Authentication**: Proper authentication mechanisms in place
- [ ] **Authorization**: Appropriate access controls implemented
- [ ] **Injection Prevention**: No SQL, command, or code injection vulnerabilities
- [ ] **Cryptography**: Secure cryptographic practices used
- [ ] **Session Management**: Sessions handled securely
- [ ] **HTTPS Only**: All external communication uses HTTPS
- [ ] **Dependency Security**: New dependencies scanned for vulnerabilities
- [ ] **Least Privilege**: Code runs with minimum necessary permissions

## Security Incident Response

If you discover a security vulnerability:

1. **DO NOT** create a public issue
2. Email details to: **security@pcl-lang.org**
3. Include:
   - Vulnerability description
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if available)
4. Wait for acknowledgment (48 hours SLA)
5. Work with security team on disclosure timeline

## Security Tools

Run these tools before committing:

```bash
# Dependency audit
npm audit --audit-level=moderate

# Secret scanning
npm run security:secrets

# Code analysis
npm run lint

# Type checking
npm run typecheck

# Full security scan
npm run security:scan
```

## Security Best Practices

### Input Validation

```typescript
// ✅ GOOD: Validate and sanitize
function parsePersonaName(input: string): string {
  if (!/^[a-zA-Z0-9_-]{1,50}$/.test(input)) {
    throw new ValidationError('Invalid persona name');
  }
  return input;
}

// ❌ BAD: Direct use without validation
function parsePersonaName(input: string): string {
  return input; // Dangerous!
}
```

### Error Messages

```typescript
// ✅ GOOD: Generic error messages
catch (error) {
  console.error('Authentication failed');
  return { success: false };
}

// ❌ BAD: Exposing internal details
catch (error) {
  console.error(`Database password incorrect: ${dbPassword}`);
  return { success: false, password: dbPassword };
}
```

### Secrets Management

```typescript
// ✅ GOOD: Use environment variables
const apiKey = process.env.PCL_API_KEY;

// ❌ BAD: Hardcoded secrets
const apiKey = 'sk-1234567890abcdef'; // NEVER!
```

## Security Contacts

- **General Security**: security@pcl-lang.org
- **Governance**: governance@pcl-lang.org
- **Compliance**: compliance@pcl-lang.org

## Resources

- [SECURITY.md](../SECURITY.md) - Full security policy
- [PCL Security Model](../GOVERNANCE/PCL_SECURITY_MODEL.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

**Remember**: Security is everyone's responsibility. When in doubt, ask!
