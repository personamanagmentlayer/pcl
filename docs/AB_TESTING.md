# PCL A/B Testing Guide

**Version:** 2.2 (Q2 2025)
**Complete Guide to Experimentation with PCL Adaptive Intelligence**

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Experiment Lifecycle](#experiment-lifecycle)
4. [Creating Experiments](#creating-experiments)
5. [Variant Assignment](#variant-assignment)
6. [Recording Metrics](#recording-metrics)
7. [Analyzing Results](#analyzing-results)
8. [Best Practices](#best-practices)
9. [Common Patterns](#common-patterns)
10. [Statistical Analysis](#statistical-analysis)
11. [Troubleshooting](#troubleshooting)
12. [Examples](#examples)

---

## Overview

PCL's built-in A/B testing framework enables systematic experimentation to compare different strategies, configurations, and approaches. All experiments use deterministic variant assignment to ensure consistency across sessions.

### Key Features

- **Deterministic Assignment:** Consistent variant selection per user/session using hashing
- **Per-Variant Metrics:** Running averages for efficient metric tracking
- **Statistical Analysis:** Automatic winner detection with significance testing
- **Experiment Lifecycle:** Draft → Running → Completed/Paused states
- **Results Export/Import:** Persistence support for long-running experiments

### Use Cases

- Compare routing strategies (learned vs. static)
- Test different merge modes (consensus vs. debate)
- Evaluate confidence scoring configurations
- Measure impact of caching thresholds
- Validate escalation rules
- Test new persona configurations

---

## Quick Start

### 1. Create an Experiment

```typescript
import { ExperimentManager } from '@pcl/sdk/runtime/experiments';

const manager = new ExperimentManager({
  enabled: true,
  minSampleSize: 30,
  significanceThreshold: 0.05,
});

// Create experiment
manager.createExperiment({
  id: 'cache-threshold-test',
  name: 'Cache Similarity Threshold Comparison',
  description: 'Compare 0.95 vs 0.90 similarity thresholds for caching',
  variants: [
    {
      id: 'control',
      name: 'Current (0.95)',
      config: { similarityThreshold: 0.95 },
    },
    {
      id: 'treatment',
      name: 'Aggressive (0.90)',
      config: { similarityThreshold: 0.9 },
    },
  ],
  allocation: [0.8, 0.2], // 80% control, 20% treatment
  metrics: ['hit_rate', 'cost', 'quality'],
  startTime: Date.now(),
  status: 'draft',
});
```

### 2. Start the Experiment

```typescript
manager.updateStatus('cache-threshold-test', 'running');
```

### 3. Assign Variants

```typescript
// Assign variant to user
const variant = manager.assignVariant(
  'cache-threshold-test',
  sessionId,
  userId
);

// Use variant configuration
const cacheThreshold = variant.config.similarityThreshold;
```

### 4. Record Metrics

```typescript
// Execute with variant config and record results
manager.recordMetric(
  'cache-threshold-test',
  sessionId,
  'hit_rate',
  0.35,
  userId
);
manager.recordMetric('cache-threshold-test', sessionId, 'cost', 0.008, userId);
manager.recordMetric(
  'cache-threshold-test',
  sessionId,
  'quality',
  0.92,
  userId
);
```

### 5. Analyze Results

```typescript
// Get analysis when ready
const analysis = manager.analyzeExperiment('cache-threshold-test');

console.log('Winner:', analysis.winner);
console.log('Statistically significant:', analysis.significant);
console.log('Recommendation:', analysis.recommendation);
```

---

## Experiment Lifecycle

### States

1. **Draft:** Experiment created but not yet started
2. **Running:** Actively collecting data
3. **Paused:** Temporarily stopped (can be resumed)
4. **Completed:** Finished and analyzed

### State Transitions

```
Draft ──────────> Running ──────────> Completed
                     │  ▲                 ▲
                     │  │                 │
                     └──> Paused ─────────┘
```

### Lifecycle Management

```typescript
// Create in draft state
manager.createExperiment({ ...config, status: 'draft' });

// Start experiment
manager.updateStatus('experiment-id', 'running');

// Pause if needed
manager.updateStatus('experiment-id', 'paused');

// Resume
manager.updateStatus('experiment-id', 'running');

// Complete
manager.updateStatus('experiment-id', 'completed');
```

---

## Creating Experiments

### Experiment Structure

```typescript
interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: Variant[];
  allocation: number[];
  metrics: string[];
  startTime: number;
  endTime?: number;
  status: 'draft' | 'running' | 'completed' | 'paused';
  minSampleSize?: number;
}
```

### Variant Structure

```typescript
interface Variant {
  id: string;
  name: string;
  config: Record<string, any>;
}
```

### Validation Rules

1. **Experiment ID:** Must be unique
2. **Variants:** Minimum 2 variants required
3. **Allocation:** Must sum to 1.0
4. **Metrics:** At least 1 metric required
5. **Status:** Only 'running' experiments accept assignments

### Example: Routing Comparison

```typescript
manager.createExperiment({
  id: 'routing-comparison',
  name: 'Learned vs Static Routing',
  description: 'Compare learned routing with static provider selection',
  variants: [
    {
      id: 'learned',
      name: 'Learned Routing',
      config: {
        routing: 'learned',
        weights: {
          capability: 0.3,
          performance: 0.25,
          cost: 0.2,
          latency: 0.15,
          availability: 0.1,
        },
      },
    },
    {
      id: 'static',
      name: 'Static Routing',
      config: {
        routing: 'static',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      },
    },
  ],
  allocation: [0.5, 0.5],
  metrics: ['latency', 'cost', 'quality', 'success_rate'],
  startTime: Date.now(),
  status: 'draft',
  minSampleSize: 50,
});
```

---

## Variant Assignment

### Deterministic Assignment

PCL uses consistent hashing to ensure the same user always gets the same variant:

```typescript
const variant = manager.assignVariant(experimentId, sessionId, userId);
```

**Algorithm:**

1. Hash `userId` (or `sessionId` if no userId) + `experimentId`
2. Normalize hash to 0-1 range
3. Select variant based on cumulative allocation

**Result:** Same user + same experiment = same variant (always)

### Assignment Examples

```typescript
// User-based (logged in users)
const variant1 = manager.assignVariant('exp-1', 'session-123', 'user-456');
// user-456 will always get same variant in exp-1

// Session-based (anonymous users)
const variant2 = manager.assignVariant('exp-1', 'session-789');
// session-789 will always get same variant in exp-1

// Check existing assignment
const existing = manager.getAssignment('exp-1', 'session-123', 'user-456');
if (existing) {
  console.log('Already assigned to:', existing.variantId);
}
```

### Assignment Distribution

Allocation directly controls traffic split:

```typescript
// 50/50 split
allocation: [0.5, 0.5];

// 80/20 split (control/treatment)
allocation: [0.8, 0.2];

// 33/33/33 split (3 variants)
allocation: [0.33, 0.33, 0.34];

// 70/20/10 split (control + 2 treatments)
allocation: [0.7, 0.2, 0.1];
```

### Multi-Variant Experiments

```typescript
manager.createExperiment({
  id: 'merge-mode-comparison',
  name: 'Compare Team Merge Modes',
  variants: [
    { id: 'consensus', name: 'Consensus', config: { merge: 'consensus' } },
    { id: 'debate', name: 'Debate', config: { merge: 'debate' } },
    { id: 'weighted', name: 'Weighted', config: { merge: 'weighted' } },
  ],
  allocation: [0.5, 0.25, 0.25], // Control gets 50%
  metrics: ['quality', 'latency', 'cost'],
});
```

---

## Recording Metrics

### Basic Recording

```typescript
manager.recordMetric(
  experimentId,
  sessionId,
  metricName,
  value,
  userId? // optional
);
```

### Running Averages

Metrics are tracked as running averages for efficiency:

**Formula:** `newAvg = (oldAvg * count + newValue) / (count + 1)`

**Benefits:**

- Constant memory per variant
- O(1) metric update
- No storage of individual values

### Example: Complete Flow

```typescript
// 1. Assign variant
const variant = manager.assignVariant('exp-1', sessionId, userId);

// 2. Execute with variant config
const result = await executeWithConfig(variant.config);

// 3. Record all metrics
manager.recordMetric('exp-1', sessionId, 'latency', result.latency, userId);
manager.recordMetric('exp-1', sessionId, 'cost', result.cost, userId);
manager.recordMetric('exp-1', sessionId, 'quality', result.quality, userId);

// Running averages automatically updated
```

### Metric Types

**Latency (milliseconds):**

```typescript
manager.recordMetric('exp-1', sessionId, 'latency', 1250);
```

**Cost (USD):**

```typescript
manager.recordMetric('exp-1', sessionId, 'cost', 0.008);
```

**Quality (0-1 scale):**

```typescript
manager.recordMetric('exp-1', sessionId, 'quality', 0.92);
```

**Success Rate (0-1 scale):**

```typescript
const success = result.error ? 0 : 1;
manager.recordMetric('exp-1', sessionId, 'success_rate', success);
```

**Hit Rate (0-1 scale):**

```typescript
const hit = cacheHit ? 1 : 0;
manager.recordMetric('exp-1', sessionId, 'hit_rate', hit);
```

**Custom Metrics:**

```typescript
manager.recordMetric('exp-1', sessionId, 'custom_score', 42.5);
```

---

## Analyzing Results

### Get Results

```typescript
const results = manager.getResults('experiment-id');

results.forEach((result) => {
  console.log(`Variant: ${result.variantId}`);
  console.log(`  Sample size: ${result.sampleSize}`);
  console.log(`  Metrics:`, result.metrics);
});
```

### Statistical Analysis

```typescript
const analysis = manager.analyzeExperiment('experiment-id');

console.log('Winner:', analysis.winner); // 'variant-id' or null
console.log('Significant:', analysis.significant); // true/false
console.log('Confidence:', analysis.confidence); // 0-1
console.log('Recommendation:', analysis.recommendation);
```

### Analysis Components

**Winner Detection:**

- Sorts variants by primary metric (first in metrics list)
- Identifies top performer

**Significance Testing:**

- Requires minimum sample size per variant (default: 30)
- Computes relative difference between winner and runner-up
- Checks against significance threshold (default: 0.05)

**Confidence Score:**

- Based on relative difference and sample sizes
- Higher sample size = higher confidence
- 0-1 scale

**Recommendation:**

- "Winner is statistically significant" → Roll out winner
- "Continue collecting samples" → Not enough data
- "No clear winner" → Variants perform similarly

### Example Analysis Flow

```typescript
// Check if experiment is ready for analysis
const stats = manager.getStats('exp-1');

if (stats.totalAssignments < 100) {
  console.log('Not enough data yet');
  return;
}

// Analyze
const analysis = manager.analyzeExperiment('exp-1');

if (analysis.significant) {
  console.log(
    `Winner: ${analysis.winner} with ${analysis.confidence} confidence`
  );
  console.log('Recommendation: Roll out winning variant');

  // Complete experiment
  manager.updateStatus('exp-1', 'completed');

  // Apply winning configuration
  applyConfig(analysis.winner);
} else {
  console.log(analysis.recommendation);
  // Continue experiment
}
```

### Comparing Specific Variants

```typescript
import { ResultsAnalyzer } from '@pcl/sdk/runtime/experiments';

const analyzer = new ResultsAnalyzer(config);

const results = manager.getResults('exp-1');
const comparison = analyzer.compareVariants(results[0], results[1], 'latency');

console.log('Winner:', comparison.winner);
console.log('Difference:', comparison.difference, 'ms');
console.log('Percent difference:', comparison.percentDifference, '%');
```

### Summary Statistics

```typescript
const summary = analyzer.computeSummary(results, 'latency');

console.log('Mean:', summary.mean);
console.log('Median:', summary.median);
console.log('Std Dev:', summary.stdDev);
console.log('Min:', summary.min);
console.log('Max:', summary.max);
```

---

## Best Practices

### 1. Start with Clear Hypotheses

**Good:**

```typescript
// Hypothesis: Lower cache threshold will increase hit rate by >10%
// without significantly degrading quality
{
  id: 'cache-threshold-test',
  metrics: ['hit_rate', 'quality', 'cost'],
  minSampleSize: 100,
}
```

**Bad:**

```typescript
// No clear hypothesis or success criteria
{
  id: 'random-test',
  metrics: ['metric1', 'metric2', 'metric3', 'metric4'],
}
```

### 2. Use Conservative Traffic Splits

**Recommended:**

```typescript
// 80/20 for safety
allocation: [0.8, 0.2];

// or 90/10 for risky changes
allocation: [0.9, 0.1];
```

**Avoid:**

```typescript
// 50/50 is risky if treatment has issues
allocation: [0.5, 0.5];
```

### 3. Define Minimum Sample Sizes

```typescript
// Based on expected effect size and significance level
minSampleSize: 100; // For most experiments

// Smaller changes need larger samples
minSampleSize: 500; // For subtle differences

// Obvious changes can use smaller samples
minSampleSize: 30; // For major differences
```

### 4. Monitor During Experiment

```typescript
// Regular monitoring
setInterval(() => {
  const stats = manager.getStats('exp-1');
  console.log('Progress:', stats.totalAssignments);

  // Early stopping if treatment is clearly worse
  const analysis = manager.analyzeExperiment('exp-1');
  if (analysis.results[1].metrics.error_rate > 0.1) {
    console.warn('High error rate, pausing experiment');
    manager.updateStatus('exp-1', 'paused');
  }
}, 3600000); // Every hour
```

### 5. One Change at a Time

**Good:**

```typescript
// Test one variable
{
  variants: [
    { config: { cacheThreshold: 0.95 } },
    { config: { cacheThreshold: 0.9 } },
  ];
}
```

**Bad:**

```typescript
// Multiple changes make results unclear
{
  variants: [
    { config: { cacheThreshold: 0.95, ttl: 3600000 } },
    { config: { cacheThreshold: 0.9, ttl: 7200000 } },
  ];
}
```

### 6. Run Long Enough

```typescript
// Don't stop too early
if (analysis.significant && stats.totalAssignments > 100) {
  // Good: Minimum sample reached
} else {
  // Continue collecting data
}
```

### 7. Document Everything

```typescript
manager.createExperiment({
  id: 'exp-1',
  name: 'Cache Threshold Test',
  description: `
    Hypothesis: Lowering similarity threshold from 0.95 to 0.90
    will increase hit rate by >10% with <5% quality degradation.

    Expected impact:
    - Hit rate: 30% → 35%+
    - Cost savings: 25% → 30%+
    - Quality: 0.90 → >0.85

    Duration: 1 week
    Target sample: 500 per variant
  `,
  // ...
});
```

---

## Common Patterns

### Pattern 1: Configuration Optimization

**Goal:** Find optimal configuration value

```typescript
manager.createExperiment({
  id: 'cache-ttl-optimization',
  name: 'Optimize Cache TTL',
  variants: [
    { id: '30min', config: { ttl: 1800000 } },
    { id: '1hour', config: { ttl: 3600000 } },
    { id: '2hour', config: { ttl: 7200000 } },
  ],
  allocation: [0.33, 0.34, 0.33],
  metrics: ['hit_rate', 'staleness', 'memory_usage'],
});
```

### Pattern 2: Feature Rollout

**Goal:** Safely roll out new feature

```typescript
manager.createExperiment({
  id: 'learned-routing-rollout',
  name: 'Learned Routing Feature',
  variants: [
    {
      id: 'control',
      name: 'Static Routing (Current)',
      config: { routing: false },
    },
    {
      id: 'treatment',
      name: 'Learned Routing (New)',
      config: { routing: true },
    },
  ],
  allocation: [0.95, 0.05], // Start with 5% traffic
  metrics: ['latency', 'cost', 'quality', 'error_rate'],
});

// If successful, gradually increase:
// Week 1: 95/5
// Week 2: 90/10
// Week 3: 80/20
// Week 4: 50/50
// Week 5: 0/100 (full rollout)
```

### Pattern 3: Algorithm Comparison

**Goal:** Compare different approaches

```typescript
manager.createExperiment({
  id: 'merge-mode-comparison',
  name: 'Team Merge Algorithm Comparison',
  variants: [
    { id: 'consensus', config: { merge: 'consensus' } },
    { id: 'debate', config: { merge: 'debate', rounds: 3 } },
    { id: 'weighted', config: { merge: 'weighted' } },
  ],
  allocation: [0.4, 0.3, 0.3],
  metrics: ['quality', 'latency', 'token_usage', 'cost'],
});
```

### Pattern 4: Threshold Tuning

**Goal:** Find optimal threshold value

```typescript
manager.createExperiment({
  id: 'escalation-threshold-tuning',
  name: 'Confidence Escalation Threshold',
  variants: [
    { id: 'conservative', config: { threshold: 0.3 } },
    { id: 'moderate', config: { threshold: 0.5 } },
    { id: 'aggressive', config: { threshold: 0.7 } },
  ],
  allocation: [0.33, 0.34, 0.33],
  metrics: ['escalation_rate', 'quality_improvement', 'cost_increase'],
});
```

### Pattern 5: Sequential Testing

**Goal:** Test multiple variants sequentially

```typescript
// Phase 1: Test A vs B
manager.createExperiment({
  id: 'phase-1',
  variants: [
    { id: 'A', config: { approach: 'A' } },
    { id: 'B', config: { approach: 'B' } },
  ],
  allocation: [0.5, 0.5],
});

// Wait for results...
const phase1Analysis = manager.analyzeExperiment('phase-1');
const winner1 = phase1Analysis.winner;

// Phase 2: Test winner vs C
manager.createExperiment({
  id: 'phase-2',
  variants: [
    { id: winner1, config: { approach: winner1 } },
    { id: 'C', config: { approach: 'C' } },
  ],
  allocation: [0.5, 0.5],
});
```

---

## Statistical Analysis

### Minimum Sample Size

Minimum samples required for reliable results:

```typescript
// Default: 30 per variant
minSampleSize: 30;

// For subtle effects: 100+
minSampleSize: 100;

// For very subtle effects: 500+
minSampleSize: 500;
```

**Formula:** `n = (Z * σ / d)²`

- Z = confidence level (1.96 for 95%)
- σ = standard deviation
- d = minimum detectable difference

### Significance Threshold

Controls false positive rate:

```typescript
// Default: p < 0.05 (5% false positive rate)
significanceThreshold: 0.05;

// More strict: p < 0.01 (1% false positive rate)
significanceThreshold: 0.01;

// Less strict: p < 0.10 (10% false positive rate)
significanceThreshold: 0.1;
```

### Confidence Calculation

PCL computes confidence based on:

1. **Relative Difference:**

   ```
   relativeDiff = |winner - runnerUp| / max(runnerUp, 0.001)
   ```

2. **Sample Factor:**

   ```
   sampleFactor = min(1, minSampleSize / 100)
   ```

3. **Confidence:**
   ```
   confidence = relativeDiff * sampleFactor
   ```

### Interpreting Results

**Confidence Levels:**

- **>0.95:** Very high confidence, safe to roll out
- **0.80-0.95:** High confidence, likely safe
- **0.50-0.80:** Moderate confidence, consider more data
- **<0.50:** Low confidence, continue experiment

**Significance:**

- **True + High Confidence:** Strong winner, roll out
- **True + Low Confidence:** Winner detected, but weak signal
- **False + High Confidence:** Close results, variants similar
- **False + Low Confidence:** Not enough data

---

## Troubleshooting

### Issue: No Statistical Significance

**Symptoms:**

- Large sample size but no winner detected
- Low confidence scores

**Causes:**

- Variants perform similarly
- Metrics have high variance
- Sample size still insufficient

**Solutions:**

```typescript
// 1. Run longer
const stats = manager.getStats('exp-1');
if (stats.totalAssignments < 500) {
  console.log('Continue collecting data');
}

// 2. Check variance
const results = manager.getResults('exp-1');
const summary = analyzer.computeSummary(results, 'latency');
if (summary.stdDev > summary.mean) {
  console.log('High variance, need larger sample');
}

// 3. Accept that variants are similar
if (stats.totalAssignments > 1000 && !analysis.significant) {
  console.log('Variants perform similarly, choose based on other factors');
}
```

### Issue: Unbalanced Traffic

**Symptoms:**

- Variant distribution doesn't match allocation

**Diagnosis:**

```typescript
const stats = manager.getStats('exp-1');
console.log('Distribution:', stats.variantDistribution);
// Expected: { control: 800, treatment: 200 } for 80/20 split
// Actual: { control: 850, treatment: 150 } ← Imbalanced
```

**Causes:**

- Non-random user distribution
- Hash collision (very rare)
- Assignment errors

**Solutions:**

```typescript
// 1. Check total assignments
if (stats.totalAssignments < 100) {
  console.log('Sample size too small, distribution will stabilize');
}

// 2. Verify allocation
const experiment = manager.getExperiment('exp-1');
console.log('Allocation:', experiment.allocation);
```

### Issue: High Variance

**Symptoms:**

- Wildly different metric values
- Unstable averages

**Solutions:**

```typescript
// 1. Remove outliers (not built-in, manual process)
// 2. Increase sample size
minSampleSize: 500;

// 3. Use median instead of mean (custom analysis)
// 4. Stratify by user segments
```

### Issue: Multiple Comparisons

**Problem:** Testing many variants increases false positive rate

**Solution:**

```typescript
// Apply Bonferroni correction
const numComparisons = (variants.length * (variants.length - 1)) / 2;
const adjustedThreshold = significanceThreshold / numComparisons;

console.log('Adjusted threshold:', adjustedThreshold);
```

---

## Examples

### Example 1: Cache Threshold Optimization

```typescript
// Setup
const manager = new ExperimentManager({
  enabled: true,
  minSampleSize: 100,
  significanceThreshold: 0.05,
});

// Create experiment
manager.createExperiment({
  id: 'cache-threshold',
  name: 'Cache Similarity Threshold Test',
  description: 'Find optimal similarity threshold for caching',
  variants: [
    { id: 'strict', name: '0.95 (Current)', config: { threshold: 0.95 } },
    { id: 'moderate', name: '0.90', config: { threshold: 0.9 } },
    { id: 'loose', name: '0.85', config: { threshold: 0.85 } },
  ],
  allocation: [0.5, 0.3, 0.2],
  metrics: ['hit_rate', 'quality', 'cost_savings'],
  startTime: Date.now(),
  status: 'running',
});

// Execute
async function handleRequest(sessionId, userId) {
  const variant = manager.assignVariant('cache-threshold', sessionId, userId);
  const threshold = variant.config.threshold;

  const cache = new ResponseCache({ similarityThreshold: threshold });
  const cached = cache.get(message, personaId);

  if (cached) {
    manager.recordMetric('cache-threshold', sessionId, 'hit_rate', 1, userId);
    manager.recordMetric(
      'cache-threshold',
      sessionId,
      'quality',
      cached.quality,
      userId
    );
    manager.recordMetric(
      'cache-threshold',
      sessionId,
      'cost_savings',
      cached.cost,
      userId
    );
    return cached.response;
  }

  const response = await execute(message);
  cache.set(message, response, personaId);

  manager.recordMetric('cache-threshold', sessionId, 'hit_rate', 0, userId);
  manager.recordMetric(
    'cache-threshold',
    sessionId,
    'quality',
    response.quality,
    userId
  );
  manager.recordMetric('cache-threshold', sessionId, 'cost_savings', 0, userId);

  return response;
}

// Analyze (after 1 week)
const analysis = manager.analyzeExperiment('cache-threshold');
console.log('Results:', analysis);

// Expected output:
// {
//   winner: 'moderate',
//   significant: true,
//   confidence: 0.92,
//   recommendation: 'moderate is statistically significant winner for hit_rate'
// }
```

### Example 2: Routing Strategy Comparison

```typescript
manager.createExperiment({
  id: 'routing-strategy',
  name: 'Learned vs Static Routing',
  variants: [
    { id: 'static', config: { routing: 'static', provider: 'anthropic' } },
    { id: 'learned', config: { routing: 'learned' } },
  ],
  allocation: [0.8, 0.2],
  metrics: ['latency', 'cost', 'quality'],
  startTime: Date.now(),
  status: 'running',
});

// Integration
async function executePersona(message, sessionId, userId) {
  const variant = manager.assignVariant('routing-strategy', sessionId, userId);

  let provider;
  if (variant.config.routing === 'static') {
    provider = getProvider(variant.config.provider);
  } else {
    const router = new LearnedRouter(config);
    const features = TaskClassifier.classify(message);
    provider = router.selectProvider(features, availableProviders).primary;
  }

  const start = Date.now();
  const response = await provider.execute(message);
  const latency = Date.now() - start;

  manager.recordMetric(
    'routing-strategy',
    sessionId,
    'latency',
    latency,
    userId
  );
  manager.recordMetric(
    'routing-strategy',
    sessionId,
    'cost',
    response.cost,
    userId
  );
  manager.recordMetric(
    'routing-strategy',
    sessionId,
    'quality',
    response.quality,
    userId
  );

  return response;
}
```

### Example 3: Feature Rollout with Gradual Increase

```typescript
// Week 1: 5% traffic
manager.createExperiment({
  id: 'new-feature-rollout',
  name: 'New Feature Gradual Rollout',
  variants: [
    { id: 'control', config: { featureEnabled: false } },
    { id: 'treatment', config: { featureEnabled: true } },
  ],
  allocation: [0.95, 0.05],
  metrics: ['latency', 'error_rate', 'user_satisfaction'],
});

// Monitor and increase weekly
async function updateAllocation(week) {
  const allocations = {
    1: [0.95, 0.05],
    2: [0.9, 0.1],
    3: [0.8, 0.2],
    4: [0.5, 0.5],
    5: [0.0, 1.0],
  };

  const analysis = manager.analyzeExperiment('new-feature-rollout');

  if (analysis.results[1].metrics.error_rate > 0.05) {
    console.error('High error rate, rolling back');
    manager.updateStatus('new-feature-rollout', 'paused');
    return;
  }

  // Update for next week
  const newAllocation = allocations[week + 1];
  // Note: Requires creating new experiment with new allocation
  // Current implementation doesn't support dynamic allocation changes
}
```

---

## Further Reading

- [Adaptive Intelligence Overview](ADAPTIVE_INTELLIGENCE.md)
- [Configuration Reference](ADAPTIVE_CONFIG.md)
- [Statistical Testing](https://en.wikipedia.org/wiki/Statistical_hypothesis_testing)
- [A/B Testing Best Practices](https://en.wikipedia.org/wiki/A/B_testing)

---

**Need Help?**

- GitHub: [Report an issue](https://github.com/personalayer/pcl-lite/issues)
- Docs: [pcl.dev/docs](https://pcl.dev/docs)
- Community: [Discord](https://discord.gg/pcl)
