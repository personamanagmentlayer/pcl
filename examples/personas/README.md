# PCL Example Personas

This directory contains example persona definitions that demonstrate how to use skills from the PCL Standard Library to create governed AI agents with specific expertise.

## 📚 Available Personas

### 1. Full-Stack Web Developer

**File**: `fullstack-developer.pcl`

**Skills**: 21 expert skills

- Frontend: TypeScript, JavaScript, React, Next.js, Vue
- Backend: Node.js, FastAPI, GraphQL, API Design, Microservices
- Database: PostgreSQL, MongoDB, Redis
- DevOps: Docker, Kubernetes, Git, AWS, CI/CD
- Testing: Playwright, Jest

**Risk Level**: Medium
**Governance**: High
**Use Case**: Building modern web applications with full-stack capabilities

---

### 2. Data Platform Engineer

**File**: `data-platform-engineer.pcl`

**Skills**: 25 expert skills

- Languages: Python, Scala, SQL
- Data Platforms: Snowflake, Databricks, PostgreSQL
- ETL/ELT: Airflow, dbt, Kafka
- Analytics: Tableau, Power BI, Looker
- Cloud: AWS, Azure
- Infrastructure: Terraform, Docker, Kubernetes
- AI/ML: Data Science, Machine Learning
- Architecture: Data Mesh

**Risk Level**: High (handles sensitive data)
**Governance**: Critical
**Use Case**: Building and maintaining modern data platforms with strict data governance

**Special Features**:

- PII tracking and masking
- Data lineage tracking
- GDPR compliance
- Data mesh principles

---

### 3. Cloud Security Architect

**File**: `cloud-security-architect.pcl`

**Skills**: 24 expert skills

- Security: Penetration Testing, Zero Trust, Cryptography, Incident Response, Cybersecurity
- Compliance: GDPR, SOC 2, Audit, Standards
- Cloud: AWS, Azure, GCP
- Infrastructure: Kubernetes, Terraform, Istio, Helm
- Monitoring: Prometheus, Grafana
- API Security: API Design, Microservices
- Programming: Python, Go

**Risk Level**: Critical (highest)
**Governance**: Critical
**Use Case**: Securing cloud infrastructure with zero trust architecture and compliance

**Special Features**:

- Dual authorization for critical operations
- Comprehensive audit logging
- Multiple compliance frameworks (ISO 27001, SOC 2, GDPR, NIST, PCI DSS, HIPAA)
- Incident response playbooks
- Zero trust principles

---

### 4. DevOps/SRE Engineer

**File**: `devops-sre-engineer.pcl`

**Skills**: 18 expert skills

- Container Orchestration: Kubernetes, Docker, Helm, Istio
- Infrastructure as Code: Terraform, Ansible
- Cloud: AWS
- CI/CD: GitHub Actions, ArgoCD
- Monitoring: Prometheus, Grafana
- Languages: Python, Bash, Go
- Testing: Chaos Engineering, Load Testing
- Version Control: Git

**Risk Level**: Critical (infrastructure operations)
**Governance**: Critical
**Use Case**: Site reliability engineering with SLO tracking, incident response, and production operations

**Special Features**:

- SRE metrics and SLO management
- Incident response workflows
- Blameless post-mortem culture
- Error budget tracking
- Disaster recovery planning
- Runbook automation
- Capacity planning

---

### 5. Enterprise Integration Specialist

**File**: `enterprise-integration-specialist.pcl`

**Skills**: 23 expert skills

- Enterprise Systems: SAP, Salesforce, ServiceNow, Microsoft 365, Dynamics 365
- Integration: REST API, GraphQL, gRPC, SOAP, API Design
- Messaging: Kafka, RabbitMQ
- Languages: Java, Python, JavaScript
- Data: PostgreSQL, MongoDB, ETL
- Cloud: AWS, Azure
- Security: OAuth, Cryptography

**Risk Level**: High (enterprise data handling)
**Governance**: Critical
**Use Case**: Integrating enterprise systems with API management, data flows, and compliance

**Special Features**:

- Multi-system integration patterns
- Event-driven architecture
- Batch and real-time data sync
- API versioning and contract testing
- Enterprise system best practices
- Data lineage tracking
- Distributed tracing
- Resilience patterns (circuit breaker, retry, DLQ)

---

## 🎯 Using These Personas

### Loading a Persona

