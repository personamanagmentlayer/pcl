# PCL Standard Library (stdlib)

**Version**: 3.1.0
**Status**: ✅ Production Ready
**Total Skills**: 191 Expert-Level Skills

---

## 🎯 What is the Standard Library?

The **PCL Standard Library** is a comprehensive collection of **191 expert-level skills** for AI agent personas, providing deep domain expertise across programming languages, frameworks, cloud platforms, data systems, security, and industry verticals.

Each skill represents **expert-level mastery** in a specific domain with:

- **Core Concepts**: Fundamental principles and architecture
- **Code Examples**: Production-ready implementations (250-800+ lines)
- **Best Practices**: Industry standards and proven patterns
- **Anti-Patterns**: Common mistakes to avoid
- **Resources**: Documentation, tools, and learning materials

## 📊 Library Statistics

- **Total Skills**: 191 expert-level skills
- **Categories**: 15 major domains
- **Total Content**: ~114,000 lines of expert knowledge (48,000 in skill entry
  points, 66,000 in on-demand reference documents)
- **Coverage**: Languages, Frameworks, Cloud, Data, Security, DevOps, Industries, and more

## 🗂️ Skill Categories

| Category              | Count | Examples                                                               |
| --------------------- | ----- | ---------------------------------------------------------------------- |
| **Domains**           | 58    | Healthcare, Finance, LegalTech, Manufacturing, Energy, AgTech, Web3    |
| **Workflows**         | 4     | TDD, refactoring, debugging, code review — procedures, not knowledge   |
| **Languages**         | 23    | Python, TypeScript, Rust, Go, Java, Kotlin, Scala, Haskell, Julia, Zig |
| **DevOps**            | 16    | Kubernetes, Docker, Terraform, ArgoCD, Prometheus, Grafana, Istio      |
| **Frameworks**        | 15    | React, Vue, Angular, Next.js, Django, Spring Boot, Flutter, Tauri      |
| **Data & Analytics**  | 17    | Snowflake, Databricks, Airflow, dbt, Tableau, Power BI, Kafka          |
| **Security**          | 12    | Penetration Testing, Zero Trust, GDPR, SOC2, Cryptography              |
| **Tools**             | 12    | Git, Slack, Teams, Discord, WebRTC, Video Streaming, Code Review       |
| **QA & Testing**      | 7     | Playwright, Cypress, Jest, Selenium, Load Testing, Chaos Engineering   |
| **API & Integration** | 6     | REST, GraphQL, gRPC, Microservices, API Design                         |
| **Professional**      | 5     | Banking, Legal, Accounting, FinOps, Standards                          |
| **AI & ML**           | 7     | Machine Learning, AI Architecture, Data Science                        |
| **Cloud Platforms**   | 4     | AWS, Azure, GCP, Cloudflare                                            |
| **Scientific**        | 3     | Quantum Computing, Bioinformatics, Research                            |
| **Design**            | 2     | System & UX Design                                                     |

See [SKILLS_INVENTORY.md](SKILLS_INVENTORY.md) for the complete skill list.

## 🚀 Quick Start

### 1. Browse Available Skills

```bash
# List all skills
find stdlib -name SKILL.md

# Search for a specific domain
find stdlib -type d -name "*react*"
find stdlib -type d -name "*kubernetes*"

# Machine-readable index
cat stdlib/catalog/skill-index.json
```

### 2. Load Skills into a Persona

```yaml
# persona.pcl
persona "FullStackDeveloper" {
  version = "1.0.0"

  # Load skills from stdlib
  skills = [
    "stdlib/languages/typescript-expert",
    "stdlib/frameworks/react-expert",
    "stdlib/frameworks/nextjs-expert",
    "stdlib/data/postgresql-expert",
    "stdlib/devops/docker-expert"
  ]

  constraints {
    max_tokens = 8000
    allowed_tools = ["Read", "Write", "Edit", "Bash"]
  }
}
```

### 3. Use Skills in Multi-Agent Systems

