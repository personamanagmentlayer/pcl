# Linkerd Expert — Core Expertise

Reference material for the `linkerd-expert` skill. See [SKILL.md](../SKILL.md).

## Core Expertise

### Linkerd Architecture

**Components:**

```
Linkerd:
├── Control Plane
│   ├── Destination (service discovery)
│   ├── Identity (mTLS certificates)
│   ├── Proxy Injector (sidecar injection)
│   └── Public API (metrics/control)
└── Data Plane
    ├── Linkerd Proxy (Rust-based)
    ├── Init Container (iptables setup)
    └── Proxy Metrics

Key Features:
- Automatic mTLS
- Golden metrics out-of-the-box
- Ultra-lightweight (written in Rust)
- Zero-config service discovery
```

### Installation

**Install Linkerd CLI:**

```bash
# Download and install CLI
curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install | sh
export PATH=$PATH:$HOME/.linkerd2/bin

# Verify CLI
linkerd version

# Check cluster compatibility
linkerd check --pre

# Install CRDs
linkerd install --crds | kubectl apply -f -

# Install control plane
linkerd install | kubectl apply -f -

# Verify installation
linkerd check

# Install viz extension (dashboard + metrics)
linkerd viz install | kubectl apply -f -

# Open dashboard
linkerd viz dashboard
```

**Production Installation:**

```bash
# Generate certificates (manual trust anchor)
step certificate create root.linkerd.cluster.local ca.crt ca.key \
  --profile root-ca --no-password --insecure

step certificate create identity.linkerd.cluster.local issuer.crt issuer.key \
  --profile intermediate-ca --not-after 8760h --no-password --insecure \
  --ca ca.crt --ca-key ca.key

# Install with custom certificates
linkerd install \
  --identity-trust-anchors-file ca.crt \
  --identity-issuer-certificate-file issuer.crt \
  --identity-issuer-key-file issuer.key \
  --set proxyInit.runAsRoot=false \
  --ha | kubectl apply -f -

# Install with custom values
linkerd install \
  --set controllerReplicas=3 \
  --set controllerResources.cpu.request=200m \
  --set controllerResources.memory.request=512Mi \
  --set proxyResources.cpu.request=100m \
  --set proxyResources.memory.request=128Mi \
  | kubectl apply -f -
```

### Mesh Injection

**Automatic Namespace Injection:**

```bash
# Enable injection for namespace
kubectl annotate namespace production linkerd.io/inject=enabled

# Verify annotation
kubectl get namespace production -o yaml
```

**Namespace with Injection:**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  annotations:
    linkerd.io/inject: enabled
```

**Pod-Level Injection:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
spec:
  template:
    metadata:
      annotations:
        linkerd.io/inject: enabled
    spec:
      containers:
        - name: myapp
          image: myapp:latest
```

**Selective Injection (Skip Ports):**

```yaml
metadata:
  annotations:
    linkerd.io/inject: enabled
    config.linkerd.io/skip-inbound-ports: '8080,8443'
    config.linkerd.io/skip-outbound-ports: '3306,5432'
```

**Proxy Configuration:**

```yaml
metadata:
  annotations:
    linkerd.io/inject: enabled
    config.linkerd.io/proxy-cpu-request: '100m'
    config.linkerd.io/proxy-memory-request: '128Mi'
    config.linkerd.io/proxy-cpu-limit: '1000m'
    config.linkerd.io/proxy-memory-limit: '256Mi'
    config.linkerd.io/proxy-log-level: 'info,linkerd=debug'
```

### Traffic Management

**Traffic Split (Canary Deployment):**

```yaml
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: myapp-canary
  namespace: production
spec:
  service: myapp
  backends:
    - service: myapp-v1
      weight: 90
    - service: myapp-v2
      weight: 10
---
# Services
apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: production
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: myapp-v1
  namespace: production
spec:
  selector:
    app: myapp
    version: v1
  ports:
    - port: 80
      targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: myapp-v2
  namespace: production
spec:
  selector:
    app: myapp
    version: v2
  ports:
    - port: 80
      targetPort: 8080
```

**HTTPRoute (Fine-Grained Routing):**

```yaml
apiVersion: policy.linkerd.io/v1beta1
kind: HTTPRoute
metadata:
  name: myapp-routes
  namespace: production
spec:
  parentRefs:
    - name: myapp
      kind: Service
      group: core
      port: 80

  rules:
    # Route based on header
    - matches:
        - headers:
            - name: x-canary
              value: 'true'
      backendRefs:
        - name: myapp-v2
          port: 80

    # Route based on path
    - matches:
        - path:
            type: PathPrefix
            value: /api/v2
      backendRefs:
        - name: myapp-v2
          port: 80

    # Default route
    - backendRefs:
        - name: myapp-v1
          port: 80
          weight: 90
        - name: myapp-v2
          port: 80
          weight: 10
```

