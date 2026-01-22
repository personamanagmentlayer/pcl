# Provider Quick Reference

Fast reference for PCL provider usage.

## Provider Setup

### Anthropic (Claude)
```typescript
import { AnthropicProvider } from '@pcl/sdk';

const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  defaultModel: 'claude-3-5-sonnet-20241022',
});
```

### OpenAI (GPT)
```typescript
import { OpenAIProvider } from '@pcl/sdk';

const provider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  defaultModel: 'gpt-4-turbo',
});
```

### Google Gemini
```typescript
import { GeminiProvider } from '@pcl/sdk';

const provider = new GeminiProvider({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
  defaultModel: 'gemini-1.5-flash',
});
```

### DeepSeek
```typescript
import { DeepSeekProvider } from '@pcl/sdk';

const provider = new DeepSeekProvider({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  defaultModel: 'deepseek-chat',
});
```

### Ollama (Local)
```typescript
import { OllamaProvider } from '@pcl/sdk';

const provider = new OllamaProvider({
  host: 'http://localhost:11434',
  defaultModel: 'llama2',
});
```

### Azure OpenAI
```typescript
import { AzureOpenAIProvider } from '@pcl/sdk';

const provider = new AzureOpenAIProvider({
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  resourceName: 'my-resource',
  deployment: 'gpt-4-deployment',
});
```

### AWS Bedrock
```typescript
import { BedrockProvider } from '@pcl/sdk';

const provider = new BedrockProvider({
  region: 'us-east-1',
  defaultModel: 'anthropic.claude-3-haiku-20240307-v1:0',
});
```

---

## Basic Usage

### Generate Response
```typescript
const response = await provider.generateResponse({
  prompt: 'Hello!',
});

console.log(response.content);
console.log('Tokens:', response.usage.totalTokens);
```

### Stream Response
```typescript
for await (const chunk of provider.streamResponse({ prompt: 'Hello!' })) {
  process.stdout.write(chunk.content);
}
```

### With Options
```typescript
const response = await provider.generateResponse({
  systemPrompt: 'You are a helpful assistant.',
  prompt: 'Explain AI',
  temperature: 0.7,
  maxTokens: 500,
  topP: 0.9,
});
```

### With History
```typescript
const response = await provider.generateResponse({
  history: [
    { from: 'user', content: 'Hi' },
    { from: 'assistant', content: 'Hello!' },
  ],
  prompt: 'How are you?',
});
```

---

## Registry

### Setup
```typescript
import { ProviderRegistry } from '@pcl/sdk';

const registry = new ProviderRegistry();

// Register provider
registry.register(provider);

// Register with rate limiting
registry.register(provider, {
  rateLimiter: {
    requestsPerMinute: 60,
    tokensPerMinute: 100_000,
  },
});
```

### Generate with Tracking
```typescript
const response = await registry.generateWithTracking('gemini', {
  prompt: 'Hello!',
});

// Get cost
console.log('Cost:', registry.getProviderCost('gemini'));
```

---

## Health Monitoring

### Start Monitoring
```typescript
registry.startHealthMonitoring(300_000); // Every 5 min
```

### Check Health
```typescript
if (registry.isProviderHealthy('openai')) {
  const response = await registry.generateWithTracking('openai', { prompt });
}
```

### Get Status
```typescript
const status = registry.getHealthStatus();
for (const [name, health] of status) {
  console.log(`${name}: ${health.status}`);
}
```

---

## Fallback Chains

### Sequential Fallback
```typescript
const chain = registry.createSequentialFallback(
  'gemini',
  'deepseek',
  'anthropic'
);

const response = await chain.generateResponse({ prompt });
console.log('Used:', response.provider);
```

### Health-Based Fallback
```typescript
const chain = registry.createHealthBasedFallback(
  'openai',
  'anthropic',
  'gemini'
);
```

### Custom Fallback
```typescript
const chain = registry.createFallbackChain()
  .withProviders('gemini', 'deepseek')
  .withStrategy('health-based')
  .withTimeout(30000)
  .withMaxRetries(2)
  .build(registry.providers, registry.healthMonitors);
```

