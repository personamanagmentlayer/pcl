# PCL Providers Guide

Complete guide to using AI providers in PCL (Persona Configuration Language).

## Table of Contents

- [Overview](#overview)
- [Available Providers](#available-providers)
- [Quick Start](#quick-start)
- [Provider Configuration](#provider-configuration)
- [Advanced Features](#advanced-features)
- [Cost Comparison](#cost-comparison)
- [Best Practices](#best-practices)

---

## Overview

PCL supports **8 AI providers** with automatic health monitoring, rate limiting, cost tracking, and fallback chains. Choose the right provider for your needs based on cost, performance, features, and deployment requirements.

### Provider Categories

**Cloud Providers** (API-based):
- Anthropic Claude
- OpenAI GPT
- Google Gemini
- DeepSeek
- Azure OpenAI
- AWS Bedrock

**Local Providers** (self-hosted):
- Ollama (FREE)

**Testing Providers**:
- Mock (development/testing)

---

## Available Providers

### 1. Anthropic Claude

**Best for**: Advanced reasoning, long context, coding

```typescript
import { AnthropicProvider } from '@pcl/sdk';

const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  defaultModel: 'claude-3-5-sonnet-20241022',
});
```

**Models**:
- `claude-3-5-sonnet-20241022` - Best balance (200K context)
- `claude-3-opus-20240229` - Highest quality
- `claude-3-haiku-20240307` - Fastest, cheapest

**Capabilities**: ✅ Streaming, ✅ Tool calling, ❌ Vision (yet)

**Cost**: $3.00-$15.00 input / $15.00-$75.00 output per 1M tokens

---

### 2. OpenAI GPT

**Best for**: General purpose, wide ecosystem support

```typescript
import { OpenAIProvider } from '@pcl/sdk';

const provider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  defaultModel: 'gpt-4-turbo',
});
```

**Models**:
- `gpt-4-turbo` - Best GPT-4 (128K context)
- `gpt-4` - Original GPT-4
- `gpt-3.5-turbo` - Fast and cheap

**Capabilities**: ✅ Streaming, ✅ Tool calling, ✅ Vision (GPT-4V)

**Cost**: $0.50-$30.00 input / $1.50-$60.00 output per 1M tokens

---

### 3. Google Gemini

**Best for**: Multimodal, huge context, cost-effective

```typescript
import { GeminiProvider } from '@pcl/sdk';

const provider = new GeminiProvider({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
  defaultModel: 'gemini-1.5-flash',
});
```

**Models**:
- `gemini-1.5-pro` - Best quality (1M context!)
- `gemini-1.5-flash` - Fast and cheap (1M context)
- `gemini-1.0-pro` - Previous generation

**Capabilities**: ✅ Streaming, ✅ Tool calling, ✅ Vision/Multimodal

**Cost**: $0.075-$3.50 input / $0.30-$10.50 output per 1M tokens

**Special**: 1 million token context window 🚀

---

### 4. DeepSeek

**Best for**: Cost-effective coding, Chinese language

```typescript
import { DeepSeekProvider } from '@pcl/sdk';

const provider = new DeepSeekProvider({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  defaultModel: 'deepseek-chat',
});
```

**Models**:
- `deepseek-chat` - General conversation
- `deepseek-coder` - Code-specialized

**Capabilities**: ✅ Streaming, ✅ Tool calling, ❌ Vision

**Cost**: $0.14 input / $0.28 output per 1M tokens (cheapest!)

**Note**: OpenAI-compatible API, excellent for coding tasks

---

### 5. Ollama (Local)

**Best for**: Privacy, offline use, FREE

```typescript
import { OllamaProvider } from '@pcl/sdk';

const provider = new OllamaProvider({
  host: 'http://localhost:11434',
  defaultModel: 'llama2',
});
```

**Models** (examples):
- `llama2`, `llama3` - Meta's Llama
- `mistral` - Mistral AI
- `codellama` - Code-specialized
- `phi` - Microsoft's small model
- `gemma` - Google's open model
- `llava` - Vision model

**Capabilities**: ✅ Streaming, ❌ Tool calling, ✅ Vision (llava)

**Cost**: FREE (runs locally)

**Requirements**: Ollama server running locally

**Additional Methods**:
```typescript
// List available models
const models = await provider.listModels();

// Pull a new model
await provider.pullModel('llama3');

// Check if server is running
const isRunning = await provider.isServerRunning();
```

---

### 6. Azure OpenAI

**Best for**: Enterprise, compliance, data residency

```typescript
import { AzureOpenAIProvider } from '@pcl/sdk';

const provider = new AzureOpenAIProvider({
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  resourceName: 'my-resource', // From: my-resource.openai.azure.com
  deployment: 'gpt-4-deployment',
  apiVersion: '2024-02-15-preview',
});
```

**Models**:
- `gpt-4-turbo` - Latest GPT-4
- `gpt-4`, `gpt-4-32k` - GPT-4 variants
- `gpt-35-turbo`, `gpt-35-turbo-16k` - GPT-3.5
- `gpt-4-vision` - Vision support

**Capabilities**: ✅ Streaming, ✅ Tool calling, ✅ Vision

**Cost**: Same as OpenAI pricing

**Benefits**: Enterprise SLA, data residency, private deployment

---

### 7. AWS Bedrock

**Best for**: AWS integration, multiple foundation models

```typescript
import { BedrockProvider } from '@pcl/sdk';

const provider = new BedrockProvider({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  defaultModel: 'anthropic.claude-3-haiku-20240307-v1:0',
});
```

**Models**:
- `anthropic.claude-3-sonnet-20240229-v1:0` - Claude 3 Sonnet
- `anthropic.claude-3-haiku-20240307-v1:0` - Claude 3 Haiku
- `anthropic.claude-3-opus-20240229-v1:0` - Claude 3 Opus
- `amazon.titan-text-express-v1` - Amazon Titan
- `meta.llama2-70b-chat-v1` - Meta Llama 2

**Capabilities**: ✅ Streaming, ✅ Tool calling, ✅ Vision (Claude 3)

**Cost**: Varies by model

**Benefits**: AWS integration, IAM roles, multi-model access

---

### 8. Mock Provider

**Best for**: Testing, development

```typescript
import { MockProvider } from '@pcl/sdk';

const provider = new MockProvider({
  responses: ['Hello!', 'How can I help?'],
  delay: 100, // Simulate network delay
});
```

**Use cases**:
- Unit testing
- Development without API keys
- CI/CD pipelines
- Prototyping

---

## Quick Start

### Basic Usage

```typescript
import { ProviderRegistry, GeminiProvider } from '@pcl/sdk';

// Create provider
const gemini = new GeminiProvider({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
});

// Register with registry
const registry = new ProviderRegistry();
registry.register(gemini);

// Generate response
const response = await gemini.generateResponse({
  prompt: 'Explain quantum computing in simple terms',
  temperature: 0.7,
  maxTokens: 500,
});

console.log(response.content);
console.log('Tokens used:', response.usage.totalTokens);
```

### Streaming Responses

```typescript
// Stream response chunks
for await (const chunk of gemini.streamResponse({
  prompt: 'Write a short story about AI',
})) {
  process.stdout.write(chunk.content);

  if (chunk.done) {
    console.log('\nFinished:', chunk.finishReason);
  }
}
```

### With Conversation History

```typescript
const response = await provider.generateResponse({
  systemPrompt: 'You are a helpful coding assistant.',
  history: [
    { from: 'user', content: 'How do I sort an array in Python?' },
    { from: 'assistant', content: 'Use the sorted() function...' },
  ],
  prompt: 'What about descending order?',
});
```

### Tool Calling

```typescript
const response = await provider.generateResponse({
  prompt: 'What is the weather in San Francisco?',
  tools: [
    {
      name: 'get_weather',
      description: 'Get current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string' },
          unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
        },
        required: ['location'],
      },
    },
  ],
});

if (response.toolCalls) {
  for (const call of response.toolCalls) {
    console.log('Tool:', call.name);
    console.log('Args:', call.arguments);
  }
}
```

---

## Provider Configuration

### Environment Variables

Recommended approach for API keys:

```bash
# .env file
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...
DEEPSEEK_API_KEY=...
AZURE_OPENAI_API_KEY=...
AZURE_RESOURCE_NAME=my-resource
AZURE_DEPLOYMENT_NAME=gpt-4
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

### Registry Configuration

```typescript
import { ProviderRegistry } from '@pcl/sdk';

const registry = new ProviderRegistry();

// Register with rate limiting
registry.register(provider, {
  rateLimiter: {
    requestsPerMinute: 60,
    tokensPerMinute: 100_000,
  },
});

// Start health monitoring (every 5 minutes)
registry.startHealthMonitoring(300_000);
```

---

## Advanced Features

### Health Monitoring

```typescript
// Check provider health
const isHealthy = registry.isProviderHealthy('gemini');

// Get detailed health status
const status = registry.getHealthStatus();
for (const [name, health] of status) {
  console.log(`${name}: ${health.status}`);
  console.log(`  Failures: ${health.failureCount}`);
  console.log(`  Success rate: ${health.successRate}%`);
}

// Get available (healthy) providers
const available = registry.getAvailableProviders();
```

### Fallback Chains

```typescript
// Sequential fallback (try each in order)
const chain = registry.createSequentialFallback(
  'gemini',
  'deepseek',
  'anthropic'
);

const response = await chain.generateResponse({
  prompt: 'Explain machine learning',
});

console.log('Used provider:', response.provider);
console.log('Attempts:', response.attemptCount);
console.log('Errors:', response.errors);
```

```typescript
// Health-based fallback (tries healthiest first)
const chain = registry.createHealthBasedFallback(
  'anthropic',
  'openai',
  'gemini'
);
```

```typescript
// Custom fallback configuration
const chain = registry.createFallbackChain()
  .withProviders('gemini', 'deepseek', 'ollama')
  .withStrategy('health-based')
  .withTimeout(30000) // 30 seconds per provider
  .withMaxRetries(2)
  .withSkipUnhealthy(true)
  .build(registry.providers, registry.healthMonitors);
```

### Rate Limiting

```typescript
// Get rate limit stats
const stats = registry.getRateLimitStats('gemini');
console.log('Requests in window:', stats.requestsInWindow);
console.log('Tokens in window:', stats.tokensInWindow);
console.log('Queue size:', stats.queueSize);

// Reset rate limiter
registry.resetRateLimiter('gemini');

// Get stats for all providers
const allStats = registry.getAllRateLimitStats();
```

### Cost Tracking

```typescript
// Track costs automatically
const response = await registry.generateWithTracking('gemini', {
  prompt: 'Write a blog post about AI',
  maxTokens: 1000,
});

// Get cost for a provider
const cost = registry.getProviderCost('gemini');
console.log(`Gemini cost: $${cost.toFixed(4)}`);

// Get aggregated stats
const stats = registry.getCostStats();
console.log('Total cost:', stats.global.totalCost);
console.log('Total tokens:', stats.global.totalTokens);
console.log('By provider:', stats.global.byProvider);
console.log('By model:', stats.global.byModel);

// Export cost data
const tracker = registry.getCostTracker('gemini');
const csv = tracker.exportCSV();
const json = tracker.exportJSON();

// Reset cost tracking
registry.resetCostTracking();
```

---

## Cost Comparison

### Input Cost (per 1M tokens)

| Provider | Cheapest | Mid-tier | Premium |
|----------|----------|----------|---------|
| DeepSeek | **$0.14** | $0.14 | $0.14 |
| Gemini | $0.075 (Flash) | $3.50 (Pro) | - |
| Anthropic | $0.25 (Haiku) | $3.00 (Sonnet) | $15.00 (Opus) |
| OpenAI | $0.50 (3.5) | $10.00 (4 Turbo) | $30.00 (4) |
| Ollama | **FREE** | FREE | FREE |

### Output Cost (per 1M tokens)

| Provider | Cheapest | Mid-tier | Premium |
|----------|----------|----------|---------|
| DeepSeek | **$0.28** | $0.28 | $0.28 |
| Gemini | $0.30 (Flash) | $10.50 (Pro) | - |
| Anthropic | $1.25 (Haiku) | $15.00 (Sonnet) | $75.00 (Opus) |
| OpenAI | $1.50 (3.5) | $30.00 (4 Turbo) | $60.00 (4) |
| Ollama | **FREE** | FREE | FREE |

### Cost Examples (1000 input + 500 output tokens)

- **Ollama**: FREE
- **DeepSeek**: $0.00028 (0.028¢)
- **Gemini Flash**: $0.00023 (0.023¢)
- **Anthropic Haiku**: $0.00088 (0.088¢)
- **OpenAI GPT-3.5**: $0.00125 (0.125¢)
- **Gemini Pro**: $0.00875 (0.875¢)
- **Anthropic Sonnet**: $0.01050 (1.05¢)
- **OpenAI GPT-4 Turbo**: $0.02500 (2.5¢)

---

## Best Practices

### 1. Use Environment Variables

```typescript
// ✅ Good
const provider = new GeminiProvider({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
});

// ❌ Bad - hardcoded key
const provider = new GeminiProvider({
  apiKey: 'AIza...', // Never commit API keys!
});
```

### 2. Implement Fallback Chains

```typescript
// ✅ Good - resilient to failures
const chain = registry.createSequentialFallback(
  'gemini',      // Try cheap option first
  'deepseek',    // Fallback to another cheap option
  'anthropic'    // Final fallback to premium
);
```

### 3. Monitor Costs

```typescript
// ✅ Good - track and limit costs
const stats = registry.getCostStats();
if (stats.global.totalCost > 10.00) {
  console.warn('Cost threshold exceeded!');
  // Switch to cheaper provider or pause
}
```

### 4. Set Appropriate Timeouts

```typescript
// ✅ Good - prevent hanging requests
const chain = registry.createFallbackChain()
  .withTimeout(30000) // 30 seconds
  .build(...);
```

### 5. Use Rate Limiting

```typescript
// ✅ Good - respect API limits
registry.register(provider, {
  rateLimiter: {
    requestsPerMinute: 60,
    tokensPerMinute: 100_000,
    enableQueuing: true,
  },
});
```

### 6. Choose the Right Model

```typescript
// ✅ Good - use cheaper models for simple tasks
const simpleResponse = await geminiFlash.generateResponse({
  prompt: 'Summarize this in one sentence: ...',
});

// ✅ Good - use premium models for complex tasks
const complexResponse = await claudeOpus.generateResponse({
  prompt: 'Analyze this complex legal document...',
});
```

### 7. Stream for Better UX

```typescript
// ✅ Good - stream for real-time feedback
for await (const chunk of provider.streamResponse({ prompt })) {
  process.stdout.write(chunk.content); // Show progress
}
```

### 8. Handle Errors Gracefully

```typescript
// ✅ Good - handle errors
try {
  const response = await provider.generateResponse({ prompt });
} catch (error) {
  console.error('Generation failed:', error.message);
  // Try fallback provider or notify user
}
```

---

## Next Steps

- [Provider Examples](./examples.md) - Complete working examples
- [API Reference](../api/providers.md) - Detailed API documentation
- [Migration Guide](./migration.md) - Upgrading from previous versions
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

---

**Need Help?**
- 📖 [Full Documentation](../README.md)
- 💬 [Discord Community](https://discord.gg/pcl)
- 🐛 [Report Issues](https://github.com/personalayer/pcl/issues)
