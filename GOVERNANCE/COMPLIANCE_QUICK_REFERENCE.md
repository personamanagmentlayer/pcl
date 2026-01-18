# PCL Compliance Quick Reference

**For**: Auditors, Compliance Officers, CISOs
**Purpose**: Rapid compliance assessment
**Last Updated**: January 17, 2026

---

## Compliance Checklist

Use this checklist to validate PCL's alignment with your compliance framework.

---

## 🔐 ISO/IEC 27001:2022 – Information Security Management

### A.5 – Information Security Policies

- ✅ **A.5.1** – Policy documented ([PCL_GOVERNANCE.md](PCL_GOVERNANCE.md) Section 5.1.1)

### A.9 – Access Control

- ✅ **A.9.1** – Access control policy ([PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) Section 4)
- ✅ **A.9.2** – User access management (RBAC/ABAC implementation)
- ✅ **A.9.4** – System and application access control (Capability-based security)

### A.10 – Cryptography

- ✅ **A.10.1** – Cryptographic controls ([PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) Section 6)
  - AES-256-GCM for data at rest
  - TLS 1.3+ for data in transit
  - RSA-4096 / ECDSA P-384 for signatures

### A.12 – Operations Security

- ✅ **A.12.4** – Logging and monitoring ([PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) Section 5)
  - Mandatory audit logging
  - Structured JSON format
  - Immutable storage (WORM)
  - 7-year retention for compliance logs

### A.14 – System Acquisition, Development and Maintenance

- ✅ **A.14.2** – Secure development lifecycle ([PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) Section 7)
  - Input validation
  - Output encoding
  - Dependency scanning
  - Code review process

**Evidence Package**: [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md)

---

## 🤖 ISO/IEC 42001:2023 – AI Management System

### Clause 5 – Leadership

- ✅ **5.1** – Leadership and commitment ([PCL_GOVERNANCE.md](PCL_GOVERNANCE.md) Section 3)
  - Steering Committee established
  - AI policy statement defined

### Clause 6 – Planning

- ✅ **6.1** – Risk assessment ([PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) Section 2)
  - Threat model documented
  - Persona risk levels (low/medium/high)
  - Risk register maintained

### Clause 7 – Support

- ✅ **7.2** – Competence ([PCL_GOVERNANCE.md](PCL_GOVERNANCE.md) Section 5.1.3)
  - Training requirements defined
  - Certification programs planned (PCD, PCO, PCA)

### Clause 8 – Operation

- ✅ **8.1** – Operational planning and control ([PCL_SPEC_v1.md](PCL_SPEC_v1.md) Section 4.6)
  - Workflows with policy enforcement
  - Sandboxed execution
  - Audit logging mandatory

### Clause 9 – Performance Evaluation

- ✅ **9.1** – Monitoring, measurement, analysis ([PCL_GOVERNANCE.md](PCL_GOVERNANCE.md) Section 10)
  - KPIs defined (activation success, policy violations, MTTD)
  - Real-time dashboards (planned Q2 2026)

### Clause 10 – Improvement

- ✅ **10.1** – Nonconformity and corrective action ([PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) Section 10)
  - Incident response plan
  - Post-incident reviews
  - Continuous improvement cycle (EDM)

**Evidence Package**: [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md), [PCL_SPEC_v1.md](PCL_SPEC_v1.md)

---

## 🛡️ OWASP Top 10 for LLM Applications (2025)

| ID        | Threat                           | Mitigation                                           | Evidence                                       |
| --------- | -------------------------------- | ---------------------------------------------------- | ---------------------------------------------- |
| **LLM01** | Prompt Injection                 | Input sanitization, template isolation               | [Section 2.3, 8.1](PCL_SECURITY_MODEL.md)      |
| **LLM02** | Insecure Output Handling         | Output validation schemas, encoding                  | [Section 2.3, 8.2](PCL_SECURITY_MODEL.md)      |
| **LLM03** | Training Data Poisoning          | Provider verification, model pinning                 | [Section 2.3, 8.3](PCL_SECURITY_MODEL.md)      |
| **LLM04** | Model Denial of Service          | Rate limiting, token budgets, circuit breakers       | [Section 2.3, 8.4](PCL_SECURITY_MODEL.md)      |
| **LLM05** | Supply Chain Vulnerabilities     | Dependency scanning, SBOM, signed packages           | [Section 2.3, 7.2, 8.5](PCL_SECURITY_MODEL.md) |
| **LLM06** | Sensitive Information Disclosure | Secret scanning, context isolation, memory scrubbing | [Section 2.3, 8.6](PCL_SECURITY_MODEL.md)      |
| **LLM07** | Insecure Plugin Design           | Capability-based security, sandboxing                | [Section 2.3, 4.3, 8.7](PCL_SECURITY_MODEL.md) |
| **LLM08** | Excessive Agency                 | Explicit capabilities, policy enforcement            | [Section 2.3, 4.3, 8.8](PCL_SECURITY_MODEL.md) |
| **LLM09** | Overreliance                     | Confidence scores, human review requirements         | [Section 2.3, 8.9](PCL_SECURITY_MODEL.md)      |
| **LLM10** | Model Theft                      | Rate limiting, access logs, watermarking             | [Section 2.3, 8.10](PCL_SECURITY_MODEL.md)     |

