---
name: monitoring-expert
version: 1.1.0
description: >-
  Expert-level monitoring and observability with Prometheus, Grafana, logging, and
  alerting. Use when the user mentions observability, Prometheus, Grafana, logging,
  metrics, or alerting, or when the task involves The Three Pillars of Observability,
  Monitoring Fundamentals, Prometheus Configuration, or Alert Rules.
category: devops
tags:
  [
    monitoring,
    observability,
    prometheus,
    grafana,
    logging,
    metrics,
    alerting,
    traces,
  ]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(docker:*, kubectl:*, promtool:*)
---

# Monitoring Expert

Expert guidance for monitoring, observability, and alerting using Prometheus, Grafana, logging systems, and distributed tracing.

## Core Concepts

### The Three Pillars of Observability

1. **Metrics** - Numerical measurements over time (Prometheus)
2. **Logs** - Discrete events (ELK, Loki)
3. **Traces** - Request flow through distributed systems (Jaeger, Tempo)

### Monitoring Fundamentals

- Golden Signals (Latency, Traffic, Errors, Saturation)
- RED Method (Rate, Errors, Duration)
- USE Method (Utilization, Saturation, Errors)
- Service Level Indicators (SLIs)
- Service Level Objectives (SLOs)
- Service Level Agreements (SLAs)

### Key Components

- Metric collection (exporters, agents)
- Time-series database
- Visualization (dashboards)
- Alerting (rules, receivers)
- Log aggregation
- Distributed tracing

## Alertmanager

### Configuration

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

route:
  receiver: 'default'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 4h

  routes:
    # Critical alerts to PagerDuty
    - match:
        severity: critical
      receiver: pagerduty
      continue: true

    # Warning alerts to Slack
    - match:
        severity: warning
      receiver: slack

    # Database alerts
    - match_re:
        service: database
      receiver: database-team

receivers:
  - name: 'default'
    email_configs:
      - to: 'team@example.com'
        from: 'alerts@example.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'alerts@example.com'
        auth_password: 'password'

  - name: 'slack'
    slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
        description: '{{ .GroupLabels.alertname }}'

  - name: 'database-team'
    slack_configs:
      - channel: '#database-alerts'
    email_configs:
      - to: 'dba-team@example.com'

inhibit_rules:
  # Suppress warning if critical alert is firing
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
```

## Grafana

### Dashboard Configuration (JSON)

```json
{
  "dashboard": {
    "title": "Application Metrics",
    "tags": ["app", "production"],
    "timezone": "browser",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "gridPos": { "x": 0, "y": 0, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (status)",
            "legendFormat": "{{ status }}"
          }
        ]
      },
      {
        "title": "P95 Latency",
        "type": "graph",
        "gridPos": { "x": 12, "y": 0, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p95"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "gridPos": { "x": 0, "y": 8, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "thresholds": {
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 0.01, "color": "yellow" },
                { "value": 0.05, "color": "red" }
              ]
            }
          }
        }
      }
    ]
  }
}
```

### Provisioning Data Sources

```yaml
# grafana/provisioning/datasources/prometheus.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: false
```

## Logging with Loki

### Loki Configuration

```yaml
# loki-config.yml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
  chunk_idle_period: 5m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2020-05-15
      store: boltdb
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 168h

storage_config:
  boltdb:
    directory: /tmp/loki/index
  filesystem:
    directory: /tmp/loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
