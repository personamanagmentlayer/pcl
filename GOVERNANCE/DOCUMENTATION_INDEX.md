# PCL Documentation Index

**Purpose**: Central navigation for all PCL governance, security, and compliance documentation
**Last Updated**: January 17, 2026

---

## 📚 Quick Navigation

### 🎯 Start Here (By Role)

| Role                             | Start With                                                     | Then Read                                                      |
| -------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| **Executive / Leadership**       | [EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)                   | [ROADMAP.md](ROADMAP.md)                                       |
| **Developer / Contributor**      | [README.md](README.md)                                         | [CONTRIBUTING_COMPLIANCE.md](CONTRIBUTING_COMPLIANCE.md)       |
| **Security Engineer / CISO**     | [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md)                 | [COMPLIANCE_QUICK_REFERENCE.md](COMPLIANCE_QUICK_REFERENCE.md) |
| **Auditor / Compliance Officer** | [COMPLIANCE_QUICK_REFERENCE.md](COMPLIANCE_QUICK_REFERENCE.md) | [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md)                         |
| **Standards Body / Regulator**   | [PCL_SPEC_v1.md](PCL_SPEC_v1.md)                               | [STANDARDS_OVERVIEW.md](STANDARDS_OVERVIEW.md)                 |
| **Architect / Technical Lead**   | [PCL_SPEC_v1.md](PCL_SPEC_v1.md)                               | [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md)                 |

---

## 📖 Core Documents

### 1. [PCL_SPEC_v1.md](PCL_SPEC_v1.md) – Language Specification

**Type**: RFC-style formal specification
**Audience**: Standards bodies, implementers, technical architects
**Size**: ~50 pages

**Contents**:

- Language syntax (EBNF grammar)
- Semantic model (execution lifecycle)
- Security model (threat defense)
- Conformance requirements
- Interoperability (import/export formats)
- ISO/EU AI Act compliance mapping

**When to use**: Reference for language semantics, writing alternative implementations, standards body submissions.

---

### 2. [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) – Security Architecture

**Type**: Security design document
**Audience**: CISOs, security engineers, auditors, penetration testers
**Size**: ~60 pages

**Contents**:

- Threat model (OWASP LLM Top 10)
- Defense-in-depth architecture
- Access control (RBAC/ABAC/Capability-based)
- Audit logging (ISO 27001 A.12.4)
- Cryptographic controls (ISO 27002 A.10)
- Secure development practices (ISO 27002 A.14)
- Zero Trust implementation (NIST SP 800-207)
- Incident response procedures

**When to use**: Security assessments, penetration test planning, ISO 27001 audits, threat modeling workshops.

---

### 3. [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md) – Governance Framework

**Type**: Governance policy document
**Audience**: Steering committee, leadership, compliance officers, project managers
**Size**: ~55 pages

**Contents**:

- Governance model (Steering Committee, Technical Board)
- Decision-making framework (RFC process)
- AI governance (ISO 42001 AIMS)
- EU AI Act compliance (Art. 9-15)
- Risk management (ISO 31000)
- Stakeholder management
- Change management (SemVer, LTS)
- Performance measurement (KPIs)

**When to use**: Establishing project governance, ISO 42001 audits, EU AI Act compliance, stakeholder engagement.

---

### 4. [ROADMAP.md](ROADMAP.md) – Strategic Roadmap

**Type**: Strategic planning document
**Audience**: All stakeholders (leadership, contributors, partners, investors)
**Size**: ~35 pages

**Contents**:

- Standards alignment matrix (ISO, OWASP, EU AI Act)
- Phase-by-phase development plan (2026-2027+)
- Compliance timeline (quarterly milestones)
- Success metrics (technical, adoption, compliance)
- Governance evolution
- Vision 2030

**When to use**: Understanding project direction, planning contributions, assessing investment potential.

---

## 📊 Compliance Documents

