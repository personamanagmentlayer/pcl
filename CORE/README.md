# 🧱 PCL Core Concepts & Invariants

**Foundational principles, concepts, and invariants of the PCL language.**

---

## What This Folder Contains

This folder documents the **core principles** that define PCL's identity and must remain stable across versions:

1. **Language Philosophy** - Why PCL exists and what makes it different
2. **Core Abstractions** - Personas, Skills, Teams, Workflows, Policies
3. **Invariants** - Rules that MUST NOT change without major version bump
4. **Design Principles** - Guiding principles for language evolution

---

## Core Invariants

### 1. Declarative-First

PCL is **declarative, not imperative**. You describe _what_ personas should do, not _how_.

```pcl
persona ARCHITECT {
  role: "System architect"
  skills: ["design", "documentation"]
}
```

### 2. Governance-First

PCL prioritizes **governance over convenience**. Every feature must support:

- Auditability
- Transparency
- Human oversight
- Risk management

### 3. Provider-Agnostic

PCL **never locks to a single AI provider**. All implementations must support:

- OpenAI
- Anthropic
- Azure OpenAI
- Custom models

### 4. Standards-Aligned

PCL is designed for **ISO 27001, ISO 42001, OWASP LLM, EU AI Act** compliance by default.

### 5. Type-Safe

All PCL constructs are **strongly typed** with static validation.

### 6. Immutable Audit Logs

Audit logs are **append-only and immutable** (WORM storage).

### 7. Human-in-the-Loop

Critical operations MUST support **human approval workflows**.

---

## Core Abstractions

### Persona

The fundamental unit of capability. A persona encapsulates:

- Identity (name, role, description)
- Skills (what it can do)
- Context (shared knowledge)
- Constraints (guardrails)

### Skill

Atomic capabilities assigned to personas:

- `@code_review` - Review code for quality
- `@threat_modeling` - Identify security risks
- `@data_analysis` - Analyze datasets

### Team

Composition of personas for collaboration:

- `@security_team` - Security-focused personas
- `@dream_team` - Full-stack development
- `@standardization` - Standards development

### Workflow

Multi-step orchestration with persona handoffs:

```pcl
workflow security_review {
  step analyze -> SEC
  step fix -> DEV
  step verify -> QA
}
```

### Policy

Governance rules enforced at runtime:

```pcl
policy no_pii_in_logs {
  forbid: personal_data in audit_logs
}
```

---

## Design Principles

### 1. Simplicity Over Features

Prefer **fewer, composable primitives** over many specialized features.

### 2. Explicit Over Implicit

Make **security and governance visible** in the code.

### 3. Fail-Safe Defaults

Default to **most secure, most transparent** behavior.

### 4. Progressive Enhancement

Basic usage should be **simple**, advanced use cases **possible**.

### 5. Vendor Neutrality

Never favor **one AI provider** over another.

---

## Stability Guarantees

### SemVer Commitment

- **Major version (2.x)**: Breaking changes allowed
- **Minor version (1.x)**: Backward-compatible additions only
- **Patch version (1.0.x)**: Bug fixes only

### Core Invariants Never Change

The 7 core invariants above **MUST NOT change** without a major version bump.

### Deprecation Policy

- **Deprecation notice**: 12 months minimum
- **Removal**: Only in major versions
- **Migration guides**: Mandatory for all breaking changes

---

## Related Documentation

- **Specifications**: [/SPEC](../SPEC/) - Formal language specs
- **Governance**: [/GOVERNANCE](../GOVERNANCE/) - How PCL is governed
- **Reference Implementations**: [/REF](../REF/) - Code examples

---

**Maintained by**: PCL Core Team
**Last Updated**: January 17, 2026
