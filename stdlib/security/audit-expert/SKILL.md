---
name: audit-expert
version: 1.1.0
description: >-
  Expert-level security auditing, compliance, code review, and vulnerability assessment.
  Use when the user mentions compliance, security review, code review, vulnerability
  assessment, SOC 2, or GDPR, or when the task involves Audit Types, Audit Frameworks,
  Audit Process, or Authentication Review.
category: security
tags:
  [
    audit,
    compliance,
    security-review,
    code-review,
    vulnerability-assessment,
    soc2,
    gdpr,
  ]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(git:*, grep:*, find:*)
---

# Audit Expert

Expert guidance for security auditing, compliance assessments, code reviews, vulnerability assessments, and regulatory compliance (SOC 2, GDPR, HIPAA, PCI-DSS).

## Core Concepts

### Audit Types

- **Security Audit**: Vulnerability assessment, penetration testing
- **Code Audit**: Code review, static analysis, security patterns
- **Compliance Audit**: SOC 2, GDPR, HIPAA, PCI-DSS, ISO 27001
- **Infrastructure Audit**: Configuration review, access control
- **Process Audit**: SDLC, change management, incident response

### Audit Frameworks

- OWASP ASVS (Application Security Verification Standard)
- NIST Cybersecurity Framework
- CIS Controls
- ISO 27001/27002
- SOC 2 Trust Service Criteria

### Audit Process

1. Planning and scoping
2. Information gathering
3. Vulnerability identification
4. Risk assessment
5. Reporting
6. Remediation tracking
7. Follow-up verification

## Audit Reporting

### Security Audit Report Template

```javascript
class SecurityAuditReport {
  constructor() {
    this.findings = [];
    this.summary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
  }

  addFinding(finding) {
    this.findings.push({
      id: this.findings.length + 1,
      severity: finding.severity,
      title: finding.title,
      description: finding.description,
      location: finding.location,
      recommendation: finding.recommendation,
      references: finding.references || [],
      cvssScore: finding.cvssScore,
      status: 'open',
      discoveredAt: new Date(),
    });

    this.summary[finding.severity]++;
  }

  generateReport() {
    return {
      reportDate: new Date(),
      auditor: 'Security Team',
      scope: this.scope,
      summary: this.summary,
      findings: this.findings.sort(
        (a, b) =>
          this.severityWeight(b.severity) - this.severityWeight(a.severity)
      ),
      recommendations: this.generateRecommendations(),
    };
  }

  severityWeight(severity) {
    const weights = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
    return weights[severity] || 0;
  }

  generateRecommendations() {
    return [
      'Address all critical and high severity findings immediately',
      'Implement security code review process',
      'Conduct regular penetration testing',
      'Provide security training for developers',
      'Establish vulnerability disclosure program',
    ];
  }
}

// Usage
const audit = new SecurityAuditReport();

audit.addFinding({
  severity: 'critical',
  title: 'SQL Injection in User Search',
  description: 'User search endpoint concatenates user input into SQL query',
  location: 'src/controllers/users.js:45',
  recommendation: 'Use parameterized queries or ORM with proper escaping',
  references: ['CWE-89', 'OWASP A03:2021'],
  cvssScore: 9.8,
});

const report = audit.generateReport();
```

## Best Practices

### Audit Preparation

1. Define scope and objectives
2. Gather documentation
3. Review previous audit findings
4. Prepare audit checklist
5. Schedule with stakeholders

### During Audit

1. Follow systematic approach
2. Document all findings
3. Collect evidence
4. Maintain objectivity
5. Communicate preliminary findings

### Post-Audit

1. Prepare detailed report
2. Present findings to stakeholders
3. Develop remediation plan
4. Track remediation progress
5. Schedule follow-up audit

## Anti-Patterns to Avoid

❌ **Auditing own code**: Use independent reviewers
❌ **Incomplete scope**: Define clear boundaries
❌ **No follow-up**: Track remediation to completion
❌ **Generic findings**: Provide specific, actionable recommendations
❌ **Ignoring context**: Consider business requirements
❌ **No prioritization**: Rank findings by risk and impact

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Compliance Auditing](references/COMPLIANCE_AUDITING.md) — GDPR Compliance Checklist, SOC 2 Compliance Audit, PCI-DSS Compliance

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Security Code Review](references/SECURITY_CODE_REVIEW.md) — Authentication Review, SQL Injection Review, Authorization Review, XSS and Output Encoding Review

## Resources

- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- NIST Framework: https://www.nist.gov/cyberframework
- CIS Controls: https://www.cisecurity.org/controls/
- SOC 2: https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report.html
- GDPR: https://gdpr.eu/
- PCI-DSS: https://www.pcisecuritystandards.org/
