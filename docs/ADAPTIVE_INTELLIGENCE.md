# PCL Adaptive Intelligence

**Version:** 2.2 (Q2 2025)
**Status:** Beta
**Feature Set:** Self-Optimizing Personas with Learning Capabilities

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Getting Started](#getting-started)
4. [Performance Analytics](#performance-analytics)
5. [Confidence Scoring](#confidence-scoring)
6. [Dynamic Weight Adjustment](#dynamic-weight-adjustment)
7. [Learned Routing](#learned-routing)
8. [Response Caching](#response-caching)
9. [Auto-Escalation](#auto-escalation)
10. [A/B Testing Framework](#ab-testing-framework)
11. [Monitoring and Metrics](#monitoring-and-metrics)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)

---

## Overview

PCL Adaptive Intelligence (v2.2) introduces self-optimizing capabilities that enable personas to learn from experience and continuously improve their performance. The system automatically tracks execution metrics, adjusts configurations, and makes intelligent routing decisions based on historical data.

### What's New in v2.2

**Automatic Optimization:**

- Dynamic weight adjustment for team members based on performance
- Learned routing to select optimal providers for each task
- Intelligent response caching with semantic matching
- Confidence scoring replacing static quality estimates

**Built-in Intelligence:**

- Performance analytics with trend detection
- Auto-escalation for low-confidence responses
- A/B testing framework for experimentation
- Real-time metrics and dashboards

**Expected Impact:**

- **20-40% cost reduction** through optimized routing and caching
- **15-25% quality improvement** via confidence scoring and escalation
- **Faster iteration cycles** with A/B testing
- **Better resource utilization** through learned patterns

---

## Key Features

### 1. Performance Analytics

Comprehensive time-series tracking of all persona executions with automatic retention management.

**Metrics Tracked:**

- Latency (milliseconds)
- Cost (USD)
- Token usage (input/output)
- Confidence scores
- Quality ratings (user feedback)

**Capabilities:**

- Query by persona, provider, model, or time range
- Aggregate with avg, sum, min, max, p50, p95, p99
- Time-series data for visualization
- Trend detection with statistical analysis

### 2. Confidence Scoring

Replace static 0.8/0.9 confidence scores with computed quality estimation based on 11 signals.

**Quality Signals:**

- Provider confidence (30% weight)
- Structure quality (15% weight)
- Coherence score (15% weight)
- Provider reliability (15% weight)
- Similar task performance (10% weight)
- Token efficiency (5% weight)
- Latency score (5% weight)
- Cost score (3% weight)
- Message complexity (1% weight)
- Domain match (1% weight)

**Calibration:** Automatically adjusts scoring based on actual outcomes to improve accuracy over time.

### 3. Dynamic Weight Adjustment

Team member weights automatically adjust based on performance, improving merge quality.

**How It Works:**

1. Track merge outcomes (which responses selected, user feedback)
2. Analyze member performance (confidence, selection rate, quality)
3. Compute target weights based on performance
4. Gradually adjust using learning rate (default: 0.1)
5. Normalize weights and enforce constraints

**Constraints:**

- Minimum weight: 0.1 (no member ignored)
- Maximum weight: 2.0 (no member dominates)
- Adaptation interval: Every 10 merges (configurable)

### 4. Learned Routing

ML-based task-to-LLM mapping selects optimal providers for each request.

**Task Classification:**

- Domain detection (code/analysis/creative/general)
- Complexity estimation (0-1 scale)
- Required capabilities (code, json, vision, math, long_context)
- Latency and cost sensitivity

**Provider Scoring:**

- Capability match (30% weight)
- Historical performance (25% weight)
- Cost efficiency (20% weight)
- Latency (15% weight)
- Availability (10% weight)

**Result:** Primary provider + 3 fallback options for resilience.

### 5. Response Caching

Intelligent cache with exact and semantic matching to avoid redundant LLM calls.

**Matching Strategy:**

1. **Exact match:** Hash of message content + persona ID
2. **Semantic similarity:** 70% token overlap + 30% structural similarity
3. **Threshold:** 0.95 default (configurable)

**Features:**

- Three eviction policies (LRU, LFU, TTL)
- Cost and latency tracking
- Configurable TTL (default: 1 hour)
- Max entries limit (default: 1000)

**Expected Savings:** >25% cost reduction from cache hits.

### 6. Auto-Escalation

Smart cascade triggers that automatically improve low-quality responses.

**Default Rules (Priority-Ordered):**

1. **Empty response** → Retry (priority 5)
2. **Very low confidence (<0.3)** → Upgrade to Opus 4 (priority 5)
3. **Error/refused** → Fallback to different provider (priority 4)
4. **High complexity + low confidence** → Escalate to team (priority 4)
5. **Low confidence (<0.5)** → Retry up to 2 times (priority 3)
6. **Short response** → Retry once (priority 2)

**Actions:**

- **Retry:** Same provider, fresh attempt
- **Fallback:** Different provider from fallback chain
- **Upgrade:** More powerful model (e.g., Sonnet → Opus)
- **Team:** Escalate to team of experts

### 7. A/B Testing Framework

Built-in experimentation infrastructure for comparing strategies.

**Capabilities:**

- Deterministic variant assignment (consistent per user/session)
- Per-variant metric tracking with running averages
- Statistical analysis with winner detection
- Experiment lifecycle (draft → running → completed)
- Results export/import for persistence

**Use Cases:**

- Compare routing strategies
- Test different merge modes
- Evaluate persona configurations
- Measure feature impact

---

## Getting Started

### Installation

Adaptive Intelligence is included in PCL v2.2+. No additional installation required.

### Basic Configuration

Enable adaptive features in your PCL configuration:

```typescript
import { Runtime } from '@pcl/sdk';

const runtime = new Runtime({
  adaptive: {
    // Enable all adaptive features
    analytics: {
      enabled: true,
      retention: 30, // days
      storage: 'memory',
    },
    confidence: {
      enabled: true,
      calibration: true,
    },
    weightAdjustment: {
      enabled: true,
      learningRate: 0.1,
    },
    routing: {
      enabled: true,
      fallbackChain: true,
    },
    caching: {
      enabled: true,
      ttl: 3600000, // 1 hour
      maxEntries: 1000,
    },
    escalation: {
      enabled: true,
    },
    experiments: {
      enabled: true,
    },
  },
});
```

### Quick Start: Enable Analytics

```typescript
import { PerformanceTracker } from '@pcl/sdk/runtime/analytics';

// Create tracker
const tracker = new PerformanceTracker({
  enabled: true,
  retention: 30,
  storage: 'memory',
});

// Record execution data
tracker.record({
  timestamp: Date.now(),
  personaId: 'developer',
  providerId: 'anthropic',
  modelId: 'claude-3-5-sonnet-20241022',
  latency: 1250,
  cost: 0.005,
  tokenUsage: { input: 500, output: 800 },
  confidence: 0.85,
  context: { messageType: 'code' },
});

// Query data
const stats = tracker.getStats();
console.log('Total executions:', stats.totalExecutions);
console.log('Average latency:', stats.avgLatency, 'ms');
console.log('Total cost:', stats.totalCost, 'USD');
```

### Quick Start: Confidence Scoring

```typescript
import { ConfidenceScorer } from '@pcl/sdk/runtime/confidence';

// Create scorer
const scorer = new ConfidenceScorer({
  enabled: true,
  signals: ['providerConfidence', 'structureQuality', 'coherenceScore'],
  weights: {
    providerConfidence: 0.3,
    structureQuality: 0.15,
    coherenceScore: 0.15,
  },
});

// Compute confidence
const confidence = scorer.computeConfidence(
  response,
  context,
  performanceHistory
);

console.log('Confidence score:', confidence);
```

---

## Performance Analytics

### Overview

The Performance Analytics system provides comprehensive time-series tracking with automatic retention management and trend detection.

### Architecture

**Components:**

- **PerformanceTracker:** Main interface for recording and querying data
- **AnalyticsStore:** In-memory storage with optional persistence
- **TrendAnalyzer:** Statistical trend detection using linear regression

### Recording Data

```typescript
import { PerformanceTracker } from '@pcl/sdk/runtime/analytics';

const tracker = new PerformanceTracker(config);

// Record a data point
tracker.record({
  timestamp: Date.now(),
  personaId: 'analyst',
  providerId: 'openai',
  modelId: 'gpt-4',
  latency: 2000,
  cost: 0.015,
  tokenUsage: { input: 1000, output: 1500 },
  confidence: 0.92,
  quality: 0.88, // Optional user feedback
  context: {
    messageType: 'analysis',
    complexity: 0.7,
  },
});
```

### Querying Data

```typescript
// Query by filters
const dataPoints = tracker.query({
  personaId: 'analyst',
  timeRange: {
    start: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
    end: Date.now(),
  },
  limit: 100,
});

// Aggregate metrics
const results = tracker.aggregate({
  personaId: 'analyst',
  metrics: ['latency', 'cost', 'confidence'],
  aggregation: 'avg',
});

console.log('Average latency:', results[0].value);
console.log('Average cost:', results[1].value);
console.log('Average confidence:', results[2].value);
```

### Time-Series Data

```typescript
// Get hourly time-series data
const timeSeries = tracker.getTimeSeries(
  { personaId: 'analyst' },
  3600000 // 1 hour intervals
);

console.log('Metric:', timeSeries.metric);
console.log('Data points:', timeSeries.points.length);
timeSeries.points.forEach((point) => {
  console.log(new Date(point.timestamp), ':', point.value);
});
```

### Trend Analysis

```typescript
// Detect trends
const trends = tracker.analyzeTrends({ personaId: 'analyst' }, [
  'latency',
  'cost',
  'confidence',
]);

trends.forEach((trend, metric) => {
  console.log(`${metric}:`);
  console.log('  Direction:', trend.direction); // improving/degrading/stable
  console.log('  Slope:', trend.slope, 'per day');
  console.log('  Confidence:', trend.confidence);
  console.log('  Mean:', trend.statistics.mean);
});
```

### Statistics

```typescript
// Get comprehensive stats
const stats = tracker.getStats();

console.log('Overview:');
console.log('  Total executions:', stats.totalExecutions);
console.log('  Average latency:', stats.avgLatency, 'ms');
console.log('  Total cost:', stats.totalCost, 'USD');
console.log('  Average confidence:', stats.avgConfidence);

console.log('\nBy Provider:');
Object.entries(stats.byProvider).forEach(([id, providerStats]) => {
  console.log(`  ${id}:`, providerStats.requestCount, 'requests');
});

console.log('\nBy Persona:');
Object.entries(stats.byPersona).forEach(([id, personaStats]) => {
  console.log(`  ${id}:`, personaStats.messageCount, 'messages');
});
```

### Data Management

```typescript
// Export data for persistence
const data = tracker.export();
await saveToDatabase(data);

// Import data
const savedData = await loadFromDatabase();
tracker.import(savedData);

// Clear all data
tracker.clear();

// Check storage size
console.log('Data points stored:', tracker.size());
```

---

## Confidence Scoring

### Overview

Confidence scoring replaces static quality estimates with computed scores based on 11 quality signals, providing more accurate and context-aware quality assessment.

### Signal Extraction

```typescript
import { SignalExtractor } from '@pcl/sdk/runtime/confidence';

// Extract all 11 signals
const signals = SignalExtractor.extractSignals(
  response,
  context,
  performanceHistory
);

console.log('Provider confidence:', signals.providerConfidence);
console.log('Structure quality:', signals.structureQuality);
console.log('Coherence score:', signals.coherenceScore);
console.log('Provider reliability:', signals.providerReliability);
console.log('Similar task performance:', signals.similarTaskPerformance);
console.log('Token efficiency:', signals.tokenEfficiency);
console.log('Latency score:', signals.latencyScore);
console.log('Cost score:', signals.costScore);
console.log('Message complexity:', signals.messageComplexity);
console.log('Domain match:', signals.domainMatch);
```

### Computing Confidence

```typescript
import { ConfidenceScorer } from '@pcl/sdk/runtime/confidence';

const scorer = new ConfidenceScorer(config);

// Compute confidence score
const confidence = scorer.computeConfidence(
  response,
  context,
  performanceHistory
);

console.log('Confidence score:', confidence); // 0-1 scale
```

### Calibration

Calibration improves scoring accuracy by learning from actual outcomes:

```typescript
import { ConfidenceCalibrator } from '@pcl/sdk/runtime/confidence';

const calibrator = new ConfidenceCalibrator(config);

// Record outcome
calibrator.recordOutcome(
  'analyst',
  0.85, // predicted confidence
  0.92 // actual quality (from user feedback)
);

// Apply calibration
const calibratedScore = calibrator.calibrate('analyst', rawConfidence);

// Get calibration stats
const stats = calibrator.getStats('analyst');
console.log('Samples:', stats.sampleCount);
console.log('Mean error:', stats.meanError);
console.log('Error std dev:', stats.errorStdDev);
```

### Custom Signal Weights

```typescript
import {
  ConfidenceScorer,
  DEFAULT_CONFIDENCE_WEIGHTS,
} from '@pcl/sdk/runtime/confidence';

// Customize weights
const customWeights = {
  ...DEFAULT_CONFIDENCE_WEIGHTS,
  providerConfidence: 0.5, // Increase provider confidence weight
  structureQuality: 0.2,
  coherenceScore: 0.15,
  // ... adjust others
};

const scorer = new ConfidenceScorer({
  enabled: true,
  weights: customWeights,
});
```

---

## Dynamic Weight Adjustment

### Overview

Team member weights automatically adjust based on performance, improving merge quality over time.

### How It Works

1. **Track Outcomes:** Every merge is recorded with member responses and selection
2. **Analyze Performance:** Compute confidence, selection rate, and quality scores
3. **Compute Target Weights:** Higher-performing members get higher weights
4. **Apply Adjustment:** Gradual adjustment using learning rate
5. **Normalize:** Ensure weights sum to member count

### Configuration

```typescript
import { WeightAdapter } from '@pcl/sdk/runtime/teams';

const adapter = new WeightAdapter({
  enabled: true,
  learningRate: 0.1, // Gradual adjustment (0.05-0.2)
  minWeight: 0.1, // Minimum weight per member
  maxWeight: 2.0, // Maximum weight per member
  adaptationInterval: 10, // Adjust every N merges
  signals: {
    confidence: 0.3, // Confidence score weight
    selection: 0.4, // Selection rate weight
    quality: 0.3, // Quality score weight
  },
});
```

### Tracking Outcomes

```typescript
import { OutcomeTracker } from '@pcl/sdk/runtime/teams';

const tracker = new OutcomeTracker(config);

// Record a merge outcome
tracker.recordOutcome({
  teamId: 'research-team',
  timestamp: Date.now(),
  memberResponses: [
    { memberId: 'analyst', confidence: 0.85, selected: true },
    { memberId: 'critic', confidence: 0.78, selected: false },
    { memberId: 'synthesizer', confidence: 0.82, selected: false },
  ],
  finalResponse: response,
  quality: 0.88, // User feedback
});
```

### Analyzing Performance

```typescript
// Get member performance
const performance = tracker.analyzeMemberPerformance('research-team');

performance.forEach((stats, memberId) => {
  console.log(`${memberId}:`);
  console.log('  Avg confidence:', stats.avgConfidence);
  console.log('  Selection rate:', stats.selectionRate);
  console.log('  Avg quality:', stats.avgQuality);
});
```

### Adjusting Weights

```typescript
// Check if adjustment needed
if (adapter.shouldAdjust('research-team')) {
  // Get current weights
  const currentWeights = new Map([
    ['analyst', 1.0],
    ['critic', 1.0],
    ['synthesizer', 1.0],
  ]);

  // Adjust based on performance
  const newWeights = adapter.adjustWeights('research-team', currentWeights);

  console.log('New weights:');
  newWeights.forEach((weight, memberId) => {
    console.log(`  ${memberId}:`, weight);
  });
}
```

### Performance Trends

```typescript
// Detect trends
const trend = tracker.detectTrend('research-team', 'analyst');

if (trend) {
  console.log('Trend:', trend.direction); // improving/stable/degrading
  console.log('Slope:', trend.slope);
  console.log('Confidence:', trend.confidence);
}
```

---

## Learned Routing

### Overview

Learned routing uses task classification and historical performance to select optimal providers for each request.

### Task Classification

```typescript
import { TaskClassifier } from '@pcl/sdk/runtime/routing';

// Classify a task
const features = TaskClassifier.classify({
  content: 'Write a Python function to calculate Fibonacci numbers',
  latencySensitivity: 0.3,
  costSensitivity: 0.7,
});

console.log('Domain:', features.domain); // 'code'
console.log('Complexity:', features.complexity); // 0.4
console.log('Required capabilities:', features.requiredCapabilities); // ['code']
console.log('Expected output length:', features.expectedOutputLength); // 500
```

### Provider Selection

```typescript
import { LearnedRouter } from '@pcl/sdk/runtime/routing';

const router = new LearnedRouter(config);

// Select provider for task
const selection = router.selectProvider(taskFeatures, availableProviders);

console.log('Primary provider:', selection.primary.id);
console.log(
  'Fallback chain:',
  selection.fallbacks.map((p) => p.id)
);

// Record execution for learning
router.recordExecution({
  timestamp: Date.now(),
  providerId: selection.primary.id,
  taskFeatures,
  latency: 1500,
  cost: 0.008,
  quality: 0.9,
  success: true,
});
```

### Provider Scoring

```typescript
// Score a single provider
const score = router.scoreProvider(provider, taskFeatures);

console.log('Total score:', score.total);
console.log('Capability match:', score.capability);
console.log('Historical performance:', score.performance);
console.log('Cost efficiency:', score.cost);
console.log('Latency:', score.latency);
console.log('Availability:', score.availability);
```

### Performance Analysis

```typescript
// Get routing statistics
const stats = router.getStats();

console.log('Total requests:', stats.totalRequests);
console.log('Cache hit rate:', stats.cacheHitRate);

console.log('\nBy provider:');
Object.entries(stats.byProvider).forEach(([id, providerStats]) => {
  console.log(`  ${id}:`);
  console.log('    Requests:', providerStats.requests);
  console.log('    Avg latency:', providerStats.avgLatency);
  console.log('    Avg cost:', providerStats.avgCost);
  console.log('    Success rate:', providerStats.successRate);
});
```

---

## Response Caching

### Overview

Response caching reduces costs and latency by storing and reusing responses for identical or similar requests.

### Basic Usage

```typescript
import { ResponseCache } from '@pcl/sdk/runtime/cache';

const cache = new ResponseCache({
  enabled: true,
  ttl: 3600000, // 1 hour
  maxEntries: 1000,
  similarityThreshold: 0.95,
  evictionPolicy: 'lru',
});

// Try to get cached response
const cached = cache.get(message, personaId);

if (cached) {
  console.log('Cache hit! Saved', cached.metadata.cost, 'USD');
  return cached.response;
}

// Execute and cache
const response = await executePersona(message);
cache.set(message, response, personaId, metadata);
```

### Semantic Matching

```typescript
import { SemanticMatcher } from '@pcl/sdk/runtime/cache';

// Compute similarity between messages
const similarity = SemanticMatcher.computeSimilarity(
  { personaId: 'developer', content: 'Write a Python function for factorial' },
  { personaId: 'developer', content: 'Create a Python factorial function' }
);

console.log('Similarity:', similarity); // 0.97 (very similar)
```

### Cache Statistics

```typescript
// Get cache stats
const stats = cache.getStats();

console.log('Total requests:', stats.totalRequests);
console.log('Cache hits:', stats.hits);
console.log('Cache misses:', stats.misses);
console.log('Hit rate:', stats.hitRate);
console.log('Cost saved:', stats.costSaved, 'USD');
console.log('Latency saved:', stats.latencySaved, 'ms');
console.log('Current entries:', stats.size);
```

### Cache Management

```typescript
// Clear cache
cache.clear();

// Clear for specific persona
cache.clearForPersona('developer');

// Get cache size
console.log('Cache entries:', cache.size());

// Export cache data
const cacheData = cache.export();

// Import cache data
cache.import(cacheData);
```

### Eviction Policies

**LRU (Least Recently Used):**

```typescript
const cache = new ResponseCache({
  evictionPolicy: 'lru',
  maxEntries: 1000,
});
```

**LFU (Least Frequently Used):**

```typescript
const cache = new ResponseCache({
  evictionPolicy: 'lfu',
  maxEntries: 1000,
});
```

**TTL (Time-To-Live):**

```typescript
const cache = new ResponseCache({
  evictionPolicy: 'ttl',
  ttl: 1800000, // 30 minutes
});
```

---

## Auto-Escalation

### Overview

Auto-escalation automatically improves low-quality responses through retries, fallbacks, or upgrades to more powerful models.

### Configuration

```typescript
import {
  EscalationManager,
  DEFAULT_ESCALATION_RULES,
} from '@pcl/sdk/runtime/escalation';

const manager = new EscalationManager({
  enabled: true,
  rules: DEFAULT_ESCALATION_RULES,
  maxGlobalRetries: 3,
});
```

### Custom Rules

```typescript
import { EscalationRule } from '@pcl/sdk/runtime/escalation';

const customRules: EscalationRule[] = [
  {
    name: 'custom-low-confidence',
    condition: (response, context) => {
      return response.confidence < 0.4 && context.importance === 'high';
    },
    action: 'upgrade',
    target: 'claude-opus-4',
    priority: 6,
  },
  {
    name: 'custom-timeout',
    condition: (response, context) => {
      return context.latency > 30000; // 30 seconds
    },
    action: 'fallback',
    priority: 5,
  },
];

const manager = new EscalationManager({
  enabled: true,
  rules: [...DEFAULT_ESCALATION_RULES, ...customRules],
});
```

### Checking for Escalation

```typescript
// Check if response should be escalated
const decision = manager.shouldEscalate(response, context);

if (decision.escalate) {
  console.log('Escalation needed:', decision.reason);
  console.log('Action:', decision.action);
  console.log('Target:', decision.target);

  // Execute escalation
  switch (decision.action) {
    case 'retry':
      return await retryExecution(context);
    case 'fallback':
      return await executeWithProvider(decision.target);
    case 'upgrade':
      return await executeWithModel(decision.target);
    case 'team':
      return await escalateToTeam(decision.target);
  }
}
```

### Escalation History

```typescript
// Get escalation statistics
const stats = manager.getStats();

console.log('Total escalations:', stats.totalEscalations);
console.log('Success rate:', stats.successRate);

console.log('\nBy rule:');
Object.entries(stats.byRule).forEach(([name, ruleStats]) => {
  console.log(`  ${name}:`);
  console.log('    Triggered:', ruleStats.triggered);
  console.log('    Success rate:', ruleStats.successRate);
});

console.log('\nBy action:');
Object.entries(stats.byAction).forEach(([action, count]) => {
  console.log(`  ${action}:`, count);
});
```

---

## A/B Testing Framework

### Overview

The A/B testing framework enables systematic experimentation to compare different strategies and configurations.

### Creating an Experiment

```typescript
import { ExperimentManager } from '@pcl/sdk/runtime/experiments';

const manager = new ExperimentManager({
  enabled: true,
  allowedExperiments: [],
  minSampleSize: 30,
  significanceThreshold: 0.05,
});

// Create experiment
manager.createExperiment({
  id: 'routing-comparison',
  name: 'Learned vs Static Routing',
  description: 'Compare learned routing with static provider selection',
  variants: [
    { id: 'learned', name: 'Learned Routing', config: { routing: 'learned' } },
    { id: 'static', name: 'Static Routing', config: { routing: 'static' } },
  ],
  allocation: [0.5, 0.5], // 50/50 split
  metrics: ['latency', 'cost', 'quality'],
  startTime: Date.now(),
  status: 'draft',
});

// Start experiment
manager.updateStatus('routing-comparison', 'running');
```

### Variant Assignment

```typescript
// Assign variant to user
const variant = manager.assignVariant('routing-comparison', sessionId, userId);

console.log('Assigned variant:', variant.name);
console.log('Configuration:', variant.config);

// Use variant configuration
const routingMode = variant.config.routing;
```

### Recording Metrics

```typescript
// Execute with variant configuration
const result = await executeWithConfig(variant.config);

// Record metrics
manager.recordMetric(
  'routing-comparison',
  sessionId,
  'latency',
  result.latency,
  userId
);

manager.recordMetric(
  'routing-comparison',
  sessionId,
  'cost',
  result.cost,
  userId
);

manager.recordMetric(
  'routing-comparison',
  sessionId,
  'quality',
  result.quality,
  userId
);
```

### Analyzing Results

```typescript
// Get results
const results = manager.getResults('routing-comparison');

results.forEach((result) => {
  console.log(`${result.variantId}:`);
  console.log('  Sample size:', result.sampleSize);
  console.log('  Avg latency:', result.metrics.latency);
  console.log('  Avg cost:', result.metrics.cost);
  console.log('  Avg quality:', result.metrics.quality);
});

// Statistical analysis
const analysis = manager.analyzeExperiment('routing-comparison');

console.log('\nAnalysis:');
console.log('Winner:', analysis.winner);
console.log('Statistically significant:', analysis.significant);
console.log('Confidence:', analysis.confidence);
console.log('Recommendation:', analysis.recommendation);

// If significant winner found, complete experiment
if (analysis.significant) {
  manager.updateStatus('routing-comparison', 'completed');
}
```

### Experiment Statistics

```typescript
// Get experiment stats
const stats = manager.getStats('routing-comparison');

console.log('Total assignments:', stats.totalAssignments);

console.log('\nVariant distribution:');
Object.entries(stats.variantDistribution).forEach(([variant, count]) => {
  console.log(`  ${variant}:`, count);
});

console.log('\nMetrics recorded:');
Object.entries(stats.metricsRecorded).forEach(([metric, count]) => {
  console.log(`  ${metric}:`, count);
});
```

---

## Monitoring and Metrics

### Real-Time Metrics

PCL Adaptive Intelligence integrates with OpenTelemetry for real-time metrics export.

**Prometheus Metrics (Port 9464):**

- `pcl_executions_total` - Total persona executions
- `pcl_latency_seconds` - Execution latency histogram
- `pcl_cost_usd` - Execution cost summary
- `pcl_confidence_score` - Confidence score distribution
- `pcl_cache_hits_total` - Cache hit counter
- `pcl_cache_misses_total` - Cache miss counter
- `pcl_escalations_total` - Escalation counter by rule

### Dashboards

Recommended Grafana dashboard panels:

**Performance Overview:**

- Total executions (counter)
- Average latency (gauge)
- Total cost (counter)
- Average confidence (gauge)

**Cost Analysis:**

- Cost per provider (pie chart)
- Cost over time (time series)
- Cost savings from cache (gauge)

**Quality Metrics:**

- Confidence score distribution (histogram)
- Quality ratings over time (time series)
- Escalation rate (gauge)

**Caching:**

- Cache hit rate (gauge)
- Cost saved (counter)
- Latency saved (counter)

### Health Checks

```typescript
// Check system health
const health = {
  analytics: tracker.size() > 0,
  cache: cache.getStats().totalRequests > 0,
  routing: router.getStats().totalRequests > 0,
};

console.log('System health:', health);
```

---

## Best Practices

### 1. Start with Analytics

Enable analytics first to gather baseline data before enabling other features:

```typescript
const runtime = new Runtime({
  adaptive: {
    analytics: { enabled: true, retention: 30 },
    // Enable others after 1-2 weeks of data collection
  },
});
```

### 2. Gradual Rollout

Enable features incrementally:

1. Week 1: Analytics only
2. Week 2: Add confidence scoring and caching
3. Week 3: Add learned routing
4. Week 4: Enable weight adjustment and escalation
5. Week 5: Run A/B tests to validate improvements

### 3. Monitor Performance Impact

Track overhead from adaptive features:

```typescript
// Measure overhead
const start = Date.now();
tracker.record(dataPoint);
const analyticsOverhead = Date.now() - start;

// Target: <10ms per operation
if (analyticsOverhead > 10) {
  console.warn('Analytics overhead high:', analyticsOverhead, 'ms');
}
```

### 4. Set Appropriate Thresholds

Adjust thresholds based on your use case:

**High accuracy required:**

```typescript
escalation: {
  rules: [
    {
      name: 'low-confidence',
      condition: (r) => r.confidence < 0.7, // Higher threshold
      action: 'upgrade',
    },
  ],
}
```

**Cost-sensitive:**

```typescript
caching: {
  enabled: true,
  ttl: 7200000, // 2 hours (longer cache)
  similarityThreshold: 0.90, // More aggressive matching
}
```

### 5. Regular Calibration

Review and recalibrate confidence scoring monthly:

```typescript
// Monthly calibration check
const calibrator = new ConfidenceCalibrator(config);
const stats = calibrator.getStats('analyst');

if (stats.sampleCount > 100 && Math.abs(stats.meanError) > 0.1) {
  console.log('Calibration drift detected, adjusting...');
  // Apply calibration adjustments
}
```

### 6. Experiment Systematically

Use A/B testing to validate changes:

```typescript
// Before making permanent changes
manager.createExperiment({
  id: 'cache-threshold-test',
  variants: [
    { id: 'current', config: { threshold: 0.95 } },
    { id: 'aggressive', config: { threshold: 0.9 } },
  ],
  allocation: [0.8, 0.2], // 80/20 split for safety
  metrics: ['hit_rate', 'quality', 'cost'],
});
```

---

## Troubleshooting

### High Memory Usage

**Symptom:** Memory usage growing over time

**Solution:**

```typescript
// Reduce retention period
analytics: {
  retention: 7, // Reduce from 30 to 7 days
  maxDataPoints: 50000, // Add limit
}

// Clear old cache entries
cache.clear();
```

### Low Cache Hit Rate

**Symptom:** Cache hit rate <10%

**Diagnosis:**

```typescript
const stats = cache.getStats();
console.log('Hit rate:', stats.hitRate);
console.log('Average similarity:', stats.avgSimilarity);
```

**Solution:**

```typescript
// Lower similarity threshold
cache: {
  similarityThreshold: 0.90, // From 0.95
}

// Increase TTL
cache: {
  ttl: 7200000, // 2 hours instead of 1
}
```

### Excessive Escalations

**Symptom:** >30% of requests escalate

**Diagnosis:**

```typescript
const stats = manager.getStats();
console.log('Escalation rate:', stats.totalEscalations / stats.totalRequests);
console.log('By rule:', stats.byRule);
```

**Solution:**

```typescript
// Adjust escalation thresholds
rules: [
  {
    name: 'low-confidence',
    condition: (r) => r.confidence < 0.3, // Lower from 0.5
  },
];
```

### Slow Performance

**Symptom:** Requests taking longer after enabling adaptive features

**Diagnosis:**

```typescript
// Measure component overhead
console.time('analytics');
tracker.record(data);
console.timeEnd('analytics');

console.time('cache-lookup');
cache.get(message, personaId);
console.timeEnd('cache-lookup');
```

**Solution:**

```typescript
// Reduce analytics retention
analytics: {
  retention: 7,
}

// Limit cache size
cache: {
  maxEntries: 500, // From 1000
}

// Disable expensive features temporarily
confidence: {
  signals: ['providerConfidence', 'structureQuality'], // Reduce signals
}
```

### Unexpected Routing Decisions

**Symptom:** Router selecting unexpected providers

**Diagnosis:**

```typescript
// Inspect routing scores
const scores = router.scoreAllProviders(taskFeatures);
scores.forEach(([provider, score]) => {
  console.log(provider.id, ':', score);
});
```

**Solution:**

```typescript
// Adjust routing weights
routing: {
  weights: {
    capability: 0.4, // Increase capability importance
    performance: 0.2,
    cost: 0.2,
    latency: 0.1,
    availability: 0.1,
  },
}
```

---

## Further Reading

- [Adaptive Configuration Reference](ADAPTIVE_CONFIG.md)
- [A/B Testing Guide](AB_TESTING.md)
- [Architecture Documentation](architecture/ADAPTIVE_ARCHITECTURE.md)
- [API Reference](api/ADAPTIVE_API.md)

---

**Need Help?**

- GitHub Issues: [Report a bug](https://github.com/personalayer/pcl-lite/issues)
- Documentation: [PCL Docs](https://pcl.dev/docs)
- Community: [Discord](https://discord.gg/pcl)
