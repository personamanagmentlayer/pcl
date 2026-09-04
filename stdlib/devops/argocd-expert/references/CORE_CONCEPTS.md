# ArgoCD Expert — Core Expertise

Reference material for the `argocd-expert` skill. See [SKILL.md](../SKILL.md).

## Core Expertise

### ArgoCD Architecture

**Components:**

```
ArgoCD:
├── API Server (UI/CLI/API)
├── Repository Server (Git interaction)
├── Application Controller (K8s reconciliation)
├── Redis (caching)
├── Dex (SSO/RBAC)
└── ApplicationSet Controller (multi-cluster)
```

### Installation

**Install ArgoCD:**

```bash
# Create namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Install with HA
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port forward to access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Login via CLI
argocd login localhost:8080 --username admin --password <password>

# Change admin password
argocd account update-password
```

**Production Installation with Custom Values:**

```yaml
# argocd-values.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Repository credentials
  repositories: |
    - url: https://github.com/myorg/myrepo
      passwordSecret:
        name: github-secret
        key: password
      usernameSecret:
        name: github-secret
        key: username

  # Resource customizations
  resource.customizations: |
    networking.k8s.io/Ingress:
      health.lua: |
        hs = {}
        hs.status = "Healthy"
        return hs

  # Timeout settings
  timeout.reconciliation: 180s

  # Diff customizations
  resource.compareoptions: |
    ignoreAggregatedRoles: true

  # UI customization
  ui.cssurl: 'https://cdn.example.com/custom.css'
```

### Application CRD

**Basic Application:**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: production

  source:
    repoURL: https://github.com/myorg/myapp
    targetRevision: main
    path: k8s/overlays/production

  destination:
    server: https://kubernetes.default.svc
    namespace: production

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

**Helm Application:**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-helm
  namespace: argocd
spec:
  project: production

  source:
    repoURL: https://github.com/myorg/helm-charts
    targetRevision: main
    path: charts/myapp
    helm:
      releaseName: myapp
      valueFiles:
        - values.yaml
        - values-production.yaml
      parameters:
        - name: image.tag
          value: 'v2.0.0'
        - name: replicaCount
          value: '5'
      values: |
        ingress:
          enabled: true
          hosts:
          - myapp.example.com

  destination:
    server: https://kubernetes.default.svc
    namespace: production

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

**Kustomize Application:**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-kustomize
  namespace: argocd
spec:
  project: production

  source:
    repoURL: https://github.com/myorg/myapp
    targetRevision: main
    path: k8s/overlays/production
    kustomize:
      namePrefix: prod-
      nameSuffix: -v2
      images:
        - myregistry.io/myapp:v2.0.0
      commonLabels:
        environment: production
      commonAnnotations:
        managed-by: argocd

  destination:
    server: https://kubernetes.default.svc
    namespace: production

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### AppProject