```

### Promtail Configuration

```yaml
# promtail-config.yml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Application logs
  - job_name: app
    static_configs:
      - targets:
          - localhost
        labels:
          job: app
          __path__: /var/log/app/*.log

  # Docker logs
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        target_label: 'container'

  # Kubernetes logs
  - job_name: kubernetes
    kubernetes_sd_configs:
      - role: pod
    pipeline_stages:
      - docker: {}
    relabel_configs:
      - source_labels:
          - __meta_kubernetes_pod_name
        target_label: pod
      - source_labels:
          - __meta_kubernetes_namespace
        target_label: namespace
```

### LogQL Queries

```logql
# All logs for a job
{job="app"}

# Filter by level
{job="app"} |= "error"

# JSON parsing
{job="app"} | json | level="error"

# Rate of errors
rate({job="app"} |= "error" [5m])

# Count by pod
sum by (pod) (count_over_time({namespace="production"}[5m]))

# Extract and filter
{job="app"}
  | json
  | line_format "{{.timestamp}} {{.level}} {{.message}}"
  | level="error"

# Metrics from logs
sum(rate({job="app"} |= "status=500" [5m])) by (endpoint)
```

## Distributed Tracing

### Jaeger Setup

```yaml
# docker-compose.yml
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - '5775:5775/udp'
      - '6831:6831/udp'
      - '6832:6832/udp'
      - '5778:5778'
      - '16686:16686' # UI
      - '14268:14268' # Collector
      - '9411:9411' # Zipkin compatible
    environment:
      - COLLECTOR_ZIPKIN_HTTP_PORT=9411
```

### Application Instrumentation (Node.js)

```typescript
// Install: npm install jaeger-client opentracing
import { initTracer } from 'jaeger-client';

const config = {
  serviceName: 'my-app',
  sampler: {
    type: 'probabilistic',
    param: 1.0, // Sample 100% of traces
  },
  reporter: {
    logSpans: true,
    agentHost: 'localhost',
    agentPort: 6831,
  },
};

const tracer = initTracer(config);

// Trace HTTP request
app.get('/api/users/:id', async (req, res) => {
  const span = tracer.startSpan('get_user');
  span.setTag('user_id', req.params.id);

  try {
    // Database query
    const dbSpan = tracer.startSpan('db_query', { childOf: span });
    const user = await db.user.findById(req.params.id);
    dbSpan.finish();

    // External API call
    const apiSpan = tracer.startSpan('external_api', { childOf: span });
    const profile = await fetchUserProfile(user.id);
    apiSpan.finish();

    span.setTag('http.status_code', 200);
    res.json({ user, profile });
  } catch (error) {
    span.setTag('error', true);
    span.setTag('http.status_code', 500);
    span.log({ event: 'error', message: error.message });
    res.status(500).json({ error: error.message });
  } finally {
    span.finish();
  }
});
```

## Best Practices

### Metric Naming

- Use descriptive names: `http_requests_total` not `requests`
- Use units in name: `duration_seconds`, `bytes_total`
- Use `_total` suffix for counters
- Use `_bucket` suffix for histograms
- Use consistent label names

### Cardinality

- Avoid high-cardinality labels (user IDs, emails)
- Use bounded label values
- Aggregate when possible
- Monitor metric count

### Alert Design

- Alert on symptoms, not causes
- Set appropriate thresholds
- Include actionable annotations
- Group related alerts
- Use inhibition rules

### Dashboard Design

- One purpose per dashboard
- Use consistent time ranges
- Include SLOs/SLIs
- Add context with annotations
- Use appropriate visualization types

## Anti-Patterns to Avoid

❌ **No SLOs**: Define service level objectives
❌ **Alert fatigue**: Too many non-actionable alerts
❌ **High cardinality**: Labels with unbounded values
❌ **Missing instrumentation**: Instrument all critical paths
❌ **No runbooks**: Alerts should have clear remediation steps
❌ **Ignoring trends**: Monitor trends, not just current values
❌ **No log structure**: Use structured logging (JSON)
❌ **Missing context**: Include relevant labels and tags

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Prometheus](references/PROMETHEUS.md) — Installation (Docker), Prometheus Configuration, Alert Rules, PromQL Queries
- [Application Instrumentation](references/APPLICATION_INSTRUMENTATION.md) — Node.js (Express), Python (Flask), Go

## Resources

- Prometheus: https://prometheus.io/docs/
- Grafana: https://grafana.com/docs/
- Loki: https://grafana.com/docs/loki/
- Jaeger: https://www.jaegertracing.io/docs/
- OpenTelemetry: https://opentelemetry.io/docs/
- SRE Book: https://sre.google/books/
