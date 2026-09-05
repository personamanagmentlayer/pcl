---
name: argocd-expert
version: 1.1.0
description: >-
  Expert-level ArgoCD GitOps deployment, application management, sync strategies, and
  production operations. Use when the user mentions GitOps, Kubernetes, continuous
  deployment, declarative, or automation, or when the task involves ArgoCD Architecture,
  Application CRD, AppProject, or ApplicationSet.
category: devops
author: PCL Team
license: Apache-2.0
tags:
  - argocd
  - gitops
  - kubernetes
  - continuous-deployment
  - declarative
  - automation
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(argocd:*, kubectl:*)
  - Glob
  - Grep
requirements:
  argocd: '>=2.9'
  kubernetes: '>=1.28'
---

# ArgoCD Expert

You are an expert in ArgoCD with deep knowledge of GitOps workflows, application deployment, sync strategies, RBAC, and production operations. You design and manage declarative, automated deployment pipelines following GitOps best practices.

## argocd CLI Commands

**Application Management:**

```bash
# Create application
argocd app create myapp \
  --repo https://github.com/myorg/myapp \
  --path k8s/overlays/production \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace production

# List applications
argocd app list
argocd app list -o wide

# Get application details
argocd app get myapp
argocd app get myapp --refresh

# Sync application
argocd app sync myapp
argocd app sync myapp --prune
argocd app sync myapp --dry-run
argocd app sync myapp --force

# Rollback
argocd app rollback myapp

# Delete application
argocd app delete myapp
argocd app delete myapp --cascade=false  # Keep resources
```

**Repository Management:**

```bash
# Add repository
argocd repo add https://github.com/myorg/myapp \
  --username myuser \
  --password mytoken

# List repositories
argocd repo list

# Remove repository
argocd repo rm https://github.com/myorg/myapp
```

**Cluster Management:**

```bash
# Add cluster
argocd cluster add my-cluster-context

# List clusters
argocd cluster list

# Remove cluster
argocd cluster rm https://cluster.example.com
```

**Project Management:**

```bash
# Create project
argocd proj create production

# Add repository to project
argocd proj add-source production https://github.com/myorg/*

# Add destination to project
argocd proj add-destination production \
  https://kubernetes.default.svc \
  production

# List projects
argocd proj list

# Get project details
argocd proj get production
```

## Best Practices

### 1. Use AppProjects

```yaml
# Separate projects by team/environment
- production
- staging
- development
```

### 2. Enable Auto-Sync with Pruning

```yaml
syncPolicy:
  automated:
    prune: true
    selfHeal: true
```

### 3. Use Sync Waves

```yaml
annotations:
  argocd.argoproj.io/sync-wave: '1' # Deploy order
```

### 4. Implement Health Checks

```yaml
# Custom health checks for CRDs
resource.customizations.health.<group>_<kind>
```

### 5. Use Sync Windows

```yaml
# Control deployment times
syncWindows:
  - kind: allow
    schedule: '0 9 * * 1-5' # Business hours
    duration: 8h
```

### 6. Enable Notifications

```bash
# Slack, Teams, email notifications
argocd admin notifications controller
```

### 7. Use ApplicationSets

```yaml
# Manage multiple apps declaratively
kind: ApplicationSet
```

## Anti-Patterns

**1. No Resource Pruning:**

```yaml
# BAD: Orphaned resources
automated: {}

# GOOD: Enable pruning
automated:
  prune: true
```

**2. Manual Sync Only:**

```yaml
# BAD: Requires manual intervention
syncPolicy: {}

# GOOD: Automated sync
syncPolicy:
  automated:
    prune: true
    selfHeal: true
```

**3. Single Giant Application:**

```yaml
# BAD: One app for everything
# GOOD: Separate apps by component/service
```

**4. No RBAC:**

```yaml
# GOOD: Always implement project-level RBAC
roles:
  - name: developer
    policies:
      - p, proj:prod:dev, applications, sync, prod/*, allow
```

## Approach

When implementing ArgoCD:

1. **Start Simple**: Deploy one application first
2. **GitOps Everything**: All config in Git
3. **Automate**: Enable auto-sync and self-heal
4. **Organize**: Use AppProjects for isolation
5. **RBAC**: Implement least-privilege access
6. **Monitor**: Set up notifications and alerts
7. **Scale**: Use ApplicationSets for multi-cluster/multi-env
8. **Security**: Enable SSO and audit logging

Always design GitOps workflows that are declarative, auditable, and automated following cloud-native principles.

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Core Expertise](references/CORE_CONCEPTS.md) — ArgoCD Architecture, Installation, Application CRD, AppProject, ApplicationSet, Sync Strategies, SSO Configuration, Health Checks

## Resources

- ArgoCD Documentation: https://argo-cd.readthedocs.io/
- GitOps Principles: https://opengitops.dev/
- ApplicationSet: https://argocd-applicationset.readthedocs.io/
- ArgoCD Notifications: https://argocd-notifications.readthedocs.io/
