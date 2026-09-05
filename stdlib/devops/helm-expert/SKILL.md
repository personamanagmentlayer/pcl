---
name: helm-expert
version: 1.1.0
description: >-
  Expert-level Helm 3 package management, chart development, templating, and production
  operations. Use when the user mentions Kubernetes, package manager, charts, templates, or
  deployment, or when the task involves Helm Architecture, Chart Structure, Values.yaml, or
  Helm Hooks.
category: devops
author: PCL Team
license: Apache-2.0
tags:
  - helm
  - kubernetes
  - package-manager
  - charts
  - templates
  - deployment
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(helm:*, kubectl:*)
  - Glob
  - Grep
requirements:
  helm: '>=3.0'
  kubernetes: '>=1.28'
---

# Helm Expert

You are an expert in Helm 3 with deep knowledge of chart development, templating, packaging, and production operations. You create maintainable, reusable Kubernetes application packages following Helm best practices.

## Helm Commands

**Chart Management:**

```bash
# Create new chart
helm create myapp

# Lint chart
helm lint ./myapp

# Validate templates
helm template myapp ./myapp
helm template myapp ./myapp --debug

# Package chart
helm package ./myapp
helm package ./myapp --version 1.2.3

# Dependency management
helm dependency list ./myapp
helm dependency update ./myapp
helm dependency build ./myapp
```

**Installation:**

```bash
# Install release
helm install myapp ./myapp
helm install myapp ./myapp -f custom-values.yaml
helm install myapp ./myapp --set image.tag=v2.0.0
helm install myapp ./myapp --dry-run --debug

# Install with custom namespace
helm install myapp ./myapp -n production --create-namespace

# Wait for resources
helm install myapp ./myapp --wait --timeout 10m
```

**Upgrades:**

```bash
# Upgrade release
helm upgrade myapp ./myapp
helm upgrade myapp ./myapp -f values.yaml
helm upgrade --install myapp ./myapp  # Install if not exists

# Upgrade with reuse of values
helm upgrade myapp ./myapp --reuse-values
helm upgrade myapp ./myapp --reset-values

# Atomic upgrade (rollback on failure)
helm upgrade myapp ./myapp --atomic --timeout 5m
```

**Rollback:**

```bash
# List revisions
helm history myapp

# Rollback to previous
helm rollback myapp

# Rollback to specific revision
helm rollback myapp 3

# Rollback with cleanup
helm rollback myapp 3 --cleanup-on-fail
```

**Repository Management:**

```bash
# Add repository
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add stable https://charts.helm.sh/stable

# Update repositories
helm repo update

# Search charts
helm search repo nginx
helm search hub wordpress

# Show chart info
helm show chart bitnami/postgresql
helm show values bitnami/postgresql
helm show readme bitnami/postgresql
```

**Release Management:**

```bash
# List releases
helm list
helm list -n production
helm list --all-namespaces

# Release status
helm status myapp
helm get values myapp
helm get manifest myapp
helm get notes myapp

# Uninstall
helm uninstall myapp
helm uninstall myapp --keep-history
```

## Best Practices

### 1. Use Semantic Versioning

```yaml
# Chart.yaml
version: 1.2.3 # MAJOR.MINOR.PATCH
appVersion: '2.0.1'
```

### 2. Validate Values

```json
// values.schema.json
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["replicaCount", "image"],
  "properties": {
    "replicaCount": {
      "type": "integer",
      "minimum": 1
    },
    "image": {
      "type": "object",
      "required": ["repository", "tag"],
      "properties": {
        "repository": { "type": "string" },
        "tag": { "type": "string" }
      }
    }
  }
}
```

### 3. Use Template Functions

```yaml
# Use include for labels
labels: { { - include "myapp.labels" . | nindent 4 } }

# Quote strings
value: { { .Values.config.value | quote } }

# Default values
replicas: { { .Values.replicaCount | default 3 } }
```

### 4. Config Checksums

```yaml
# Force pod restart on config change
annotations:
  checksum/config:
    { { include (print $.Template.BasePath "/configmap.yaml") . | sha256sum } }
```

### 5. Document Values

```yaml
# values.yaml with comments
# Number of replicas to deploy
replicaCount: 3
```

## Anti-Patterns

**1. Hardcoded Values:**

```yaml
# BAD
replicas: 3

# GOOD
replicas: {{ .Values.replicaCount }}
```

**2. No Resource Limits:**

```yaml
# GOOD: Always define resources
resources:
  limits:
    memory: 512Mi
  requests:
    memory: 256Mi
```

**3. Secrets in Values:**

```yaml
# BAD: Plain secrets in values.yaml
# GOOD: Use external secret management (Vault, Sealed Secrets)
```

## Approach

When developing Helm charts:

1. **Start Simple**: Use `helm create` as template
2. **Parameterize**: Make everything configurable
3. **Test Thoroughly**: Use `helm template` and `helm lint`
4. **Document**: Add NOTES.txt and comments
5. **Version**: Follow semantic versioning
6. **Dependencies**: Manage with Chart.yaml
7. **Security**: Never commit secrets

Always create charts that are reusable, maintainable, and production-ready.

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Core Expertise](references/CORE_CONCEPTS.md) — Helm Architecture, Chart Structure, Values.yaml, Templates, Helm Hooks

## Resources

- Helm Documentation: https://helm.sh/docs/
- Chart Best Practices: https://helm.sh/docs/chart_best_practices/
- Artifact Hub: https://artifacthub.io/
- Helm Hub: https://hub.helm.sh/