```yaml
# multi-agent-system.pcl
system "DataPlatform" {

agent "DataEngineer" {
skills = [
"stdlib/data/airflow-expert",
"stdlib/data/dbt-expert",
"stdlib/data/snowflake-expert",
"stdlib/languages/python-expert"
]
role = "Build and maintain data pipelines"
}

agent "DataAnalyst" {
skills = [
"stdlib/data/tableau-expert",
"stdlib/data/powerbi-expert",
"stdlib/data/sql-expert"
]
role = "Create dashboards and analytics"
}

agent "MLEngineer" {
skills = [
"stdlib/ai/ml-expert",
"stdlib/data/databricks-expert",
"stdlib/languages/python-expert"
]
role = "Train and deploy ML models"
}
}
```

## 📖 Skill Format

Each skill follows the **PCL Agent Skills Specification**:

```markdown
---
name: skill-name
version: 1.0.0
description: Brief description of the skill
category: domain
tags: [tag1, tag2, tag3]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(command:*)
---

# Skill Title

Brief introduction to the skill domain.

## Core Concepts

### Concept 1

Explanation...

## Code Examples

\`\`\`language
// Production-ready code example
// 50-200 lines demonstrating real-world usage
\`\`\`

## Best Practices

- Practice 1
- Practice 2

## Anti-Patterns

❌ Anti-pattern 1
❌ Anti-pattern 2

## Resources

- Documentation: https://...
- Tools: https://...
```

## 🎭 Example Personas

### Full-Stack Web Developer

```yaml
persona "FullStackDev" {
  description = "Expert full-stack web developer"

  skills = [
    # Frontend
    "stdlib/languages/typescript-expert",
    "stdlib/frameworks/react-expert",
    "stdlib/frameworks/nextjs-expert",

    # Backend
    "stdlib/languages/nodejs-expert",
    "stdlib/frameworks/fastapi-expert",
    "stdlib/api/graphql-expert",

    # Database
    "stdlib/data/postgresql-expert",
    "stdlib/data/redis-expert",

    # DevOps
    "stdlib/devops/docker-expert",
    "stdlib/devops/kubernetes-expert",
    "stdlib/cloud/aws-expert"
  ]

  constraints {
    governance_level = "high"
    risk_classification = "medium"
  }
}
```

### Cloud Security Architect

```yaml
persona "SecurityArchitect" {
  description = "Expert in cloud security and compliance"

  skills = [
    # Security
    "stdlib/security/zero-trust-expert",
    "stdlib/security/cryptography-expert",
    "stdlib/security/penetration-testing-expert",

    # Compliance
    "stdlib/security/gdpr-expert",
    "stdlib/security/soc2-expert",

    # Cloud
    "stdlib/cloud/aws-expert",
    "stdlib/cloud/azure-expert",
    "stdlib/devops/kubernetes-expert",
    "stdlib/devops/istio-expert"
  ]

  constraints {
    governance_level = "critical"
    risk_classification = "high"
    audit_required = true
  }
}
```

### Data Platform Engineer

```yaml
persona "DataEngineer" {
  description = "Expert in modern data platforms"

  skills = [
    # Languages
    "stdlib/languages/python-expert",
    "stdlib/languages/scala-expert",

    # Data Platforms
    "stdlib/data/snowflake-expert",
    "stdlib/data/databricks-expert",

    # Orchestration
    "stdlib/data/airflow-expert",
    "stdlib/data/dbt-expert",

    # Streaming
    "stdlib/data/kafka-expert",

    # Cloud
    "stdlib/cloud/aws-expert",
    "stdlib/devops/terraform-expert"
  ]

  constraints {
    governance_level = "high"
    data_classification = ["pii", "confidential"]
  }
}
```

## 🔍 Skill Discovery

### By Technology Stack

**MERN Stack**:

- mongodb-expert
- nodejs-expert
- react-expert
- typescript-expert

**Data Science Stack**:

- python-expert
- data-science-expert
- ml-expert
- databricks-expert

**Cloud Native Stack**:

- kubernetes-expert
- istio-expert
- prometheus-expert
- grafana-expert
- argocd-expert

**Mobile Development**:

- flutter-expert
- react-native-expert
- ios-expert
- android-expert

### By Industry