**Evidence Package**: [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) Section 8

---

## 🇪🇺 EU AI Act (Regulation 2024/1689)

### High-Risk AI Systems Requirements

| Article     | Requirement                         | PCL Implementation                         | Evidence                                                   |
| ----------- | ----------------------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| **Art. 9**  | Risk management system              | `risk_level` field, constraint validation  | [PCL_SPEC_v1.md](PCL_SPEC_v1.md) Section 4.3               |
| **Art. 10** | Data and data governance            | Data minimization policies                 | [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md) Section 6.2         |
| **Art. 11** | Technical documentation             | Auto-generated from PCL source             | [PCL_SPEC_v1.md](PCL_SPEC_v1.md) Appendix C                |
| **Art. 12** | Record-keeping                      | Immutable audit logs, 7-year retention     | [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) Section 5.3 |
| **Art. 13** | Transparency and information        | Human-readable PCL, decision traces        | [PCL_SPEC_v1.md](PCL_SPEC_v1.md) Section 6.1.2             |
| **Art. 14** | Human oversight                     | Approval policies for high-risk operations | [PCL_SPEC_v1.md](PCL_SPEC_v1.md) Section 4.5               |
| **Art. 15** | Accuracy, robustness, cybersecurity | ISO 27001, OWASP LLM compliance            | [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md)             |

**Example PCL Code**:

```pcl
persona HIGH_RISK_DECISION {
  risk_level: "high"
  eu_ai_act: {
    category: "high_risk"
    annex: "III.5" // Credit scoring
  }

  controls: [
    "human_oversight",
    "audit_trail",
    "transparency_notice"
  ]
}

policy EU_AI_ACT_COMPLIANCE {
  rules: [
    {
      condition: "risk_level == 'high'",
      action: "require_human_approval",
      approval_sla: "24_hours"
    }
  ]
}
```

**Evidence Package**: [PCL_SPEC_v1.md](PCL_SPEC_v1.md) Appendix C, [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md) Section 6.1

---

## 🔒 NIST SP 800-207 – Zero Trust Architecture

### Core Principles

| Principle                      | PCL Implementation                           | Evidence                             |
| ------------------------------ | -------------------------------------------- | ------------------------------------ |
| **Never Trust, Always Verify** | Every action authenticated & authorized      | [Section 9.1](PCL_SECURITY_MODEL.md) |
| **Least Privilege Access**     | Deny-by-default, explicit capability grants  | [Section 4.3](PCL_SECURITY_MODEL.md) |
| **Assume Breach**              | Sandboxing, containment, blast radius limits | [Section 3.2](PCL_SECURITY_MODEL.md) |
| **Continuous Monitoring**      | Real-time audit logs, anomaly detection      | [Section 9.2](PCL_SECURITY_MODEL.md) |

**Evidence Package**: [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) Section 9

---

## 📋 GDPR (Regulation 2016/679) – Data Protection

### Key Requirements

| Article     | Requirement               | PCL Implementation                   |
| ----------- | ------------------------- | ------------------------------------ |
| **Art. 5**  | Data minimization         | Configurable data retention policies |
| **Art. 17** | Right to erasure          | `pcl audit delete --user-id <id>`    |
| **Art. 20** | Data portability          | JSON export format                   |
| **Art. 25** | Data protection by design | Privacy-first architecture           |
| **Art. 32** | Security of processing    | ISO 27001 compliance                 |

**Example PCL Code**:

```pcl
persona DATA_PROCESSOR {
  data_policy: {
    collect: "minimum_necessary",
    retain: "30_days",
    anonymize: "after_processing"
  }
}
```

**Evidence Package**: [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md) Section 6.2

---

## 📊 Compliance Audit Package

When preparing for an audit, provide:

### 1. Core Documentation

- [ ] [PCL_SPEC_v1.md](PCL_SPEC_v1.md) – Language specification
- [ ] [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) – Security architecture
- [ ] [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md) – Governance framework

### 2. Security Evidence

