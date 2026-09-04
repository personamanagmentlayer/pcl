# Kubernetes Expert — Core Expertise

Reference material for the `kubernetes-expert` skill. See [SKILL.md](../SKILL.md).

## Core Expertise

### Kubernetes Architecture

**Core Components:**

```
Control Plane:
├── API Server (kube-apiserver)
├── etcd (distributed key-value store)
├── Scheduler (kube-scheduler)
├── Controller Manager (kube-controller-manager)
└── Cloud Controller Manager

Worker Nodes:
├── kubelet (node agent)
├── kube-proxy (network proxy)
└── Container Runtime (containerd, CRI-O)
```

### Pods

**Basic Pod:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: nginx
    env: production
  annotations:
    description: 'Production nginx server'
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80
          name: http
          protocol: TCP
      resources:
        requests:
          memory: '64Mi'
          cpu: '250m'
        limits:
          memory: '128Mi'
          cpu: '500m'
      env:
        - name: ENVIRONMENT
          value: 'production'
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
      volumeMounts:
        - name: config
          mountPath: /etc/nginx/conf.d
          readOnly: true
      livenessProbe:
        httpGet:
          path: /health
          port: 80
        initialDelaySeconds: 30
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /ready
          port: 80
        initialDelaySeconds: 5
        periodSeconds: 5

  volumes:
    - name: config
      configMap:
        name: nginx-config

  restartPolicy: Always
  nodeSelector:
    disktype: ssd
  tolerations:
    - key: 'node-role'
      operator: 'Equal'
      value: 'web'
      effect: 'NoSchedule'
```

**Multi-Container Pod:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-sidecar
spec:
  containers:
    # Main application
    - name: app
      image: myapp:1.0
      ports:
        - containerPort: 8080
      volumeMounts:
        - name: shared-logs
          mountPath: /var/log/app

    # Sidecar: log collector
    - name: log-collector
      image: fluentd:latest
      volumeMounts:
        - name: shared-logs
          mountPath: /var/log/app
          readOnly: true

  volumes:
    - name: shared-logs
      emptyDir: {}
```

### Deployments

**Production Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
  labels:
    app: web-app
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1 # Max pods above desired count
      maxUnavailable: 0 # Always maintain availability
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
        version: v1
      annotations:
        prometheus.io/scrape: 'true'
        prometheus.io/port: '9090'
    spec:
      serviceAccountName: web-app-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000

      containers:
        - name: web-app
          image: myregistry.io/web-app:1.2.3
          imagePullPolicy: IfNotPresent

          ports:
            - containerPort: 8080
              name: http
            - containerPort: 9090
              name: metrics

          env:
            - name: ENVIRONMENT
              value: 'production'
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName

          resources:
            requests:
              memory: '256Mi'
              cpu: '500m'
            limits:
              memory: '512Mi'
              cpu: '1000m'

          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            successThreshold: 1
            failureThreshold: 3

          startupProbe:
            httpGet:
              path: /startup
              port: 8080
            initialDelaySeconds: 0
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 30

          volumeMounts:
            - name: config
              mountPath: /etc/config
              readOnly: true
            - name: cache
              mountPath: /var/cache

          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL

      volumes:
        - name: config
          configMap:
            name: app-config
        - name: cache
          emptyDir: {}

      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - web-app
                topologyKey: kubernetes.io/hostname

      imagePullSecrets:
        - name: registry-secret
```

### Services

**ClusterIP Service:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app-service
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: web-app
  ports:
    - name: http
      port: 80
      targetPort: 8080
      protocol: TCP
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800
```

**LoadBalancer Service:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app-lb
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: 'nlb'
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: 'true'
spec:
  type: LoadBalancer
  selector:
    app: web-app
  ports:
    - port: 443
      targetPort: 8080
      protocol: TCP
  loadBalancerSourceRanges:
    - 10.0.0.0/8
```

**Headless Service:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: database-headless
spec:
  clusterIP: None # Headless
  selector:
    app: database
  ports:
    - port: 5432
      targetPort: 5432
```

### Ingress

**Nginx Ingress:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
    nginx.ingress.kubernetes.io/rate-limit: '100'
    cert-manager.io/cluster-issuer: 'letsencrypt-prod'
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - example.com
        - www.example.com
      secretName: example-com-tls

  rules:
    - host: example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80

          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-service
                port:
                  number: 80

    - host: admin.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: admin-service
                port:
                  number: 80
```

### ConfigMaps and Secrets

**ConfigMap:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  # Key-value pairs
  app.properties: |
    environment=production
    log.level=info
    cache.ttl=3600

  nginx.conf: |
    server {
      listen 80;
      location / {
        proxy_pass http://backend:8080;
      }
    }

  DATABASE_HOST: 'postgres.production.svc.cluster.local'
  REDIS_HOST: 'redis.production.svc.cluster.local'
```

**Secret:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: production
type: Opaque
stringData:
  username: admin
  password: super-secret-password
  url: postgresql://admin:super-secret-password@postgres:5432/mydb

# Or base64 encoded
data:
  username: YWRtaW4=
  password: c3VwZXItc2VjcmV0LXBhc3N3b3Jk
```

### StatefulSets

**Database StatefulSet:**

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: production
spec:
  serviceName: postgres-headless
  replicas: 3
  selector:
    matchLabels:
      app: postgres

  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
              name: postgres

          env:
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata

          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data

          resources:
            requests:
              memory: '1Gi'
              cpu: '500m'
            limits:
              memory: '2Gi'
              cpu: '1000m'

  volumeClaimTemplates:
    - metadata:
        name: postgres-storage
      spec:
        accessModes: ['ReadWriteOnce']
        storageClassName: 'fast-ssd'
        resources:
          requests:
            storage: 10Gi
```

### Persistent Volumes

**PersistentVolumeClaim:**

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
  namespace: production
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 10Gi
```

**PersistentVolume:**

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-nfs
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: nfs
  nfs:
    path: /exports/data
    server: nfs-server.example.com
```

### RBAC (Role-Based Access Control)

**ServiceAccount:**

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
  namespace: production
```

**Role:**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: production
rules:
  - apiGroups: ['']
    resources: ['pods']
    verbs: ['get', 'watch', 'list']
```

**RoleBinding:**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: production
subjects:
  - kind: ServiceAccount
    name: app-sa
    namespace: production
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

**ClusterRole:**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: secret-reader
rules:
  - apiGroups: ['']
    resources: ['secrets']
    verbs: ['get', 'list']
```

### HorizontalPodAutoscaler

**HPA based on CPU:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70

    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80

  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 30
        - type: Pods
          value: 4
          periodSeconds: 30
      selectPolicy: Max
```

### NetworkPolicy

**Network Policy:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api

  policyTypes:
    - Ingress
    - Egress

  ingress:
    # Allow from web app
    - from:
        - podSelector:
            matchLabels:
              app: web-app
      ports:
        - protocol: TCP
          port: 8080

    # Allow from ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080

  egress:
    # Allow to database
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432

    # Allow DNS
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53

    # Allow external HTTPS
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 443
```
