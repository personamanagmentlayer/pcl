---
name: cicd-expert
version: 1.1.0
description: >-
  Expert-level CI/CD with GitHub Actions, Jenkins, deployment pipelines, and automation.
  Use when the user mentions CI/CD, GitHub Actions, Jenkins, GitLab CI, deployment, or
  automation, or when the task involves CI/CD Fundamentals, Pipeline Design, Workflow
  Basics, or Docker Build and Push.
category: devops
tags:
  [cicd, github-actions, jenkins, gitlab-ci, deployment, automation, pipeline]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(git:*, docker:*, kubectl:*)
---

# CI/CD Expert

Expert guidance for Continuous Integration and Continuous Deployment, including GitHub Actions, Jenkins, GitLab CI, deployment strategies, and automation best practices.

## Core Concepts

### CI/CD Fundamentals

- Continuous Integration (CI)
- Continuous Delivery vs Deployment
- Build automation
- Test automation
- Artifact management
- Deployment strategies (blue-green, canary, rolling)

### Pipeline Design

- Pipeline stages and jobs
- Parallel execution
- Dependencies and artifacts
- Caching strategies
- Matrix builds
- Conditional execution

### Security

- Secret management
- Dependency scanning
- SAST/DAST
- Container scanning
- Supply chain security
- SBOM generation

## GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - security
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: '/certs'
  IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA

default:
  image: node:20-alpine
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
      - .npm/

build:
  stage: build
  script:
    - npm ci --cache .npm --prefer-offline
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week

test:unit:
  stage: test
  needs: [build]
  script:
    - npm ci --cache .npm --prefer-offline
    - npm run test:unit -- --coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      junit: test-results/unit/*.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

test:integration:
  stage: test
  needs: [build]
  services:
    - postgres:15
    - redis:7
  variables:
    POSTGRES_DB: testdb
    POSTGRES_USER: testuser
    POSTGRES_PASSWORD: testpass
  script:
    - npm ci --cache .npm --prefer-offline
    - npm run test:integration
  artifacts:
    reports:
      junit: test-results/integration/*.xml

security:sast:
  stage: security
  image: returntocorp/semgrep
  script:
    - semgrep --config=auto --json --output=sast-report.json .
  artifacts:
    reports:
      sast: sast-report.json

security:dependency:
  stage: security
  script:
    - npm audit --audit-level=high
  allow_failure: true

docker:build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $IMAGE_TAG .
    - docker push $IMAGE_TAG
  only:
    - main
    - tags

deploy:staging:
  stage: deploy
  image: bitnami/kubectl:latest
  environment:
    name: staging
    url: https://staging.example.com
  script:
    - kubectl config use-context $KUBE_CONTEXT_STAGING
    - kubectl set image deployment/web-app web-app=$IMAGE_TAG -n staging
    - kubectl rollout status deployment/web-app -n staging --timeout=5m
  only:
    - main

deploy:production:
  stage: deploy
  image: bitnami/kubectl:latest
  environment:
    name: production
    url: https://example.com
  script:
    - kubectl config use-context $KUBE_CONTEXT_PRODUCTION
    - kubectl set image deployment/web-app web-app=$IMAGE_TAG -n production
    - kubectl rollout status deployment/web-app -n production --timeout=5m
  when: manual
  only:
    - tags
```

## Deployment Strategies

### Blue-Green Deployment

```yaml
# GitHub Actions
- name: Blue-Green Deployment
  run: |
    # Deploy to green environment
    kubectl apply -f k8s/green/
    kubectl rollout status deployment/app-green -n production

    # Run smoke tests
    npm run test:smoke -- --env=green

    # Switch traffic to green
    kubectl patch service app -n production -p '{"spec":{"selector":{"version":"green"}}}'

    # Keep blue for rollback
    echo "Blue environment kept for rollback"
```

### Canary Deployment

```yaml
# Deploy canary (10% traffic)
- name: Deploy Canary
  run: |
    kubectl apply -f k8s/canary/
    kubectl set image deployment/app-canary app=$IMAGE_TAG -n production

    # Monitor metrics
    sleep 300

    # Check error rate
    ERROR_RATE=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=error_rate" | jq -r '.data.result[0].value[1]')

    if (( $(echo "$ERROR_RATE < 0.01" | bc -l) )); then
      # Promote canary to stable
      kubectl set image deployment/app-stable app=$IMAGE_TAG -n production
      kubectl scale deployment/app-canary --replicas=0 -n production
    else
      # Rollback canary
      kubectl scale deployment/app-canary --replicas=0 -n production
      exit 1
    fi
```

### Rolling Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2 # Max 2 pods above desired count
      maxUnavailable: 1 # Max 1 pod unavailable during update
  template:
    spec:
      containers:
        - name: app
          image: myapp:v2
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
```

## Best Practices

### Pipeline Design

- Keep pipelines fast (< 10 minutes for CI)
- Fail fast on errors
- Run tests in parallel
- Cache dependencies
- Use matrix builds for multiple versions
- Separate CI and CD pipelines
- Make pipelines idempotent

### Security

- Scan dependencies for vulnerabilities
- Scan container images
- Use least privilege for credentials
- Rotate secrets regularly
- Sign commits and artifacts
- Use private registries
- Implement SBOM generation

### Artifact Management

- Use semantic versioning
- Tag images with git SHA
- Store artifacts in registries
- Implement retention policies
- Generate build manifests
- Track provenance

### Monitoring & Observability

- Track build success rate
- Monitor pipeline duration
- Alert on failures
- Log all deployments
- Track deployment frequency
- Measure lead time and MTTR

## Anti-Patterns to Avoid

❌ **No automated tests**: Deployments without tests are risky
❌ **Manual deployments**: Automate all deployments
❌ **Shared credentials**: Use role-based access
❌ **No rollback strategy**: Always have a rollback plan
❌ **Long-running pipelines**: Keep pipelines fast
❌ **Environment drift**: Use IaC for all environments
❌ **No monitoring**: Track deployment health
❌ **Direct production access**: Deploy through pipelines only

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [GitHub Actions](references/GITHUB_ACTIONS.md) — Workflow Basics, Docker Build and Push, Deployment Workflow, Reusable Workflows, Composite Actions
- [Jenkins](references/JENKINS.md) — Declarative Pipeline, Shared Library

## Resources

- GitHub Actions: https://docs.github.com/en/actions
- Jenkins: https://www.jenkins.io/doc/
- GitLab CI: https://docs.gitlab.com/ee/ci/
- Argo CD: https://argo-cd.readthedocs.io/
- Tekton: https://tekton.dev/docs/
