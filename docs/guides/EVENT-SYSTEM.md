# PCL Event System Guide

> **Status**: Proposed (Phase 2 Implementation)
> **Last Updated**: 2026-01-17

The PCL Event System provides observability hooks into the runtime, enabling logging, analytics, cost tracking, database integration, and error monitoring.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Event Types](#event-types)
3. [Use Cases](#use-cases)
4. [Best Practices](#best-practices)
5. [API Reference](#api-reference)
6. [Advanced Patterns](#advanced-patterns)

---

## Quick Start

### Basic Event Listener

```typescript
import { PCLRuntime } from '@pcl/sdk';

const runtime = new PCLRuntime();

// Listen to persona execution
runtime.on('persona:before', (persona, query) => {
  console.log(`▶️ Executing ${persona.id}: ${query}`);
});

runtime.on('persona:after', (persona, result) => {
  console.log(`✅ Completed ${persona.id} in ${result.duration}ms`);
});

// Execute persona
await runtime.execute('ARCHI', 'Design a microservices architecture');
```

**Output**:

```
▶️ Executing ARCHI: Design a microservices architecture
✅ Completed ARCHI in 2340ms
```

---

## Event Types

### Persona Lifecycle

| Event            | Parameters          | Description             |
| ---------------- | ------------------- | ----------------------- |
| `persona:before` | `(persona, query)`  | Before persona executes |
| `persona:after`  | `(persona, result)` | After persona completes |
| `persona:error`  | `(persona, error)`  | When persona fails      |

### Workflow Lifecycle

| Event               | Parameters           | Description        |
| ------------------- | -------------------- | ------------------ |
| `workflow:start`    | `(workflow)`         | Workflow begins    |
| `workflow:step`     | `(step, result)`     | Each workflow step |
| `workflow:complete` | `(workflow, result)` | Workflow completes |
| `workflow:error`    | `(workflow, error)`  | Workflow fails     |

### LLM Integration

| Event          | Parameters             | Description        |
| -------------- | ---------------------- | ------------------ |
| `llm:call`     | `(provider, prompt)`   | Before LLM call    |
| `llm:response` | `(provider, response)` | After LLM responds |
| `llm:error`    | `(provider, error)`    | LLM call fails     |

---

## Use Cases

### 1. 📊 Logging & Observability

```typescript
import { createLogger } from 'winston';

const logger = createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: 'pcl-runtime.log' })],
});

runtime.on('persona:before', (persona, query) => {
  logger.info('persona_start', {
    personaId: persona.id,
    query: query,
    timestamp: new Date().toISOString(),
  });
});

runtime.on('persona:error', (persona, error) => {
  logger.error('persona_error', {
    personaId: persona.id,
    error: error.message,
    stack: error.stack,
  });
});
```

### 2. 📈 Analytics & Metrics

```typescript
import { Analytics } from '@segment/analytics-node';

const analytics = new Analytics({ writeKey: 'YOUR_KEY' });

runtime.on('persona:after', (persona, result) => {
  analytics.track({
    userId: 'system',
    event: 'Persona Execution',
    properties: {
      personaId: persona.id,
      duration: result.duration,
      tokensUsed: result.tokens,
      success: true,
    },
  });
});

runtime.on('workflow:complete', (workflow, result) => {
  analytics.track({
    userId: 'system',
    event: 'Workflow Completion',
    properties: {
      workflowId: workflow.id,
      steps: workflow.steps.length,
      totalDuration: result.totalDuration,
      success: true,
    },
  });
});
```

### 3. 💰 Cost Tracking

```typescript
class CostTracker {
  private totalCost = 0;

  private readonly costs = {
    'claude-3-sonnet': { input: 0.003, output: 0.015 }, // per 1K tokens
    'gpt-4': { input: 0.03, output: 0.06 },
  };

  attach(runtime: PCLRuntime) {
    runtime.on('llm:response', (provider, response) => {
      const rates = this.costs[provider];
      const cost =
        (response.usage.input_tokens / 1000) * rates.input +
        (response.usage.output_tokens / 1000) * rates.output;

      this.totalCost += cost;

      console.log(`💵 Call cost: $${cost.toFixed(4)}`);
      console.log(`💰 Total cost: $${this.totalCost.toFixed(4)}`);
    });
  }

  getTotal(): number {
    return this.totalCost;
  }
}

const tracker = new CostTracker();
tracker.attach(runtime);
```

### 4. 🗄️ Database Integration

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

runtime.on('persona:after', async (persona, result) => {
  await prisma.personaExecution.create({
    data: {
      personaId: persona.id,
      query: result.query,
      response: result.response,
      duration: result.duration,
      tokens: result.tokens,
      timestamp: new Date(),
    },
  });
});

runtime.on('workflow:complete', async (workflow, result) => {
  await prisma.workflowExecution.create({
    data: {
      workflowId: workflow.id,
      steps: workflow.steps.length,
      totalDuration: result.totalDuration,
      success: true,
      timestamp: new Date(),
    },
  });
});
```

### 5. 🚨 Error Tracking

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({ dsn: 'YOUR_DSN' });

runtime.on('persona:error', (persona, error) => {
  Sentry.captureException(error, {
    tags: {
      personaId: persona.id,
      component: 'persona-execution',
    },
    contexts: {
      persona: {
        id: persona.id,
        skills: persona.skills.map((s) => s.id),
      },
    },
  });
});

runtime.on('llm:error', (provider, error) => {
  Sentry.captureException(error, {
    tags: {
      provider: provider,
      component: 'llm-integration',
    },
  });
});
```

### 6. 📊 Progress Tracking

```typescript
import cliProgress from 'cli-progress';

const progressBar = new cliProgress.SingleBar(
  {},
  cliProgress.Presets.shades_classic
);

runtime.on('workflow:start', (workflow) => {
  progressBar.start(workflow.steps.length, 0);
  console.log(`🚀 Starting workflow: ${workflow.id}`);
});

runtime.on('workflow:step', (step, result) => {
  progressBar.increment();
  console.log(`✅ Completed step: ${step.id}`);
});

runtime.on('workflow:complete', (workflow, result) => {
  progressBar.stop();
  console.log(`🎉 Workflow complete: ${workflow.id}`);
});
```

---

## Best Practices

### ✅ DO

**1. Keep listeners lightweight**

```typescript
// ✅ GOOD: Fast, non-blocking
runtime.on('persona:before', (persona) => {
  console.log(`Starting ${persona.id}`);
});
```

**2. Handle errors in async listeners**

```typescript
// ✅ GOOD: Error handling
runtime.on('persona:after', async (persona, result) => {
  try {
    await db.save(result);
  } catch (error) {
    console.error('Failed to save result:', error);
  }
});
```

**3. Unsubscribe when done**

```typescript
// ✅ GOOD: Cleanup
const listener = (persona) => console.log(persona.id);
runtime.on('persona:before', listener);

// Later...
runtime.off('persona:before', listener);
```

**4. Use `once()` for one-time events**

```typescript
// ✅ GOOD: Auto-cleanup
runtime.once('workflow:complete', (workflow) => {
  console.log('First workflow done!');
});
```

### ❌ DON'T

**1. Block event loop**

```typescript
// ❌ BAD: Synchronous heavy computation
runtime.on('persona:after', (persona, result) => {
  const hash = expensiveSyncHash(result.response); // Blocks!
});

// ✅ GOOD: Offload to worker thread
runtime.on('persona:after', async (persona, result) => {
  await workerPool.hash(result.response);
});
```

**2. Throw unhandled errors**

```typescript
// ❌ BAD: Crashes runtime
runtime.on('persona:after', (persona, result) => {
  JSON.parse(result.invalidJson); // Throws!
});

// ✅ GOOD: Catch errors
runtime.on('persona:after', (persona, result) => {
  try {
    JSON.parse(result.maybeJson);
  } catch (error) {
    console.error('Parse failed:', error);
  }
});
```

**3. Create memory leaks**

```typescript
// ❌ BAD: Listener never cleaned up
function setupTracking() {
  const tracker = new Tracker();
  runtime.on('persona:after', (persona) => {
    tracker.record(persona); // `tracker` never freed!
  });
}

// ✅ GOOD: Explicit cleanup
function setupTracking() {
  const tracker = new Tracker();
  const listener = (persona) => tracker.record(persona);

  runtime.on('persona:after', listener);

  return () => {
    runtime.off('persona:after', listener);
    tracker.dispose();
  };
}
```

---

## API Reference

### `runtime.on(event, listener)`

Subscribe to an event.

```typescript
runtime.on('persona:before', (persona, query) => {
  // Handle event
});
```

### `runtime.once(event, listener)`

Subscribe to event, auto-unsubscribe after first emission.

```typescript
runtime.once('workflow:complete', (workflow) => {
  console.log('First workflow done!');
});
```

### `runtime.off(event, listener)`

Unsubscribe from event.

```typescript
const listener = (persona) => console.log(persona.id);
runtime.on('persona:before', listener);
runtime.off('persona:before', listener);
```

### `runtime.removeAllListeners(event?)`

Remove all listeners for an event (or all events if no event specified).

```typescript
runtime.removeAllListeners('persona:before'); // Remove all 'persona:before' listeners
runtime.removeAllListeners(); // Remove ALL listeners
```

---

## Advanced Patterns

### Composable Event Handlers

```typescript
class EventHandler {
  attach(runtime: PCLRuntime) {
    throw new Error('Not implemented');
  }
}

class LoggingHandler extends EventHandler {
  attach(runtime: PCLRuntime) {
    runtime.on('persona:before', (persona) => {
      console.log(`Starting ${persona.id}`);
    });
  }
}

class CostTrackingHandler extends EventHandler {
  private cost = 0;

  attach(runtime: PCLRuntime) {
    runtime.on('llm:response', (provider, response) => {
      this.cost += calculateCost(provider, response);
    });
  }
}

// Compose multiple handlers
const handlers = [new LoggingHandler(), new CostTrackingHandler()];

handlers.forEach((h) => h.attach(runtime));
```

### Event Middleware Chain

```typescript
class EventMiddleware {
  private middlewares: Function[] = [];

  use(fn: Function) {
    this.middlewares.push(fn);
  }

  async execute(event: string, ...args: any[]) {
    for (const mw of this.middlewares) {
      await mw(event, ...args);
    }
  }
}

const middleware = new EventMiddleware();

middleware.use(async (event, ...args) => {
  console.log(`Event: ${event}`);
});

middleware.use(async (event, ...args) => {
  await logToDatabase(event, args);
});

runtime.on('persona:after', (...args) => {
  middleware.execute('persona:after', ...args);
});
```

---

## Migration Guide

### From Claude Code Hooks (If Applicable)

**Before (Shell Commands)**:

```json
{
  "hooks": {
    "on_persona_start": "echo 'Starting persona'",
    "on_persona_end": "notify-send 'Persona complete'"
  }
}
```

**After (Event Listeners)**:

```typescript
runtime.on('persona:before', (persona) => {
  console.log('Starting persona');
});

runtime.on('persona:after', (persona) => {
  notify('Persona complete');
});
```

---

## Troubleshooting

### Events not firing?

1. Check event name spelling
2. Verify listener is attached before execution
3. Check for errors in listener (use try/catch)

### Memory leaks?

1. Always clean up listeners with `off()` or `removeAllListeners()`
2. Use `once()` for one-time events
3. Avoid closures that capture large objects

### Performance issues?

1. Profile listeners with `console.time()`
2. Offload heavy work to worker threads
3. Batch database writes instead of per-event

---

## See Also

- [API Reference: Events](../api/EVENTS.md)
- [ADR-001: Event System Architecture](../../.roadmap/decisions/ADR-001-event-system.md)
- [Runtime API](../api/RUNTIME.md)

---

**Questions?** Open an issue on [GitHub](https://github.com/pcl-lang/pcl/issues)
