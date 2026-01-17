# Events API Reference

> **Status**: Proposed (Phase 2 Implementation)
> **Last Updated**: 2026-01-17

Complete reference for PCL Runtime event system.

---

## Table of Contents

1. [Overview](#overview)
2. [Event Emitter API](#event-emitter-api)
3. [Persona Events](#persona-events)
4. [Workflow Events](#workflow-events)
5. [LLM Events](#llm-events)
6. [Event Data Types](#event-data-types)

---

## Overview

The PCL Runtime extends Node.js `EventEmitter` to provide lifecycle hooks for observability, logging, analytics, and integration.

```typescript
import { PCLRuntime } from '@pcl/sdk';

const runtime = new PCLRuntime();

// Subscribe to events
runtime.on('persona:before', (persona, query) => {
  console.log(`Executing: ${persona.id}`);
});

// Execute personas, workflows, etc.
await runtime.execute('ARCHI', 'Design system');
```

---

## Event Emitter API

### `on(event, listener)`

Subscribes to an event. Listener is called every time the event is emitted.

```typescript
runtime.on(event: string, listener: (...args: any[]) => void): this
```

**Example**:

```typescript
runtime.on('persona:before', (persona, query) => {
  console.log(`Starting ${persona.id}`);
});
```

**Returns**: The runtime instance (for chaining).

---

### `once(event, listener)`

Subscribes to an event, but automatically unsubscribes after first emission.

```typescript
runtime.once(event: string, listener: (...args: any[]) => void): this
```

**Example**:

```typescript
runtime.once('workflow:complete', (workflow, result) => {
  console.log('First workflow completed!');
});
```

**Returns**: The runtime instance (for chaining).

---

### `off(event, listener)`

Unsubscribes a listener from an event.

```typescript
runtime.off(event: string, listener: (...args: any[]) => void): this
```

**Example**:

```typescript
const listener = (persona) => console.log(persona.id);
runtime.on('persona:before', listener);

// Later...
runtime.off('persona:before', listener);
```

**Returns**: The runtime instance (for chaining).

---

### `removeAllListeners(event?)`

Removes all listeners for a specific event, or all listeners if no event specified.

```typescript
runtime.removeAllListeners(event?: string): this
```

**Example**:

```typescript
// Remove all 'persona:before' listeners
runtime.removeAllListeners('persona:before');

// Remove ALL listeners
runtime.removeAllListeners();
```

**Returns**: The runtime instance (for chaining).

---

### `emit(event, ...args)`

Emits an event (typically called internally by the runtime).

```typescript
runtime.emit(event: string, ...args: any[]): boolean
```

**Returns**: `true` if event had listeners, `false` otherwise.

---

### `listenerCount(event)`

Returns the number of listeners for a specific event.

```typescript
runtime.listenerCount(event: string): number
```

**Example**:

```typescript
const count = runtime.listenerCount('persona:before');
console.log(`${count} listeners registered`);
```

---

### `listeners(event)`

Returns an array of listeners for a specific event.

```typescript
runtime.listeners(event: string): Function[]
```

**Example**:

```typescript
const listeners = runtime.listeners('persona:before');
console.log(`${listeners.length} listeners`);
```

---

## Persona Events

### `persona:before`

Emitted before a persona begins execution.

```typescript
runtime.on('persona:before', (persona: Persona, query: string) => void)
```

**Parameters**:

- `persona: Persona` - The persona being executed
- `query: string` - The user query/prompt

**Example**:

```typescript
runtime.on('persona:before', (persona, query) => {
  console.log(`▶️ ${persona.id}: ${query}`);
  console.log(`Skills: ${persona.skills.map((s) => s.id).join(', ')}`);
});
```

**Use Cases**:

- Logging execution start
- Metrics collection
- Request validation
- Rate limiting

---

### `persona:after`

Emitted after a persona completes execution successfully.

```typescript
runtime.on('persona:after', (persona: Persona, result: PersonaResult) => void)
```

**Parameters**:

- `persona: Persona` - The executed persona
- `result: PersonaResult` - Execution results

**Result Type**:

```typescript
interface PersonaResult {
  query: string; // Original query
  response: string; // Persona's response
  duration: number; // Execution time (ms)
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  provider: string; // LLM provider used
  model: string; // Model name
  metadata: {
    timestamp: Date;
    cost?: number;
  };
}
```

**Example**:

```typescript
runtime.on('persona:after', (persona, result) => {
  console.log(`✅ ${persona.id} completed in ${result.duration}ms`);
  console.log(`Tokens: ${result.tokens.total}`);
  console.log(`Response: ${result.response.substring(0, 100)}...`);
});
```

**Use Cases**:

- Logging results
- Cost tracking
- Database persistence
- Analytics

---

### `persona:error`

Emitted when a persona execution fails.

```typescript
runtime.on('persona:error', (persona: Persona, error: Error) => void)
```

**Parameters**:

- `persona: Persona` - The persona that failed
- `error: Error` - The error that occurred

**Example**:

```typescript
runtime.on('persona:error', (persona, error) => {
  console.error(`❌ ${persona.id} failed: ${error.message}`);
  console.error(error.stack);

  // Send to error tracking
  Sentry.captureException(error, {
    tags: { personaId: persona.id },
  });
});
```

**Use Cases**:

- Error logging
- Error tracking (Sentry, Rollbar)
- Retry logic
- Fallback strategies

---

## Workflow Events

### `workflow:start`

Emitted when a workflow begins execution.

```typescript
runtime.on('workflow:start', (workflow: Workflow) => void)
```

**Parameters**:

- `workflow: Workflow` - The workflow starting

**Workflow Type**:

```typescript
interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  metadata: {
    startTime: Date;
    estimatedDuration?: number;
  };
}
```

**Example**:

```typescript
runtime.on('workflow:start', (workflow) => {
  console.log(`🚀 Starting workflow: ${workflow.name}`);
  console.log(`Steps: ${workflow.steps.length}`);
  progressBar.start(workflow.steps.length, 0);
});
```

---

### `workflow:step`

Emitted after each workflow step completes.

```typescript
runtime.on('workflow:step', (step: WorkflowStep, result: any) => void)
```

**Parameters**:

- `step: WorkflowStep` - The completed step
- `result: any` - Step execution result

**Step Type**:

```typescript
interface WorkflowStep {
  id: string;
  personaId: string;
  query: string;
  dependencies: string[];
  metadata: {
    stepNumber: number;
    totalSteps: number;
  };
}
```

**Example**:

```typescript
runtime.on('workflow:step', (step, result) => {
  const progress = (step.metadata.stepNumber / step.metadata.totalSteps) * 100;
  console.log(
    `📍 Step ${step.metadata.stepNumber}/${step.metadata.totalSteps} (${progress.toFixed(0)}%)`
  );
  progressBar.increment();
});
```

---

### `workflow:complete`

Emitted when a workflow completes successfully.

```typescript
runtime.on('workflow:complete', (workflow: Workflow, result: WorkflowResult) => void)
```

**Parameters**:

- `workflow: Workflow` - The completed workflow
- `result: WorkflowResult` - Final results

**Result Type**:

```typescript
interface WorkflowResult {
  workflowId: string;
  steps: StepResult[];
  totalDuration: number;
  totalTokens: number;
  totalCost: number;
  success: boolean;
  metadata: {
    startTime: Date;
    endTime: Date;
  };
}
```

**Example**:

```typescript
runtime.on('workflow:complete', (workflow, result) => {
  console.log(`🎉 Workflow complete: ${workflow.name}`);
  console.log(`Duration: ${result.totalDuration}ms`);
  console.log(`Total cost: $${result.totalCost.toFixed(4)}`);
  progressBar.stop();
});
```

---

### `workflow:error`

Emitted when a workflow fails.

```typescript
runtime.on('workflow:error', (workflow: Workflow, error: Error) => void)
```

**Parameters**:

- `workflow: Workflow` - The failed workflow
- `error: Error` - The error that occurred

**Example**:

```typescript
runtime.on('workflow:error', (workflow, error) => {
  console.error(`❌ Workflow failed: ${workflow.name}`);
  console.error(`Error: ${error.message}`);
  progressBar.stop();

  // Notify team
  slack.send({
    channel: '#alerts',
    text: `Workflow ${workflow.name} failed: ${error.message}`,
  });
});
```

---

## LLM Events

### `llm:call`

Emitted before making an LLM API call.

```typescript
runtime.on('llm:call', (provider: string, prompt: string) => void)
```

**Parameters**:

- `provider: string` - LLM provider name (`'anthropic'`, `'openai'`, etc.)
- `prompt: string` - The prompt being sent

**Example**:

```typescript
runtime.on('llm:call', (provider, prompt) => {
  console.log(`📡 Calling ${provider}`);
  console.log(`Prompt length: ${prompt.length} chars`);
});
```

---

### `llm:response`

Emitted after receiving an LLM response.

```typescript
runtime.on('llm:response', (provider: string, response: LLMResponse) => void)
```

**Parameters**:

- `provider: string` - LLM provider name
- `response: LLMResponse` - The response data

**Response Type**:

```typescript
interface LLMResponse {
  content: string;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  metadata: {
    latency: number;
    cost?: number;
  };
}
```

**Example**:

```typescript
runtime.on('llm:response', (provider, response) => {
  console.log(`✅ ${provider} responded in ${response.metadata.latency}ms`);
  console.log(`Tokens: ${response.usage.total_tokens}`);

  // Track cost
  const cost = calculateCost(provider, response.usage);
  totalCost += cost;
});
```

---

### `llm:error`

Emitted when an LLM call fails.

```typescript
runtime.on('llm:error', (provider: string, error: Error) => void)
```

**Parameters**:

- `provider: string` - LLM provider name
- `error: Error` - The error that occurred

**Example**:

```typescript
runtime.on('llm:error', (provider, error) => {
  console.error(`❌ ${provider} call failed: ${error.message}`);

  if (error.message.includes('rate_limit')) {
    console.log('⏳ Rate limited, retrying in 60s...');
  }
});
```

---

## Event Data Types

### Complete Type Definitions

```typescript
// Core types
interface Persona {
  id: string;
  name: string;
  intent: string;
  skills: Skill[];
  extends?: string[];
  implements?: string[];
  metadata: Record<string, any>;
}

interface Skill {
  id: string;
  name: string;
  type: 'foundation' | 'technical' | 'specialized';
  description: string;
}

interface PersonaResult {
  query: string;
  response: string;
  duration: number;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  provider: string;
  model: string;
  metadata: {
    timestamp: Date;
    cost?: number;
  };
}

interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  metadata: {
    startTime: Date;
    estimatedDuration?: number;
  };
}

interface WorkflowStep {
  id: string;
  personaId: string;
  query: string;
  dependencies: string[];
  metadata: {
    stepNumber: number;
    totalSteps: number;
  };
}

interface WorkflowResult {
  workflowId: string;
  steps: StepResult[];
  totalDuration: number;
  totalTokens: number;
  totalCost: number;
  success: boolean;
  metadata: {
    startTime: Date;
    endTime: Date;
  };
}

interface LLMResponse {
  content: string;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  metadata: {
    latency: number;
    cost?: number;
  };
}

// Event listener types
type PersonaBeforeListener = (persona: Persona, query: string) => void;
type PersonaAfterListener = (persona: Persona, result: PersonaResult) => void;
type PersonaErrorListener = (persona: Persona, error: Error) => void;

type WorkflowStartListener = (workflow: Workflow) => void;
type WorkflowStepListener = (step: WorkflowStep, result: any) => void;
type WorkflowCompleteListener = (
  workflow: Workflow,
  result: WorkflowResult
) => void;
type WorkflowErrorListener = (workflow: Workflow, error: Error) => void;

type LLMCallListener = (provider: string, prompt: string) => void;
type LLMResponseListener = (provider: string, response: LLMResponse) => void;
type LLMErrorListener = (provider: string, error: Error) => void;

// Complete event map
interface RuntimeEvents {
  'persona:before': PersonaBeforeListener;
  'persona:after': PersonaAfterListener;
  'persona:error': PersonaErrorListener;

  'workflow:start': WorkflowStartListener;
  'workflow:step': WorkflowStepListener;
  'workflow:complete': WorkflowCompleteListener;
  'workflow:error': WorkflowErrorListener;

  'llm:call': LLMCallListener;
  'llm:response': LLMResponseListener;
  'llm:error': LLMErrorListener;
}
```

---

## See Also

- [Event System Guide](../guides/EVENT-SYSTEM.md)
- [ADR-001: Event System Architecture](../../.roadmap/decisions/ADR-001-event-system.md)
- [Runtime API](RUNTIME.md)

---

**Questions?** Open an issue on [GitHub](https://github.com/pcl-lang/pcl/issues)