### 5. [STANDARDS_OVERVIEW.md](STANDARDS_OVERVIEW.md) – Standards Quick Reference

**Type**: Marketing/positioning document
**Audience**: Enterprises, decision-makers, standards bodies
**Size**: ~25 pages

**Contents**:

- Standards compliance matrix
- Competitive differentiation
- Compliance roadmap (2026-2027)
- Quick start (compliance edition)
- Certification programs (planned)

**When to use**: Evaluating PCL for enterprise adoption, comparing to competitors, understanding compliance value.

---

### 6. [COMPLIANCE_QUICK_REFERENCE.md](COMPLIANCE_QUICK_REFERENCE.md) – Auditor's Guide

**Type**: Compliance checklist
**Audience**: Auditors, compliance officers, CISOs
**Size**: ~20 pages

**Contents**:

- ISO 27001 checklist (controls A.5, A.9, A.10, A.12, A.14)
- ISO 42001 checklist (clauses 5-10)
- OWASP LLM Top 10 matrix
- EU AI Act requirements (Art. 9-15)
- GDPR compliance
- Audit preparation guide

**When to use**: Preparing for audits, conducting compliance assessments, validating security controls.

---

### 7. [STANDARDS_IMPLEMENTATION_SUMMARY.md](STANDARDS_IMPLEMENTATION_SUMMARY.md) – Implementation Status

**Type**: Progress report
**Audience**: Project managers, contributors, leadership
**Size**: ~15 pages

**Contents**:

- What was accomplished (Phase 1)
- Standards coverage matrix (✅ ✅ 📋)
- Strategic impact (before/after)
- Next steps (Q2 2026)
- Metrics tracking

**When to use**: Reviewing project status, understanding standards alignment, planning next phase.

---

## 🚀 Getting Started Guides

### 8. [EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md) – Leadership Brief

**Type**: Executive summary
**Audience**: Leadership, investors, strategic partners
**Size**: ~10 pages

**Contents**:

- Problem statement (enterprise AI adoption blockers)
- Solution overview (PCL positioning)
- Market opportunity ($10B+ → $1T+)
- Competitive advantage
- Traction & validation
- Revenue model (future)
- Roadmap (2026-2027+)
- Risk mitigation

**When to use**: Pitching PCL to executives, securing funding, strategic partnerships.

---

### 9. [CONTRIBUTING_COMPLIANCE.md](CONTRIBUTING_COMPLIANCE.md) – Developer Guide

**Type**: Contributor handbook
**Audience**: Developers, contributors, technical reviewers
**Size**: ~20 pages

**Contents**:

- Quick compliance checks (security, testing, docs)
- Standards-aligned development (OWASP LLM examples)
- Audit logging best practices
- Risk management (ISO 42001)
- Policy enforcement patterns
- Testing for compliance
- PR review checklist

**When to use**: Contributing code, reviewing PRs, maintaining standards alignment.

---

### 10. [README.md](README.md) – Project Overview

**Type**: GitHub README
**Audience**: General audience, first-time visitors
**Size**: ~10 pages

**Contents**:

- What is PCL? (positioning)
- Quick start (code examples)
- Standards & compliance badges
- Core concepts (personas, teams, workflows)
- Installation
- Documentation links

**When to use**: First introduction to PCL, understanding basic concepts.

---

## 🗂️ Document Relationships

```
EXECUTIVE_SUMMARY.md (Leadership)
    ↓
ROADMAP.md (Strategic Planning)
    ↓
PCL_SPEC_v1.md (Technical Specification) ←→ PCL_SECURITY_MODEL.md (Security)
    ↓                                              ↓
PCL_GOVERNANCE.md (Governance)            COMPLIANCE_QUICK_REFERENCE.md (Audits)
    ↓                                              ↓
CONTRIBUTING_COMPLIANCE.md (Developers) ←→ STANDARDS_OVERVIEW.md (Marketing)
    ↓
README.md (Getting Started)
```

---

