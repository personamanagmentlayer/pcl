# PCL Adaptive Intelligence Configuration Reference

**Version:** 2.2 (Q2 2025)
**Complete Configuration Guide for Adaptive Features**

---

## Table of Contents

1. [Overview](#overview)
2. [Complete Configuration Schema](#complete-configuration-schema)
3. [Analytics Configuration](#analytics-configuration)
4. [Confidence Scoring Configuration](#confidence-scoring-configuration)
5. [Weight Adjustment Configuration](#weight-adjustment-configuration)
6. [Routing Configuration](#routing-configuration)
7. [Caching Configuration](#caching-configuration)
8. [Escalation Configuration](#escalation-configuration)
9. [Experiments Configuration](#experiments-configuration)
10. [Configuration Presets](#configuration-presets)
11. [Environment Variables](#environment-variables)
12. [Migration Guide](#migration-guide)

---

## Overview

PCL Adaptive Intelligence is highly configurable. This guide provides complete reference for all configuration options.

### Configuration Principles

1. **Secure by default:** Safe defaults that work well for most use cases
2. **Opt-in features:** All adaptive features disabled by default
3. **Gradual adoption:** Enable features incrementally
4. **Environment-aware:** Development vs. production configurations
5. **Type-safe:** Full TypeScript type definitions

---

## Complete Configuration Schema

### Full Configuration Object

```typescript
import { Runtime } from '@pcl/sdk';

const runtime = new Runtime({
  adaptive: {
    // Performance Analytics
    analytics: {
      enabled: boolean;
      retention: number;
      storage: 'memory' | 'disk' | 'database';
      maxDataPoints?: number;
      autoAggregate?: boolean;
      aggregationInterval?: number;
    },

    // Confidence Scoring
    confidence: {
      enabled: boolean;
      signals: string[];
      weights?: Partial<ConfidenceWeights>;
      calibration?: boolean;
      minSampleSize?: number;
    },

    // Dynamic Weight Adjustment
    weightAdjustment: {
      enabled: boolean;
      learningRate: number;
      minWeight: number;
      maxWeight: number;
      adaptationInterval: number;
      signals?: {
        confidence: number;
        selection: number;
        quality: number;
      };
    },

    // Learned Routing
    routing: {
      enabled: boolean;
      fallbackChain: boolean;
      weights?: {
        capability: number;
        performance: number;
        cost: number;
        latency: number;
        availability: number;
      };
      cacheDuration?: number;
    },

    // Response Caching
    caching: {
      enabled: boolean;
      ttl: number;
      maxEntries: number;
      similarityThreshold: number;
      evictionPolicy: 'lru' | 'lfu' | 'ttl';
      storage?: 'memory' | 'redis' | 'disk';
    },

    // Auto-Escalation
    escalation: {
      enabled: boolean;
      rules: EscalationRule[];
      maxGlobalRetries?: number;
      retryDelay?: number;
    },

    // A/B Testing
    experiments: {
      enabled: boolean;
      allowedExperiments: string[];
      minSampleSize?: number;
      significanceThreshold?: number;
    },
  },
});
```

---

## Analytics Configuration

### AnalyticsConfig Interface

```typescript
interface AnalyticsConfig {
  /** Enable analytics collection */
  enabled: boolean;

  /** Retention period in days (0 = unlimited) */
  retention: number;

  /** Storage backend */
  storage: 'memory' | 'disk' | 'database';

  /** Maximum data points in memory (default: 100,000) */
  maxDataPoints?: number;

  /** Auto-aggregate old data (default: false) */
  autoAggregate?: boolean;

  /** Aggregation interval in days (default: 7) */
  aggregationInterval?: number;
}
```

### Default Configuration

```typescript
const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  enabled: false,
  retention: 30, // 30 days
  storage: 'memory',
  maxDataPoints: 100000,
  autoAggregate: false,
  aggregationInterval: 7,
};
```

### Configuration Examples

**Development (Minimal Retention):**

```typescript
analytics: {
  enabled: true,
  retention: 7,       // 1 week
  storage: 'memory',
  maxDataPoints: 10000,
}
```

**Production (High Volume):**

```typescript
analytics: {
  enabled: true,
  retention: 90,      // 3 months
  storage: 'database', // Persistent storage
  maxDataPoints: 500000,
  autoAggregate: true,
  aggregationInterval: 14,
}
```

**Low Memory:**

```typescript
analytics: {
  enabled: true,
  retention: 7,
  storage: 'disk',
  maxDataPoints: 50000,
  autoAggregate: true,
  aggregationInterval: 3,
}
```

### Storage Options

**Memory (Default):**

- Fast access
- Limited by RAM
- Data lost on restart
- Best for: Development, low volume

**Disk:**

- Persistent storage
- Slower than memory
- Survives restarts
- Best for: Medium volume, limited RAM

**Database:**

- Highly scalable
- Complex queries supported
- Requires database setup
- Best for: Production, high volume

---

## Confidence Scoring Configuration

### ConfidenceConfig Interface

```typescript
interface ConfidenceConfig {
  /** Enable confidence scoring */
  enabled: boolean;

  /** Signals to use for scoring */
  signals: string[];

  /** Custom signal weights */
  weights?: Partial<ConfidenceWeights>;

  /** Enable calibration */
  calibration?: boolean;

  /** Minimum samples for calibration */
  minSampleSize?: number;
}
```

### Default Signal Weights

```typescript
const DEFAULT_CONFIDENCE_WEIGHTS: ConfidenceWeights = {
  providerConfidence: 0.3, // 30%
  structureQuality: 0.15, // 15%
  coherenceScore: 0.15, // 15%
  providerReliability: 0.15, // 15%
  similarTaskPerformance: 0.1, // 10%
  tokenEfficiency: 0.05, // 5%
  latencyScore: 0.05, // 5%
  costScore: 0.03, // 3%
  messageComplexity: 0.01, // 1%
  domainMatch: 0.01, // 1%
  responseLength: 0.0, // 0% (optional)
};
```

### Configuration Examples

**All Signals (Default):**

```typescript
confidence: {
  enabled: true,
  signals: [
    'providerConfidence',
    'structureQuality',
    'coherenceScore',
    'providerReliability',
    'similarTaskPerformance',
    'tokenEfficiency',
    'latencyScore',
    'costScore',
    'messageComplexity',
    'domainMatch',
  ],
  calibration: true,
  minSampleSize: 100,
}
```

**Core Signals Only (Faster):**

```typescript
confidence: {
  enabled: true,
  signals: [
    'providerConfidence',
    'structureQuality',
    'coherenceScore',
    'providerReliability',
  ],
  weights: {
    providerConfidence: 0.40,
    structureQuality: 0.25,
    coherenceScore: 0.20,
    providerReliability: 0.15,
  },
  calibration: true,
}
```

**Custom Weights (Quality Focus):**

```typescript
confidence: {
  enabled: true,
  signals: [
    'providerConfidence',
    'structureQuality',
    'coherenceScore',
    'similarTaskPerformance',
  ],
  weights: {
    providerConfidence: 0.25,
    structureQuality: 0.30,    // Increased
    coherenceScore: 0.30,      // Increased
    similarTaskPerformance: 0.15,
  },
  calibration: true,
  minSampleSize: 50,
}
```

**Cost-Optimized:**

```typescript
confidence: {
  enabled: true,
  signals: [
    'providerConfidence',
    'costScore',
    'tokenEfficiency',
  ],
  weights: {
    providerConfidence: 0.50,
    costScore: 0.30,          // High weight on cost
    tokenEfficiency: 0.20,
  },
  calibration: false,         // Faster
}
```

### Available Signals

| Signal                   | Description                      | Weight | Computation Cost |
| ------------------------ | -------------------------------- | ------ | ---------------- |
| `providerConfidence`     | Provider-reported confidence     | 30%    | Low              |
| `structureQuality`       | Response structure assessment    | 15%    | Medium           |
| `coherenceScore`         | Logical flow and coherence       | 15%    | High             |
| `providerReliability`    | Historical provider success rate | 15%    | Low              |
| `similarTaskPerformance` | Performance on similar tasks     | 10%    | Medium           |
| `tokenEfficiency`        | Output/input token ratio         | 5%     | Low              |
| `latencyScore`           | Response time quality            | 5%     | Low              |
| `costScore`              | Cost efficiency                  | 3%     | Low              |
| `messageComplexity`      | Input complexity assessment      | 1%     | Medium           |
| `domainMatch`            | Task-persona domain alignment    | 1%     | Low              |
| `responseLength`         | Output length appropriateness    | 0%     | Low              |

---

## Weight Adjustment Configuration

### WeightAdjustmentConfig Interface

```typescript
interface WeightAdjustmentConfig {
  /** Enable dynamic weight adjustment */
  enabled: boolean;

  /** Learning rate (0.05-0.2 recommended) */
  learningRate: number;

  /** Minimum weight per member */
  minWeight: number;

  /** Maximum weight per member */
  maxWeight: number;

  /** Adjust every N merges */
  adaptationInterval: number;

  /** Signal weights for performance computation */
  signals?: {
    confidence: number;
    selection: number;
    quality: number;
  };
}
```

### Default Configuration

```typescript
const DEFAULT_WEIGHT_ADJUSTMENT_CONFIG: WeightAdjustmentConfig = {
  enabled: false,
  learningRate: 0.1,
  minWeight: 0.1,
  maxWeight: 2.0,
  adaptationInterval: 10,
  signals: {
    confidence: 0.3,
    selection: 0.4,
    quality: 0.3,
  },
};
```

### Configuration Examples

**Conservative (Slow Learning):**

```typescript
weightAdjustment: {
  enabled: true,
  learningRate: 0.05,      // Slower adjustment
  minWeight: 0.3,          // Higher minimum
  maxWeight: 1.5,          // Lower maximum
  adaptationInterval: 20,  // Less frequent
  signals: {
    confidence: 0.3,
    selection: 0.4,
    quality: 0.3,
  },
}
```

**Aggressive (Fast Learning):**

```typescript
weightAdjustment: {
  enabled: true,
  learningRate: 0.2,       // Faster adjustment
  minWeight: 0.05,         // Lower minimum
  maxWeight: 3.0,          // Higher maximum
  adaptationInterval: 5,   // More frequent
  signals: {
    confidence: 0.2,
    selection: 0.5,        // Emphasize selection
    quality: 0.3,
  },
}
```

**Quality-Focused:**

```typescript
weightAdjustment: {
  enabled: true,
  learningRate: 0.1,
  minWeight: 0.1,
  maxWeight: 2.0,
  adaptationInterval: 10,
  signals: {
    confidence: 0.2,
    selection: 0.2,
    quality: 0.6,          // Emphasize quality
  },
}
```

**Selection-Focused:**

```typescript
weightAdjustment: {
  enabled: true,
  learningRate: 0.15,
  minWeight: 0.1,
  maxWeight: 2.5,
  adaptationInterval: 8,
  signals: {
    confidence: 0.2,
    selection: 0.6,        // Emphasize selection rate
    quality: 0.2,
  },
}
```

### Learning Rate Guidelines

| Learning Rate | Adjustment Speed | Use Case                              |
| ------------- | ---------------- | ------------------------------------- |
| 0.05          | Very slow        | Stable environments, high confidence  |
| 0.1           | Moderate         | Default, balanced approach            |
| 0.15          | Fast             | Dynamic environments, experimentation |
| 0.2           | Very fast        | Rapid adaptation, testing             |

---

## Routing Configuration

### RoutingConfig Interface

```typescript
interface RoutingConfig {
  /** Enable learned routing */
  enabled: boolean;

  /** Enable fallback chain */
  fallbackChain: boolean;

  /** Scoring weights */
  weights?: {
    capability: number;
    performance: number;
    cost: number;
    latency: number;
    availability: number;
  };

  /** Cache routing decisions (ms) */
  cacheDuration?: number;
}
```

### Default Configuration

```typescript
const DEFAULT_ROUTING_CONFIG: RoutingConfig = {
  enabled: false,
  fallbackChain: true,
  weights: {
    capability: 0.3,
    performance: 0.25,
    cost: 0.2,
    latency: 0.15,
    availability: 0.1,
  },
  cacheDuration: 300000, // 5 minutes
};
```

### Configuration Examples

**Quality-First:**

```typescript
routing: {
  enabled: true,
  fallbackChain: true,
  weights: {
    capability: 0.40,      // Emphasize capability
    performance: 0.35,     // Emphasize performance
    cost: 0.10,
    latency: 0.10,
    availability: 0.05,
  },
  cacheDuration: 600000,   // 10 minutes
}
```

**Cost-Optimized:**

```typescript
routing: {
  enabled: true,
  fallbackChain: true,
  weights: {
    capability: 0.25,
    performance: 0.15,
    cost: 0.40,            // Emphasize cost
    latency: 0.10,
    availability: 0.10,
  },
  cacheDuration: 300000,
}
```

**Latency-Sensitive:**

```typescript
routing: {
  enabled: true,
  fallbackChain: true,
  weights: {
    capability: 0.30,
    performance: 0.20,
    cost: 0.10,
    latency: 0.35,         // Emphasize latency
    availability: 0.05,
  },
  cacheDuration: 60000,    // 1 minute (fresher decisions)
}
```

**Balanced (Default):**

```typescript
routing: {
  enabled: true,
  fallbackChain: true,
  weights: {
    capability: 0.30,
    performance: 0.25,
    cost: 0.20,
    latency: 0.15,
    availability: 0.10,
  },
  cacheDuration: 300000,
}
```

---

## Caching Configuration

### CachingConfig Interface

```typescript
interface CachingConfig {
  /** Enable response caching */
  enabled: boolean;

  /** Time-to-live in milliseconds */
  ttl: number;

  /** Maximum cache entries */
  maxEntries: number;

  /** Similarity threshold (0-1) */
  similarityThreshold: number;

  /** Eviction policy */
  evictionPolicy: 'lru' | 'lfu' | 'ttl';

  /** Storage backend */
  storage?: 'memory' | 'redis' | 'disk';
}
```

### Default Configuration

```typescript
const DEFAULT_CACHING_CONFIG: CachingConfig = {
  enabled: false,
  ttl: 3600000, // 1 hour
  maxEntries: 1000,
  similarityThreshold: 0.95,
  evictionPolicy: 'lru',
  storage: 'memory',
};
```

### Configuration Examples

**Aggressive Caching (Cost Reduction):**

```typescript
caching: {
  enabled: true,
  ttl: 7200000,            // 2 hours
  maxEntries: 5000,
  similarityThreshold: 0.90, // Lower threshold
  evictionPolicy: 'lfu',   // Keep frequently used
  storage: 'memory',
}
```

**Conservative Caching (Quality Focus):**

```typescript
caching: {
  enabled: true,
  ttl: 1800000,            // 30 minutes
  maxEntries: 500,
  similarityThreshold: 0.98, // Higher threshold
  evictionPolicy: 'ttl',   // Expire old entries
  storage: 'memory',
}
```

**High Volume:**

```typescript
caching: {
  enabled: true,
  ttl: 3600000,
  maxEntries: 10000,
  similarityThreshold: 0.95,
  evictionPolicy: 'lru',
  storage: 'redis',        // Distributed cache
}
```

**Low Memory:**

```typescript
caching: {
  enabled: true,
  ttl: 1800000,
  maxEntries: 200,
  similarityThreshold: 0.95,
  evictionPolicy: 'lru',
  storage: 'disk',         // Persistent storage
}
```

### Eviction Policy Comparison

| Policy | When to Use         | Memory Usage | Hit Rate |
| ------ | ------------------- | ------------ | -------- |
| LRU    | General purpose     | Medium       | Good     |
| LFU    | Repeated queries    | High         | Best     |
| TTL    | Time-sensitive data | Low          | Variable |

### Similarity Threshold Guidelines

| Threshold | Matching         | Use Case                 |
| --------- | ---------------- | ------------------------ |
| 0.98-1.0  | Very strict      | High accuracy required   |
| 0.95-0.97 | Strict (default) | Balanced quality/savings |
| 0.90-0.94 | Moderate         | Cost-focused             |
| 0.85-0.89 | Loose            | Maximum savings          |

---

## Escalation Configuration

### EscalationConfig Interface

```typescript
interface EscalationConfig {
  /** Enable auto-escalation */
  enabled: boolean;

  /** Escalation rules */
  rules: EscalationRule[];

  /** Global retry limit */
  maxGlobalRetries?: number;

  /** Retry delay in milliseconds */
  retryDelay?: number;
}
```

### EscalationRule Interface

```typescript
interface EscalationRule {
  /** Rule name */
  name: string;

  /** Condition function */
  condition: (response: Response, context: Context) => boolean;

  /** Action to take */
  action: 'retry' | 'fallback' | 'upgrade' | 'team';

  /** Target (provider/model/team ID) */
  target?: string;

  /** Maximum retries for this rule */
  maxRetries?: number;

  /** Priority (higher = evaluated first) */
  priority: number;
}
```

### Default Configuration

```typescript
import { DEFAULT_ESCALATION_RULES } from '@pcl/sdk/runtime/escalation';

const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  enabled: false,
  rules: DEFAULT_ESCALATION_RULES,
  maxGlobalRetries: 3,
  retryDelay: 1000, // 1 second
};
```

### Configuration Examples

**Conservative (Fewer Escalations):**

```typescript
escalation: {
  enabled: true,
  rules: [
    {
      name: 'very-low-confidence',
      condition: (r) => r.confidence < 0.2, // Lower threshold
      action: 'upgrade',
      target: 'claude-opus-4',
      priority: 5,
    },
    {
      name: 'empty-response',
      condition: (r) => r.content.trim().length === 0,
      action: 'retry',
      maxRetries: 1,
      priority: 5,
    },
  ],
  maxGlobalRetries: 2,
  retryDelay: 2000,
}
```

**Aggressive (More Escalations):**

```typescript
escalation: {
  enabled: true,
  rules: [
    {
      name: 'low-confidence',
      condition: (r) => r.confidence < 0.6, // Higher threshold
      action: 'retry',
      maxRetries: 2,
      priority: 4,
    },
    {
      name: 'medium-confidence',
      condition: (r) => r.confidence < 0.75,
      action: 'upgrade',
      target: 'claude-opus-4',
      priority: 3,
    },
  ],
  maxGlobalRetries: 5,
  retryDelay: 500,
}
```

**Custom Rules:**

```typescript
escalation: {
  enabled: true,
  rules: [
    // Domain-specific rule
    {
      name: 'code-error',
      condition: (r, ctx) => {
        return ctx.messageType === 'code' &&
               r.content.includes('syntax error');
      },
      action: 'team',
      target: 'code-review-team',
      priority: 6,
    },

    // Latency-based rule
    {
      name: 'slow-response',
      condition: (r, ctx) => ctx.latency > 30000, // 30s
      action: 'fallback',
      priority: 5,
    },

    // Cost-based rule
    {
      name: 'expensive-response',
      condition: (r, ctx) => ctx.cost > 0.5, // $0.50
      action: 'fallback',
      target: 'cost-efficient-provider',
      priority: 4,
    },
  ],
  maxGlobalRetries: 3,
  retryDelay: 1000,
}
```

---

## Experiments Configuration

### ExperimentsConfig Interface

```typescript
interface ExperimentsConfig {
  /** Enable A/B testing */
  enabled: boolean;

  /** Allowed experiment IDs (for safety) */
  allowedExperiments: string[];

  /** Minimum sample size per variant */
  minSampleSize?: number;

  /** Significance threshold for analysis */
  significanceThreshold?: number;
}
```

### Default Configuration

```typescript
const DEFAULT_EXPERIMENTS_CONFIG: ExperimentsConfig = {
  enabled: false,
  allowedExperiments: [],
  minSampleSize: 30,
  significanceThreshold: 0.05, // p < 0.05
};
```

### Configuration Examples

**Development (Permissive):**

```typescript
experiments: {
  enabled: true,
  allowedExperiments: [], // Allow all
  minSampleSize: 10,      // Lower threshold
  significanceThreshold: 0.10,
}
```

**Production (Strict):**

```typescript
experiments: {
  enabled: true,
  allowedExperiments: [   // Whitelist only
    'routing-comparison',
    'cache-threshold-test',
  ],
  minSampleSize: 100,     // Higher threshold
  significanceThreshold: 0.01, // p < 0.01
}
```

**High Traffic:**

```typescript
experiments: {
  enabled: true,
  allowedExperiments: [
    'experiment-1',
    'experiment-2',
  ],
  minSampleSize: 1000,    // Large sample
  significanceThreshold: 0.001, // Very strict
}
```

---

## Configuration Presets

### Development Preset

Optimized for local development with minimal resource usage:

```typescript
const DEVELOPMENT_CONFIG = {
  adaptive: {
    analytics: {
      enabled: true,
      retention: 7,
      storage: 'memory',
      maxDataPoints: 10000,
    },
    confidence: {
      enabled: true,
      signals: ['providerConfidence', 'structureQuality'],
      calibration: false,
    },
    weightAdjustment: {
      enabled: false,
    },
    routing: {
      enabled: false,
    },
    caching: {
      enabled: true,
      ttl: 1800000,
      maxEntries: 100,
      similarityThreshold: 0.95,
      evictionPolicy: 'lru',
    },
    escalation: {
      enabled: true,
      rules: DEFAULT_ESCALATION_RULES.slice(0, 3), // First 3 rules only
      maxGlobalRetries: 2,
    },
    experiments: {
      enabled: true,
      allowedExperiments: [],
      minSampleSize: 10,
    },
  },
};
```

### Production Preset

Optimized for production with all features enabled:

```typescript
const PRODUCTION_CONFIG = {
  adaptive: {
    analytics: {
      enabled: true,
      retention: 90,
      storage: 'database',
      maxDataPoints: 1000000,
      autoAggregate: true,
      aggregationInterval: 14,
    },
    confidence: {
      enabled: true,
      signals: [
        'providerConfidence',
        'structureQuality',
        'coherenceScore',
        'providerReliability',
        'similarTaskPerformance',
        'tokenEfficiency',
        'latencyScore',
        'costScore',
      ],
      calibration: true,
      minSampleSize: 100,
    },
    weightAdjustment: {
      enabled: true,
      learningRate: 0.1,
      minWeight: 0.1,
      maxWeight: 2.0,
      adaptationInterval: 10,
    },
    routing: {
      enabled: true,
      fallbackChain: true,
      cacheDuration: 300000,
    },
    caching: {
      enabled: true,
      ttl: 3600000,
      maxEntries: 10000,
      similarityThreshold: 0.95,
      evictionPolicy: 'lru',
      storage: 'redis',
    },
    escalation: {
      enabled: true,
      rules: DEFAULT_ESCALATION_RULES,
      maxGlobalRetries: 3,
      retryDelay: 1000,
    },
    experiments: {
      enabled: true,
      allowedExperiments: ['approved-experiment-1'],
      minSampleSize: 100,
      significanceThreshold: 0.05,
    },
  },
};
```

### Cost-Optimized Preset

Maximum cost savings:

```typescript
const COST_OPTIMIZED_CONFIG = {
  adaptive: {
    analytics: {
      enabled: true,
      retention: 30,
      storage: 'memory',
      maxDataPoints: 100000,
    },
    confidence: {
      enabled: true,
      signals: ['providerConfidence', 'costScore', 'tokenEfficiency'],
      weights: {
        providerConfidence: 0.5,
        costScore: 0.3,
        tokenEfficiency: 0.2,
      },
      calibration: true,
    },
    weightAdjustment: {
      enabled: true,
      learningRate: 0.1,
      signals: {
        confidence: 0.2,
        selection: 0.3,
        quality: 0.5,
      },
    },
    routing: {
      enabled: true,
      fallbackChain: true,
      weights: {
        capability: 0.25,
        performance: 0.15,
        cost: 0.4, // Emphasize cost
        latency: 0.1,
        availability: 0.1,
      },
    },
    caching: {
      enabled: true,
      ttl: 7200000, // 2 hours
      maxEntries: 5000,
      similarityThreshold: 0.9, // More aggressive
      evictionPolicy: 'lfu',
    },
    escalation: {
      enabled: true,
      rules: DEFAULT_ESCALATION_RULES.filter(
        (r) => r.action !== 'upgrade' // Avoid expensive upgrades
      ),
    },
  },
};
```

### Quality-Optimized Preset

Maximum quality and accuracy:

```typescript
const QUALITY_OPTIMIZED_CONFIG = {
  adaptive: {
    analytics: {
      enabled: true,
      retention: 90,
      storage: 'database',
      maxDataPoints: 500000,
    },
    confidence: {
      enabled: true,
      signals: [
        'providerConfidence',
        'structureQuality',
        'coherenceScore',
        'providerReliability',
        'similarTaskPerformance',
        'domainMatch',
      ],
      weights: {
        providerConfidence: 0.25,
        structureQuality: 0.25,
        coherenceScore: 0.25,
        providerReliability: 0.15,
        similarTaskPerformance: 0.05,
        domainMatch: 0.05,
      },
      calibration: true,
      minSampleSize: 200,
    },
    weightAdjustment: {
      enabled: true,
      learningRate: 0.05, // Conservative
      minWeight: 0.3,
      maxWeight: 1.5,
      adaptationInterval: 20,
      signals: {
        confidence: 0.2,
        selection: 0.2,
        quality: 0.6, // Emphasize quality
      },
    },
    routing: {
      enabled: true,
      fallbackChain: true,
      weights: {
        capability: 0.4, // Emphasize capability
        performance: 0.35,
        cost: 0.1,
        latency: 0.1,
        availability: 0.05,
      },
    },
    caching: {
      enabled: true,
      ttl: 1800000, // 30 minutes
      maxEntries: 1000,
      similarityThreshold: 0.98, // Very strict
      evictionPolicy: 'ttl',
    },
    escalation: {
      enabled: true,
      rules: [
        ...DEFAULT_ESCALATION_RULES,
        {
          name: 'moderate-confidence',
          condition: (r) => r.confidence < 0.75,
          action: 'upgrade',
          target: 'claude-opus-4',
          priority: 3,
        },
      ],
      maxGlobalRetries: 5,
    },
  },
};
```

---

## Environment Variables

### Supported Environment Variables

```bash
# Analytics
PCL_ANALYTICS_ENABLED=true
PCL_ANALYTICS_RETENTION=30
PCL_ANALYTICS_STORAGE=memory

# Confidence
PCL_CONFIDENCE_ENABLED=true
PCL_CONFIDENCE_CALIBRATION=true

# Weight Adjustment
PCL_WEIGHT_ADJUSTMENT_ENABLED=true
PCL_WEIGHT_ADJUSTMENT_LEARNING_RATE=0.1

# Routing
PCL_ROUTING_ENABLED=true
PCL_ROUTING_FALLBACK_CHAIN=true

# Caching
PCL_CACHING_ENABLED=true
PCL_CACHING_TTL=3600000
PCL_CACHING_MAX_ENTRIES=1000
PCL_CACHING_SIMILARITY_THRESHOLD=0.95

# Escalation
PCL_ESCALATION_ENABLED=true
PCL_ESCALATION_MAX_RETRIES=3

# Experiments
PCL_EXPERIMENTS_ENABLED=false
PCL_EXPERIMENTS_MIN_SAMPLE_SIZE=30
```

### Loading from Environment

```typescript
import { Runtime } from '@pcl/sdk';

const runtime = new Runtime({
  adaptive: {
    analytics: {
      enabled: process.env.PCL_ANALYTICS_ENABLED === 'true',
      retention: parseInt(process.env.PCL_ANALYTICS_RETENTION || '30'),
      storage: (process.env.PCL_ANALYTICS_STORAGE as any) || 'memory',
    },
    caching: {
      enabled: process.env.PCL_CACHING_ENABLED === 'true',
      ttl: parseInt(process.env.PCL_CACHING_TTL || '3600000'),
      maxEntries: parseInt(process.env.PCL_CACHING_MAX_ENTRIES || '1000'),
      similarityThreshold: parseFloat(
        process.env.PCL_CACHING_SIMILARITY_THRESHOLD || '0.95'
      ),
      evictionPolicy: 'lru',
    },
    // ... other config
  },
});
```

---

## Migration Guide

### Upgrading from v2.1 to v2.2

**Step 1: Update package**

```bash
npm install @pcl/sdk@2.2
```

**Step 2: Review configuration**
All adaptive features are opt-in. Your existing configuration will continue to work.

**Step 3: Enable analytics (optional)**

```typescript
// Add to existing config
adaptive: {
  analytics: {
    enabled: true,
    retention: 30,
    storage: 'memory',
  },
}
```

**Step 4: Enable other features gradually**
Enable one feature at a time, monitor impact, then enable next.

### Breaking Changes

**None.** All adaptive features are additive and opt-in.

### Deprecation Notices

**None** for v2.2.

---

## Further Reading

- [Adaptive Intelligence Overview](ADAPTIVE_INTELLIGENCE.md)
- [A/B Testing Guide](AB_TESTING.md)
- [API Reference](api/ADAPTIVE_API.md)

---

**Questions?**

- GitHub: [Issues](https://github.com/personalayer/pcl/issues)
- Docs: [pcl.dev/docs](https://pcl.dev/docs)
- Community: [Discord](https://discord.gg/pcl)
