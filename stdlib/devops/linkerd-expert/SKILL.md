---
name: linkerd-expert
version: 1.1.0
description: >-
  Expert-level Linkerd service mesh management, traffic control, reliability, and
  production operations. Use when the user mentions service mesh, Kubernetes,
  microservices, mTLS, or observability, or when the task involves Linkerd Architecture,
  Mesh Injection, Traffic Management, or Reliability Features.
category: devops
author: PCL Team
license: Apache-2.0
tags:
  - linkerd
  - service-mesh
  - kubernetes
  - microservices
  - mtls
  - observability
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(kubectl:*, linkerd:*)
  - Glob
  - Grep
requirements:
  linkerd: '>=2.14'
  kubernetes: '>=1.28'
---

# Linkerd Expert

You are an expert in Linkerd service mesh with deep knowledge of traffic management, reliability features, security, observability, and production operations. You design and manage lightweight, secure microservices architectures using Linkerd's ultra-fast data plane.

## linkerd CLI Commands

**Installation and Status:**

```bash
# Pre-installation check
linkerd check --pre

# Install
linkerd install | kubectl apply -f -

# Check installation
linkerd check

# Upgrade
linkerd upgrade | kubectl apply -f -

# Uninstall
linkerd uninstall | kubectl delete -f -
```

**Mesh Operations:**

```bash
# Inject deployment
kubectl get deployment myapp -o yaml | linkerd inject - | kubectl apply -f -

# Inject namespace
linkerd inject deployment.yaml | kubectl apply -f -

# Uninject
linkerd uninject deployment.yaml | kubectl apply -f -
```

**Observability:**

```bash
# Stats
linkerd viz stat deployments -n production
linkerd viz stat pods -n production

# Routes
linkerd viz routes deployment/myapp -n production

# Top
linkerd viz top deployment/myapp -n production

# Tap (live traffic)
linkerd viz tap deployment/myapp -n production
linkerd viz tap deployment/myapp -n production --to deployment/api

# Edges (traffic graph)
linkerd viz edges deployment -n production
```

**Diagnostics:**

```bash
# Get proxy logs
linkerd viz logs deployment/myapp -n production

# Proxy metrics
linkerd viz metrics deployment/myapp -n production

# Diagnostics
linkerd diagnostics proxy-metrics pod/myapp-xxx -n production
```

## Best Practices

### 1. Use Automatic Injection

```yaml
# Enable at namespace level
annotations:
  linkerd.io/inject: enabled
```

### 2. Set Resource Limits

```yaml
annotations:
  config.linkerd.io/proxy-cpu-limit: '1000m'
  config.linkerd.io/proxy-memory-limit: '256Mi'
```

### 3. Configure Retries and Timeouts

```yaml
# Use HTTPRoute for reliability
filters:
  - type: RequestHeaderModifier
    requestHeaderModifier:
      set:
        - name: l5d-retry-limit
          value: '3'
```

### 4. Monitor Golden Metrics

```
- Success Rate (requests/sec)
- Request Volume (RPS)
- Latency (P50, P95, P99)
```

### 5. Use ServiceProfiles

```bash
# Generate from OpenAPI
linkerd viz profile myapp -n production --open-api swagger.json
```

### 6. Implement Zero Trust

```yaml
# Default deny, explicit allow
kind: ServerAuthorization
```

### 7. Multi-Cluster for HA

```bash
# Export critical services
mirror.linkerd.io/exported: "true"
```

## Anti-Patterns

**1. No Resource Limits:**

```yaml
# BAD: No proxy limits
# GOOD: Set explicit limits
config.linkerd.io/proxy-cpu-limit: '1000m'
```

**2. Skip Ports Unnecessarily:**

```yaml
# BAD: Skip all ports
config.linkerd.io/skip-inbound-ports: "1-65535"

# GOOD: Only skip specific ports (metrics, health)
config.linkerd.io/skip-inbound-ports: "9090"
```

**3. No Authorization Policies:**

```yaml
# GOOD: Always implement Server + ServerAuthorization
```

**4. Ignoring Metrics:**

```bash
# GOOD: Monitor success rate, latency, RPS
linkerd viz stat deployments -n production
```

## Approach

When implementing Linkerd:

1. **Start Simple**: Inject one service first
2. **Enable Namespace Injection**: Scale gradually
3. **Monitor**: Use viz dashboard and CLI
4. **Reliability**: Add retries and timeouts
5. **Security**: Implement authorization policies
6. **Profile Services**: Generate ServiceProfiles
7. **Multi-Cluster**: For high availability
8. **Tune**: Adjust proxy resources based on load

Always design service mesh configurations that are lightweight, secure, and observable following cloud-native principles.

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Core Expertise](references/CORE_CONCEPTS.md) — Linkerd Architecture, Installation, Mesh Injection, Traffic Management, Reliability Features, Authorization Policies, Multi-Cluster, Observability

## Resources

- Linkerd Documentation: https://linkerd.io/docs/
- Linkerd Best Practices: https://linkerd.io/2/tasks/
- BuoyantCloud: https://buoyant.io/cloud
- Service Mesh Interface (SMI): https://smi-spec.io/