### Reliability Features

**Retries:**

```yaml
apiVersion: policy.linkerd.io/v1alpha1
kind: HTTPRoute
metadata:
  name: myapp-retries
  namespace: production
spec:
  parentRefs:
    - name: myapp
      kind: Service

  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api
      filters:
        - type: RequestHeaderModifier
          requestHeaderModifier:
            set:
              - name: l5d-retry-http
                value: '5xx'
              - name: l5d-retry-limit
                value: '3'
      backendRefs:
        - name: myapp
          port: 80
```

**Timeouts:**

```yaml
apiVersion: policy.linkerd.io/v1alpha1
kind: HTTPRoute
metadata:
  name: myapp-timeouts
  namespace: production
spec:
  parentRefs:
    - name: myapp
      kind: Service

  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api
      timeouts:
        request: 10s
        backendRequest: 8s
      backendRefs:
        - name: myapp
          port: 80
```

**Circuit Breaking (via ServiceProfile):**

```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: myapp.production.svc.cluster.local
  namespace: production
spec:
  routes:
    - name: GET /api/users
      condition:
        method: GET
        pathRegex: /api/users
      responseClasses:
        - condition:
            status:
              min: 500
              max: 599
          isFailure: true
      retryBudget:
        retryRatio: 0.2
        minRetriesPerSecond: 10
        ttl: 10s
```

### Authorization Policies

**Server (Define Ports):**

```yaml
apiVersion: policy.linkerd.io/v1beta1
kind: Server
metadata:
  name: myapp-server
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: myapp
  port: 8080
  proxyProtocol: HTTP/2
```

**ServerAuthorization (Allow Traffic):**

```yaml
apiVersion: policy.linkerd.io/v1beta1
kind: ServerAuthorization
metadata:
  name: myapp-auth
  namespace: production
spec:
  server:
    name: myapp-server

  client:
    # Allow from specific service account
    meshTLS:
      serviceAccounts:
      - name: frontend
        namespace: production

    # Allow unauthenticated (for ingress)
    unauthenticated: true

    # Allow from specific namespaces
    meshTLS:
      identities:
      - "*.production.serviceaccount.identity.linkerd.cluster.local"
```

**AuthorizationPolicy (Deny by Default):**

```yaml
# Deny all traffic by default
apiVersion: policy.linkerd.io/v1beta1
kind: Server
metadata:
  name: all-pods
  namespace: production
spec:
  podSelector:
    matchLabels: {}
  port: 1-65535
---
apiVersion: policy.linkerd.io/v1beta1
kind: ServerAuthorization
metadata:
  name: deny-all
  namespace: production
spec:
  server:
    name: all-pods
  client:
    # No clients allowed (deny all)
    networks: []
---
# Allow specific traffic
apiVersion: policy.linkerd.io/v1beta1
kind: ServerAuthorization
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  server:
    selector:
      matchLabels:
        app: api
  client:
    meshTLS:
      serviceAccounts:
        - name: frontend
```

### Multi-Cluster

**Install Multi-Cluster:**

```bash
# Install multi-cluster components
linkerd multicluster install | kubectl apply -f -

# Link clusters
linkerd multicluster link --cluster-name target | kubectl apply -f -

# Export service
kubectl label service myapp -n production mirror.linkerd.io/exported=true

# Check mirrored services
linkerd multicluster gateways
linkerd multicluster check
```

**Service Export:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: production
  labels:
    mirror.linkerd.io/exported: 'true'
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
```

### Observability

**Golden Metrics (via CLI):**

```bash
# Top routes by request rate
linkerd viz routes deployment/myapp -n production

# Live request metrics
linkerd viz stat deployments -n production

# Top resources by request volume
linkerd viz top deployments -n production

# Tap live traffic
linkerd viz tap deployment/myapp -n production

# Profile HTTP routes
linkerd viz profile myapp -n production --open-api swagger.json
```

**Prometheus Metrics:**

```promql
# Request rate
sum(rate(request_total{namespace="production"}[1m])) by (deployment)

# Success rate
sum(rate(request_total{namespace="production",classification="success"}[1m])) /
sum(rate(request_total{namespace="production"}[1m])) * 100

# Latency (P95)
histogram_quantile(0.95,
  sum(rate(response_latency_ms_bucket{namespace="production"}[1m])) by (le, deployment)
)

# TCP connection count
sum(tcp_open_connections{namespace="production"}) by (deployment)
```

**Jaeger Integration:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: linkerd-config-overrides
  namespace: linkerd
data:
  global: |
    tracing:
      collector:
        endpoint: jaeger.linkerd-jaeger:55678
      sampling:
        rate: 1.0
```