- [ ] Audit log samples (anonymized)
- [ ] Dependency scan reports (npm audit, Snyk)
- [ ] SBOM (Software Bill of Materials)
- [ ] Penetration test results (planned Q2 2026)

### 3. Compliance Reports

- [ ] ISO 27001 control checklist
- [ ] ISO 42001 AIMS assessment
- [ ] OWASP LLM coverage matrix
- [ ] EU AI Act readiness report

### 4. Governance Records

- [ ] Risk register
- [ ] Policy documents
- [ ] Incident response records (if any)
- [ ] Change management logs

### 5. Technical Artifacts

- [ ] Source code (GitHub)
- [ ] Test coverage reports (≥80%)
- [ ] CI/CD pipeline configuration
- [ ] Deployment architecture diagrams

---

## 🎯 Audit Preparation Checklist

### Before the Audit

- [ ] Review all governance documents for accuracy
- [ ] Update risk register with latest assessments
- [ ] Generate compliance reports (automated)
- [ ] Prepare audit log samples
- [ ] Brief key personnel (developers, operators, governance)

### During the Audit

- [ ] Provide requested documentation promptly
- [ ] Demonstrate audit log queries
- [ ] Walk through security controls
- [ ] Show policy enforcement in action
- [ ] Answer questions transparently

### After the Audit

- [ ] Address findings in order of severity
- [ ] Document corrective actions
- [ ] Update governance documents as needed
- [ ] Schedule follow-up review
- [ ] Publish audit results (if appropriate)

---

## 🚨 Red Flags (Non-Compliance Indicators)

Auditors should investigate if:

- ❌ Audit logs are not enabled or incomplete
- ❌ Personas have excessive capabilities without justification
- ❌ High-risk operations lack approval policies
- ❌ No evidence of regular governance reviews (EDM cycle)
- ❌ Security incidents not documented
- ❌ Policies are outdated or not enforced
- ❌ No training records for operators
- ❌ Cryptographic keys stored insecurely
- ❌ Dependencies with known vulnerabilities
- ❌ Test coverage below 80%

---

## ✅ Best Practices for Compliance

### 1. Enable Strict Audit Mode

```pcl
policy STRICT_AUDIT {
  audit: {
    level: "verbose",
    retention: "7_years",
    immutable: true,
    siem_export: "enabled"
  }
}
```

### 2. Classify All Personas

```pcl
persona EXAMPLE {
  risk_level: "medium" // Required: low, medium, high
  eu_ai_act: {
    category: "high_risk",
    annex: "III.X"
  }
}
```

### 3. Enforce Least Privilege

```pcl
persona LIMITED {
  capabilities: ["read:docs"] // Explicit grants only
  denied: ["write:*", "exec:*", "network:*"] // Deny by default
}
```

### 4. Require Human Oversight

```pcl
policy HIGH_RISK {
  rules: [
    {
      condition: "risk_level == 'high'",
      action: "require_approval",
      approver: "CISO"
    }
  ]
}
```

### 5. Maintain Audit Trails

```bash
# Export audit logs for SIEM
pcl audit export --format json --since 2026-01-01 > audit.json

# Verify log integrity
pcl audit verify --hash sha256
```

---

## 📞 Compliance Support

**Questions?** Contact:

- **Compliance**: compliance@pcl-lang.org (planned)
- **Security**: security@pcl-lang.org (planned)
- **Governance**: governance@pcl-lang.org (planned)

**Resources**:

- Documentation: [docs/](docs/)
- Security Model: [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md)
- Governance Framework: [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md)
- GitHub Issues: Report compliance concerns

---

## 📅 Compliance Calendar

### Quarterly (Every 3 months)

- [ ] Review risk register
- [ ] Update governance documents
- [ ] Generate compliance reports
- [ ] Audit log review
- [ ] Dependency vulnerability scan

### Annually (Every 12 months)

- [ ] Full ISO 27001 audit
- [ ] ISO 42001 AIMS review
- [ ] Penetration testing
- [ ] Governance effectiveness assessment
- [ ] Publish annual compliance report

---

## 🏆 Certification Status

### Current

- ✅ **ISO 27001** – Self-assessed, aligned
- ✅ **ISO 42001** – Self-assessed, aligned
- ✅ **OWASP LLM** – Self-assessed, all 10 mitigated

### Planned

- 🎯 **Q2 2026** – External security audit
- 🎯 **Q4 2026** – ISO 42001 certification (third-party)
- 📋 **2027** – SOC 2 Type II (if SaaS launched)
- 📋 **2027** – FedRAMP (if US government targeted)

---

**Document Version**: 1.0
**Last Review**: January 17, 2026
**Next Review**: April 2026
**Owner**: PCL Governance Team