## 📋 Document Maintenance Schedule

| Document                      | Review Cycle  | Owner              | Next Review |
| ----------------------------- | ------------- | ------------------ | ----------- |
| PCL_SPEC_v1.md                | Annually      | Technical Board    | Jan 2027    |
| PCL_SECURITY_MODEL.md         | Annually      | Security WG        | Jan 2027    |
| PCL_GOVERNANCE.md             | Annually      | Steering Committee | Jan 2027    |
| ROADMAP.md                    | Quarterly     | Steering Committee | Apr 2026    |
| STANDARDS_OVERVIEW.md         | Semi-annually | Marketing Team     | Jul 2026    |
| COMPLIANCE_QUICK_REFERENCE.md | Quarterly     | Compliance Officer | Apr 2026    |
| EXECUTIVE_SUMMARY.md          | Quarterly     | Leadership         | Apr 2026    |
| CONTRIBUTING_COMPLIANCE.md    | Semi-annually | Technical Board    | Jul 2026    |
| README.md                     | As needed     | Maintainers        | —           |

---

## 🔍 Finding Specific Information

### Security Topics

| Topic                 | Document                                       | Section    |
| --------------------- | ---------------------------------------------- | ---------- |
| **Threat Model**      | [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) | Section 2  |
| **OWASP LLM Top 10**  | [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) | Section 8  |
| **Zero Trust**        | [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) | Section 9  |
| **Audit Logging**     | [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) | Section 5  |
| **Access Control**    | [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) | Section 4  |
| **Incident Response** | [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) | Section 10 |

### Compliance Topics

| Topic         | Document                                                       | Section                |
| ------------- | -------------------------------------------------------------- | ---------------------- |
| **ISO 27001** | [COMPLIANCE_QUICK_REFERENCE.md](COMPLIANCE_QUICK_REFERENCE.md) | ISO 27001 Checklist    |
| **ISO 42001** | [COMPLIANCE_QUICK_REFERENCE.md](COMPLIANCE_QUICK_REFERENCE.md) | ISO 42001 Checklist    |
| **EU AI Act** | [COMPLIANCE_QUICK_REFERENCE.md](COMPLIANCE_QUICK_REFERENCE.md) | EU AI Act Requirements |
| **GDPR**      | [COMPLIANCE_QUICK_REFERENCE.md](COMPLIANCE_QUICK_REFERENCE.md) | GDPR Compliance        |

### Governance Topics

| Topic                 | Document                               | Section     |
| --------------------- | -------------------------------------- | ----------- |
| **Decision-Making**   | [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md) | Section 4   |
| **RFC Process**       | [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md) | Section 4.2 |
| **Risk Management**   | [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md) | Section 8   |
| **Change Management** | [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md) | Section 9   |
| **KPIs**              | [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md) | Section 10  |

### Technical Topics

| Topic                | Document                         | Section   |
| -------------------- | -------------------------------- | --------- |
| **Language Syntax**  | [PCL_SPEC_v1.md](PCL_SPEC_v1.md) | Section 4 |
| **Semantic Model**   | [PCL_SPEC_v1.md](PCL_SPEC_v1.md) | Section 5 |
| **Conformance**      | [PCL_SPEC_v1.md](PCL_SPEC_v1.md) | Section 7 |
| **Interoperability** | [PCL_SPEC_v1.md](PCL_SPEC_v1.md) | Section 8 |

---

## 🎓 Learning Paths

### Path 1: Enterprise Evaluator

1. [EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md) – Understand the value proposition
2. [STANDARDS_OVERVIEW.md](STANDARDS_OVERVIEW.md) – Review compliance alignment
3. [COMPLIANCE_QUICK_REFERENCE.md](COMPLIANCE_QUICK_REFERENCE.md) – Assess audit readiness
4. [ROADMAP.md](ROADMAP.md) – Evaluate maturity timeline

**Time**: 2-3 hours

### Path 2: Security Auditor

