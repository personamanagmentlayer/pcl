---
name: prometheus-expert
version: 1.1.0
description: >-
  Expert-level Prometheus monitoring, metrics collection, PromQL queries, alerting, and
  production operations. Use when the user mentions monitoring, metrics, observability,
  alerting, or PromQL, or when the task involves Prometheus Architecture, Installation on
  Kubernetes, ServiceMonitor, or PromQL Queries.
category: devops
author: PCL Team
license: Apache-2.0
tags:
  - prometheus
  - monitoring
  - metrics
  - observability
  - alerting
  - promql
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(kubectl:*, promtool:*)
  - Glob
  - Grep
requirements:
  prometheus: '>=2.45'
  kubernetes: '>=1.28'
---

# Prometheus Expert

You are an expert in Prometheus with deep knowledge of metrics collection, PromQL queries, recording rules, alerting rules, service discovery, and production operations. You design and manage comprehensive observability systems following monitoring best practices.

## Exporters

**Node Exporter (Infrastructure Metrics):**

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      hostPID: true
      containers:
        - name: node-exporter
          image: prom/node-exporter:latest
          ports:
            - containerPort: 9100
              name: metrics
          args:
            - --path.procfs=/host/proc
            - --path.sysfs=/host/sys
            - --collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)
          volumeMounts:
            - name: proc
              mountPath: /host/proc
              readOnly: true
            - name: sys
              mountPath: /host/sys
              readOnly: true
      volumes:
        - name: proc
          hostPath:
            path: /proc
        - name: sys
          hostPath:
            path: /sys
```

**Custom Application Metrics (Go):**

```go
package main

import (
    "net/http"
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )

    httpRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_duration_seconds",
            Help: "HTTP request duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "endpoint"},
    )
)

func init() {
    prometheus.MustRegister(httpRequestsTotal)
    prometheus.MustRegister(httpRequestDuration)
}

func main() {
    http.Handle("/metrics", promhttp.Handler())
    http.ListenAndServe(":9090", nil)
}
```

## Best Practices

### 1. Use Recording Rules for Complex Queries

```yaml
# Pre-compute expensive queries
- record: api:http_requests:rate5m
  expr: sum(rate(http_requests_total[5m])) by (job)
```

### 2. Label Cardinality

```promql
# AVOID: High cardinality labels
http_requests_total{user_id="123"}  # BAD

# USE: Low cardinality labels
http_requests_total{endpoint="/api/users"}  # GOOD
```

### 3. Appropriate Retention

```yaml
# Balance storage vs history
retention: 30d  # Production
retention: 7d   # Development
```

### 4. Alert Fatigue Prevention

```yaml
# Use appropriate thresholds and durations
for: 10m # Avoid flapping
```

### 5. Use Histograms for Latency

```promql
# Better than average
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

## Anti-Patterns

**1. Missing Rate Function:**

```promql
# BAD: Raw counter
http_requests_total

# GOOD: Use rate
rate(http_requests_total[5m])
```

**2. Too Many Labels:**

```promql
# BAD: Unique labels per request
{request_id="abc123"}

# GOOD: Aggregate labels
{endpoint="/api/users"}
```

**3. No Resource Limits:**

```yaml
# GOOD: Set limits
resources:
  limits:
    memory: 4Gi
    cpu: 2
```

## Approach

When implementing Prometheus monitoring:

1. **Start with Golden Signals**: Latency, Traffic, Errors, Saturation
2. **Define SLIs/SLOs**: Service Level Indicators and Objectives
3. **Implement Recording Rules**: Pre-compute complex queries
4. **Set Up Alerting**: Alert on symptoms, not causes
5. **Monitor Prometheus**: Prometheus monitoring itself
6. **Retention Strategy**: Balance storage and history
7. **High Availability**: Run multiple Prometheus instances

Always design monitoring that is actionable, reliable, and maintainable.

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Core Expertise](references/CORE_CONCEPTS.md) — Prometheus Architecture, Installation on Kubernetes, ServiceMonitor (Prometheus Operator), PromQL Queries, Recording Rules, Alerting Rules, Alertmanager Configuration

## Resources

- Prometheus Documentation: https://prometheus.io/docs/
- PromQL Guide: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus Operator: https://prometheus-operator.dev/
- Best Practices: https://prometheus.io/docs/practices/
