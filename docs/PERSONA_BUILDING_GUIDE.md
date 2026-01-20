# Persona Building Guide

**PCL Standard Library v2.0.0**

Comprehensive guide for designing, building, and optimizing AI personas using the PCL Standard Library's 173 expert skills.

## Table of Contents

1. [Persona Design Philosophy](#persona-design-philosophy)
2. [Skill Selection Strategies](#skill-selection-strategies)
3. [Common Persona Archetypes](#common-persona-archetypes)
4. [Advanced Composition Patterns](#advanced-composition-patterns)
5. [Governance Configuration](#governance-configuration)
6. [Testing and Validation](#testing-and-validation)
7. [Evolution and Maintenance](#evolution-and-maintenance)
8. [Real-World Examples](#real-world-examples)

## Persona Design Philosophy

### What Makes a Good Persona?

A well-designed persona is:

1. **Focused**: Clear purpose with cohesive skill set
2. **Governed**: Appropriate risk controls and audit trails
3. **Practical**: Skills match real-world tasks
4. **Maintainable**: Easy to update and evolve
5. **Secure**: Principle of least privilege enforced

### The Skill Selection Framework

```
┌─────────────────────────────────────────────┐
│         Define Use Case & Requirements      │
│  - What tasks will this persona perform?    │
│  - What domain knowledge is needed?         │
│  - What tools are required?                 │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         Identify Core Skills (3-5)          │
│  - Primary language(s)                      │
│  - Main framework(s)                        │
│  - Key domain expertise                     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│       Add Supporting Skills (5-10)          │
│  - Data layer                               │
│  - Integration patterns                     │
│  - Infrastructure tools                     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│    Configure Governance & Constraints       │
│  - Risk classification                      │
│  - Tool permissions                         │
│  - Compliance requirements                  │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         Test & Refine                       │
│  - Validate capabilities                    │
│  - Remove redundant skills                  │
│  - Optimize for performance                 │
└─────────────────────────────────────────────┘
```

## Skill Selection Strategies

### Strategy 1: Bottom-Up (Task-Driven)

Start with specific tasks, identify needed skills:

```pcl
// Task: "Build a REST API for user authentication"

persona "AuthAPIBuilder" {
  // 1. Language for implementation
  skills = ["stdlib/languages/python-expert"]

  // 2. Framework for API
  + ["stdlib/frameworks/django-expert"]

  // 3. Database for users
  + ["stdlib/data/postgresql-expert"]

  // 4. API patterns
  + ["stdlib/integration/rest-api-expert"]

  // 5. Security
  + ["stdlib/security/cryptography-expert"]
}
```

### Strategy 2: Top-Down (Architecture-Driven)

Start with architecture, add layers:

```pcl
// Architecture: Microservices on Kubernetes

persona "MicroservicesArchitect" {
  skills = [
    // Application Layer
    "stdlib/languages/go-expert",
    "stdlib/frameworks/gin-expert",

    // Data Layer
    "stdlib/data/postgresql-expert",
    "stdlib/data/redis-expert",

    // Messaging Layer
    "stdlib/data/kafka-expert",

    // Orchestration Layer
    "stdlib/devops/kubernetes-expert",
    "stdlib/devops/helm-expert",

    // Service Mesh
    "stdlib/devops/istio-expert",

    // Observability
    "stdlib/devops/prometheus-expert",
    "stdlib/devops/grafana-expert"
  ]
}
```

### Strategy 3: Domain-First

Start with domain, add technical skills:

```pcl
// Domain: Healthcare data processing

persona "HealthcareDataProcessor" {
  skills = [
    // Domain Expertise (PRIMARY)
    "stdlib/domains/healthcare-expert",
    "stdlib/security/hipaa-expert",

    // Technical Implementation (SECONDARY)
    "stdlib/languages/python-expert",
    "stdlib/data/snowflake-expert",
    "stdlib/data/airflow-expert",

    // Security & Compliance
    "stdlib/security/gdpr-expert",
    "stdlib/security/soc2-expert"
  ]

  governance {
    risk_classification = "critical"
    compliance_required = ["HIPAA", "GDPR", "SOC 2"]
  }
}
```

### Strategy 4: Role-Based

Match skills to job roles:

```pcl
// Role: DevOps Engineer

persona "DevOpsEngineer" {
  skills = [
    // Core DevOps Skills
    "stdlib/devops/kubernetes-expert",
    "stdlib/devops/docker-expert",
    "stdlib/devops/terraform-expert",
    "stdlib/devops/ansible-expert",

    // Cloud Platforms
    "stdlib/cloud/aws-expert",

    // CI/CD
    "stdlib/devops/github-actions-expert",
    "stdlib/devops/argocd-expert",

    // Monitoring
    "stdlib/devops/prometheus-expert",
    "stdlib/devops/grafana-expert",

    // Scripting
    "stdlib/languages/python-expert",
    "stdlib/languages/bash-expert"
  ]
}
```

## Common Persona Archetypes

### 1. Full-Stack Web Developer

**Skills**: 15-25 | **Risk**: Medium | **Complexity**: High

```pcl
persona "FullStackWebDev" {
  version = "1.0.0"
  description = "Modern full-stack web application developer"

  skills = [
    // Frontend
    "stdlib/languages/typescript-expert",
    "stdlib/frameworks/react-expert",
    "stdlib/frameworks/nextjs-expert",
    "stdlib/specialized/tailwind-expert",

    // Backend
    "stdlib/languages/nodejs-expert",
    "stdlib/frameworks/express-expert",

    // Database
    "stdlib/data/postgresql-expert",
    "stdlib/data/redis-expert",

    // API
    "stdlib/integration/rest-api-expert",
    "stdlib/integration/graphql-expert",

    // DevOps
    "stdlib/devops/docker-expert",
    "stdlib/cloud/aws-expert",

    // Tools
    "stdlib/devops/git-expert",
    "stdlib/qa/jest-expert",
    "stdlib/qa/playwright-expert"
  ]

  governance {
    risk_classification = "medium"
    governance_level = "high"
    audit_required = true
  }

  constraints {
    allowed_tools = [
      "Read", "Write", "Edit",
      "Bash(npm:*, node:*, git:*, docker:*)"
    ]
  }
}
```

### 2. Data Engineer

**Skills**: 20-30 | **Risk**: High | **Complexity**: Very High

```pcl
persona "DataPlatformEngineer" {
  version = "1.0.0"
  description = "Data platform and pipeline engineer"

  skills = [
    // Languages
    "stdlib/languages/python-expert",
    "stdlib/languages/sql-expert",

    // Data Warehousing
    "stdlib/data/snowflake-expert",
    "stdlib/data/databricks-expert",

    // Data Processing
    "stdlib/data/apache-spark-expert",
    "stdlib/data/airflow-expert",
    "stdlib/data/dbt-expert",

    // Streaming
    "stdlib/data/kafka-expert",

    // Storage
    "stdlib/data/postgresql-expert",
    "stdlib/data/mongodb-expert",

    // Cloud
    "stdlib/cloud/aws-expert",

    // Analytics
    "stdlib/data/looker-expert",

    // Orchestration
    "stdlib/devops/kubernetes-expert"
  ]

  governance {
    risk_classification = "high"
    governance_level = "critical"
    data_lineage = true
    track_pii_access = true
  }

  compliance {
    frameworks = ["GDPR", "SOC 2", "ISO 27001"]
    data_classification = ["pii", "confidential", "internal"]
    encryption_at_rest = true
  }
}
```

### 3. Security Engineer

**Skills**: 15-20 | **Risk**: Critical | **Complexity**: High

```pcl
persona "SecurityEngineer" {
  version = "1.0.0"
  description = "Application and infrastructure security specialist"

  skills = [
    // Core Security
    "stdlib/security/penetration-testing-expert",
    "stdlib/security/zero-trust-expert",
    "stdlib/security/cryptography-expert",

    // Compliance
    "stdlib/security/gdpr-expert",
    "stdlib/security/soc2-expert",
    "stdlib/security/incident-response-expert",

    // Cloud Security
    "stdlib/cloud/aws-expert",
    "stdlib/devops/kubernetes-expert",

    // Languages (for security review)
    "stdlib/languages/python-expert",
    "stdlib/languages/go-expert",

    // Tools
    "stdlib/devops/terraform-expert"
  ]

  governance {
    risk_classification = "critical"
    governance_level = "critical"
    separation_of_duties = true
    dual_authorization = true
  }

  constraints {
    allowed_tools = [
      "Read",
      "Bash(nmap:*, burp:*, metasploit:*)"
    ]
    prohibited_tools = [
      "Write",  // No modifications in production
      "Bash(rm:*)",
      "Bash(DROP:*)"
    ]
  }
}
```

### 4. Mobile Developer

**Skills**: 12-18 | **Risk**: Medium | **Complexity**: Medium

```pcl
persona "MobileDeveloper" {
  version = "1.0.0"
  description = "Cross-platform mobile application developer"

  skills = [
    // Language
    "stdlib/languages/typescript-expert",

    // Framework
    "stdlib/frameworks/react-native-expert",
    // OR: "stdlib/frameworks/flutter-expert" + "stdlib/languages/dart-expert"

    // Backend Integration
    "stdlib/integration/rest-api-expert",
    "stdlib/integration/graphql-expert",

    // State Management
    "stdlib/frameworks/react-expert",

    // Testing
    "stdlib/qa/jest-expert",
    "stdlib/qa/playwright-expert",

    // DevOps
    "stdlib/devops/git-expert"
  ]

  governance {
    risk_classification = "medium"
    governance_level = "standard"
  }
}
```

### 5. Cloud Architect

**Skills**: 18-25 | **Risk**: Critical | **Complexity**: Very High

```pcl
persona "CloudArchitect" {
  version = "1.0.0"
  description = "Multi-cloud infrastructure architect"

  skills = [
    // Cloud Platforms
    "stdlib/cloud/aws-expert",
    "stdlib/cloud/azure-expert",
    "stdlib/cloud/gcp-expert",

    // Infrastructure as Code
    "stdlib/devops/terraform-expert",
    "stdlib/infrastructure/ansible-expert",

    // Container Orchestration
    "stdlib/devops/kubernetes-expert",
    "stdlib/devops/helm-expert",
    "stdlib/devops/istio-expert",

    // Monitoring
    "stdlib/devops/prometheus-expert",
    "stdlib/devops/grafana-expert",

    // Security
    "stdlib/security/zero-trust-expert",

    // Networking
    "stdlib/specialized/networking-expert"
  ]

  governance {
    risk_classification = "critical"
    governance_level = "critical"
    audit_required = true
    approval_required = true
  }

  constraints {
    allowed_tools = [
      "Read",
      "Bash(terraform:plan:*)",
      "Bash(kubectl:get:*)",
      "Bash(aws:*:describe-*)"
    ]
    prohibited_tools = [
      "Bash(terraform:apply:*)",  // Requires manual approval
      "Bash(kubectl:delete:*)",
      "Bash(aws:ec2:terminate-*)"
    ]
  }
}
```

### 6. Machine Learning Engineer

**Skills**: 15-22 | **Risk**: High | **Complexity**: Very High

```pcl
persona "MLEngineer" {
  version = "1.0.0"
  description = "Machine learning model development and deployment"

  skills = [
    // Languages
    "stdlib/languages/python-expert",

    // ML Frameworks
    "stdlib/specialized/machine-learning-expert",
    "stdlib/specialized/deep-learning-expert",

    // Data Processing
    "stdlib/data/apache-spark-expert",
    "stdlib/languages/sql-expert",

    // Data Storage
    "stdlib/data/postgresql-expert",
    "stdlib/data/mongodb-expert",

    // Cloud ML
    "stdlib/cloud/aws-expert",  // SageMaker
    "stdlib/cloud/gcp-expert",  // Vertex AI

    // MLOps
    "stdlib/devops/docker-expert",
    "stdlib/devops/kubernetes-expert",

    // Experimentation
    "stdlib/qa/load-testing-expert"
  ]

  governance {
    risk_classification = "high"
    track_model_versions = true
    track_data_lineage = true
  }
}
```

## Advanced Composition Patterns

### Pattern 1: Capability Matrices

Define skills in capability groups:

```pcl
persona "EnterpriseArchitect" {
  capabilities {
    backend = [
      "stdlib/languages/java-expert",
      "stdlib/frameworks/spring-boot-expert"
    ]

    frontend = [
      "stdlib/languages/typescript-expert",
      "stdlib/frameworks/react-expert"
    ]

    data = [
      "stdlib/data/postgresql-expert",
      "stdlib/data/kafka-expert"
    ]

    infrastructure = [
      "stdlib/devops/kubernetes-expert",
      "stdlib/cloud/aws-expert"
    ]

    security = [
      "stdlib/security/zero-trust-expert",
      "stdlib/security/soc2-expert"
    ]
  }

  // Flatten all capabilities into skills array
  skills = flatten([
    capabilities.backend,
    capabilities.frontend,
    capabilities.data,
    capabilities.infrastructure,
    capabilities.security
  ])
}
```

### Pattern 2: Conditional Skill Loading

Load skills based on project context:

```pcl
persona "AdaptiveDeveloper" {
  project_type = var.project_type  // "web", "mobile", "backend"

  skills = concat(
    // Core skills always loaded
    [
      "stdlib/languages/typescript-expert",
      "stdlib/devops/git-expert"
    ],

    // Conditional skills
    project_type == "web" ? [
      "stdlib/frameworks/react-expert",
      "stdlib/frameworks/nextjs-expert"
    ] : [],

    project_type == "mobile" ? [
      "stdlib/frameworks/react-native-expert"
    ] : [],

    project_type == "backend" ? [
      "stdlib/frameworks/express-expert",
      "stdlib/data/postgresql-expert"
    ] : []
  )
}
```

### Pattern 3: Skill Inheritance

Create base personas and extend:

```pcl
// Base persona
persona "BaseDeveloper" {
  skills = [
    "stdlib/devops/git-expert",
    "stdlib/qa/jest-expert"
  ]

  governance {
    audit_required = true
  }
}

// Extended persona
persona "JavascriptDeveloper" extends "BaseDeveloper" {
  skills = base.skills + [
    "stdlib/languages/typescript-expert",
    "stdlib/frameworks/react-expert",
    "stdlib/frameworks/nodejs-expert"
  ]
}

// Further extension
persona "FullStackJSDeveloper" extends "JavascriptDeveloper" {
  skills = base.skills + [
    "stdlib/data/postgresql-expert",
    "stdlib/integration/rest-api-expert",
    "stdlib/devops/docker-expert"
  ]
}
```

### Pattern 4: Skill Groups (Presets)

Define reusable skill combinations:

```pcl
// Define skill groups
skill_groups {
  "modern_web_stack" = [
    "stdlib/languages/typescript-expert",
    "stdlib/frameworks/react-expert",
    "stdlib/frameworks/nextjs-expert",
    "stdlib/specialized/tailwind-expert"
  ]

  "python_data_stack" = [
    "stdlib/languages/python-expert",
    "stdlib/data/pandas-expert",
    "stdlib/data/apache-spark-expert"
  ]

  "cloud_native_stack" = [
    "stdlib/devops/kubernetes-expert",
    "stdlib/devops/docker-expert",
    "stdlib/devops/helm-expert"
  ]
}

// Use in personas
persona "ModernWebDev" {
  skills = concat(
    skill_groups.modern_web_stack,
    skill_groups.cloud_native_stack,
    [
      "stdlib/data/postgresql-expert",
      "stdlib/cloud/aws-expert"
    ]
  )
}
```

## Governance Configuration

### Risk Classification Matrix

| Classification | Skill Examples              | Use Cases               | Controls                         |
| -------------- | --------------------------- | ----------------------- | -------------------------------- |
| **Low**        | Languages, basic frameworks | Learning, prototyping   | Basic logging                    |
| **Medium**     | Web frameworks, APIs        | Application development | Approval for deployments         |
| **High**       | Database, cloud infra       | Production systems      | Dual approval, detailed audit    |
| **Critical**   | Security, compliance        | Financial, healthcare   | Separation of duties, full audit |

### Governance Patterns

**Pattern 1: Development Environment**

```pcl
persona "DevEnvironmentDev" {
  skills = [/* ... */]

  governance {
    risk_classification = "low"
    governance_level = "standard"
    environment = "development"
  }

  constraints {
    allowed_tools = ["Read", "Write", "Edit", "Bash(*)"]
  }
}
```

**Pattern 2: Staging Environment**

```pcl
persona "StagingDev" {
  skills = [/* ... */]

  governance {
    risk_classification = "medium"
    governance_level = "high"
    environment = "staging"
    audit_required = true
  }

  constraints {
    allowed_tools = [
      "Read", "Write", "Edit",
      "Bash(npm:*, docker:*)"
    ]
    prohibited_tools = [
      "Bash(rm:-rf:*)",
      "Bash(DROP:*)"
    ]
  }
}
```

**Pattern 3: Production Environment**

```pcl
persona "ProductionOps" {
  skills = [/* ... */]

  governance {
    risk_classification = "critical"
    governance_level = "critical"
    environment = "production"
    audit_required = true
    approval_required = true
    separation_of_duties = true
  }

  constraints {
    allowed_tools = [
      "Read",
      "Bash(kubectl:get:*)",
      "Bash(kubectl:logs:*)"
    ]
    prohibited_tools = [
      "Write",
      "Bash(kubectl:delete:*)",
      "Bash(terraform:apply:*)"
    ]
  }
}
```

## Testing and Validation

### Skill Coverage Testing

```python
import pytest
from pcl import Persona

def test_persona_has_backend_skills():
    persona = Persona.from_file("fullstack-dev.pcl")

    # Verify language skills
    assert "python-expert" in persona.loaded_skills or \
           "nodejs-expert" in persona.loaded_skills

    # Verify framework
    assert any(
        skill in persona.loaded_skills
        for skill in ["django-expert", "express-expert", "spring-boot-expert"]
    )

    # Verify database
    assert any(
        skill in persona.loaded_skills
        for skill in ["postgresql-expert", "mongodb-expert", "mysql-expert"]
    )

def test_persona_tool_permissions():
    persona = Persona.from_file("production-ops.pcl")

    # Should have read permissions
    assert persona.can_use_tool("Read")

    # Should NOT have write in production
    assert not persona.can_use_tool("Write")

    # Should NOT have destructive commands
    assert not persona.can_use_tool("Bash(rm:-rf:*)")
    assert not persona.can_use_tool("Bash(kubectl:delete:*)")
```

### Capability Testing

```python
def test_persona_can_handle_task():
    persona = Persona.from_file("web-dev.pcl")

    # Test capability
    response = persona.query("Create a React component with TypeScript")

    assert "typescript" in response.lower()
    assert "react" in response.lower()
    assert response.contains_code_block()

def test_persona_respects_constraints():
    persona = Persona.from_file("restricted-dev.pcl")

    # Should reject prohibited operations
    with pytest.raises(PermissionError):
        persona.execute("Bash(rm -rf /)")
```

## Evolution and Maintenance

### Version Management

```pcl
persona "VersionedDev" {
  version = "2.1.0"  // Persona version

  changelog = """
  ## 2.1.0
  - Added: Next.js 14 support
  - Updated: React 18 patterns
  - Removed: Legacy class components

  ## 2.0.0
  - Migrated from JavaScript to TypeScript
  - Added: Testing with Playwright

  ## 1.0.0
  - Initial release
  """

  skills = [
    "stdlib/languages/typescript-expert@1.0.0",
    "stdlib/frameworks/react-expert@1.2.0",
    "stdlib/frameworks/nextjs-expert@1.1.0"
  ]
}
```

### Deprecation Strategy

```pcl
persona "ModernDev" {
  skills = [
    "stdlib/languages/typescript-expert",
    "stdlib/frameworks/react-expert"
  ]

  deprecated_skills = [
    "stdlib/languages/coffeescript-expert",  // Removed in v2.0.0
    "stdlib/frameworks/angular-js-expert"    // Use angular-expert instead
  ]

  migration_notes = """
  Migrating from v1.x:
  - Replace AngularJS with Angular
  - Update all ES5 to TypeScript
  - Replace Webpack with Vite
  """
}
```

### Monitoring and Analytics

```pcl
persona "AnalyzedDev" {
  skills = [/* ... */]

  analytics {
    track_skill_usage = true
    track_tool_usage = true
    track_performance = true
  }

  reporting {
    daily_summary = true
    weekly_report = true
    alert_on_errors = true
  }
}
```

## Real-World Examples

See the [examples/personas/](../examples/personas/) directory for complete, production-ready persona definitions:

- **fullstack-developer.pcl** - 21 skills, medium risk, web application development
- **data-platform-engineer.pcl** - 25 skills, high risk, data pipeline engineering
- **cloud-security-architect.pcl** - 24 skills, critical risk, multi-cloud security

Each example includes:

- Complete skill composition
- Governance configuration
- Tool permissions
- Compliance alignment
- Capabilities matrix
- Risk assessment

## Best Practices Checklist

- [ ] Persona has clear, focused purpose
- [ ] Skills are cohesive and non-redundant
- [ ] Risk classification matches capabilities
- [ ] Tool permissions follow least privilege
- [ ] Governance level appropriate for use case
- [ ] Compliance frameworks identified
- [ ] Version pinning for critical dependencies
- [ ] Tests validate required capabilities
- [ ] Documentation includes rationale
- [ ] Evolution strategy defined

## Next Steps

- Review [Skills Integration Guide](SKILLS_INTEGRATION_GUIDE.md) for loading and usage
- Read [Governance Model](GOVERNANCE_MODEL.md) for compliance details
- Explore [Skill Catalog](../stdlib/catalog/README.md) to discover available skills
- Study [Example Personas](../examples/personas/) for patterns

## Support

- Issues: <https://github.com/your-org/pcl/issues>
- Discussions: <https://github.com/your-org/pcl/discussions>
- Documentation: <https://pcl.dev/docs>