**Project with RBAC:**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
spec:
  description: Production applications

  # Source repositories
  sourceRepos:
    - https://github.com/myorg/*
    - https://charts.bitnami.com/bitnami

  # Destination clusters and namespaces
  destinations:
    - namespace: production
      server: https://kubernetes.default.svc
    - namespace: monitoring
      server: https://kubernetes.default.svc

  # Cluster resource whitelist
  clusterResourceWhitelist:
    - group: '*'
      kind: '*'

  # Namespace resource blacklist
  namespaceResourceBlacklist:
    - group: ''
      kind: ResourceQuota
    - group: ''
      kind: LimitRange

  # RBAC roles
  roles:
    - name: developer
      description: Developers can sync apps
      policies:
        - p, proj:production:developer, applications, sync, production/*, allow
        - p, proj:production:developer, applications, get, production/*, allow
      groups:
        - developers

    - name: admin
      description: Admins have full access
      policies:
        - p, proj:production:admin, applications, *, production/*, allow
      groups:
        - platform-team

  # Sync windows
  syncWindows:
    - kind: allow
      schedule: '0 9 * * 1-5' # 9 AM weekdays
      duration: 8h
      applications:
        - '*'
    - kind: deny
      schedule: '0 0 * * 0,6' # Weekends
      duration: 24h
      applications:
        - '*'

  # Orphaned resources
  orphanedResources:
    warn: true
```

### ApplicationSet

**Git Generator (Multi-Environment):**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp-environments
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/myapp
        revision: main
        directories:
          - path: k8s/overlays/*

  template:
    metadata:
      name: 'myapp-{{path.basename}}'
    spec:
      project: production
      source:
        repoURL: https://github.com/myorg/myapp
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

**List Generator (Multi-Cluster):**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp-clusters
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - cluster: us-east-1
            url: https://cluster1.example.com
            namespace: production
          - cluster: us-west-2
            url: https://cluster2.example.com
            namespace: production
          - cluster: eu-central-1
            url: https://cluster3.example.com
            namespace: production

  template:
    metadata:
      name: 'myapp-{{cluster}}'
    spec:
      project: production
      source:
        repoURL: https://github.com/myorg/myapp
        targetRevision: main
        path: k8s/overlays/production
      destination:
        server: '{{url}}'
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

**Matrix Generator (Environments × Clusters):**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp-matrix
  namespace: argocd
spec:
  generators:
    - matrix:
        generators:
          - git:
              repoURL: https://github.com/myorg/myapp
              revision: main
              directories:
                - path: k8s/overlays/*
          - list:
              elements:
                - cluster: prod-us
                  url: https://prod-us.example.com
                - cluster: prod-eu
                  url: https://prod-eu.example.com

  template:
    metadata:
      name: 'myapp-{{path.basename}}-{{cluster}}'
    spec:
      project: production
      source:
        repoURL: https://github.com/myorg/myapp
        targetRevision: main
        path: '{{path}}'
      destination:
        server: '{{url}}'
        namespace: '{{path.basename}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

### Sync Strategies

**Automatic Sync with Policies:**

```yaml
syncPolicy:
  automated:
    prune: true # Delete resources not in Git
    selfHeal: true # Force sync on drift
    allowEmpty: false # Prevent deletion of all resources

  syncOptions:
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    - PruneLast=true
    - ApplyOutOfSyncOnly=true
    - RespectIgnoreDifferences=true
    - ServerSideApply=true

  retry:
    limit: 5
    backoff:
      duration: 5s
      factor: 2
      maxDuration: 3m
```

**Sync Hooks:**

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: database-migration
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
    argocd.argoproj.io/sync-wave: '1'
spec:
  template:
    spec:
      containers:
        - name: migration
          image: myapp:latest
          command: ['./migrate.sh']
      restartPolicy: Never
---
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-test
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
    argocd.argoproj.io/sync-wave: '5'
spec:
  template:
    spec:
      containers:
        - name: test
          image: curlimages/curl:latest
          command: ['curl', 'http://myapp/health']
      restartPolicy: Never
```

### SSO Configuration

**Dex with GitHub:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.example.com
  dex.config: |
    connectors:
    - type: github
      id: github
      name: GitHub
      config:
        clientID: $dex.github.clientId
        clientSecret: $dex.github.clientSecret
        orgs:
        - name: myorg
          teams:
          - platform-team
          - developers
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    # Admins have full access
    g, myorg:platform-team, role:admin

    # Developers can sync apps
    g, myorg:developers, role:developer

    # Developer role definition
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, */*, allow
    p, role:developer, repositories, get, *, allow
    p, role:developer, projects, get, *, allow

  scopes: '[groups, email]'
```

### Health Checks

**Custom Health Check:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.argoproj.io_Rollout: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.conditions ~= nil then
        for i, condition in ipairs(obj.status.conditions) do
          if condition.type == "Progressing" and condition.reason == "RolloutCompleted" then
            hs.status = "Healthy"
            hs.message = "Rollout completed"
            return hs
          end
        end
      end
    end
    hs.status = "Progressing"
    hs.message = "Rollout in progress"
    return hs
```