```bash
# Using PCL CLI (future)
pcl persona load examples/personas/fullstack-developer.pcl

# Validate persona
pcl persona validate examples/personas/fullstack-developer.pcl
```

### Persona Structure

Each persona definition includes:

```pcl
persona "Name" {
  version = "1.0.0"
  description = "..."

  # Skills from stdlib
  skills = [...]

  # Governance rules
  governance {
    risk_classification = "low|medium|high|critical"
    audit_required = true/false
    requires_approval_for = [...]
  }

  # Tool permissions
  constraints {
    allowed_tools = [...]
    prohibited_tools = [...]
  }

  # Compliance frameworks
  compliance {
    frameworks = [...]
    data_classification = [...]
  }

  # Capabilities matrix
  capabilities = {...}

  # Working context
  context {...}
}
```

## 🔒 Governance Levels

### Low Risk

- Public-facing content
- Documentation
- UI development
- No data access

### Medium Risk

- Application development
- Internal tools
- Limited data access
- Code deployments

### High Risk

- Data pipelines
- PII handling
- Database operations
- Infrastructure changes

### Critical Risk

- Security operations
- Compliance audits
- Production data access
- Encryption key management

## 🛡️ Security Features

All personas implement:

- ✅ **Principle of Least Privilege** - Minimal tool permissions
- ✅ **Audit Logging** - All actions logged
- ✅ **Human Oversight** - Critical operations require approval
- ✅ **Separation of Duties** - Role-based access control
- ✅ **Compliance Alignment** - ISO, GDPR, SOC 2, NIST frameworks

## 📊 Skill Composition Patterns

### Layered Approach (Full-Stack Developer)

1. **Language Layer**: TypeScript, JavaScript
2. **Framework Layer**: React, Next.js, Node.js
3. **Data Layer**: PostgreSQL, MongoDB, Redis
4. **Integration Layer**: GraphQL, REST APIs
5. **Infrastructure Layer**: Docker, Kubernetes, AWS

### Domain-Oriented (Data Platform Engineer)

1. **Core Domain**: Data Engineering
2. **Supporting Domains**: Cloud, DevOps, ML
3. **Governance Domain**: Data Mesh, Privacy
4. **Tool Domain**: Airflow, dbt, Snowflake

### Security-First (Cloud Security Architect)

1. **Security Core**: Pentesting, Zero Trust, Cryptography
2. **Compliance Layer**: GDPR, SOC 2, ISO 27001
3. **Platform Layer**: Multi-cloud (AWS, Azure, GCP)
4. **Monitoring Layer**: SIEM, IDS/IPS, Continuous Monitoring

## 🚀 Creating Custom Personas

### Step 1: Identify Required Skills

Browse the [skill catalog](../../stdlib/catalog/skill-catalog.json) to find relevant skills:

```python
import json

with open('stdlib/catalog/skill-catalog.json') as f:
    catalog = json.load(f)

# Search by category
devops_skills = catalog['categories']['devops']

# Search by tag
security_skills = [s for s in catalog['skills'] if 'security' in s.get('tags', [])]
```

### Step 2: Define Governance Requirements

Consider:

- Risk level of operations
- Data sensitivity
- Compliance requirements
- Approval workflows
- Audit requirements

### Step 3: Configure Tool Permissions

Use allowlists (allowed_tools) and denylists (prohibited_tools):

```pcl
constraints {
  # Allow specific operations
  allowed_tools = [
    "Bash(npm:install:*, npm:test:*)",  # Allow npm install and test
    "Bash(kubectl:get:*, kubectl:describe:*)"  # Read-only K8s
  ]

  # Explicitly prohibit dangerous operations
  prohibited_tools = [
    "Bash(rm:-rf:*)",
    "Bash(kubectl:delete:*)",
    "Bash(DROP:*)"
  ]
}
```

### Step 4: Align with Compliance

Map to relevant frameworks:

```pcl
compliance {
  frameworks = ["ISO 27001", "GDPR", "SOC 2"]
  data_classification = ["pii", "confidential"]

  security_requirements = {
    encryption_at_rest = true
    access_logging = true
  }
}
```

## 📖 Further Reading

- [PCL Standard Library](../../stdlib/README.md)
- [Skill Catalog](../../stdlib/catalog/README.md)
- [Governance Framework](../../docs/GOVERNANCE.md)
- [Security Model](../../.github/EMERGENCY_SECURITY.md)

---

**Note**: These are example personas for reference. Customize them based on your specific governance requirements and use cases.
