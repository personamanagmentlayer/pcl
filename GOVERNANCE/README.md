# 🧭 PCL Governance & Licensing

**Governance framework, compliance documentation, and licensing information.**

---

## 📋 Documents in This Folder

### Strategic Documents

- **[ROADMAP.md](ROADMAP.md)** - Strategic roadmap & compliance timeline (Q1 2026 - 2027+)
- **[EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)** - Leadership brief for decision-makers
- **[MISSION_COMPLETE.md](MISSION_COMPLETE.md)** - Foundation phase completion report
- **[DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)** - Central navigation hub

### Governance & Compliance

- **[PCL_GOVERNANCE.md](PCL_GOVERNANCE.md)** - ISO 38500 governance framework
- **[PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md)** - ISO 27001/42001 security architecture
- **[COMPLIANCE_QUICK_REFERENCE.md](COMPLIANCE_QUICK_REFERENCE.md)** - Auditor's guide
- **[STANDARDS_OVERVIEW.md](STANDARDS_OVERVIEW.md)** - Standards quick reference
- **[STANDARDS_IMPLEMENTATION_SUMMARY.md](STANDARDS_IMPLEMENTATION_SUMMARY.md)** - Implementation status

### Developer Guidelines

- **[CONTRIBUTING_COMPLIANCE.md](CONTRIBUTING_COMPLIANCE.md)** - Developer compliance guide

---

## 🏛️ Governance Structure

### Three-Layer Model

```
┌─────────────────────────────────────┐
│   Strategic Governance Layer       │  ← Steering Committee
│   (WHY: Vision, standards)         │
├─────────────────────────────────────┤
│   Tactical Governance Layer        │  ← Technical Board
│   (WHAT: Architecture, roadmap)    │
├─────────────────────────────────────┤
│   Operational Governance Layer     │  ← Working Groups
│   (HOW: Implementation, testing)   │
└─────────────────────────────────────┘
```

### Key Bodies

1. **Steering Committee** - Strategic direction, standards alignment
2. **Technical Board** - Architecture decisions, RFC approval
3. **Security Working Group** - Threat modeling, audits
4. **Standards Working Group** - ISO/OWASP/EU compliance

---

## 📜 Licensing

### Core License

**Apache 2.0 License** - See [../LICENSE](../LICENSE)

- ✅ Commercial use allowed
- ✅ Modification allowed
- ✅ Distribution allowed
- ✅ Patent grant included
- ⚠️ Trademark use restricted (see below)

### Trademark Policy

**All PCL project names are trademarks of IbIFACE**

- ✅ Use PCL in documentation (fair use)
- ✅ "Built with PCL" badges allowed
- ❌ Cannot imply official endorsement
- ❌ Cannot use PCL logo without permission

For trademark usage guidelines, contact: **<legal@ibiface.com>**

---

## 🔒 Security Policy

### Reporting Vulnerabilities

**DO NOT open public GitHub issues for security vulnerabilities.**

**Email**: <security@pcl-lang.org>

**PGP Key**: Available at <https://pcl-lang.org/security.asc>

### Response Timeline

- **Acknowledgment**: Within 24 hours
- **Initial assessment**: Within 72 hours
- **Fix timeline**: Based on severity (Critical: 7 days, High: 30 days)

See [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md) for full security architecture.

---

## 📊 Standards Compliance

### Mandatory Standards (✅ Complete)

| Standard             | Version | Compliance Doc                                                 |
| -------------------- | ------- | -------------------------------------------------------------- |
| **ISO/IEC 27001**    | 2022    | [PCL_SECURITY_MODEL.md](PCL_SECURITY_MODEL.md)                 |
| **ISO/IEC 42001**    | 2023    | [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md)                         |
| **OWASP LLM Top 10** | 2025    | [COMPLIANCE_QUICK_REFERENCE.md](COMPLIANCE_QUICK_REFERENCE.md) |
| **RFC 2119**         | 1997    | [/SPEC/PCL_SPEC_v1.md](../SPEC/PCL_SPEC_v1.md)                 |

### Strategic Standards (🔄 In Progress)

- ISO/IEC 23894:2023 (AI Risk Management) - Q2 2026
- NIST SP 800-207 (Zero Trust) - Q2 2026
- EU AI Act (Articles 9-15) - Q3 2026

See [STANDARDS_OVERVIEW.md](STANDARDS_OVERVIEW.md) for complete list.

---

## 🤝 Contributing

### Before Contributing

1. Read [CONTRIBUTING_COMPLIANCE.md](CONTRIBUTING_COMPLIANCE.md)
2. Review [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md) - RFC process
3. Check [ROADMAP.md](ROADMAP.md) - Current priorities

### Contribution Guidelines

- ✅ All code must maintain ISO 27001/42001 alignment
- ✅ Test coverage ≥80% required
- ✅ Security controls documented
- ✅ OWASP LLM mitigations validated

### RFC Process

**For significant changes:**

1. **Draft RFC** - Create RFC document
2. **Community Review** - 14-day comment period
3. **Technical Board Review** - Evaluate technical merit
4. **Steering Committee Approval** - Strategic alignment
5. **Implementation** - Merge to main branch

See [PCL_GOVERNANCE.md](PCL_GOVERNANCE.md) Section 4 for details.

---

## 📞 Contact

### General Inquiries

- **Email**: <info@pcl-lang.org>
- **Website**: <https://pcl-lang.org>
- **GitHub**: <https://github.com/ibiface/pcl-lite>

### Specialized Contacts

- **Security**: <security@pcl-lang.org>
- **Compliance**: <compliance@pcl-lang.org>
- **Governance**: <governance@pcl-lang.org>
- **Trademarks**: <legal@ibiface.com>

---

## 🎯 Governance KPIs

Track governance effectiveness:

| Metric                      | Target  | Current | Status      |
| --------------------------- | ------- | ------- | ----------- |
| **RFC Response Time**       | <7 days | TBD     | 📋 Pending  |
| **Security Issue Response** | <24h    | TBD     | 📋 Pending  |
| **Standards Compliance**    | 100%    | 100%    | ✅ Complete |
| **Community PRs Reviewed**  | <48h    | TBD     | 📋 Pending  |

---

## 📚 Related Documentation

- **Specifications**: [/SPEC](../SPEC/) - Formal language specs
- **Core Concepts**: [/CORE](../CORE/) - PCL fundamentals
- **Reference Implementations**: [/REF](../REF/) - Code examples

---

## 🔄 Document Maintenance

### Update Schedule

- **Quarterly Review**: ROADMAP.md, STANDARDS_IMPLEMENTATION_SUMMARY.md
- **Annual Review**: PCL_GOVERNANCE.md, PCL_SECURITY_MODEL.md
- **Continuous**: CONTRIBUTING_COMPLIANCE.md (as standards evolve)

### Version History

- **v1.0** (January 17, 2026) - Initial governance framework established

---

**Maintained by**: PCL Steering Committee
**Last Updated**: January 17, 2026
**Next Review**: April 17, 2026 (Q2 2026)

---

## ⚖️ Legal Notice

**PCL (Persona Control Language)** is a trademark of **IbIFACE**.

All documentation and code are licensed under **Apache 2.0** unless otherwise noted.

For trademark usage, licensing inquiries, or legal questions:
**<legal@ibiface.com>**
