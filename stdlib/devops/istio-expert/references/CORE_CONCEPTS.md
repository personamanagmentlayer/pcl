# Istio Expert — Core Expertise

Reference material for the `istio-expert` skill. See [SKILL.md](../SKILL.md).

## Core Expertise

### Istio Architecture

**Components:**

```
Control Plane (istiod):
├── Pilot (traffic management)
├── Citadel (certificate management)
├── Galley (configuration validation)
└── Mixer (deprecated in 1.7+)

Data Plane:
├── Envoy Proxy (sidecar)
├── Automatic sidecar injection
└── Gateway proxies
```

### Installation

**Install with istioctl:**

```bash
# Download Istio
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.20.0
export PATH=$PWD/bin:$PATH

# Install with default profile
istioctl install --set profile=default -y

# Install with custom profile
istioctl install --set profile=production -y

# Verify installation
istioctl verify-install

# Enable sidecar injection for namespace
kubectl label namespace default istio-injection=enabled
```

**IstioOperator Custom Resource:**

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: production-istio
  namespace: istio-system
spec:
  profile: production

  meshConfig:
    accessLogFile: /dev/stdout
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 100.0
        zipkin:
          address: zipkin.istio-system:9411

  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 1000m
            memory: 4Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5

    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          resources:
            requests:
              cpu: 1000m
              memory: 1Gi
            limits:
              cpu: 2000m
              memory: 2Gi
          service:
            type: LoadBalancer
            ports:
              - port: 80
                targetPort: 8080
                name: http2
              - port: 443
                targetPort: 8443
                name: https
```

### VirtualService - Traffic Routing

**Basic VirtualService:**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reviews
  namespace: default
spec:
  hosts:
    - reviews

  http:
    - match:
        - headers:
            end-user:
              exact: jason
      route:
        - destination:
            host: reviews
            subset: v2

    - route:
        - destination:
            host: reviews
            subset: v1
```

**Advanced Traffic Splitting (Canary):**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reviews-canary
  namespace: default
spec:
  hosts:
    - reviews.default.svc.cluster.local

  http:
    - match:
        - headers:
            x-canary:
              exact: 'true'
      route:
        - destination:
            host: reviews
            subset: v2
          weight: 100

    - route:
        - destination:
            host: reviews
            subset: v1
          weight: 90
        - destination:
            host: reviews
            subset: v2
          weight: 10
```

**URL Rewrite and Redirect:**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-rewrite
spec:
  hosts:
    - api.example.com

  http:
    # Redirect HTTP to HTTPS
    - match:
        - port: 80
      redirect:
        uri: /
        authority: api.example.com
        scheme: https
        redirectCode: 301

    # URL rewrite
    - match:
        - uri:
            prefix: /v1/
      rewrite:
        uri: /api/v1/
      route:
        - destination:
            host: api-service
            port:
              number: 8080

    # Timeout and retry
    - route:
        - destination:
            host: api-service
      timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx,reset,connect-failure
```

### DestinationRule - Load Balancing & Circuit Breaking

**Subsets and Load Balancing:**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: reviews-destination
  namespace: default
spec:
  host: reviews

  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id

    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
        maxRequestsPerConnection: 2

    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 40

  subsets:
    - name: v1
      labels:
        version: v1

    - name: v2
      labels:
        version: v2
      trafficPolicy:
        loadBalancer:
          simple: ROUND_ROBIN

    - name: v3
      labels:
        version: v3
      trafficPolicy:
        loadBalancer:
          simple: LEAST_REQUEST
```

**Circuit Breaking:**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: circuit-breaker
spec:
  host: backend.prod.svc.cluster.local

  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 10
        http2MaxRequests: 100
        maxRequestsPerConnection: 1

    outlierDetection:
      consecutiveGatewayErrors: 5
      consecutive5xxErrors: 5
      interval: 5s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
      minHealthPercent: 0
```

### Gateway - Ingress/Egress

**Ingress Gateway:**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: web-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway

  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: example-com-tls
      hosts:
        - '*.example.com'

    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - '*'
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: web-route
spec:
  hosts:
    - 'app.example.com'
  gateways:
    - web-gateway

  http:
    - match:
        - uri:
            prefix: /api
      route:
        - destination:
            host: api-service
            port:
              number: 8080

    - match:
        - uri:
            prefix: /
      route:
        - destination:
            host: frontend-service
            port:
              number: 80
```

**Egress Gateway:**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: external-gateway
spec:
  selector:
    istio: egressgateway

  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - api.external.com
      tls:
        mode: PASSTHROUGH
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: external-api
spec:
  hosts:
    - api.external.com
  gateways:
    - mesh
    - external-gateway

  http:
    - match:
        - gateways:
            - mesh
          port: 80
      route:
        - destination:
            host: istio-egressgateway.istio-system.svc.cluster.local
            port:
              number: 443

    - match:
        - gateways:
            - external-gateway
          port: 443
      route:
        - destination:
            host: api.external.com
            port:
              number: 443
```

### Security - mTLS and Authorization

**PeerAuthentication (mTLS):**

```yaml
# Mesh-wide strict mTLS
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
---
# Namespace-level permissive mTLS
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: namespace-policy
  namespace: production
spec:
  mtls:
    mode: PERMISSIVE
---
# Workload-specific mTLS
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: api-mtls
  namespace: production
spec:
  selector:
    matchLabels:
      app: api
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: DISABLE # Allow plain HTTP on metrics port
```

**AuthorizationPolicy:**

```yaml
# Deny all by default
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec: {}
---
# Allow specific operations
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: api-access
  namespace: production
spec:
  selector:
    matchLabels:
      app: api

  action: ALLOW

  rules:
    # Allow from frontend
    - from:
        - source:
            principals:
              - cluster.local/ns/production/sa/frontend
      to:
        - operation:
            methods: ['GET', 'POST']
            paths: ['/api/v1/*']

    # Allow from specific namespace
    - from:
        - source:
            namespaces: ['production']
      to:
        - operation:
            methods: ['GET']
            paths: ['/health']
---
# JWT validation
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: production
spec:
  selector:
    matchLabels:
      app: api
  jwtRules:
    - issuer: 'https://auth.example.com'
      jwksUri: 'https://auth.example.com/.well-known/jwks.json'
      audiences:
        - 'api.example.com'
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
spec:
  selector:
    matchLabels:
      app: api
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ['*']
```

### Observability - Telemetry

**Prometheus Metrics:**

```bash
# Check metrics endpoint
kubectl exec -it deploy/istio-ingressgateway -n istio-system -- curl localhost:15090/stats/prometheus

# Important metrics
istio_requests_total
istio_request_duration_milliseconds
istio_request_bytes
istio_response_bytes
istio_tcp_connections_opened_total
istio_tcp_connections_closed_total
```

**Distributed Tracing:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
data:
  mesh: |
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 100.0
        custom_tags:
          environment:
            literal:
              value: "production"
        zipkin:
          address: zipkin.istio-system:9411
```
