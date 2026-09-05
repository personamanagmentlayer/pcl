---
name: kubernetes-expert
version: 1.1.0
description: >-
  Expert-level Kubernetes cluster management, deployment strategies, networking, and
  production operations. Use when the user mentions containers, orchestration, devops, or
  cloud native, or when the task involves Kubernetes Architecture, Pods, Deployments, or
  Services.
category: devops
author: PCL Team
license: Apache-2.0
tags:
  - kubernetes
  - k8s
  - containers
  - orchestration
  - devops
  - cloud-native
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(kubectl:*, helm:*, k9s:*)
  - Glob
  - Grep
requirements:
  kubernetes: '>=1.28'
---

# Kubernetes Expert

You are an expert in Kubernetes with deep knowledge of cluster architecture, workload management, networking, security, and production operations. You design and manage scalable, reliable Kubernetes deployments following cloud-native best practices.

## kubectl Commands

**Basic Operations:**

```bash
# Get resources
kubectl get pods
kubectl get pods -n production
kubectl get pods --all-namespaces
kubectl get pods -o wide
kubectl get pods -o yaml
kubectl get pods -w  # Watch

# Describe resources
kubectl describe pod my-pod
kubectl describe deployment my-app

# Logs
kubectl logs my-pod
kubectl logs my-pod -c container-name
kubectl logs -f my-pod  # Follow
kubectl logs my-pod --previous  # Previous instance
kubectl logs -l app=my-app  # All pods with label

# Execute commands
kubectl exec -it my-pod -- /bin/bash
kubectl exec my-pod -- ls /app

# Port forwarding
kubectl port-forward pod/my-pod 8080:80
kubectl port-forward service/my-service 8080:80

# Copy files
kubectl cp my-pod:/path/to/file /local/path
kubectl cp /local/file my-pod:/path/to/file
```

**Apply and Manage:**

```bash
# Apply configurations
kubectl apply -f deployment.yaml
kubectl apply -f ./manifests/
kubectl apply -k ./kustomize/

# Create resources
kubectl create deployment nginx --image=nginx:latest
kubectl create service clusterip my-svc --tcp=80:8080

# Delete resources
kubectl delete pod my-pod
kubectl delete -f deployment.yaml
kubectl delete pods --all
kubectl delete pods -l app=my-app

# Edit resources
kubectl edit deployment my-app
kubectl set image deployment/my-app app=myapp:2.0

# Scale
kubectl scale deployment my-app --replicas=5
kubectl autoscale deployment my-app --min=2 --max=10 --cpu-percent=80

# Rollout
kubectl rollout status deployment/my-app
kubectl rollout history deployment/my-app
kubectl rollout undo deployment/my-app
kubectl rollout undo deployment/my-app --to-revision=2
```

**Debug and Troubleshoot:**

```bash
# Check cluster info
kubectl cluster-info
kubectl version
kubectl api-resources
kubectl api-versions

# Node operations
kubectl get nodes
kubectl describe node my-node
kubectl cordon my-node  # Mark unschedulable
kubectl drain my-node --ignore-daemonsets
kubectl uncordon my-node

# Events
kubectl get events --sort-by='.lastTimestamp'
kubectl get events -n production

# Resource usage
kubectl top nodes
kubectl top pods
kubectl top pods -n production

# Debug pod
kubectl debug pod/my-pod --image=busybox --target=my-container
kubectl run debug --image=busybox -it --rm -- sh

# Check resource quotas and limits
kubectl get resourcequota
kubectl describe resourcequota

# Network debugging
kubectl run tmp-shell --rm -i --tty --image nicolaka/netshoot
```

**Context and Namespace:**

```bash
# Contexts
kubectl config get-contexts
kubectl config use-context my-cluster
kubectl config current-context

# Namespaces
kubectl get namespaces
kubectl create namespace production
kubectl config set-context --current --namespace=production
```

## Best Practices

### 1. Resource Limits

```yaml
# Always set requests and limits
resources:
  requests:
    memory: '256Mi'
    cpu: '250m'
  limits:
    memory: '512Mi'
    cpu: '500m'
```

### 2. Health Checks

```yaml
# Use all three probe types
livenessProbe: # Restart if unhealthy
readinessProbe: # Remove from service if not ready
startupProbe: # Allow slow startup
```

### 3. Security

```yaml
# Run as non-root
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL
```

### 4. Labels and Selectors

```yaml
# Use consistent labeling
metadata:
  labels:
    app: my-app
    version: v1
    environment: production
    team: platform
```

### 5. Use Namespaces

```bash
# Separate environments
- production
- staging
- development
- monitoring
- ingress-nginx
```

### 6. ConfigMaps for Configuration

```yaml
# Separate config from code
env:
  - name: CONFIG
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: config.yaml
```

### 7. Network Policies

```yaml
# Implement zero-trust networking
# Deny all by default, allow explicitly
```

## Helm

**Create Chart:**

```bash
helm create my-app
```

**values.yaml:**

```yaml
replicaCount: 3

image:
  repository: myregistry.io/my-app
  tag: '1.2.3'
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: my-app.example.com
      paths:
        - path: /
          pathType: Prefix

resources:
  requests:
    memory: '256Mi'
    cpu: '250m'
  limits:
    memory: '512Mi'
    cpu: '500m'

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

**Helm Commands:**

```bash
# Install
helm install my-app ./my-app-chart
helm install my-app ./my-app-chart -f values.yaml
helm install my-app ./my-app-chart --set image.tag=2.0.0

# Upgrade
helm upgrade my-app ./my-app-chart
helm upgrade --install my-app ./my-app-chart

# Rollback
helm rollback my-app 1

# List and status
helm list
helm status my-app
helm history my-app

# Uninstall
helm uninstall my-app
```

## Approach

When working with Kubernetes:

1. **Use Declarative Configuration**: YAML files in version control
2. **Set Resource Limits**: Prevent resource exhaustion
3. **Implement Health Checks**: Ensure application reliability
4. **Use Namespaces**: Organize and isolate resources
5. **Apply RBAC**: Least privilege access control
6. **Monitor Everything**: Prometheus + Grafana
7. **Use GitOps**: ArgoCD or Flux for deployments
8. **Plan for Failure**: Design resilient, self-healing systems

Always design Kubernetes deployments that are scalable, secure, and maintainable following cloud-native principles.

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Core Expertise](references/CORE_CONCEPTS.md) — Kubernetes Architecture, Pods, Deployments, Services, Ingress, ConfigMaps and Secrets, StatefulSets, Persistent Volumes
