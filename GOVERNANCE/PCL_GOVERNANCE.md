# PCL Governance Framework

**Version**: 1.0
**Status**: Governance Policy
**Date**: January 2026
**Alignment**: ISO 38500, ISO 42001, EU AI Act, COBIT 2019

---

## Executive Summary

This document establishes the **governance framework** for the Persona Control Language (PCL) project and ecosystem. It defines decision-making structures, accountability models, stakeholder roles, and compliance mechanisms aligned with international standards for IT governance (ISO 38500) and AI system management (ISO 42001).

PCL governance operates on three levels:

1. **Project Governance** – Open-source community management
2. **Standard Governance** – Language specification evolution
3. **Deployment Governance** – Enterprise adoption and compliance

---

## Table of Contents

1. [Governance Objectives](#1-governance-objectives)
2. [Governance Model (ISO 38500)](#2-governance-model-iso-38500)
3. [Organizational Structure](#3-organizational-structure)
4. [Decision-Making Framework](#4-decision-making-framework)
5. [AI Governance (ISO 42001)](#5-ai-governance-iso-42001)
6. [Compliance & Legal (EU AI Act)](#6-compliance--legal-eu-ai-act)
7. [Stakeholder Management](#7-stakeholder-management)
8. [Risk Management (ISO 31000)](#8-risk-management-iso-31000)
9. [Change Management](#9-change-management)
10. [Performance Measurement](#10-performance-measurement)
11. [Appendices](#11-appendices)

---

## 1. Governance Objectives

### 1.1 Strategic Objectives

#### Neutrality & Independence

PCL MUST remain:

- **Vendor-neutral**: No dependency on single provider
- **Runtime-agnostic**: Executable across platforms
- **Community-driven**: Open governance, transparent roadmap

#### Standardization & Interoperability

- Publish formal language specification (RFC-style)
- Maintain reference implementation (open-source)
- Enable third-party tooling and integrations
- Foster ecosystem growth

#### Accountability & Trust

- Clear ownership and decision rights
- Transparent governance processes
- Compliance with international standards
- Ethical AI principles

#### Sustainability

- Long-term project viability
- Diverse contributor base
- Financial sustainability model
- Community stewardship

### 1.2 Governance Principles (ISO 38500)

| Principle           | Description                     | PCL Implementation                                  |
| ------------------- | ------------------------------- | --------------------------------------------------- |
| **Responsibility**  | Clear accountability            | Defined roles (Steering Committee, Technical Board) |
| **Strategy**        | Align with organizational goals | Public roadmap, quarterly reviews                   |
| **Acquisition**     | Valid decisions on acquisitions | Dependency approval process                         |
| **Performance**     | Deliver value                   | KPIs, community feedback loops                      |
| **Conformance**     | Comply with rules               | ISO 27001, ISO 42001, EU AI Act compliance          |
| **Human Behaviour** | Respect people                  | Code of Conduct, inclusive participation            |

---

## 2. Governance Model (ISO 38500)

### 2.1 Three-Layer Model

```
┌─────────────────────────────────────────────┐
│  STRATEGIC LAYER (Steering Committee)      │
│  - Vision, mission, strategic direction    │
│  - Resource allocation                     │
│  - Risk oversight                          │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│  TACTICAL LAYER (Technical Board)          │
│  - Architecture decisions                  │
│  - Specification evolution                 │
│  - Release planning                        │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│  OPERATIONAL LAYER (Contributors)          │
│  - Feature development                     │
│  - Bug fixes, testing                      │
│  - Documentation, support                  │
└─────────────────────────────────────────────┘
```

### 2.2 Evaluate-Direct-Monitor (EDM) Cycle

**ISO 38500 mandates a continuous governance cycle:**

#### Evaluate

- Assess current state vs. objectives
- Review community feedback
- Benchmark against standards (ISO 42001, OWASP)
- Analyze risks and opportunities

**Frequency**: Quarterly

**Output**: Governance Assessment Report

#### Direct

- Set strategic priorities
- Allocate resources (budget, contributors)
- Approve major changes (spec, architecture)
- Define policies and guidelines

**Frequency**: Bi-annually

**Output**: Strategic Directive Document

#### Monitor

- Track KPIs (adoption, security incidents)
- Audit compliance (ISO 27001, EU AI Act)
- Review project health (velocity, quality)
- Escalate issues to governance bodies

**Frequency**: Monthly

**Output**: Governance Dashboard

---

## 3. Organizational Structure

### 3.1 Governance Bodies

#### Steering Committee

**Role**: Strategic oversight and accountability

**Composition**:

- 1 Chair (elected, 2-year term)
- 5-7 members representing:
  - Core contributors
  - Enterprise adopters
  - Academic researchers
  - Legal/compliance experts

**Responsibilities**:

- Approve project strategy and roadmap
- Allocate budget and resources
- Resolve escalated conflicts
- Ensure compliance with standards
- Appoint Technical Board members

**Decision Model**: Consensus-based, with chair breaking ties

**Meeting Cadence**: Quarterly

#### Technical Board

**Role**: Architecture and specification governance

**Composition**:

- 1 Technical Lead (appointed by Steering Committee)
- 3-5 Subject Matter Experts (SME):
  - Compiler design
  - Security & compliance
  - AI systems
  - Developer experience

**Responsibilities**:

- Maintain PCL specification
- Review technical proposals (RFCs)
- Approve breaking changes
- Define testing and quality standards
- Coordinate releases

**Decision Model**: 2/3 majority vote

**Meeting Cadence**: Bi-weekly

#### Working Groups

**Purpose**: Focused initiatives

**Examples**:

- **Security WG**: OWASP LLM compliance, threat modeling
- **Standards WG**: ISO alignment, specification evolution
- **Ecosystem WG**: Tooling, IDE integrations, training
- **Legal WG**: Licensing, compliance, risk management

**Lifecycle**: Formed as needed, disbanded when objectives met

### 3.2 Roles & Responsibilities

#### Project Maintainer

**Criteria**:

- 6+ months active contribution
- Demonstrated technical expertise
- Community trust (nominated by peers)

**Permissions**:

- Merge PRs to main branch
- Release new versions
- Triage issues and manage roadmap

**Accountability**: Technical Board

#### Core Contributor

**Criteria**:

- 3+ merged PRs
- Active in discussions

**Permissions**:

- Submit RFCs
- Vote on non-breaking changes
- Access to contributor channels

#### Community Member

**Criteria**: Anyone using or interested in PCL

**Permissions**:

- Submit issues and PRs
- Participate in discussions
- Vote in community polls

---

## 4. Decision-Making Framework

### 4.1 Decision Types

| Decision Type   | Authority          | Process                            | Example                                   |
| --------------- | ------------------ | ---------------------------------- | ----------------------------------------- |
| **Strategic**   | Steering Committee | Proposal → Discussion → Vote       | Adopting a new standard (e.g., ISO 42001) |
| **Technical**   | Technical Board    | RFC → Review → Consensus           | Adding a new language feature             |
| **Operational** | Maintainers        | Review → Merge                     | Bug fix, documentation update             |
| **Emergency**   | Technical Lead     | Immediate action → Post-hoc review | Critical security patch                   |

### 4.2 RFC Process (Request for Comments)

**Used for**: Major changes to specification, architecture, or processes

#### Step 1: Proposal

Author submits RFC document:

```markdown
# RFC-001: Workflow Orchestration Extensions

**Author**: [Name]
**Status**: Draft
**Created**: 2026-01-17

## Summary

[One-paragraph description]

## Motivation

[Why is this needed?]

## Detailed Design

[Technical specification]

## Alternatives Considered

[Other approaches]

## Impact

- Breaking changes: Yes/No
- Security implications: [Assessment]
- Compliance: ISO 42001, EU AI Act

## Open Questions

[Unresolved items]
```

#### Step 2: Public Comment

- 14-day comment period
- Discussion on GitHub / mailing list
- Author addresses feedback

#### Step 3: Technical Review

- Technical Board evaluates
- Assess alignment with standards
- Security and compliance review

#### Step 4: Decision

- **Approved**: Merged, assigned to milestone
- **Rejected**: Documented rationale
- **Deferred**: Parked for future consideration

#### Step 5: Implementation

- Tracked as GitHub project
- Regular progress updates
- Final review before release

### 4.3 Consensus-Building

**Lazy Consensus**: Used for low-risk decisions

- Proposal announced
- 72-hour silence = implicit approval
- Any objection triggers discussion

**Explicit Consensus**: Used for high-risk decisions

- Discussion until all concerns addressed
- No vetoes without alternative proposal
- Chair/Lead facilitates compromise

---

## 5. AI Governance (ISO 42001)

### 5.1 AI Management System (AIMS)

PCL implements ISO 42001 requirements:

#### 5.1.1 Policy (ISO 42001 Clause 5)

**PCL AI Policy Statement**:

> PCL is committed to responsible AI governance. We ensure that:
>
> - AI agents operate within defined boundaries
> - Human oversight is maintained for high-risk operations
> - Transparency and explainability are prioritized
> - Ethical considerations guide development
> - Compliance with regulations is mandatory

#### 5.1.2 Risk Assessment (ISO 42001 Clause 6)

**Risk Classification for Personas**:

| Risk Level | Criteria                      | Controls                                     |
| ---------- | ----------------------------- | -------------------------------------------- |
| **Low**    | Read-only, no external access | Standard monitoring                          |
| **Medium** | Limited write, network access | Enhanced logging, approval for production    |
| **High**   | Code execution, financial ops | Mandatory human oversight, strict sandboxing |

**Process**:

1. Identify AI risks (privacy, bias, security)
2. Assess likelihood and impact
3. Define mitigation controls
4. Assign risk owners
5. Review quarterly

#### 5.1.3 Competence (ISO 42001 Clause 7)

**Training Requirements**:

- **Developers**: PCL security model, OWASP LLM Top 10
- **Operators**: Persona capabilities, incident response
- **Auditors**: Compliance frameworks, log analysis

**Certification**:

- PCL Certified Developer (PCD)
- PCL Certified Operator (PCO)
- PCL Certified Auditor (PCA)

#### 5.1.4 Operational Controls (ISO 42001 Clause 8)

**Controls Implemented**:

- Capability-based access control
- Policy enforcement engine
- Audit logging (mandatory)
- Version control for PCL programs
- Change management process

#### 5.1.5 Performance Monitoring (ISO 42001 Clause 9)

**KPIs**:

- Persona activation success rate
- Policy violation rate
- Mean time to detect (MTTD) security incidents
- Compliance audit pass rate

**Dashboards**: Real-time monitoring via Grafana/Kibana

#### 5.1.6 Improvement (ISO 42001 Clause 10)

**Continuous Improvement**:

- Post-incident reviews
- Quarterly governance assessments
- Community feedback integration
- Benchmarking against industry standards

### 5.2 Intellectual Property & Licensing

**Dual Licensing Model**:

PCL uses separate licenses for different asset types to balance openness with governance requirements:

| Asset Type        | License             | Rationale                                          |
| ----------------- | ------------------- | -------------------------------------------------- |
| **Source Code**   | Apache 2.0          | Patent protection, enterprise adoption, permissive |
| **Documentation** | CC BY 4.0           | Standards bodies prefer, enables translations      |
| **Trademarks**    | IbIFACE Proprietary | Brand protection, quality control                  |

**Contributor Agreement**:

- **No CLA Required**: Contributors retain copyright
- **Implicit License Grant**: By contributing, you agree to Apache 2.0 (code) or CC BY 4.0 (docs)
- **Patent Grant**: Apache 2.0 Section 3 provides defensive patent termination
- **Moral Rights**: Contributors waive moral rights only as necessary for collaboration

**Inbound = Outbound Rule**: Contributions licensed under same terms as project (Apache 2.0 for code, CC BY 4.0 for docs)

**Commercial Use**:

- ✅ Anyone can use PCL commercially under Apache 2.0
- ✅ Anyone can build commercial services around PCL
- ❌ Cannot use "PCL" trademark without permission (see [TRADEMARK_POLICY.md](TRADEMARK_POLICY.md))
- ✅ IbIFACE may offer commercial extensions under proprietary license (Open Core model)

**Fork Rights**:

- ✅ Code: Anyone can fork under Apache 2.0
- ❌ Trademark: Must rename if incompatible with specification
- ✅ Docs: Can adapt under CC BY 4.0 with attribution

**Standards Submission Authority**:

- Technical Board approves submission of PCL specs to IETF, W3C, ISO
- CC BY 4.0 ensures specification can be referenced freely
- Trademark policy prevents unauthorized "official" implementations

### 5.3 AI Lifecycle Governance

```
┌─────────────────────────────────────────────┐
│  DESIGN                                     │
│  - Persona specification                    │
│  - Risk assessment                          │
│  - Compliance check                         │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│  DEVELOPMENT                                │
│  - Secure coding practices                  │
│  - Testing (unit, integration, security)    │
│  - Code review (security-focused)           │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│  DEPLOYMENT                                 │
│  - Policy validation                        │
│  - Sandboxed execution                      │
│  - Monitoring & logging                     │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│  OPERATION                                  │
│  - Runtime enforcement                      │
│  - Incident response                        │
│  - Performance tuning                       │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│  DECOMMISSION                               │
│  - Data retention compliance                │
│  - Secure deletion                          │
│  - Post-deployment review                   │
└─────────────────────────────────────────────┘
```

---

## 6. Compliance & Legal (EU AI Act)

### 6.1 EU AI Act Alignment

PCL is positioned as an **enabling technology** for EU AI Act compliance.

#### 6.1.1 Risk Classification (Article 6)

PCL supports automated risk classification:

```pcl
persona HIGH_RISK_BIOMETRIC {
  id: "BIOMETRIC_AUTH"
  eu_ai_act: {
    category: "high_risk"
    annex: "III.1" # Biometric identification
  }

  # Mandatory controls per EU AI Act
  controls: [
    "human_oversight",
    "accuracy_monitoring",
    "audit_trail"
  ]
}
```

#### 6.1.2 Transparency Obligations (Article 13)

PCL programs MUST include:

- Clear description of persona purpose
- Data usage and retention policies
- Explanation of decision-making logic

**Example**:

```pcl
persona RESUME_SCREENER {
  description: "Automated CV screening for pre-qualification"

  transparency: {
    purpose: "Identify candidates meeting minimum criteria",
    decision_logic: "Keyword matching + experience calculation",
    human_review: "All recommendations reviewed by HR"
  }
}
```

#### 6.1.3 Human Oversight (Article 14)

For high-risk systems:

```pcl
policy HIGH_RISK_OVERSIGHT {
  rules: [
    {
      condition: "persona.eu_ai_act.category == 'high_risk'",
      action: "require_human_approval",
      approval_sla: "24_hours"
    }
  ]
}
```

#### 6.1.4 Record-Keeping (Article 12)

PCL audit logs satisfy record-keeping requirements:

- Automatic logging of all persona actions
- Immutable storage (WORM)
- Retention period: 7 years (configurable)
- Export format: EU-compliant JSON schema

### 6.2 GDPR Compliance

#### Data Minimization

PCL encourages minimal data processing:

```pcl
persona DATA_PROCESSOR {
  data_policy: {
    collect: "minimum_necessary",
    retain: "30_days",
    anonymize: "after_processing"
  }
}
```

#### Right to Erasure (Article 17)

```bash
# Delete all logs related to a user
pcl audit delete --user-id user-123 --confirm
```

#### Data Portability (Article 20)

```bash
# Export user data in machine-readable format
pcl export --user-id user-123 --format json
```

### 6.3 Licensing & Intellectual Property

**PCL Specification**: Creative Commons Attribution 4.0 (CC BY 4.0)

**PCL Reference Implementation**: MIT License

**Rationale**:

- Specification: Open, reusable by standards bodies
- Implementation: Permissive, encourages ecosystem growth

**Trademark Policy**:

- "PCL" and "Persona Control Language" are trademarks
- Usage permitted for compliant implementations
- Certification required for commercial tools claiming "PCL-certified"

---

## 7. Stakeholder Management

### 7.1 Stakeholder Map

| Stakeholder      | Interest                  | Influence | Engagement Strategy                |
| ---------------- | ------------------------- | --------- | ---------------------------------- |
| **Developers**   | Usability, features       | High      | GitHub, Discord, RFCs              |
| **Enterprises**  | Compliance, stability     | High      | Advisory board, case studies       |
| **Regulators**   | Safety, transparency      | Medium    | Standards alignment, audit support |
| **Researchers**  | Innovation, publications  | Medium    | Academic partnerships, conferences |
| **Tool Vendors** | Integration, monetization | Medium    | API stability, documentation       |

### 7.2 Communication Plan

**Channels**:

- **Website**: pcl-lang.org (docs, downloads, blog)
- **GitHub**: Issues, PRs, Discussions
- **Mailing List**: <pcl-announce@googlegroups.com>
- **Discord**: Real-time community chat
- **Twitter/X**: Announcements, ecosystem highlights

**Cadence**:

- **Monthly**: Community newsletter
- **Quarterly**: Roadmap update, governance report
- **Annually**: State of PCL report

---

## 8. Risk Management (ISO 31000)

### 8.1 Strategic Risks

| Risk                          | Likelihood | Impact   | Mitigation                             |
| ----------------------------- | ---------- | -------- | -------------------------------------- |
| **Vendor capture**            | Medium     | High     | Open governance, multi-vendor support  |
| **Security breach**           | Medium     | Critical | ISO 27001 compliance, pentests         |
| **Standard fragmentation**    | Low        | High     | Clear specification, conformance tests |
| **Community decline**         | Low        | Medium   | Contributor recognition, grants        |
| **Regulatory non-compliance** | Low        | Critical | Legal WG, quarterly compliance audits  |

### 8.2 Operational Risks

| Risk                    | Mitigation                      |
| ----------------------- | ------------------------------- |
| **Malicious persona**   | Sandboxing, policy enforcement  |
| **Supply chain attack** | Dependency scanning, SBOMs      |
| **Data breach**         | Encryption, access control      |
| **DoS attack**          | Rate limiting, circuit breakers |

### 8.3 Risk Register

Maintained by Steering Committee, reviewed quarterly.

**Template**:

```markdown
## Risk ID: R-001

**Description**: [Risk description]
**Category**: Strategic / Operational / Compliance
**Likelihood**: Low / Medium / High
**Impact**: Low / Medium / High / Critical
**Owner**: [Name]
**Mitigation Plan**: [Actions]
**Status**: Open / Mitigated / Closed
**Review Date**: [Date]
```

---

## 9. Change Management

### 9.1 Semantic Versioning

PCL follows [SemVer 2.0](https://semver.org/):

- **Major (X.0.0)**: Breaking changes
- **Minor (x.Y.0)**: New features (backward-compatible)
- **Patch (x.y.Z)**: Bug fixes

**Deprecation Policy**:

- Deprecated features announced 1 major version in advance
- Maintained for 2 major versions
- Removed in 3rd major version

**Example**:

```
v1.0: Feature X introduced
v2.0: Feature X deprecated (warning)
v3.0: Feature X still supported (error if used)
v4.0: Feature X removed
```

### 9.2 Release Process

#### Planning (T-8 weeks)

- Finalize scope
- Assign owners
- Create milestone

#### Development (T-6 weeks)

- Feature implementation
- Continuous testing
- Weekly status updates

#### Stabilization (T-2 weeks)

- Feature freeze
- Bug fixes only
- Documentation updates

#### Release Candidate (T-1 week)

- RC1, RC2 as needed
- Community testing
- Final approval by Technical Board

#### Release (T-0)

- Tag release on GitHub
- Publish to npm, PyPI, etc.
- Announce via all channels
- Update website

### 9.3 Backward Compatibility

**Guarantees**:

- PCL v1.x programs run on v1.y runtimes (y > x)
- Security patches backported to last 2 major versions
- Long-Term Support (LTS) releases every 2 years

**Breaking Change Process**:

1. RFC submitted with justification
2. Technical Board approval required
3. Deprecation notice in preceding major version
4. Migration guide provided
5. Automated migration tool (if feasible)

### 9.4 License Change Authority

**Current Licensing**:

- **Code**: Apache 2.0 ([LICENSE](../LICENSE))
- **Documentation**: CC BY 4.0 ([LICENSE-DOCS](../LICENSE-DOCS))
- **Trademarks**: IbIFACE ([TRADEMARK_POLICY.md](TRADEMARK_POLICY.md))

**License Change Policy**:

PCL's dual licensing (Apache 2.0 + CC BY 4.0) is **stable and committed** to foster community trust.

**Authority for License Changes**:

| Change Type                      | Authority Required                                             | Notice Period |
| -------------------------------- | -------------------------------------------------------------- | ------------- |
| **Code License Change**          | Steering Committee (unanimous) + Community vote (2/3 majority) | 12 months     |
| **Documentation License Change** | Technical Board (2/3 majority)                                 | 6 months      |
| **Trademark Policy Change**      | IbIFACE + Steering Committee consultation                      | 3 months      |

**Community Vote Process**:

1. **Proposal**: Steering Committee publishes rationale
2. **Comment Period**: 90 days for community feedback
3. **Vote**: Core Contributors + Maintainers (weighted by contribution)
4. **Approval**: 2/3 majority required
5. **Transition**: 12-month dual licensing period (old + new)

**Irrevocable Commitment**: Past versions remain under their original license. Only future releases can adopt new licensing.

**Precedent**: Following Rust's model (committed to MIT/Apache 2.0), PCL commits to permissive licensing to ensure community confidence.

---

## 10. Performance Measurement

### 10.1 Key Performance Indicators (KPIs)

#### Project Health

| KPI                     | Target    | Measurement                   |
| ----------------------- | --------- | ----------------------------- |
| **Active Contributors** | 50+       | Monthly unique committers     |
| **Community Growth**    | 20% YoY   | GitHub stars, Discord members |
| **Issue Response Time** | <48 hours | Median time to first response |
| **PR Merge Time**       | <7 days   | Median time to merge          |
| **Test Coverage**       | ≥80%      | Automated coverage reports    |

#### Adoption

| KPI                         | Target    | Measurement                |
| --------------------------- | --------- | -------------------------- |
| **Downloads**               | 10k/month | npm, PyPI analytics        |
| **Enterprise Adopters**     | 5+        | Case studies, testimonials |
| **IDE Integrations**        | 3+        | VS Code, JetBrains, etc.   |
| **Certified Professionals** | 100+      | Certification program      |

#### Security & Compliance

| KPI                           | Target     | Measurement             |
| ----------------------------- | ---------- | ----------------------- |
| **Security Incidents**        | 0 critical | Incident reports        |
| **Vulnerability Remediation** | <24 hours  | Time to patch           |
| **Audit Pass Rate**           | 100%       | ISO 27001, 42001 audits |
| **OWASP LLM Compliance**      | 10/10      | Self-assessment         |

#### Quality

| KPI                        | Target           | Measurement        |
| -------------------------- | ---------------- | ------------------ |
| **Build Success Rate**     | ≥95%             | CI/CD metrics      |
| **Documentation Coverage** | 100% public APIs | Automated checks   |
| **Conformance Test Pass**  | 100%             | Test suite results |

### 10.2 Dashboards

**Public Dashboard** (pcl-lang.org/metrics):

- Community stats
- Adoption metrics
- Release schedule

**Internal Dashboard** (governance only):

- Security metrics
- Risk register
- Compliance status

### 10.3 Annual Report

Published every December:

1. **Executive Summary**: Highlights and achievements
2. **Project Health**: KPIs, trends, challenges
3. **Governance Review**: EDM cycle outcomes
4. **Compliance Status**: ISO, EU AI Act, OWASP
5. **Financial Report**: Budget, expenses, grants
6. **Community Recognition**: Top contributors
7. **Roadmap**: Priorities for upcoming year

---

## 11. Appendices

### Appendix A: Code of Conduct

PCL adopts the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

**Key Principles**:

- **Inclusive**: Welcoming to all backgrounds
- **Respectful**: Professional and constructive communication
- **Collaborative**: Credit shared, blame avoided
- **Accountable**: Violations addressed promptly

**Enforcement**:

- Incidents reported to <conduct@pcl-lang.org>
- Investigated by Steering Committee
- Sanctions: warning, temporary ban, permanent ban

### Appendix B: Conflict of Interest Policy

**Disclosure Required**:

- Employment by LLM provider (OpenAI, Anthropic, etc.)
- Financial interest in competing projects
- Consulting relationships with adopters

**Recusal**:

- Members with conflicts abstain from related votes
- Disclosed in meeting minutes

### Appendix C: Financial Governance

**Funding Sources**:

- Grants (Mozilla, Linux Foundation, etc.)
- Corporate sponsorships (tiered)
- Certification program fees
- Consulting services (optional)

**Budget Allocation**:

- 50% – Development (maintainer stipends)
- 20% – Infrastructure (hosting, CI/CD)
- 15% – Community (events, grants)
- 10% – Legal & compliance
- 5% – Reserve

**Transparency**:

- Budget published annually
- Expenses tracked in public ledger (Open Collective)

### Appendix D: Governance Review Checklist

**Quarterly Review** (by Steering Committee):

- [ ] EDM cycle completed (Evaluate-Direct-Monitor)
- [ ] KPIs reviewed, trends analyzed
- [ ] Risk register updated
- [ ] Compliance audits on track
- [ ] Community feedback addressed
- [ ] Budget reconciliation
- [ ] Roadmap adjustments (if needed)

**Annual Review**:

- [ ] Governance model effectiveness
- [ ] Organizational structure adequacy
- [ ] Standard alignment (ISO 38500, 42001)
- [ ] Strategic objectives still relevant
- [ ] Election of Steering Committee (if due)
- [ ] Annual report published

### Appendix E: Governance Document Control

| Document              | Owner              | Review Cycle | Next Review |
| --------------------- | ------------------ | ------------ | ----------- |
| PCL_SPEC_v1.md        | Technical Board    | Annually     | Jan 2027    |
| PCL_SECURITY_MODEL.md | Security WG        | Annually     | Jan 2027    |
| PCL_GOVERNANCE.md     | Steering Committee | Annually     | Jan 2027    |
| Code of Conduct       | Steering Committee | Bi-annually  | Jul 2026    |
| Risk Register         | Risk Owner         | Quarterly    | Apr 2026    |

### Appendix F: Glossary of Governance Terms

**AIMS**: AI Management System (ISO 42001)

**EDM**: Evaluate-Direct-Monitor (ISO 38500 governance cycle)

**RFC**: Request for Comments (technical proposal process)

**SBOM**: Software Bill of Materials (dependency inventory)

**SME**: Subject Matter Expert

**WG**: Working Group

**WORM**: Write Once, Read Many (immutable storage)

---

## Document Approval

**Approved by**:

- Steering Committee: [Date]
- Technical Board: [Date]
- Legal Review: [Date]

**Effective Date**: January 17, 2026

**Next Review**: January 2027

---

**END OF GOVERNANCE FRAMEWORK**

---

**Contact**: <governance@pcl-lang.org>

**Website**: <https://pcl-lang.org/governance>

**Repository**: <https://github.com/pcl-lang/governance>
