# Skills Integration Guide

**PCL Standard Library v2.0.0**

Complete guide for integrating and using skills from the PCL Standard Library in your AI personas.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Loading Skills](#loading-skills)
4. [Skill Composition Patterns](#skill-composition-patterns)
5. [Governance Integration](#governance-integration)
6. [Tool Permissions](#tool-permissions)
7. [Performance Optimization](#performance-optimization)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Overview

The PCL Standard Library provides 173 expert-level skills across 14 categories. Skills are modular, composable, and governance-aware units of AI capability.

### What is a Skill?

A skill is a structured knowledge module that provides:

- **Expert domain knowledge** (250-800+ lines of documentation)
- **Code examples** (10-30+ practical examples)
- **Best practices** and anti-patterns
- **YAML metadata** for discovery and governance
- **Tool permissions** defining allowed operations

### Skill Categories

```
languages/       - 22 programming languages (Python, TypeScript, Rust, etc.)
frameworks/      - 21 frameworks (React, Spring Boot, Django, etc.)
data/            - 14 data technologies (PostgreSQL, Kafka, Snowflake, etc.)
devops/          - 17 DevOps tools (Kubernetes, Docker, Terraform, etc.)
cloud/           - 4 cloud platforms (AWS, Azure, GCP, Cloudflare)
integration/     - 6 integration patterns (GraphQL, REST, gRPC, etc.)
infrastructure/  - 4 infrastructure tools (Ansible, Packer, Consul, etc.)
security/        - 12 security domains (Zero Trust, Pentesting, etc.)
domains/         - 27 industry domains (Healthcare, Finance, etc.)
qa/              - 6 testing frameworks (Playwright, Cypress, etc.)
communication/   - 5 communication tools (Slack, Teams, etc.)
emerging/        - 8 emerging tech (Web3, Quantum, Robotics, etc.)
enterprise/      - 8 enterprise systems (SAP, Salesforce, etc.)
specialized/     - 19 specialized areas (Performance, API Design, etc.)
```

## Quick Start

### 1. Browse Available Skills

Use the skill catalog to discover skills:

```bash
# View all skills in JSON format
cat stdlib/catalog/skill-catalog.json

# View lightweight index
cat stdlib/catalog/skill-index.json

# Or browse by category
ls stdlib/languages/
ls stdlib/frameworks/
```

### 2. Create Your First Persona

```pcl
persona "MyFirstDeveloper" {
  version = "1.0.0"

  skills = [
    "stdlib/languages/python-expert",
    "stdlib/frameworks/django-expert",
    "stdlib/data/postgresql-expert"
  ]

  governance {
    risk_classification = "low"
    governance_level = "standard"
  }
}
```

### 3. Load and Use

```python
from pcl import Persona

# Load persona with skills
dev = Persona.from_file("my-first-developer.pcl")

# Skills are automatically loaded and integrated
dev.query("Create a Django REST API for user management")
```

## Loading Skills

### Basic Skill Loading

Skills are loaded via path references in the `skills` array:

```pcl
persona "Developer" {
  skills = [
    "stdlib/languages/typescript-expert",
    "stdlib/frameworks/react-expert"
  ]
}
```

### Relative vs Absolute Paths

```pcl
# Relative to PCL installation (recommended)
skills = ["stdlib/languages/python-expert"]

# Absolute path (for custom skills)
skills = ["/path/to/custom/skills/my-expert.md"]

# Mix of both
skills = [
  "stdlib/languages/go-expert",
  "/company/internal/banking-expert.md"
]
```

### Conditional Loading

Load skills based on environment or configuration:

```pcl
persona "EnvironmentAwareDev" {
  skills = concat(
    ["stdlib/languages/python-expert"],
    env.CLOUD_PROVIDER == "aws" ? ["stdlib/cloud/aws-expert"] : [],
    env.USE_K8S ? ["stdlib/devops/kubernetes-expert"] : []
  )
}
```

### Skill Discovery at Runtime

Use the catalog for dynamic skill loading:

```python
import json

# Load catalog
with open('stdlib/catalog/skill-catalog.json') as f:
    catalog = json.load(f)

# Find skills by tag
web_skills = [
    skill['path']
    for skill in catalog['skills']
    if 'web' in skill['tags']
]

# Find skills by category
security_skills = catalog['categories']['security']
```

## Skill Composition Patterns

### 1. Layered Architecture Pattern

Build personas in layers from language to application:

```pcl
persona "FullStackWebDev" {
  skills = [
    # Language Layer
    "stdlib/languages/typescript-expert",

    # Framework Layer
    "stdlib/frameworks/react-expert",
    "stdlib/frameworks/nextjs-expert",
    "stdlib/frameworks/nodejs-expert",

    # Data Layer
    "stdlib/data/postgresql-expert",
    "stdlib/data/redis-expert",

    # Integration Layer
    "stdlib/integration/rest-api-expert",
    "stdlib/integration/graphql-expert",

    # Infrastructure Layer
    "stdlib/devops/docker-expert",
    "stdlib/cloud/aws-expert"
  ]
}
```

### 2. Domain-First Pattern

Start with domain expertise, add technical skills:

```pcl
persona "HealthcareDataEngineer" {
  skills = [
    # Domain Layer (Primary)
    "stdlib/domains/healthcare-expert",
    "stdlib/domains/hipaa-expert",

    # Technical Skills (Supporting)
    "stdlib/languages/python-expert",
    "stdlib/data/snowflake-expert",
    "stdlib/data/airflow-expert"
  ]
}
```

### 3. Microservice Specialist Pattern

Focus on a specific tech stack:

```pcl
persona "JavaMicroservicesDev" {
  skills = [
    "stdlib/languages/java-expert",
    "stdlib/frameworks/spring-boot-expert",
    "stdlib/devops/kubernetes-expert",
    "stdlib/devops/istio-expert",
    "stdlib/data/kafka-expert",
    "stdlib/integration/grpc-expert"
  ]
}
```

### 4. Security-First Pattern

Security expertise across the stack:

```pcl
persona "SecurityArchitect" {
  skills = [
    # Security Core
    "stdlib/security/zero-trust-expert",
    "stdlib/security/penetration-testing-expert",
    "stdlib/security/cryptography-expert",

    # Compliance
    "stdlib/security/gdpr-expert",
    "stdlib/security/soc2-expert",

    # Cloud Security
    "stdlib/cloud/aws-expert",
    "stdlib/devops/kubernetes-expert"
  ]

  governance {
    risk_classification = "critical"
    governance_level = "critical"
    separation_of_duties = true
  }
}
```

### 5. Polyglot Developer Pattern

Multiple language expertise:

```pcl
persona "PolyglotDev" {
  skills = [
    # Backend Languages
    "stdlib/languages/python-expert",
    "stdlib/languages/go-expert",
    "stdlib/languages/rust-expert",

    # Frontend
    "stdlib/languages/typescript-expert",
    "stdlib/frameworks/react-expert",

    # Systems
    "stdlib/languages/c-expert"
  ]
}
```

## Governance Integration

### Risk Classification

Skills contribute to persona risk level:

```pcl
persona "LowRiskDev" {
  skills = [
    "stdlib/languages/python-expert",
    "stdlib/frameworks/flask-expert"
  ]

  governance {
    risk_classification = "low"  # Read-only operations
  }
}

persona "HighRiskOps" {
  skills = [
    "stdlib/devops/kubernetes-expert",
    "stdlib/cloud/aws-expert",
    "stdlib/data/postgresql-expert"
  ]

  governance {
    risk_classification = "high"  # Infrastructure changes
    governance_level = "critical"
    audit_required = true
  }
}
```

### Governance Levels

| Level        | Skills Examples          | Audit Requirements               |
| ------------ | ------------------------ | -------------------------------- |
| **Standard** | Languages, frameworks    | Basic logging                    |
| **High**     | Data access, API changes | Detailed logging + approval      |
| **Critical** | Infrastructure, security | Full audit trail + dual approval |

### Compliance Frameworks

Map skills to compliance requirements:

```pcl
persona "GDPRCompliantDev" {
  skills = [
    "stdlib/languages/python-expert",
    "stdlib/data/postgresql-expert",
    "stdlib/security/gdpr-expert"
  ]

  compliance {
    frameworks = ["GDPR", "ISO 27001"]
    data_classification = ["pii", "confidential"]
    encryption_at_rest = true
    pii_masking = true
  }

  governance {
    track_pii_access = true
    data_lineage = true
  }
}
```

## Tool Permissions

### Understanding allowed-tools

Each skill declares allowed tools in YAML frontmatter:

```yaml
---
name: python-expert
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(python:*, pip:*, pytest:*)
---
```

### Persona Tool Allowlist

Combine tool permissions from all skills:

```pcl
persona "RestrictedDev" {
  skills = [
    "stdlib/languages/python-expert",
    "stdlib/data/postgresql-expert"
  ]

  constraints {
    # Union of all skill allowed-tools
    allowed_tools = [
      "Read",
      "Write",
      "Edit",
      "Bash(python:*, pip:*, psql:*)"
    ]

    # Additional restrictions
    prohibited_tools = [
      "Bash(rm:-rf:*)",
      "Bash(DROP:*)",
      "Bash(sudo:*)"
    ]
  }
}
```

### Tool Permission Patterns

Pattern matching for bash commands:

```pcl
# Allow specific commands
"Bash(npm:install:*)"     # npm install <anything>
"Bash(git:status)"        # git status only
"Bash(docker:ps:*)"       # docker ps with any flags

# Allow command families
"Bash(kubectl:*)"         # All kubectl commands
"Bash(terraform:*)"       # All terraform commands

# Prohibit dangerous operations
"Bash(rm:-rf:*)"          # No rm -rf
"Bash(DROP:*)"            # No SQL DROP
"Bash(chmod:777:*)"       # No chmod 777
```

### Production Safety Pattern

```pcl
persona "ProductionSafeDev" {
  skills = [
    "stdlib/devops/kubernetes-expert",
    "stdlib/cloud/aws-expert"
  ]

  constraints {
    allowed_tools = [
      "Read",
      "Bash(kubectl:get:*)",
      "Bash(kubectl:describe:*)",
      "Bash(kubectl:logs:*)",
      "Bash(aws:s3:ls:*)",
      "Bash(aws:ec2:describe-*)"
    ]

    prohibited_tools = [
      "Bash(kubectl:delete:*)",
      "Bash(kubectl:apply:*)",
      "Bash(aws:ec2:terminate-*)",
      "Bash(rm:*)",
      "Write"  # No file writes in production
    ]
  }

  governance {
    environment = "production"
    read_only = true
  }
}
```

## Performance Optimization

### Skill Loading Performance

```python
# Lazy loading (recommended for large personas)
persona = Persona.from_file("large-persona.pcl", lazy_load=True)

# Pre-load frequently used skills
persona = Persona.from_file("dev.pcl", preload=[
    "stdlib/languages/python-expert",
    "stdlib/frameworks/django-expert"
])

# Cache parsed skills
from pcl.cache import SkillCache
cache = SkillCache()
persona = Persona.from_file("dev.pcl", skill_cache=cache)
```

### Skill Subsetting

Load only needed sections:

```python
# Load only code examples (for reference)
skill = Skill.from_file(
    "stdlib/languages/python-expert.md",
    sections=["code_examples"]
)

# Load only best practices (for guidelines)
skill = Skill.from_file(
    "stdlib/security/zero-trust-expert.md",
    sections=["best_practices", "anti_patterns"]
)
```

### Memory Optimization

```pcl
# For memory-constrained environments
persona "LightweightDev" {
  skills = [
    "stdlib/languages/python-expert",
    "stdlib/frameworks/flask-expert"  # Lighter than Django
  ]

  optimization {
    skill_compression = true
    max_memory_mb = 512
    unload_unused_after = "10m"
  }
}
```

## Best Practices

### 1. Start Small, Scale Up

```pcl
# Bad: Loading everything
persona "OverloadedDev" {
  skills = [
    # 50+ skills loaded...
  ]
}

# Good: Start focused
persona "FocusedDev" {
  skills = [
    "stdlib/languages/python-expert",
    "stdlib/frameworks/django-expert",
    "stdlib/data/postgresql-expert"
  ]
}
```

### 2. Use Skill Catalog for Discovery

```bash
# Find skills by keyword
jq '.skills[] | select(.name | contains("web"))' \
  stdlib/catalog/skill-catalog.json

# Find skills by tag
jq '.skills[] | select(.tags[] | contains("api"))' \
  stdlib/catalog/skill-catalog.json

# Get all security skills
jq '.categories.security' stdlib/catalog/skill-catalog.json
```

### 3. Version Pin Critical Skills

```pcl
persona "StableProduction" {
  skills = [
    "stdlib/languages/python-expert@1.0.0",
    "stdlib/frameworks/django-expert@1.0.0"
  ]

  version_policy {
    allow_minor_updates = true
    allow_major_updates = false
  }
}
```

### 4. Document Skill Rationale

```pcl
persona "DocumentedDev" {
  description = "Full-stack web developer for e-commerce platform"

  skills = [
    # Frontend: React for SPA, TypeScript for type safety
    "stdlib/languages/typescript-expert",
    "stdlib/frameworks/react-expert",

    # Backend: Django for rapid development, PostgreSQL for relational data
    "stdlib/languages/python-expert",
    "stdlib/frameworks/django-expert",
    "stdlib/data/postgresql-expert",

    # DevOps: Docker for containers, AWS for hosting
    "stdlib/devops/docker-expert",
    "stdlib/cloud/aws-expert"
  ]
}
```

### 5. Test Persona Capabilities

```python
import pytest
from pcl import Persona

def test_persona_has_required_skills():
    persona = Persona.from_file("developer.pcl")

    assert "python-expert" in persona.loaded_skills
    assert "django-expert" in persona.loaded_skills

def test_persona_tool_permissions():
    persona = Persona.from_file("developer.pcl")

    assert persona.can_use_tool("Read")
    assert persona.can_use_tool("Bash(python:*)")
    assert not persona.can_use_tool("Bash(rm:-rf:*)")
```

### 6. Implement Governance Guards

```pcl
persona "GuardedDev" {
  skills = [
    "stdlib/cloud/aws-expert",
    "stdlib/devops/kubernetes-expert"
  ]

  governance {
    risk_classification = "high"

    pre_execution_checks = [
      "verify_environment",
      "check_resource_limits",
      "validate_permissions"
    ]

    post_execution_audit = [
      "log_all_changes",
      "notify_security_team",
      "create_audit_trail"
    ]
  }
}
```

## Troubleshooting

### Skill Not Found

```
Error: Skill 'stdlib/languages/python-expert' not found
```

**Solution:**

1. Check path is correct relative to PCL installation
2. Verify file exists: `ls stdlib/languages/python-expert.md`
3. Use catalog to find correct path:
   ```bash
   jq '.skills[] | select(.name | contains("python"))' \
     stdlib/catalog/skill-catalog.json
   ```

### Invalid YAML Frontmatter

```
Error: Invalid YAML in skill 'custom-expert.md'
```

**Solution:**

1. Validate YAML syntax: `python scripts/validate-skills.py`
2. Check required fields exist:
   ```yaml
   ---
   name: my-expert
   version: 1.0.0
   description: My custom skill
   category: custom
   tags: []
   allowed-tools: []
   ---
   ```

### Tool Permission Denied

```
Error: Tool 'Bash(kubectl:delete:*)' not allowed for persona
```

**Solution:**

1. Check skill allowed-tools in YAML frontmatter
2. Add tool to persona constraints:
   ```pcl
   constraints {
     allowed_tools = [
       "Bash(kubectl:delete:*)"
     ]
   }
   ```
3. Verify governance level permits this tool

### Memory Issues with Large Personas

```
Error: Out of memory loading 50 skills
```

**Solution:**

1. Enable lazy loading:
   ```python
   persona = Persona.from_file("large.pcl", lazy_load=True)
   ```
2. Reduce skill count
3. Use skill subsetting to load only needed sections

### Conflicting Tool Permissions

```
Warning: Skill A allows 'Write', Skill B prohibits 'Write'
```

**Solution:**

1. Explicit override in persona:
   ```pcl
   constraints {
     allowed_tools = ["Write"]  # Explicitly allow
     # or
     prohibited_tools = ["Write"]  # Explicitly prohibit
   }
   ```
2. Remove conflicting skill
3. Create custom skill variant with consistent permissions

## Next Steps

- Read the [Persona Building Guide](PERSONA_BUILDING_GUIDE.md) for advanced composition strategies
- Review [Governance Model](GOVERNANCE_MODEL.md) for compliance integration
- Explore [Example Personas](../examples/personas/) for real-world patterns
- Browse [Skill Catalog](../stdlib/catalog/README.md) for available skills

## Support

- Issues: <https://github.com/your-org/pcl/issues>
- Discussions: <https://github.com/your-org/pcl/discussions>
- Documentation: <https://pcl.dev/docs>
