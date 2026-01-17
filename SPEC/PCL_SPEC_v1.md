# PCL Specification v1.0

**Status**: Draft Standard
**Date**: January 2026
**Authors**: PCL Working Group
**Category**: Standards Track

---

## Abstract

This document specifies the **Persona Control Language (PCL) v1.0**, a domain-specific language for AI persona governance, orchestration, and control. PCL provides vendor-neutral, auditable, and portable mechanisms for defining, composing, and managing AI agent behaviors across providers and runtimes.

PCL is designed as a **governance language**, not an application language. Its primary purpose is to establish clear boundaries, capabilities, and accountability for autonomous AI systems operating in enterprise, institutional, and regulated environments.

---

## Status of This Memo

This is a **Draft Standard** specification for the Persona Control Language. Distribution of this memo is unlimited.

---

## Copyright Notice

Copyright (c) 2026 PCL Contributors. All rights reserved.

This specification is made available under the terms of the **Creative Commons Attribution 4.0 International License** (CC BY 4.0).

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Terminology](#2-terminology)
3. [Design Principles](#3-design-principles)
4. [Language Syntax](#4-language-syntax)
5. [Semantic Model](#5-semantic-model)
6. [Security Model](#6-security-model)
7. [Conformance Requirements](#7-conformance-requirements)
8. [Interoperability](#8-interoperability)
9. [Normative References](#9-normative-references)
10. [Informative References](#10-informative-references)

---

## 1. Introduction

### 1.1 Motivation

Modern AI systems operate with increasing autonomy, often without clear governance frameworks. Traditional programming languages lack the semantic constructs needed to express:

- **Role-based capabilities** for AI agents
- **Composition patterns** for multi-agent systems
- **Audit trails** for AI decision-making
- **Portability** across LLM providers and runtimes

PCL addresses this gap by providing a **declarative, human-readable, machine-verifiable** language for AI governance.

### 1.2 Scope

This specification defines:

- **Core syntax**: Lexical structure, grammar, and file format
- **Semantic model**: Personas, skills, teams, policies, workflows
- **Security model**: Access control, sandboxing, audit logging
- **Execution model**: Runtime behavior and state management
- **Interoperability**: Import/export formats, provider integration

### 1.3 Out of Scope

PCL does **NOT** specify:

- LLM training methods or model architectures
- Network protocols for agent-to-agent communication
- User interface design for AI applications
- Specific prompt engineering techniques

### 1.4 Relationship to Other Standards

PCL is designed to align with:

- **ISO/IEC 27001** – Information Security Management
- **ISO/IEC 42001** – AI Management Systems
- **ISO/IEC 23894** – AI Risk Management
- **OWASP LLM Top 10** – LLM Security
- **EU AI Act** – High-Risk AI Systems Regulation
- **RFC 2119** – Requirement Levels (MUST/SHOULD/MAY)

---

## 2. Terminology

### 2.1 RFC 2119 Keywords

The key words **"MUST"**, **"MUST NOT"**, **"REQUIRED"**, **"SHALL"**, **"SHALL NOT"**, **"SHOULD"**, **"SHOULD NOT"**, **"RECOMMENDED"**, **"MAY"**, and **"OPTIONAL"** in this document are to be interpreted as described in [RFC 2119].

### 2.2 PCL-Specific Terms

- **Persona**: A logical AI agent with defined capabilities, constraints, and behavior patterns
- **Skill**: A capability that a persona can perform (e.g., code review, security audit)
- **Team**: A composition of personas working under a coordination strategy
- **Policy**: A governance rule constraining persona behavior
- **Workflow**: An orchestrated sequence of persona activations
- **Runtime**: An execution environment that interprets PCL programs
- **Provider**: An LLM service (e.g., OpenAI, Anthropic, Azure OpenAI)

### 2.3 Alignment with ISO/IEC 22989 (AI Concepts)

| ISO Term          | PCL Equivalent               |
| ----------------- | ---------------------------- |
| AI Agent          | Persona                      |
| Autonomy Level    | Capability Set + Constraints |
| Human-in-the-Loop | Policy Enforcement Point     |
| Control Mechanism | Workflow Step                |

---

## 3. Design Principles

### 3.1 Core Principles

1. **Separation of Concerns**
   - Persona definition ≠ execution logic
   - Configuration ≠ code

2. **Least Privilege**
   - Personas MUST operate with minimal necessary capabilities
   - Default deny for sensitive operations

3. **Auditability**
   - All persona activations MUST be traceable
   - State changes MUST be logged

4. **Portability**
   - PCL programs MUST execute consistently across runtimes
   - No vendor lock-in

5. **Fail-Safe Defaults**
   - Invalid PCL MUST NOT execute
   - Errors MUST prevent action, not default to permissive behavior

6. **Human Oversight**
   - High-risk operations REQUIRE explicit approval
   - Clear escalation paths

### 3.2 Alignment with Zero Trust Architecture (NIST SP 800-207)

- **Never Trust, Always Verify**: Every persona action is validated
- **Least Privilege Access**: Capabilities are explicitly granted
- **Assume Breach**: Sandboxing and containment by default
- **Continuous Monitoring**: Real-time audit logging

---

## 4. Language Syntax

### 4.1 Lexical Structure

#### 4.1.1 Character Encoding

PCL files MUST be encoded in **UTF-8**.

#### 4.1.2 Tokens

```ebnf
Identifier ::= [A-Z_][A-Z0-9_]*
String     ::= '"' ( [^"\\] | '\\' . )* '"'
Number     ::= [0-9]+ ( '.' [0-9]+ )?
Keyword    ::= 'persona' | 'team' | 'skill' | 'policy' | 'workflow'
```

### 4.2 File Structure

A PCL program consists of:

```ebnf
Program ::= Declaration*

Declaration ::= PersonaDeclaration
              | TeamDeclaration
              | PolicyDeclaration
              | WorkflowDeclaration
              | ImportDeclaration
```

### 4.3 Persona Declaration

```pcl
persona ARCHITECT {
  id: "ARCHI"
  version: "1.0"

  # ISO 42001 Risk Classification
  risk_level: "low"

  skills: [
    SYSTEM_DESIGN,
    SECURITY_ANALYSIS
  ]

  constraints: [
    "no_code_execution",
    "read_only_filesystem"
  ]

  provider: {
    model: "gpt-4"
    temperature: 0.7
  }
}
```

#### 4.3.1 Required Fields

- `id`: MUST be unique across the PCL program
- `skills`: MUST be a non-empty list of skill identifiers

#### 4.3.2 Optional Fields

- `version`: SHOULD follow semantic versioning
- `risk_level`: SHOULD be one of `low`, `medium`, `high` (per ISO 23894)
- `constraints`: MAY specify security restrictions
- `provider`: MAY specify LLM provider preferences

### 4.4 Team Declaration

```pcl
team SECURITY_REVIEW {
  id: "sec-review"
  mode: "consensus"

  members: [
    { persona: "SEC", weight: 2.0 },
    { persona: "ARCHI", weight: 1.0 },
    { persona: "CRITIC", weight: 1.5 }
  ]

  policy: SECURITY_POLICY
}
```

#### 4.4.1 Coordination Modes

- `primary`: Single persona leads, others consult
- `consensus`: All personas must agree
- `weighted`: Weighted voting mechanism
- `sequential`: Chain-of-thought handoff
- `parallel`: Concurrent execution with merge

### 4.5 Policy Declaration

```pcl
policy SECURITY_POLICY {
  rules: [
    {
      condition: "operation == 'file_write'",
      action: "deny",
      reason: "Read-only mode enforced"
    },
    {
      condition: "risk_level == 'high'",
      action: "require_approval",
      approver: "HUMAN_OPERATOR"
    }
  ]
}
```

### 4.6 Workflow Declaration

```pcl
workflow CODE_REVIEW {
  steps: [
    { persona: "SEC", task: "security_audit" },
    { persona: "ARCHI", task: "architecture_review" },
    { team: "SECURITY_REVIEW", task: "consensus_decision" }
  ]

  on_failure: "rollback"
  audit_log: "mandatory"
}
```

---

## 5. Semantic Model

### 5.1 Execution Lifecycle

```
Parse → Validate → Link → Execute → Audit
```

#### 5.1.1 Parse Phase

- Lexical analysis and syntax validation
- AST generation
- Position tracking for error reporting

#### 5.1.2 Validate Phase

- Semantic analysis
- Type checking
- Constraint validation
- Circular dependency detection

#### 5.1.3 Link Phase

- Symbol resolution
- Provider binding
- Policy attachment

#### 5.1.4 Execute Phase

- Persona activation
- State management
- Result collection

#### 5.1.5 Audit Phase

- Log generation (ISO 27001 compliance)
- Trace export
- Metrics collection

### 5.2 State Management

#### 5.2.1 Persona State

Each persona maintains:

```typescript
interface PersonaState {
  id: string;
  status: 'inactive' | 'active' | 'suspended';
  context: Map<string, any>;
  history: Action[];
  metrics: PerformanceMetrics;
}
```

#### 5.2.2 Immutability

Persona states MUST be immutable. State transitions create new state instances.

---

## 6. Security Model

### 6.1 Threat Model

PCL defends against:

1. **Prompt Injection** (OWASP LLM01)
2. **Insecure Output Handling** (OWASP LLM02)
3. **Training Data Poisoning** (OWASP LLM03)
4. **Model Denial of Service** (OWASP LLM04)
5. **Supply Chain Vulnerabilities** (OWASP LLM05)
6. **Sensitive Information Disclosure** (OWASP LLM06)
7. **Insecure Plugin Design** (OWASP LLM07)
8. **Excessive Agency** (OWASP LLM08)
9. **Overreliance** (OWASP LLM09)
10. **Model Theft** (OWASP LLM10)

### 6.2 Security Controls (ISO 27002 Mapping)

| Control ID | Description             | PCL Mechanism         |
| ---------- | ----------------------- | --------------------- |
| A.9.1      | Access Control Policy   | Policy enforcement    |
| A.9.2      | User Access Management  | Persona capabilities  |
| A.12.4     | Logging and Monitoring  | Audit logs            |
| A.14.2     | Security in Development | Constraint validation |

### 6.3 Sandboxing

Personas MUST execute in isolated environments with:

- **No filesystem access** (unless explicitly granted)
- **No network access** (unless explicitly granted)
- **Resource limits** (memory, CPU, tokens)
- **Timeout enforcement**

### 6.4 Audit Logging (ISO 27001 A.12.4.1)

All persona actions MUST generate audit logs containing:

- Timestamp (ISO 8601 format)
- Persona ID
- Action type
- Input parameters
- Output result
- Success/failure status
- User context (if applicable)

---

## 7. Conformance Requirements

### 7.1 Conformant PCL Implementation

A conformant implementation MUST:

1. Support all mandatory syntax elements (Section 4)
2. Enforce security constraints (Section 6)
3. Generate compliant audit logs (Section 6.4)
4. Pass the PCL Test Suite
5. Support import/export in JSON format

### 7.2 Conformant PCL Program

A conformant PCL program MUST:

1. Parse without syntax errors
2. Pass semantic validation
3. Declare all referenced personas and skills
4. Include risk classification for high-risk operations

---

## 8. Interoperability

### 8.1 Standard Formats

PCL MUST support:

- **Source format**: `.pcl` (UTF-8 text)
- **Exchange format**: JSON Schema-validated JSON
- **Audit format**: Structured JSON logs

### 8.2 Provider Independence

PCL programs MUST execute across providers without modification to core logic. Provider-specific configurations SHOULD be externalized.

### 8.3 Import/Export

```pcl
import "./stdlib/security.pcl"
import "https://pcl.org/registry/teams/dream-team.pcl"

export {
  persona CUSTOM_PERSONA,
  team MY_TEAM
}
```

---

## 9. Normative References

- **[RFC 2119]** – Key words for use in RFCs to Indicate Requirement Levels
- **[ISO 27001]** – Information Security Management Systems
- **[ISO 42001]** – Artificial Intelligence Management System
- **[ISO 23894]** – Risk Management for AI Systems
- **[OWASP LLM]** – OWASP Top 10 for Large Language Model Applications
- **[NIST 800-207]** – Zero Trust Architecture

---

## 10. Informative References

- **[EU AI Act]** – Regulation on Artificial Intelligence
- **[IEEE 7000]** – Model Process for Addressing Ethical Concerns
- **[OpenAPI]** – OpenAPI Specification v3.1
- **[JSON Schema]** – JSON Schema Core Specification

---

## Appendix A: EBNF Grammar (Normative)

See `src/grammar/pcl.ebnf` for the complete formal grammar.

---

## Appendix B: Security Checklist

- [ ] All personas have explicit capability declarations
- [ ] High-risk operations require approval policies
- [ ] Audit logging is enabled
- [ ] Provider credentials are externalized
- [ ] No hardcoded secrets in PCL files
- [ ] Constraint validation passes
- [ ] Test coverage ≥ 80%

---

## Appendix C: Compliance Mapping

### ISO 42001 (AI Management System)

| Requirement                      | PCL Support         |
| -------------------------------- | ------------------- |
| 5.1 – Leadership and commitment  | Governance model    |
| 6.1 – Risk assessment            | Risk classification |
| 7.2 – Competence                 | Skill definitions   |
| 8.1 – Operational planning       | Workflows           |
| 9.1 – Monitoring and measurement | Audit logs          |

### EU AI Act (High-Risk Systems)

| Article                           | PCL Support                   |
| --------------------------------- | ----------------------------- |
| Art. 9 – Risk management          | `risk_level` field            |
| Art. 10 – Data governance         | Data minimization constraints |
| Art. 11 – Technical documentation | Generated from PCL            |
| Art. 12 – Record-keeping          | Audit logs                    |
| Art. 13 – Transparency            | Human-readable PCL            |
| Art. 14 – Human oversight         | Approval policies             |

---

## Authors' Addresses

PCL Working Group
Email: pcl-spec@example.org
Web: https://pcl-lang.org

---

## Change History

- **v1.0 (2026-01)**: Initial specification release

---

**END OF SPECIFICATION**