1. [COMPLIANCE_QUICK_REFERENCE.md](COMPLIANCE_QUICK_REFERENCE.md) – Review checklists
2. [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) – Deep dive security architecture
3. [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md) – Understand governance controls
4. [PCL_SPEC_v1.md](PCL_SPEC_v1.md) – Technical validation

**Time**: 4-6 hours

### Path 3: Developer / Contributor

1. [README.md](README.md) – Quick start
2. [CONTRIBUTING_COMPLIANCE.md](CONTRIBUTING_COMPLIANCE.md) – Development guidelines
3. [PCL_SPEC_v1.md](PCL_SPEC_v1.md) – Technical specification
4. [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) – Security patterns

**Time**: 3-4 hours

### Path 4: Standards Body Representative

1. [PCL_SPEC_v1.md](PCL_SPEC_v1.md) – Formal specification
2. [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md) – Governance model
3. [STANDARDS_OVERVIEW.md](STANDARDS_OVERVIEW.md) – Alignment matrix
4. [ROADMAP.md](ROADMAP.md) – Standardization timeline

**Time**: 4-5 hours

---

## 📞 Support & Questions

| Question Type  | Contact                                                                    |
| -------------- | -------------------------------------------------------------------------- |
| **General**    | [GitHub Discussions](https://github.com/personalayer/pcl-lite/discussions) |
| **Security**   | security@pcl-lang.org (planned)                                            |
| **Compliance** | compliance@pcl-lang.org (planned)                                          |
| **Governance** | governance@pcl-lang.org (planned)                                          |
| **Technical**  | [GitHub Issues](https://github.com/personalayer/pcl-lite/issues)           |

---

## 🔄 Document Versions

All documents are versioned using Git. View history:

```bash
# See document history
git log --follow <document-name>.md

# Compare versions
git diff <commit1> <commit2> <document-name>.md
```

---

## 📦 Compliance Audit Package

When preparing for external audits, package these documents:

### Tier 1 (Required)

- [ ] [PCL_SPEC_v1.md](PCL_SPEC_v1.md)
- [ ] [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md)
- [ ] [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md)
- [ ] [COMPLIANCE_QUICK_REFERENCE.md](COMPLIANCE_QUICK_REFERENCE.md)

### Tier 2 (Supporting)

- [ ] [ROADMAP.md](ROADMAP.md)
- [ ] [STANDARDS_OVERVIEW.md](STANDARDS_OVERVIEW.md)
- [ ] [STANDARDS_IMPLEMENTATION_SUMMARY.md](STANDARDS_IMPLEMENTATION_SUMMARY.md)

### Tier 3 (Context)

- [ ] [EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)
- [ ] [CONTRIBUTING_COMPLIANCE.md](CONTRIBUTING_COMPLIANCE.md)
- [ ] [README.md](README.md)

---

## 🌟 Key Takeaways

**For Executives**:

> PCL is not a language—it's a governance framework for AI systems, aligned with ISO 27001, ISO 42001, OWASP LLM, and EU AI Act.

**For Security Teams**:

> PCL implements defense-in-depth with Zero Trust principles, mandatory audit logging, and OWASP LLM Top 10 mitigations.

**For Developers**:

> Every contribution maintains standards alignment. Follow [CONTRIBUTING_COMPLIANCE.md](CONTRIBUTING_COMPLIANCE.md) to ensure your code is compliant.

**For Auditors**:

> Use [COMPLIANCE_QUICK_REFERENCE.md](COMPLIANCE_QUICK_REFERENCE.md) for rapid assessment. Full evidence in [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) and [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md).

**For Standards Bodies**:

> [PCL_SPEC_v1.md](PCL_SPEC_v1.md) is RFC-style and ready for formal standardization processes (IETF, W3C, ISO).

---

**Last Updated**: January 17, 2026
**Maintained by**: PCL Documentation Team
**Status**: Foundation Phase Complete ✅