**Healthcare**: healthcare, healthtech-expert, pharmaceutical-expert
**Finance**: banking-expert, fintech-expert, trading-expert
**Legal**: lawyer-expert, legal-tech, legaltech-expert
**Manufacturing**: manufacturing-expert, iot-expert
**Agriculture**: farming, agtech-expert

## 🛡️ Governance & Security

Skills integrate with PCL's governance framework:

### Risk Classification

```yaml
skill "penetration-testing-expert" {
  risk_level = "high"          # Can execute security tests
  requires_approval = true      # Human approval needed
  audit_all_actions = true      # Log everything
}

skill "react-expert" {
  risk_level = "low"           # UI development only
  requires_approval = false
}
```

### Tool Permissions

```yaml
# Skill declares what tools it needs
allowed-tools:
  - Read # Can read files
  - Write # Can write files
  - Edit # Can edit files
  - Bash(npm:*, yarn:*) # Can run npm/yarn only
  - Bash(kubectl:get:*) # Can only run kubectl get
```

### Compliance Alignment

Skills support compliance frameworks:

- **ISO 42001** - AI risk management
- **ISO 27001** - Information security
- **GDPR** - Data protection (gdpr-expert skill)
- **SOC 2** - Security controls (soc2-expert skill)
- **OWASP** - Security best practices

## 📚 Skill Composition Patterns

### Layered Architecture

```yaml
persona "EnterpriseBackend" {
  skills = [
    # Layer 1: Language
    "stdlib/languages/java-expert",

    # Layer 2: Framework
    "stdlib/frameworks/spring-boot-expert",

    # Layer 3: Data
    "stdlib/data/postgresql-expert",
    "stdlib/data/redis-expert",

    # Layer 4: Integration
    "stdlib/api/microservices-expert",
    "stdlib/api/graphql-expert",

    # Layer 5: Infrastructure
    "stdlib/devops/kubernetes-expert",
    "stdlib/devops/istio-expert",
    "stdlib/cloud/aws-expert"
  ]
}
```

### Cross-Functional Teams

```yaml
system "ProductDevelopment" {

persona "Frontend" {
skills = ["react-expert", "typescript-expert", "cypress-expert"]
}

persona "Backend" {
skills = ["go-expert", "postgresql-expert", "microservices-expert"]
}

persona "DevOps" {
skills = ["kubernetes-expert", "terraform-expert", "prometheus-expert"]
}

persona "Security" {
skills = ["penetration-testing-expert", "zero-trust-expert"]
}
}
```

## 📊 Documentation

- **[CHANGELOG.md](CHANGELOG.md)** - Per-skill versioning and migration notes
- **[SKILLS_INVENTORY.md](SKILLS_INVENTORY.md)** - Complete skill list with sizes and reference files
- **[DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md)** - File organization and structure
- **[catalog/](catalog/)** - Machine-readable index (JSON + YAML)

Both documents are generated; rerun `python scripts/generate-skill-inventory.py`
after changing the tree rather than editing them.

## 🔧 Development & Contributing

### Creating Custom Skills

1. **Copy an existing skill as template**:

```bash
cp -r stdlib/languages/python-expert stdlib/languages/my-skill
```

2. **Edit SKILL.md** with your expertise

3. **Validate the skill**:

```bash
python scripts/validate-skills.py
```

### Maintenance commands

```bash
python scripts/validate-skills.py           # conformance gate (must pass)
python scripts/split-skill-references.py    # keep SKILL.md under 500 lines
python scripts/generate-skill-catalog.py    # rebuild catalog/
python scripts/generate-skill-inventory.py  # rebuild inventory + structure docs
```

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

## 📈 What's New in v3.1.0

**17 new skills**, taking the library from 174 to 191 and adding a fifteenth
category. Chosen by cross-referencing coverage gaps against observed usage —
developer survey data and the install rankings of public agent-skill registries.

- **`workflows/` (new category, 4 skills)** — `tdd-workflow`,
  `refactoring-workflow`, `debugging-workflow`, `code-review-workflow`.
  Procedures rather than knowledge: the shape that dominates real agent-skill
  usage and that the library had none of.
