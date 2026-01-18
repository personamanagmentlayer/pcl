# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of PCL seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do NOT Disclose Publicly

Please do not open a public issue on GitHub. Security vulnerabilities should be reported privately.

### 2. Report Privately

Send a detailed report to: **security@pcl-lang.org** or create a private security advisory on GitHub.

Include:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if available)

### 3. Response Time

- We will acknowledge receipt of your vulnerability report within 48 hours
- We will provide a detailed response within 7 days
- We will work with you to understand and resolve the issue promptly

### 4. Disclosure Policy

- We request that you do not disclose the vulnerability until we have had a chance to address it
- Once a fix is available, we will:
  - Release a security patch
  - Publish a security advisory
  - Credit you for the discovery (unless you prefer to remain anonymous)

## Security Best Practices

When using PCL:

### 1. Input Validation
- Always validate and sanitize user input before processing
- Use PCL's built-in validation mechanisms
- Be cautious with dynamic persona composition

### 2. Access Control
- Implement proper authentication for registry access
- Use role-based access control for team operations
- Secure API keys and credentials

### 3. Registry Security
- Use encrypted connections (HTTPS/TLS) for registry communication
- Regularly audit registry access logs
- Keep registry backend software up to date

### 4. Code Execution
- Be cautious when executing dynamically generated PCL code
- Validate workflow definitions before execution
- Use sandboxing for untrusted persona execution

### 5. Dependencies
- Regularly update dependencies using `npm audit`
- Review security advisories for PCL and its dependencies
- Use `npm audit fix` to patch known vulnerabilities

## Known Security Considerations

### Bootstrap System
The PCL Bootstrap system for AI chat interfaces should be used with:
- Trusted AI providers only
- Proper rate limiting
- Input validation for persona commands
- Monitoring for unusual activity

### Registry Backends
Different backends have different security profiles:
- **JSON File Backend**: Local filesystem permissions apply
- **SQLite Backend**: Database file permissions critical
- **PostgreSQL Backend**: Network security and authentication required

## Security Updates

Security updates are released as soon as possible after a vulnerability is confirmed. Subscribe to our GitHub releases to stay informed.

## Compliance

PCL aims to help organizations meet compliance requirements. See:
- [PCL Governance](GOVERNANCE/PCL_GOVERNANCE.md)
- [Security Model](GOVERNANCE/PCL_SECURITY_MODEL.md)
- [Compliance Quick Reference](GOVERNANCE/COMPLIANCE_QUICK_REFERENCE.md)

## Contact

For security concerns that are not vulnerabilities (questions, best practices, etc.), please open a regular GitHub issue or discussion.

---

**Last Updated**: January 18, 2026
