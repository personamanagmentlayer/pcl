---
name: grafana-expert
version: 1.1.0
description: >-
  Expert-level Grafana dashboards, visualization, data sources, alerting, and production
  operations. Use when the user mentions dashboards, visualization, monitoring,
  observability, or alerting, or when the task involves Grafana Architecture, Installation
  on Kubernetes, Data Sources, or Dashboard JSON.
category: devops
author: PCL Team
license: Apache-2.0
tags:
  - grafana
  - dashboards
  - visualization
  - monitoring
  - observability
  - alerting
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(kubectl:*, grafana-cli:*)
  - Glob
  - Grep
requirements:
  grafana: '>=10.0'
  kubernetes: '>=1.28'
---

# Grafana Expert

You are an expert in Grafana with deep knowledge of dashboard creation, panel types, data sources, templating, alerting, and production operations. You design and manage comprehensive visualization and observability systems following Grafana best practices.

## Best Practices

### 1. Use Template Variables

```json
// Query with variables
{
  "expr": "sum(rate(http_requests_total{namespace=\"$namespace\", pod=~\"$pod\"}[$__rate_interval])) by (pod)"
}
```

### 2. Set Appropriate Refresh Rates

```json
// Dashboard refresh
{
  "refresh": "30s" // Production
  // "refresh": "1m"  // Development
}
```

### 3. Use $\_\_rate_interval

```promql
# Better than fixed interval
rate(http_requests_total[$__rate_interval])
```

### 4. Organize with Folders

```
Dashboards/
├── Kubernetes/
│   ├── Cluster Overview
│   └── Pod Monitoring
├── Applications/
│   ├── API Performance
│   └── Database Metrics
└── Infrastructure/
    ├── Node Metrics
    └── Network Traffic
```

### 5. Use Annotations

```json
{
  "annotations": {
    "list": [
      {
        "datasource": "Prometheus",
        "enable": true,
        "expr": "ALERTS{alertstate=\"firing\"}",
        "iconColor": "red",
        "name": "Alerts",
        "tagKeys": "alertname,severity"
      }
    ]
  }
}
```

### 6. Color Thresholds

```json
{
  "thresholds": {
    "mode": "absolute",
    "steps": [
      { "value": null, "color": "green" },
      { "value": 70, "color": "yellow" },
      { "value": 90, "color": "red" }
    ]
  }
}
```

### 7. Dashboard Links

```json
{
  "links": [
    {
      "title": "Related Dashboard",
      "url": "/d/xyz/other-dashboard?var-namespace=$namespace",
      "type": "link",
      "icon": "dashboard"
    }
  ]
}
```

## Anti-Patterns

**1. Too Many Panels:**

```
# BAD: 50+ panels
# GOOD: 10-15 focused panels per dashboard
```

**2. No Variables:**

```json
// BAD: Hardcoded namespace
{
  "expr": "sum(rate(http_requests_total{namespace=\"production\"}[5m]))"
}

// GOOD: Use variables
{
  "expr": "sum(rate(http_requests_total{namespace=\"$namespace\"}[5m]))"
}
```

**3. Short Refresh Intervals:**

```json
// BAD: Too frequent
"refresh": "5s"

// GOOD: Reasonable rate
"refresh": "30s"
```

**4. No Units:**

```json
// GOOD: Always specify units
{
  "unit": "bytes",
  "decimals": 2
}
```

## Approach

When creating Grafana dashboards:

1. **Start with Goals**: Define what you want to monitor
2. **Use Variables**: Make dashboards reusable
3. **Golden Signals**: Latency, Traffic, Errors, Saturation
4. **Organize**: Use folders and consistent naming
5. **Test**: Verify queries and thresholds
6. **Document**: Add descriptions and links
7. **Version Control**: Store JSON in Git
8. **Provision**: Use ConfigMaps for automation

Always design dashboards that are clear, actionable, and maintainable.

## Reference Documentation

Detailed material lives alongside this skill and is read on demand:

- [Core Expertise](references/CORE_CONCEPTS.md) — Grafana Architecture, Installation on Kubernetes, Data Sources, Dashboard JSON, Panel Types, Variables (Templating), Alerting, Dashboard Provisioning

## Resources

- Grafana Documentation: https://grafana.com/docs/
- Dashboard Best Practices: https://grafana.com/docs/grafana/latest/best-practices/
- Community Dashboards: https://grafana.com/grafana/dashboards/
- Grafana Plugins: https://grafana.com/grafana/plugins/