---

## Rate Limiting

### Get Stats
```typescript
const stats = registry.getRateLimitStats('openai');
console.log('Requests:', stats?.requestsInWindow);
console.log('Tokens:', stats?.tokensInWindow);
```

### Reset
```typescript
registry.resetRateLimiter('openai');
```

---

## Cost Tracking

### Get Costs
```typescript
// Provider cost
console.log('OpenAI:', registry.getProviderCost('openai'));

// Total cost
const stats = registry.getCostStats();
console.log('Total:', stats.global.totalCost);
console.log('By provider:', stats.global.byProvider);
```

### Export
```typescript
const tracker = registry.getCostTracker('openai');

// CSV
const csv = tracker.exportCSV();
await fs.writeFile('costs.csv', csv);

// JSON
const json = tracker.exportJSON();
console.log(json);
```

### Reset
```typescript
registry.resetCostTracking();
```

---

## Tool Calling

```typescript
const tools = [
  {
    name: 'get_weather',
    description: 'Get weather for a location',
    parameters: {
      type: 'object' as const,
      properties: {
        location: { type: 'string' },
      },
      required: ['location'],
    },
  },
];

const response = await provider.generateResponse({
  prompt: 'What is the weather in NYC?',
  tools,
});

if (response.toolCalls) {
  for (const call of response.toolCalls) {
    console.log(`${call.name}(${JSON.stringify(call.arguments)})`);
  }
}
```

---

## Ollama Specific

### Check Server
```typescript
const isRunning = await provider.isServerRunning();
```

### List Models
```typescript
const models = await provider.listModels();
console.log(models);
```

### Pull Model
```typescript
await provider.pullModel('llama3');
```

---

## Environment Variables

```bash
# .env file

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
OPENAI_API_KEY=sk-...

# Gemini
GOOGLE_AI_API_KEY=AIza...

# DeepSeek
DEEPSEEK_API_KEY=sk-...

# Azure
AZURE_OPENAI_API_KEY=...
AZURE_RESOURCE_NAME=my-resource
AZURE_DEPLOYMENT_NAME=gpt-4

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

---

## Common Patterns

### Cost-Optimized Pipeline
```typescript
// Draft with cheap model
const draft = await registry.generateWithTracking('gemini', {
  prompt: 'Write a blog post',
  defaultModel: 'gemini-1.5-flash',
});

// Polish with premium model
const final = await registry.generateWithTracking('anthropic', {
  prompt: `Improve: ${draft.content}`,
});
```

### Multi-Turn Conversation
```typescript
const messages = [];

async function chat(userMessage: string) {
  messages.push({ from: 'user', content: userMessage });

  const response = await provider.generateResponse({
    history: messages.slice(0, -1),
    prompt: userMessage,
  });

  messages.push({ from: 'assistant', content: response.content });
  return response.content;
}
```

### Retry with Exponential Backoff
```typescript
async function generateWithRetry(prompt: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await provider.generateResponse({ prompt });
    } catch (error: any) {
      if (error.status === 429 && i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
      } else {
        throw error;
      }
    }
  }
}
```

---

## Pricing (per 1M tokens)

| Provider | Input | Output |
|----------|-------|--------|
| Ollama | FREE | FREE |
| DeepSeek | $0.14 | $0.28 |
| Gemini Flash | $0.075 | $0.30 |
| Anthropic Haiku | $0.25 | $1.25 |
| OpenAI 3.5 | $0.50 | $1.50 |
| Gemini Pro | $3.50 | $10.50 |
| Anthropic Sonnet | $3.00 | $15.00 |
| OpenAI 4 Turbo | $10.00 | $30.00 |
| Anthropic Opus | $15.00 | $75.00 |

---

## Links

- [Complete Guide](./README.md)
- [Examples](./examples.md)
- [Troubleshooting](./troubleshooting.md)
- [Migration](./migration.md)
- [API Reference](../api/providers.md)