- **Applied AI (3)** — `llm-engineering-expert`, `rag-expert`,
  `agent-engineering-expert`. The largest coverage gap: the library mentioned
  LLMs in tags but had no skill on prompting, retrieval or tool use.
- **Capabilities (2)** — `document-processing-expert` (PDF, DOCX, XLSX, PPTX in
  one skill), `browser-automation-expert` (distinct from `playwright-expert`,
  which is for testing your own application).
- **Data (3)** — `mysql-expert` (the second most used database, previously
  absent), `analytical-databases-expert`, `stream-processing-expert`.
- **Security (3)** — `secrets-management-expert`,
  `supply-chain-security-expert` (OWASP A03 2025), `identity-access-expert`
  (OWASP A01).
- **Interface (1)** — `accessibility-expert`. The `design/` category held only
  software architecture; WCAG conformance had no home.
- **Meta (1)** — `skill-router`, for finding and composing skills across 191.

Grouping was deliberate: five vector stores live inside `rag-expert`, four
document formats inside `document-processing-expert`. Roughly fifty topics are
covered by seventeen skills, with per-tool detail in `references/`.

## 📈 What's New in v3.0.0

**Agent Skills v1.0 conformance.** Every skill now passes
`scripts/validate-skills.py`. **This release has breaking changes** — one skill
removed, five moved, seven with capabilities withdrawn. See
[CHANGELOG.md](CHANGELOG.md) for the migration notes.

- **Uniform layout** — all 174 skills live at
  `stdlib/<category>/<name>/SKILL.md`; 71 flat files were converted, and 5
  directories renamed to match their declared `name:`.
- **Repaired metadata** — 20 skills had an unparseable frontmatter block (an
  H1 preceded it, and the key was `skill_id:` instead of `name:`), so tooling
  saw no metadata at all; 21 more were missing `version:`.
- **Discoverable descriptions** — every description states an explicit
  `Use when ...` trigger naming the keywords and tasks that select the skill.
- **Progressive disclosure** — 127 oversized skills were split, moving bulk
  material into `references/` read on demand. A `SKILL.md` now averages 277
  lines instead of 644, so activating a skill costs a fraction of the context
  it did.
- **Deduplicated** — the two overlapping legal-technology skills were merged
  into `legaltech-expert`.

## 📈 What's New in v2.0.0

**Major Expansion**: 100 → 173 skills (+73 skills)

**New Categories Added**:

- **Modern Languages**: Zig, Nim, Julia, Haskell, Clojure
- **Modern Frameworks**: Vue, Angular, Svelte, Next.js, Remix, Flutter, Tauri
- **Emerging Tech**: Web3, Metaverse, Edge Computing, Serverless, WebAssembly, Robotics, 5G
- **Data Platforms**: Snowflake, Databricks, Airflow, dbt, Looker, Tableau, Power BI
- **Security & Compliance**: Penetration Testing, Zero Trust, GDPR, SOC2, Cryptography
- **Cloud Native**: Istio, Helm, ArgoCD, Prometheus, Grafana, Linkerd
- **Mobile & Desktop**: Flutter, React Native, iOS, Android, Electron, Tauri
- **Industry Specializations**: Pharmaceutical, Biotech, FinTech, RegTech, PropTech, CleanTech
- **Enterprise Systems**: SAP, Salesforce, ServiceNow, Workday, Oracle, Microsoft 365
- **Testing & QA**: Playwright, Cypress, Jest, Selenium, Load Testing, Chaos Engineering
- **Communication**: Slack, Teams, Discord, WebRTC, Video Streaming

## 📝 License

Part of the PCL project. See [LICENSE](../LICENSE) for details.

## 🔗 Related Documentation

- [PCL Specification](../docs/SPECIFICATION.md)
- [Persona Guide](../docs/PERSONAS.md)
- [Governance Framework](../docs/GOVERNANCE.md)
- [Security Model](../.github/EMERGENCY_SECURITY.md)

---

**The PCL Standard Library** - Governed AI expertise at scale 🚀

**Last Updated**: 2026-01-19
**Maintainer**: PCL Team
**Status**: ✅ Production Ready
