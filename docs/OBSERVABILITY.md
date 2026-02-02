# PCL Observability Guide

**Version:** 1.0.0
**Last Updated:** 2026-01-23
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [OpenTelemetry Integration](#opentelemetry-integration)
4. [Metrics Collection](#metrics-collection)
5. [Distributed Tracing](#distributed-tracing)
6. [Structured Logging](#structured-logging)
7. [Health Checks](#health-checks)
8. [Performance Profiling](#performance-profiling)
9. [Cost Tracking](#cost-tracking)
10. [HTTP API Reference](#http-api-reference)
11. [SLO & Error Budget Tracking](#slo--error-budget-tracking)
12. [Grafana Dashboards](#grafana-dashboards)
13. [Standards Compliance](#standards-compliance)
14. [Best Practices](#best-practices)

---

## Overview

PCL's observability suite provides comprehensive monitoring, tracing, and debugging capabilities for production deployments. Built on OpenTelemetry standards, it integrates seamlessly with industry-standard tools like Prometheus, Jaeger, and Grafana.

### Features

- **OpenTelemetry Integration** - Standards-based telemetry collection
- **Prometheus Metrics** - 20+ pre-configured metrics for runtime monitoring
- **Distributed Tracing** - End-to-end request tracing across workflows, personas, and providers
- **Structured Logging** - Context-aware logging with trace correlation
- **Health Checks** - Component-level health monitoring
- **Performance Profiling** - CPU, memory, and event loop profiling
- **Cost Tracking** - Real-time cost monitoring for AI provider usage

---

## Quick Start

### Installation

Observability dependencies are included by default:

```bash
npm install @pcl/sdk
```

### Basic Setup

```typescript
import { initTelemetry } from '@pcl/observability';

// Initialize telemetry
initTelemetry({
  serviceName: 'my-pcl-app',
  environment: 'production',
  enableTracing: true,
  enableMetrics: true,
  exporters: {
    prometheus: {
      port: 9464,
      endpoint: '/metrics',
    },
  },
});
```

### Verify Setup

```bash
# Check Prometheus metrics
curl http://localhost:9464/metrics

# Check health status
curl http://localhost:3000/api/v1/health/status
```

---

## OpenTelemetry Integration

### Configuration

```typescript
import { initTelemetry, TelemetryConfig } from '@pcl/observability';

const config: TelemetryConfig = {
  serviceName: 'pcl-runtime',
  serviceVersion: '1.0.0',
  environment: 'production',
  enableTracing: true,
  enableMetrics: true,
  exporters: {
    prometheus: {
      port: 9464,
      endpoint: '/metrics',
      host: '0.0.0.0',
    },
    jaeger: {
      endpoint: 'http://localhost:14268/api/traces',
    },
    console: {
      enabled: true,
      logLevel: 'info',
    },
  },
};

initTelemetry(config);
```

### Shutdown

```typescript
import { shutdown } from '@pcl/observability';

// Graceful shutdown
await shutdown();
```

### Environment Variables

```bash
# Service identification
OTEL_SERVICE_NAME=pcl-runtime
OTEL_SERVICE_VERSION=1.0.0

# Exporter endpoints
OTEL_EXPORTER_JAEGER_ENDPOINT=http://localhost:14268/api/traces
OTEL_EXPORTER_PROMETHEUS_PORT=9464

# Logging
OTEL_LOG_LEVEL=info
```

---

## Metrics Collection

### Available Metrics

#### Persona Metrics

```
pcl_persona_activations_total{persona_id}
pcl_persona_messages_total{persona_id}
pcl_persona_tokens_used_total{persona_id}
pcl_persona_response_duration_seconds{persona_id}
pcl_active_personas{persona_id}
```

#### Team Metrics

```
pcl_team_merges_total{team_id, merge_mode}
pcl_team_response_duration_seconds{team_id, merge_mode}
pcl_active_teams{team_id}
```

#### Workflow Metrics

```
pcl_workflow_executions_total{workflow_name, status}
pcl_workflow_duration_seconds{workflow_name, status}
pcl_workflow_steps_total{workflow_name, step_name}
pcl_active_workflows{workflow_name}
```

#### Provider Metrics

```
pcl_provider_requests_total{provider, model}
pcl_provider_errors_total{provider, error_type}
pcl_provider_latency_seconds{provider, model}
pcl_provider_tokens_total{provider, model, type}
pcl_provider_cost_usd{provider, model}
```

#### Scheduler Metrics

```
pcl_scheduler_queued{priority}
pcl_scheduler_running{priority}
pcl_scheduler_completed_total{priority}
pcl_scheduler_failed_total{priority}
pcl_scheduler_wait_time_seconds{priority}
pcl_scheduler_execution_time_seconds{priority}
```

### Recording Metrics

```typescript
import { getMetricsCollector } from '@pcl/observability';

const metrics = getMetricsCollector();

// Record persona activation
metrics.recordPersonaActivation('researcher');

// Record message processing
metrics.recordPersonaMessage('researcher', 250, 1500); // 250ms, 1500 tokens

// Record workflow execution
metrics.recordWorkflowStart('analysis-pipeline');
// ... workflow execution ...
metrics.recordWorkflowEnd('analysis-pipeline', 5000, 'success'); // 5000ms
```

### Prometheus Scraping

Configure Prometheus to scrape PCL metrics:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'pcl-runtime'
    static_configs:
      - targets: ['localhost:9464']
    scrape_interval: 15s
```

---

## Distributed Tracing

### Automatic Instrumentation

HTTP requests are automatically instrumented when telemetry is enabled.

### Manual Instrumentation

```typescript
import { getTracingInstrumentation } from '@pcl/observability';

const tracing = getTracingInstrumentation();

// Create workflow span
const workflowSpan = tracing.createWorkflowSpan({
  workflowName: 'data-pipeline',
  input: { query: 'analyze trends' },
});

try {
  // Create nested persona span
  const personaSpan = tracing.createPersonaSpan({
    personaId: 'analyst',
    role: 'data-analyst',
    parent: workflowSpan,
  });

  // Add events
  tracing.addSpanEvent(personaSpan, 'processing.started');

  // Your logic here

  tracing.setSpanOK(personaSpan);
  tracing.endSpan(personaSpan);

  tracing.setSpanOK(workflowSpan);
} catch (error) {
  tracing.setSpanError(workflowSpan, error);
  throw error;
} finally {
  tracing.endSpan(workflowSpan);
}
```

### Using Span Helpers

```typescript
// Async function with span
await tracing.withSpan('database-query', async (span) => {
  tracing.setSpanAttributes(span, {
    'db.system': 'postgresql',
    'db.statement': 'SELECT * FROM users',
  });

  const result = await db.query('SELECT * FROM users');
  return result;
});

// Sync function with span
const result = tracing.withSpanSync('calculation', (span) => {
  tracing.setSpanAttributes(span, { 'calc.type': 'aggregate' });
  return performCalculation();
});
```

### Jaeger Setup

```bash
# Run Jaeger all-in-one
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 14268:14268 \
  jaegertracing/all-in-one:latest

# View traces at http://localhost:16686
```

---

## Structured Logging

### Basic Usage

```typescript
import { getLogger } from '@pcl/observability';

const logger = getLogger({ component: 'workflow-executor' });

logger.info('Workflow started', { workflowName: 'analysis' });
logger.warn('High memory usage detected', { heapUsed: 95 });
logger.error('Provider request failed', new Error('Timeout'), {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet',
});
```

### Child Loggers

```typescript
const baseLogger = getLogger({ service: 'pcl-runtime' });
const workflowLogger = baseLogger.child({ workflow: 'analysis-pipeline' });

workflowLogger.info('Step 1 complete'); // Includes workflow context
```

### Log Levels

```typescript
import { createLogger } from '@pcl/observability';

const logger = createLogger({
  minLevel: 'warn', // Only log warn and error
  includeTrace: true, // Include trace IDs
});

logger.setLevel('debug'); // Change level at runtime
```

### Log Output Format

```json
{
  "timestamp": "2026-01-23T10:30:45.123Z",
  "level": "info",
  "message": "Workflow completed",
  "context": {
    "component": "workflow-executor",
    "workflow": "analysis-pipeline"
  },
  "metadata": {
    "duration": 5230,
    "status": "success"
  },
  "traceId": "a1b2c3d4e5f6g7h8",
  "spanId": "i9j0k1l2m3n4"
}
```

---

## Health Checks

### Endpoints

#### Liveness Probe

```bash
GET /api/v1/health/liveness
# Returns 200 if service is alive
```

#### Readiness Probe

```bash
GET /api/v1/health/readiness
# Returns 200 if service is ready to accept traffic
```

#### Detailed Status

```bash
GET /api/v1/health/status
# Returns detailed component health
```

### Response Format

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-23T10:30:45.123Z",
    "uptime": 3600,
    "version": "1.0.0",
    "components": {
      "runtime": {
        "status": "healthy",
        "metadata": {
          "heapUsedPercent": 45,
          "heapUsed": 123456789,
          "heapTotal": 274877906
        }
      },
      "eventLoop": {
        "status": "healthy",
        "metadata": {
          "lagMs": 2
        }
      }
    }
  }
}
```

### Registering Custom Health Checks

```typescript
import { getHealthAggregator } from '@pcl/observability';

const health = getHealthAggregator();

health.registerCheck('database', async () => {
  try {
    await db.ping();
    return { status: 'healthy' };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Database connection failed: ${error.message}`,
    };
  }
});

health.registerCheck('cache', async () => {
  const latency = await cache.ping();
  return {
    status: latency < 100 ? 'healthy' : 'degraded',
    metadata: { latencyMs: latency },
  };
});
```

### Kubernetes Integration

```yaml
# Deployment configuration
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: pcl-runtime
      livenessProbe:
        httpGet:
          path: /api/v1/health/liveness
          port: 3000
        initialDelaySeconds: 10
        periodSeconds: 30

      readinessProbe:
        httpGet:
          path: /api/v1/health/readiness
          port: 3000
        initialDelaySeconds: 5
        periodSeconds: 10
```

---

## Performance Profiling

### Endpoints

#### Start Profiling

```bash
POST /api/v1/profiler/start
```

#### Stop Profiling

```bash
POST /api/v1/profiler/stop
# Returns profile data
```

#### Memory Snapshot

```bash
GET /api/v1/profiler/memory
```

#### Runtime Statistics

```bash
GET /api/v1/profiler/stats
```

### Example Usage

```bash
# Start profiling
curl -X POST http://localhost:3000/api/v1/profiler/start

# Run your workload...

# Stop and get profile
curl -X POST http://localhost:3000/api/v1/profiler/stop
```

### Memory Snapshot Response

```json
{
  "success": true,
  "data": {
    "heapUsed": 123456789,
    "heapTotal": 274877906,
    "external": 12345678,
    "arrayBuffers": 1234567,
    "rss": 345678901,
    "timestamp": "2026-01-23T10:30:45.123Z",
    "formatted": {
      "heapUsed": "117.75 MB",
      "heapTotal": "262.14 MB",
      "external": "11.77 MB",
      "arrayBuffers": "1.18 MB",
      "rss": "329.64 MB"
    }
  }
}
```

### Runtime Stats Response

```json
{
  "success": true,
  "data": {
    "heapUsed": 123456789,
    "heapTotal": 274877906,
    "external": 12345678,
    "rss": 345678901,
    "eventLoopLag": 2,
    "activeHandles": 15,
    "activeRequests": 3,
    "uptime": 3600,
    "cpuUsage": {
      "user": 1234567,
      "system": 234567
    }
  }
}
```

---

## Cost Tracking

### Endpoints

#### Cost Summary

```bash
GET /api/v1/costs
```

#### Costs by Provider

```bash
GET /api/v1/costs/providers
```

#### Costs by Model

```bash
GET /api/v1/costs/models
```

#### Export Cost Data

```bash
# Export as JSON
GET /api/v1/costs/export?format=json

# Export as CSV
GET /api/v1/costs/export?format=csv
```

#### Reset Tracking

```bash
POST /api/v1/costs/reset
```

### Response Format

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCost": 45.67,
      "totalTokens": 1234567,
      "totalPromptTokens": 800000,
      "totalCompletionTokens": 434567,
      "requestCount": 156,
      "byProvider": {
        "anthropic": {
          "cost": 30.45,
          "tokens": 800000,
          "requests": 100
        },
        "openai": {
          "cost": 15.22,
          "tokens": 434567,
          "requests": 56
        }
      },
      "byModel": {
        "claude-3-5-sonnet-20241022": {
          "cost": 25.3,
          "tokens": 600000,
          "requests": 80
        },
        "gpt-4-turbo": {
          "cost": 10.15,
          "tokens": 300000,
          "requests": 40
        }
      }
    },
    "timestamp": "2026-01-23T10:30:45.123Z"
  }
}
```

---

## HTTP API Reference

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication

Cost tracking and profiler endpoints may require authentication in production. Configure via HTTP server settings.

### Common Response Format

```typescript
// Success response
{
  "success": true,
  "data": { ... }
}

// Error response
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "timestamp": "2026-01-23T10:30:45.123Z"
  }
}
```

### Rate Limiting

All API endpoints are subject to rate limiting:

- Default: 100 requests per minute per IP
- Configurable via server configuration

---

## Grafana Dashboards

### Example Dashboard Panels

#### Request Rate

```promql
rate(pcl_persona_messages_total[5m])
```

#### Response Time (95th percentile)

```promql
histogram_quantile(0.95,
  rate(pcl_persona_response_duration_seconds_bucket[5m])
)
```

#### Error Rate

```promql
rate(pcl_workflow_executions_total{status="failure"}[5m]) /
rate(pcl_workflow_executions_total[5m])
```

#### Cost Over Time

```promql
increase(pcl_provider_cost_usd[1h])
```

#### Active Resources

```promql
pcl_active_personas + pcl_active_teams + pcl_active_workflows
```

### Dashboard JSON

Example Grafana dashboard JSON is available in the repository at `examples/grafana/pcl-dashboard.json`.

---

## SLO & Error Budget Tracking

PCL implements Service Level Objectives (SLO) and error budget tracking based on Google SRE practices.

### Configuration

```typescript
import { getSLORegistry, CommonSLOs } from '@pcl/observability';

const registry = getSLORegistry();

// Register an SLO
registry.register({
  name: 'api-availability',
  target: 0.999, // 99.9% success rate
  windowSeconds: 30 * 24 * 60 * 60, // 30-day rolling window
  description: '99.9% API availability over 30 days',
});
```

### Common SLOs

```typescript
// 99.9% availability (allows 0.1% errors)
CommonSLOs.HIGH_AVAILABILITY;

// 99.5% availability (allows 0.5% errors)
CommonSLOs.STANDARD_AVAILABILITY;

// 99% availability (allows 1% errors)
CommonSLOs.BASIC_AVAILABILITY;

// 95% success rate for AI operations
CommonSLOs.AI_OPERATION_SUCCESS;
```

### Recording Results

```typescript
const tracker = registry.get('api-availability');

// Record successful request
tracker.recordSuccess();

// Record failed request
tracker.recordFailure();
```

### HTTP API

```bash
# Get all SLO statuses
GET /api/v1/slo

# Get specific SLO
GET /api/v1/slo/api-availability

# Register new SLO
POST /api/v1/slo

# Record request result
POST /api/v1/slo/api-availability/record

# Get common presets
GET /api/v1/slo/presets/common
```

### SLO Status Response

```json
{
  "success": true,
  "data": {
    "name": "api-availability",
    "target": 0.999,
    "current": 0.9995,
    "errorBudget": {
      "total": 100,
      "consumed": 50,
      "remaining": 50,
      "consumedPercent": 50
    },
    "metrics": {
      "totalRequests": 100000,
      "successfulRequests": 99950,
      "failedRequests": 50
    },
    "healthy": true
  }
}
```

---

## Standards Compliance

PCL implements multiple industry standards for error handling and observability:

### RFC 7807 - Problem Details for HTTP APIs

All HTTP errors include RFC 7807 fields:

```json
{
  "success": false,
  "error": {
    "type": "/errors/validation",
    "title": "Validation Error",
    "status": 400,
    "detail": "Invalid request data",
    "instance": "/api/v1/artifacts/123",
    "code": "VALIDATION_ERROR",
    "traceId": "550e8400e29b41d4a716446655440000"
  }
}
```

### OpenTelemetry Semantic Conventions

PCL uses semantic conventions for AI/LLM metrics:

```typescript
// Semantic metric names
ai.persona.activations.total;
gen_ai.client.operation.duration;
gen_ai.client.token.usage;

// Semantic attributes
gen_ai.system; // "anthropic", "openai"
gen_ai.request.model; // "claude-3-5-sonnet"
gen_ai.usage.input_tokens; // Token count
```

For complete standards compliance details, see [STANDARDS-COMPLIANCE.md](STANDARDS-COMPLIANCE.md).

---

## Best Practices

### 1. Enable Telemetry in Production

Always enable telemetry in production for visibility:

```typescript
const isProd = process.env.NODE_ENV === 'production';

initTelemetry({
  serviceName: 'pcl-runtime',
  environment: isProd ? 'production' : 'development',
  enableTracing: isProd,
  enableMetrics: true,
});
```

### 2. Use Structured Logging

Prefer structured logging with context:

```typescript
// Good
logger.info('Request processed', {
  requestId: 'abc123',
  duration: 250,
  status: 'success',
});

// Avoid
console.log('Request abc123 processed in 250ms with status success');
```

### 3. Monitor Cost in Real-Time

Set up alerts for unexpected cost increases:

```promql
# Alert if hourly cost exceeds $10
increase(pcl_provider_cost_usd[1h]) > 10
```

### 4. Profile Regularly

Run profiling sessions during load testing to identify bottlenecks before production.

### 5. Component Health Checks

Register health checks for all critical components (database, cache, external APIs).

### 6. Trace Context Propagation

Ensure trace context is propagated across async boundaries and external calls.

### 7. Sampling for High-Volume

In high-volume scenarios, use trace sampling to reduce overhead:

```typescript
initTelemetry({
  // ... other config
  samplingRatio: 0.1, // Sample 10% of traces
});
```

### 8. Metric Cardinality

Avoid high-cardinality labels (e.g., user IDs) in metrics to prevent memory issues.

### 9. Graceful Shutdown

Always shut down telemetry gracefully:

```typescript
process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});
```

### 10. Security

Protect profiling and cost endpoints in production:

```typescript
app.use('/api/v1/profiler', authMiddleware);
app.use('/api/v1/costs', authMiddleware);
```

---

## Troubleshooting

### Metrics Not Appearing

1. Check Prometheus exporter is running:

   ```bash
   curl http://localhost:9464/metrics
   ```

2. Verify telemetry initialization:
   ```typescript
   import { isInitialized_ } from '@pcl/observability';
   console.log('Telemetry initialized:', isInitialized_());
   ```

### Traces Not in Jaeger

1. Verify Jaeger endpoint configuration
2. Check trace sampling rate
3. Ensure HTTP instrumentation is enabled

### High Memory Usage

1. Check for metric cardinality issues
2. Review active spans (may not be closed)
3. Monitor event loop lag

---

## Next Steps

- Explore [Prometheus documentation](https://prometheus.io/docs/)
- Learn about [OpenTelemetry](https://opentelemetry.io/)
- Set up [Grafana](https://grafana.com/) for visualization
- Configure [Jaeger](https://www.jaegertracing.io/) for distributed tracing

---

**Questions or Issues?**
Report issues at: https://github.com/personalayer/pcl/issues
