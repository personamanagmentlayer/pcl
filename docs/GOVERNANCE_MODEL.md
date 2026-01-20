# Governance Model for PCL Skills

**PCL Standard Library v2.0.0**

Comprehensive governance framework for AI personas using the PCL Standard Library, ensuring security, compliance, and auditability.

## Table of Contents

1. [Governance Overview](#governance-overview)
2. [Risk Classification Framework](#risk-classification-framework)
3. [Governance Levels](#governance-levels)
4. [Compliance Integration](#compliance-integration)
5. [Tool Permission Model](#tool-permission-model)
6. [Audit and Monitoring](#audit-and-monitoring)
7. [Data Governance](#data-governance)
8. [Separation of Duties](#separation-of-duties)
9. [Implementation Guidelines](#implementation-guidelines)

## Governance Overview

### Why Governance Matters

AI personas with expert capabilities require robust governance to:

- **Prevent unauthorized actions** - Ensure personas only perform permitted operations
- **Meet compliance requirements** - Align with ISO 42001, GDPR, SOC 2, HIPAA, etc.
- **Enable audit trails** - Track all persona actions for security and compliance
- **Manage risk** - Classify and control based on potential impact
- **Enforce separation of duties** - Prevent single-persona execution of critical workflows

### Governance Principles

1. **Least Privilege**: Personas receive minimum permissions needed
2. **Defense in Depth**: Multiple layers of controls
3. **Zero Trust**: Verify every action, assume breach
4. **Transparency**: All actions logged and auditable
5. **Accountability**: Clear ownership and responsibility

### Governance Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Persona Definition                    │
│  - Skills (capabilities)                                 │
│  - Constraints (tool permissions)                        │
│  - Governance configuration                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Pre-Execution Validation                    │
│  1. Check risk classification                            │
│  2. Verify tool permissions                              │
│  3. Validate compliance requirements                     │
│  4. Check approval status (if required)                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 Runtime Monitoring                       │
│  - Log all tool invocations                              │
│  - Track data access (PII, sensitive)                    │
│  - Monitor resource usage                                │
│  - Enforce timeout limits                                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Post-Execution Audit                        │
│  - Record outcomes                                       │
│  - Generate audit trail                                  │
│  - Update compliance logs                                │
│  - Notify stakeholders (if required)                     │
└─────────────────────────────────────────────────────────┘
```

## Risk Classification Framework

### Risk Levels

| Level        | Impact                      | Examples                          | Controls                         |
| ------------ | --------------------------- | --------------------------------- | -------------------------------- |
| **Low**      | Minimal business impact     | Read-only queries, documentation  | Basic logging                    |
| **Medium**   | Limited business impact     | Application code changes, testing | Approval for deployments         |
| **High**     | Significant business impact | Database changes, infrastructure  | Dual approval, detailed audit    |
| **Critical** | Severe business impact      | Production changes, security      | Separation of duties, full audit |

### Risk Assessment Matrix

**Skill-Based Risk Scoring:**

```python
def calculate_persona_risk(skills):
    risk_scores = {
        'languages/*': 1,         # Low risk - just knowledge
        'frameworks/*': 2,        # Low-medium risk
        'data/*': 3,              # Medium-high risk - data access
        'devops/*': 4,            # High risk - infrastructure
        'cloud/*': 4,             # High risk - cloud resources
        'security/*': 5,          # Critical risk - security operations
    }

    total_score = sum(risk_scores.get(skill.category, 1) for skill in skills)

    if total_score < 10:
        return 'low'
    elif total_score < 25:
        return 'medium'
    elif total_score < 40:
        return 'high'
    else:
        return 'critical'
```

### Risk Classification Examples

**Low Risk Persona:**

```pcl
persona "DocumentationWriter" {
  skills = [
    "stdlib/specialized/technical-writing-expert"
  ]

  governance {
    risk_classification = "low"
    governance_level = "standard"
  }

  constraints {
    allowed_tools = ["Read"]
    prohibited_tools = ["Write", "Edit", "Bash(*)"]
  }
}
```

**Medium Risk Persona:**

```pcl
persona "WebDeveloper" {
  skills = [
    "stdlib/languages/typescript-expert",
    "stdlib/frameworks/react-expert",
    "stdlib/devops/git-expert"
  ]

  governance {
    risk_classification = "medium"
    governance_level = "high"
    audit_required = true
  }

  constraints {
    allowed_tools = [
      "Read", "Write", "Edit",
      "Bash(npm:*, git:*)"
    ]
  }
}
```

**High Risk Persona:**

```pcl
persona "DatabaseAdministrator" {
  skills = [
    "stdlib/data/postgresql-expert",
    "stdlib/data/mongodb-expert",
    "stdlib/languages/sql-expert"
  ]

  governance {
    risk_classification = "high"
    governance_level = "critical"
    audit_required = true
    approval_required = true
    data_lineage = true
  }

  constraints {
    allowed_tools = [
      "Read",
      "Bash(psql:SELECT:*)",
      "Bash(psql:EXPLAIN:*)"
    ]
    prohibited_tools = [
      "Write",
      "Bash(psql:DROP:*)",
      "Bash(psql:DELETE:*)",
      "Bash(psql:TRUNCATE:*)"
    ]
  }
}
```

**Critical Risk Persona:**

```pcl
persona "ProductionInfrastructureOps" {
  skills = [
    "stdlib/cloud/aws-expert",
    "stdlib/devops/kubernetes-expert",
    "stdlib/security/zero-trust-expert"
  ]

  governance {
    risk_classification = "critical"
    governance_level = "critical"
    audit_required = true
    approval_required = true
    separation_of_duties = true
    dual_authorization = true
    environment = "production"
  }

  constraints {
    allowed_tools = [
      "Read",
      "Bash(kubectl:get:*)",
      "Bash(kubectl:describe:*)",
      "Bash(aws:*:describe-*)"
    ]
    prohibited_tools = [
      "Write",
      "Bash(kubectl:delete:*)",
      "Bash(kubectl:apply:*)",
      "Bash(terraform:apply:*)"
    ]
  }
}
```

## Governance Levels

### Level Definitions

**Standard Governance:**

- Basic activity logging
- Standard approval workflows
- Weekly audit reviews

**High Governance:**

- Detailed activity logging
- Manager approval required
- Daily audit reviews
- Compliance reporting

**Critical Governance:**

- Full audit trail (every action)
- Dual authorization required
- Real-time monitoring
- Immediate compliance reporting
- Separation of duties enforced

### Governance Level Configuration

```pcl
persona "HighGovernanceDev" {
  governance {
    governance_level = "high"

    audit {
      log_all_actions = true
      log_retention_days = 365
      audit_format = "json"
      audit_destination = "s3://audit-logs/personas/"
    }

    approval {
      required = true
      approvers = ["manager@company.com", "lead@company.com"]
      approval_timeout = "4h"
    }

    monitoring {
      real_time = true
      alert_on_errors = true
      alert_recipients = ["security@company.com"]
    }

    compliance {
      frameworks = ["SOC 2", "ISO 27001"]
      report_frequency = "daily"
    }
  }
}
```

## Compliance Integration

### Supported Frameworks

- **ISO 42001**: AI Management System
- **ISO 27001**: Information Security
- **GDPR**: EU Data Protection
- **SOC 2**: Service Organization Controls
- **HIPAA**: Healthcare Privacy
- **PCI DSS**: Payment Card Security
- **NIST CSF**: Cybersecurity Framework
- **CCPA**: California Consumer Privacy

### Compliance Mapping

**GDPR Compliance:**

```pcl
persona "GDPRCompliantDataProcessor" {
  skills = [
    "stdlib/languages/python-expert",
    "stdlib/data/postgresql-expert",
    "stdlib/security/gdpr-expert"
  ]

  compliance {
    frameworks = ["GDPR", "ISO 27001"]

    data_protection {
      data_classification = ["pii", "sensitive", "confidential"]
      encryption_at_rest = true
      encryption_in_transit = true
      pseudonymization = true
      anonymization = true
    }

    privacy {
      right_to_access = true
      right_to_erasure = true
      right_to_portability = true
      consent_management = true
    }

    security {
      data_breach_notification = true
      data_protection_impact_assessment = true
      data_protection_officer = "dpo@company.com"
    }
  }

  governance {
    track_pii_access = true
    pii_access_log = "s3://compliance-logs/pii-access/"
    data_lineage = true
  }
}
```

**SOC 2 Compliance:**

```pcl
persona "SOC2CompliantDev" {
  skills = [
    "stdlib/cloud/aws-expert",
    "stdlib/devops/kubernetes-expert",
    "stdlib/security/soc2-expert"
  ]

  compliance {
    frameworks = ["SOC 2 Type II"]

    trust_services_criteria {
      security = {
        logical_access_controls = true
        multi_factor_authentication = true
        encryption = true
      }

      availability = {
        monitoring = true
        incident_response = true
        disaster_recovery = true
      }

      confidentiality = {
        data_classification = true
        access_controls = true
        encryption = true
      }

      processing_integrity = {
        data_validation = true
        error_handling = true
        quality_monitoring = true
      }
    }
  }

  governance {
    audit_required = true
    audit_format = "soc2"
    change_management = true
    risk_assessment = true
  }
}
```

**HIPAA Compliance:**

```pcl
persona "HIPAACompliantHealthcareApp" {
  skills = [
    "stdlib/domains/healthcare-expert",
    "stdlib/security/hipaa-expert",
    "stdlib/data/postgresql-expert"
  ]

  compliance {
    frameworks = ["HIPAA", "HITECH"]

    administrative_safeguards = {
      security_management_process = true
      workforce_security = true
      information_access_management = true
      security_awareness_training = true
    }

    physical_safeguards = {
      facility_access_controls = true
      workstation_security = true
      device_controls = true
    }

    technical_safeguards = {
      access_control = true
      audit_controls = true
      integrity_controls = true
      transmission_security = true
    }

    phi_protection = {
      encryption = true
      minimum_necessary = true
      de_identification = true
      business_associate_agreements = true
    }
  }

  governance {
    risk_classification = "critical"
    track_phi_access = true
    breach_notification = true
    audit_retention_years = 6
  }
}
```

## Tool Permission Model

### Permission Syntax

**Basic Permissions:**

```pcl
constraints {
  allowed_tools = [
    "Read",           // Read any file
    "Write",          // Write any file
    "Edit",           // Edit any file
    "Bash(*)"         // Any bash command
  ]
}
```

**Pattern Matching:**

```pcl
constraints {
  allowed_tools = [
    "Bash(npm:install:*)",        // npm install <anything>
    "Bash(git:status)",           // git status only
    "Bash(docker:ps:*)",          // docker ps with any flags
    "Bash(kubectl:get:pods:*)",   // kubectl get pods with options
  ]
}
```

**Wildcards and Negation:**

```pcl
constraints {
  allowed_tools = [
    "Bash(kubectl:*)",           // All kubectl commands
    "!Bash(kubectl:delete:*)"    // EXCEPT delete
  ]
}
```

### Permission Hierarchies

**Development Environment:**

```pcl
constraints {
  allowed_tools = [
    "Read", "Write", "Edit",
    "Bash(npm:*)",
    "Bash(git:*)",
    "Bash(docker:*)",
    "Bash(pytest:*)"
  ]
  prohibited_tools = [
    "Bash(rm:-rf:/*)"
  ]
}
```

**Staging Environment:**

```pcl
constraints {
  allowed_tools = [
    "Read", "Edit",
    "Bash(npm:install:*)",
    "Bash(npm:test:*)",
    "Bash(git:status)",
    "Bash(docker:ps:*)"
  ]
  prohibited_tools = [
    "Write",  // Approved deployments only
    "Bash(rm:*)",
    "Bash(kubectl:delete:*)"
  ]
}
```

**Production Environment:**

```pcl
constraints {
  allowed_tools = [
    "Read",
    "Bash(kubectl:get:*)",
    "Bash(kubectl:logs:*)",
    "Bash(kubectl:describe:*)"
  ]
  prohibited_tools = [
    "Write",
    "Edit",
    "Bash(kubectl:delete:*)",
    "Bash(kubectl:apply:*)",
    "Bash(terraform:*)"
  ]
}
```

### Permission Enforcement

```python
class PermissionEnforcer:
    def check_tool_permission(self, persona, tool, args):
        # Check explicit prohibitions first
        for prohibited in persona.prohibited_tools:
            if self.matches_pattern(prohibited, tool, args):
                raise PermissionError(f"Tool {tool} is prohibited")

        # Check allowed tools
        for allowed in persona.allowed_tools:
            if self.matches_pattern(allowed, tool, args):
                self.log_tool_usage(persona, tool, args)
                return True

        # Default deny
        raise PermissionError(f"Tool {tool} not allowed for persona")

    def matches_pattern(self, pattern, tool, args):
        # Pattern matching logic
        if pattern.startswith("!"):
            # Negation
            return not self.matches_pattern(pattern[1:], tool, args)

        if "*" in pattern:
            # Wildcard matching
            return self.wildcard_match(pattern, f"{tool}:{':'.join(args)}")

        # Exact match
        return pattern == f"{tool}:{':'.join(args)}"
```

## Audit and Monitoring

### Audit Trail Requirements

**Standard Audit:**

- Tool invocations
- File access (read/write)
- API calls
- Errors and exceptions

**Enhanced Audit:**

- All of standard audit
- Data accessed (what, when, why)
- User interactions
- Performance metrics
- Resource usage

**Full Audit:**

- All of enhanced audit
- Complete input/output logs
- Execution traces
- Model decisions
- Real-time streaming

### Audit Log Format

```json
{
  "timestamp": "2026-01-20T10:30:45.123Z",
  "persona_id": "fullstack-dev-001",
  "persona_version": "1.0.0",
  "user_id": "john.doe@company.com",
  "session_id": "sess-abc123",
  "event_type": "tool_invocation",
  "tool": "Bash",
  "args": ["git", "commit", "-m", "Add feature"],
  "outcome": "success",
  "exit_code": 0,
  "duration_ms": 234,
  "files_modified": ["src/app.ts", "src/utils.ts"],
  "risk_level": "medium",
  "governance_checks": {
    "permission_verified": true,
    "approval_status": "approved",
    "compliance_validated": true
  },
  "metadata": {
    "git_branch": "feature/new-feature",
    "commit_hash": "abc123def456"
  }
}
```

### Real-Time Monitoring

```pcl
persona "MonitoredDev" {
  governance {
    monitoring {
      real_time = true
      stream_to = "kafka://monitoring-cluster:9092/persona-events"

      alerts = [
        {
          condition = "error_rate > 0.05"
          severity = "high"
          notify = ["oncall@company.com"]
        },
        {
          condition = "prohibited_tool_attempt"
          severity = "critical"
          notify = ["security@company.com"]
          action = "suspend_persona"
        },
        {
          condition = "pii_access"
          severity = "medium"
          notify = ["compliance@company.com"]
          log = "pii-access-log"
        }
      ]

      dashboards = [
        "grafana://personas/fullstack-dev",
        "datadog://personas/activity"
      ]
    }
  }
}
```

## Data Governance

### Data Classification

```pcl
persona "DataGovernedDev" {
  data_governance {
    classification_levels = [
      "public",
      "internal",
      "confidential",
      "pii",
      "sensitive",
      "restricted"
    ]

    access_controls = {
      "public" = "all"
      "internal" = "employees"
      "confidential" = "need_to_know"
      "pii" = "gdpr_compliant_only"
      "sensitive" = "dual_authorization"
      "restricted" = "security_clearance"
    }

    data_handling = {
      pii_masking = true
      encryption_at_rest = true
      encryption_in_transit = true
      data_retention_days = 90
      secure_deletion = true
    }
  }

  governance {
    track_data_access = true
    data_lineage = true
    data_access_log = "s3://governance/data-access/"
  }
}
```

### PII Handling

```pcl
persona "PIIAwareDev" {
  pii_handling {
    detect_pii = true
    pii_patterns = [
      "email",
      "phone",
      "ssn",
      "credit_card",
      "passport"
    ]

    actions = {
      log_access = true
      require_justification = true
      mask_in_logs = true
      encrypt_storage = true
    }

    compliance = {
      gdpr_article_32 = true
      ccpa_section_1798_100 = true
    }
  }
}
```

## Separation of Duties

### SoD Principles

Prevent single persona from completing critical workflows:

```pcl
# Persona 1: Can develop and test
persona "Developer" {
  skills = [
    "stdlib/languages/python-expert",
    "stdlib/qa/pytest-expert"
  ]

  governance {
    can_deploy = false
    can_approve = false
  }
}

# Persona 2: Can review and approve
persona "Reviewer" {
  skills = [
    "stdlib/specialized/code-review-expert"
  ]

  governance {
    can_develop = false
    can_deploy = false
    can_approve = true
  }
}

# Persona 3: Can deploy (after approval)
persona "Deployer" {
  skills = [
    "stdlib/devops/kubernetes-expert",
    "stdlib/cloud/aws-expert"
  ]

  governance {
    can_develop = false
    can_approve = false
    can_deploy = true
    requires_approval_from = ["Reviewer"]
  }
}
```

### Dual Authorization

```pcl
persona "CriticalOpsPersona" {
  governance {
    dual_authorization = true
    authorizers = [
      "manager@company.com",
      "tech-lead@company.com"
    ]
    authorization_timeout = "2h"

    critical_operations = [
      "Bash(kubectl:delete:namespace:*)",
      "Bash(terraform:destroy:*)",
      "Bash(aws:ec2:terminate-instances:*)"
    ]
  }
}
```

## Implementation Guidelines

### Step 1: Define Governance Policy

```yaml
# governance-policy.yaml
organization: 'Acme Corp'
version: '1.0.0'

default_governance:
  risk_classification: 'medium'
  governance_level: 'high'
  audit_required: true

environments:
  development:
    risk_classification: 'low'
    governance_level: 'standard'
  staging:
    risk_classification: 'medium'
    governance_level: 'high'
  production:
    risk_classification: 'critical'
    governance_level: 'critical'
    dual_authorization: true

compliance_frameworks:
  - 'ISO 27001'
  - 'SOC 2 Type II'
  - 'GDPR'
```

### Step 2: Implement Governance Checks

```python
from pcl.governance import GovernanceEngine

engine = GovernanceEngine.from_file("governance-policy.yaml")

def execute_persona_action(persona, action):
    # Pre-execution validation
    validation = engine.validate(persona, action)
    if not validation.passed:
        raise GovernanceError(validation.errors)

    # Check approvals
    if validation.requires_approval:
        if not approval_service.is_approved(action):
            raise ApprovalRequired(f"Action requires approval: {action}")

    # Execute with monitoring
    with engine.monitor(persona, action) as monitor:
        result = persona.execute(action)
        monitor.record_outcome(result)

    # Post-execution audit
    engine.audit_log.record(persona, action, result)

    return result
```

### Step 3: Configure Monitoring

```python
# monitoring-config.py
monitoring_config = {
    'audit_log': {
        'destination': 's3://audit-logs/personas/',
        'format': 'json',
        'retention_days': 365
    },
    'real_time_alerts': {
        'error_threshold': 0.05,
        'pii_access': True,
        'prohibited_tools': True
    },
    'dashboards': [
        'grafana://personas/overview',
        'datadog://personas/metrics'
    ]
}
```

## Next Steps

- Review [Skills Integration Guide](SKILLS_INTEGRATION_GUIDE.md) for skill loading
- Read [Persona Building Guide](PERSONA_BUILDING_GUIDE.md) for composition patterns
- Study [Example Personas](../examples/personas/) for governance implementations
- Explore [Compliance Templates](../templates/compliance/) for framework-specific configs

## Support

- Issues: <https://github.com/your-org/pcl/issues>
- Security: <security@your-org.com>
- Compliance: <compliance@your-org.com>
- Documentation: <https://pcl.dev/docs/governance>
