# PCL Standard Library (stdlib)

**Version**: 2.0.0
**Status**: ✅ Production Ready
**Total Skills**: 173 Expert-Level Skills

---

## 🎯 What is the Standard Library?

The **PCL Standard Library** is a comprehensive collection of **173 expert-level skills** for AI agent personas, providing deep domain expertise across programming languages, frameworks, cloud platforms, data systems, security, and industry verticals.

Each skill represents **expert-level mastery** in a specific domain with:

- **Core Concepts**: Fundamental principles and architecture
- **Code Examples**: Production-ready implementations (250-800+ lines)
- **Best Practices**: Industry standards and proven patterns
- **Anti-Patterns**: Common mistakes to avoid
- **Resources**: Documentation, tools, and learning materials

## 📊 Library Statistics

- **Total Skills**: 173 expert-level skills
- **Categories**: 14 major domains
- **Total Content**: ~120,000+ lines of expert knowledge
- **Coverage**: Languages, Frameworks, Cloud, Data, Security, DevOps, Industries, and more

## 🗂️ Skill Categories

| Category              | Count | Examples                                                               |
| --------------------- | ----- | ---------------------------------------------------------------------- |
| **Languages**         | 22    | Python, TypeScript, Rust, Go, Java, Kotlin, Scala, Haskell, Julia, Zig |
| **Frameworks**        | 21    | React, Vue, Angular, Next.js, Django, Spring Boot, Flutter, Tauri      |
| **DevOps**            | 17    | Kubernetes, Docker, Terraform, ArgoCD, Prometheus, Grafana, Istio      |
| **Domains**           | 76    | Healthcare, Finance, Legal, Manufacturing, Energy, AgTech, Web3        |
| **Data & Analytics**  | 14    | Snowflake, Databricks, Airflow, dbt, Tableau, Power BI, Kafka          |
| **Security**          | 12    | Penetration Testing, Zero Trust, GDPR, SOC2, Cryptography              |
| **QA & Testing**      | 12    | Playwright, Cypress, Jest, Selenium, Load Testing, Chaos Engineering   |
| **API & Integration** | 6     | REST, GraphQL, gRPC, Microservices, API Design                         |
| **Cloud Platforms**   | 4     | AWS, Azure, GCP, Cloudflare                                            |
| **AI & ML**           | 4     | Machine Learning, AI Architecture, Data Science                        |
| **Tools**             | 5     | Slack, Teams, Discord, WebRTC, Video Streaming                         |
| **Professional**      | 6     | Banking, Legal, Accounting, FinOps, Auditing                           |
| **Scientific**        | 3     | Quantum Computing, Bioinformatics, Research                            |
| **Design**            | 1     | System & UX Design                                                     |

See [SKILLS_INVENTORY.md](SKILLS_INVENTORY.md) for the complete skill list.

## 🚀 Quick Start

### 1. Browse Available Skills

```bash
# List all skills
find stdlib -name "SKILL.md" -o -name "*-expert.md"

# Search for specific domain
find stdlib -name "*react*"
find stdlib -name "*kubernetes*"
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

- **[SKILLS_INVENTORY.md](SKILLS_INVENTORY.md)** - Complete skill list organized by category
- **[DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md)** - File organization and structure
- **[COMPLETE_LIBRARY_MANIFEST.md](COMPLETE_LIBRARY_MANIFEST.md)** - Full manifest with statistics

## 🔧 Development & Contributing

### Creating Custom Skills

1. **Copy an existing skill as template**:

```bash
cp -r stdlib/languages/python-expert stdlib/languages/my-skill
```

2. **Edit SKILL.md** with your expertise

3. **Validate the skill**:

```bash
python scripts/validate-skill.py stdlib/languages/my-skill
```

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

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
