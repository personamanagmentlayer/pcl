# Migration Guide: Provider System Updates

Guide for upgrading to PCL's enhanced provider system with 8 providers and advanced features.

## Overview

**What's New:**
- ✅ 5 new providers (Gemini, DeepSeek, Ollama, Azure, Bedrock)
- ✅ Health monitoring with circuit breakers
- ✅ Automatic fallback chains
- ✅ Rate limiting with token buckets
- ✅ Cost tracking and reporting
- ✅ Enhanced provider registry

**Breaking Changes:** None! The new features are fully backward compatible.

---

## Quick Migration

### Before (v1.x)

```typescript
import { AnthropicProvider, OpenAIProvider } from '@pcl/sdk';

const anthropic = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const response = await anthropic.generateResponse({
  prompt: 'Hello!',
});
```

### After (v2.x)

```typescript
import { ProviderRegistry, AnthropicProvider } from '@pcl/sdk';

const registry = new ProviderRegistry();

// Register with automatic enhancements
registry.register(new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY!,
}));

// Use with tracking
const response = await registry.generateWithTracking('anthropic', {
  prompt: 'Hello!',
});

// Get cost info
console.log('Cost:', registry.getProviderCost('anthropic'));
```

**Result:** Same functionality, plus automatic health monitoring, rate limiting, and cost tracking!

---

## Migration Steps

### Step 1: Update Dependencies

```bash
npm install @pcl/sdk@latest
```

**New dependencies (optional):**
```bash
# For Gemini
npm install @google/generative-ai

# For Ollama (local LLMs)
npm install ollama

# For Azure OpenAI
# Uses standard openai package (already installed)

# For AWS Bedrock
npm install @aws-sdk/client-bedrock-runtime

# For DeepSeek
# Uses standard openai package (already installed)
```

### Step 2: Update Imports

**Before:**
```typescript
import { AnthropicProvider, OpenAIProvider } from '@pcl/sdk';
```

**After (add new providers):**
```typescript
import {
  ProviderRegistry,
  AnthropicProvider,
  OpenAIProvider,
  GeminiProvider,      // NEW
  DeepSeekProvider,    // NEW
  OllamaProvider,      // NEW
  AzureOpenAIProvider, // NEW
  BedrockProvider,     // NEW
} from '@pcl/sdk';
```

### Step 3: Migrate to Registry (Recommended)

**Before:**
```typescript
const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const response = await provider.generateResponse({ prompt });
```

**After:**
```typescript
const registry = new ProviderRegistry();
registry.register(new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY!,
}));

// Option 1: Use tracking (recommended)
const response = await registry.generateWithTracking('anthropic', { prompt });

// Option 2: Direct access (still works)
const provider = registry.get('anthropic')!;
const response = await provider.generateResponse({ prompt });
```

**Benefits of registry:**
- ✅ Automatic health monitoring
- ✅ Automatic rate limiting
- ✅ Automatic cost tracking
- ✅ Easy fallback chains
- ✅ Centralized configuration

### Step 4: Add New Features (Optional)

#### Health Monitoring

```typescript
// Enable automatic health checks
registry.startHealthMonitoring(300_000); // Every 5 minutes

// Check provider health
if (registry.isProviderHealthy('anthropic')) {
  const response = await registry.generateWithTracking('anthropic', { prompt });
}

// Get health status
const status = registry.getHealthStatus();
for (const [name, health] of status) {
  console.log(`${name}: ${health.status}`);
}
```

#### Fallback Chains

```typescript
// Create fallback chain
const chain = registry.createSequentialFallback(
  'gemini',     // Try first
  'deepseek',   // Then fallback
  'anthropic'   // Final fallback
);

const response = await chain.generateResponse({ prompt });
console.log('Used provider:', response.provider);
console.log('Attempts:', response.attemptCount);
```

#### Rate Limiting

```typescript
// Register with rate limits
registry.register(new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
}), {
  rateLimiter: {
    requestsPerMinute: 60,
    tokensPerMinute: 100_000,
    enableQueuing: true,
  },
});

// Check rate limit status
const stats = registry.getRateLimitStats('openai');
console.log('Requests in window:', stats?.requestsInWindow);
```

#### Cost Tracking

```typescript
// Automatic cost tracking with generateWithTracking
const response = await registry.generateWithTracking('openai', { prompt });

// Get costs
console.log('OpenAI cost:', registry.getProviderCost('openai'));
console.log('Total cost:', registry.getCostStats().global.totalCost);

// Export cost data
const tracker = registry.getCostTracker('openai');
const csv = tracker.exportCSV();
await fs.writeFile('costs.csv', csv);
```

---

## Adding New Providers

### Gemini (Google)

```typescript
import { GeminiProvider } from '@pcl/sdk';

registry.register(new GeminiProvider({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
  defaultModel: 'gemini-1.5-flash', // Fast and cheap
}));

// Use it
const response = await registry.generateWithTracking('gemini', {
  prompt: 'Explain quantum computing',
});
```

**Get API key:** https://makersuite.google.com/app/apikey

### DeepSeek (Cost-Effective)

```typescript
import { DeepSeekProvider } from '@pcl/sdk';

registry.register(new DeepSeekProvider({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  defaultModel: 'deepseek-chat', // or 'deepseek-coder' for code
}));

// Use it
const response = await registry.generateWithTracking('deepseek', {
  prompt: 'Write a Python function to sort a list',
});
```

**Get API key:** https://platform.deepseek.com/

**Cost:** $0.14 input / $0.28 output per 1M tokens (cheapest!)

### Ollama (FREE, Local)

```typescript
import { OllamaProvider } from '@pcl/sdk';

// Start Ollama server first: ollama serve
registry.register(new OllamaProvider({
  host: 'http://localhost:11434',
  defaultModel: 'llama2',
}));

// Pull model if needed
const ollama = registry.get('ollama') as OllamaProvider;
await ollama.pullModel('llama3');

// Use it (FREE!)
const response = await registry.generateWithTracking('ollama', {
  prompt: 'Explain Docker',
});
```

**Setup:** https://ollama.ai/

### Azure OpenAI (Enterprise)

```typescript
import { AzureOpenAIProvider } from '@pcl/sdk';

registry.register(new AzureOpenAIProvider({
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  resourceName: 'my-resource', // From: my-resource.openai.azure.com
  deployment: 'gpt-4-deployment',
}));

// Use it
const response = await registry.generateWithTracking('azure', {
  prompt: 'Summarize GDPR requirements',
});
```

### AWS Bedrock (Multi-Model)

```typescript
import { BedrockProvider } from '@pcl/sdk';

registry.register(new BedrockProvider({
  region: 'us-east-1',
  defaultModel: 'anthropic.claude-3-haiku-20240307-v1:0',
}));

// Use it
const response = await registry.generateWithTracking('bedrock', {
  model: 'anthropic.claude-3-sonnet-20240229-v1:0',
  prompt: 'Analyze this data',
});
```

---

## Upgrading Existing Code

### Pattern 1: Simple Provider Usage

**Before:**
```typescript
import { OpenAIProvider } from '@pcl/sdk';

const openai = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
});

async function chat(prompt: string) {
  return await openai.generateResponse({ prompt });
}
```

**After:**
```typescript
import { ProviderRegistry, OpenAIProvider } from '@pcl/sdk';

const registry = new ProviderRegistry();
registry.register(new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
}));

async function chat(prompt: string) {
  // Now with automatic cost tracking!
  return await registry.generateWithTracking('openai', { prompt });
}

// Get costs
console.log('Total spent:', registry.getCostStats().global.totalCost);
```

### Pattern 2: Multiple Providers

**Before:**
```typescript
const anthropic = new AnthropicProvider({ apiKey: 'key1' });
const openai = new OpenAIProvider({ apiKey: 'key2' });

// Manual fallback
let response;
try {
  response = await anthropic.generateResponse({ prompt });
} catch (error) {
  response = await openai.generateResponse({ prompt });
}
```

**After:**
```typescript
const registry = new ProviderRegistry();
registry.register(new AnthropicProvider({ apiKey: 'key1' }));
registry.register(new OpenAIProvider({ apiKey: 'key2' }));

// Automatic fallback!
const chain = registry.createSequentialFallback('anthropic', 'openai');
const result = await chain.generateResponse({ prompt });

console.log('Used:', result.provider);
console.log('Attempts:', result.attemptCount);
```

### Pattern 3: Streaming

**Before:**
```typescript
for await (const chunk of provider.streamResponse({ prompt })) {
  process.stdout.write(chunk.content);
}
```

**After (same, still works):**
```typescript
const provider = registry.get('openai')!;
for await (const chunk of provider.streamResponse({ prompt })) {
  process.stdout.write(chunk.content);
}

// Or with fallback
const chain = registry.createSequentialFallback('openai', 'anthropic');
for await (const result of chain.streamResponse({ prompt })) {
  process.stdout.write(result.result.content);
  if (result.result.done) {
    console.log('\nUsed provider:', result.provider);
  }
}
```

### Pattern 4: Conversation History

**Before:**
```typescript
const response = await provider.generateResponse({
  systemPrompt: 'You are helpful',
  history: [
    { from: 'user', content: 'Hello' },
    { from: 'assistant', content: 'Hi!' },
  ],
  prompt: 'How are you?',
});
```

**After (unchanged):**
```typescript
// Still works exactly the same!
const response = await registry.generateWithTracking('openai', {
  systemPrompt: 'You are helpful',
  history: [
    { from: 'user', content: 'Hello' },
    { from: 'assistant', content: 'Hi!' },
  ],
  prompt: 'How are you?',
});

// Plus cost tracking!
console.log('Cost:', registry.getProviderCost('openai'));
```

---

## Configuration Migration

### Environment Variables

**Add new provider keys:**

```bash
# .env file

# Existing
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# New providers (optional)
GOOGLE_AI_API_KEY=AIza...
DEEPSEEK_API_KEY=sk-...
AZURE_OPENAI_API_KEY=...
AZURE_RESOURCE_NAME=my-resource
AZURE_DEPLOYMENT_NAME=gpt-4
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

### Rate Limits

**Configure for your API tier:**

```typescript
// OpenAI rate limits (example)
registry.register(new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
}), {
  rateLimiter: {
    requestsPerMinute: 60,        // Free tier: 60 RPM
    tokensPerMinute: 100_000,     // Free tier: 100K TPM
    enableQueuing: true,
  },
});

// Anthropic rate limits (example)
registry.register(new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY!,
}), {
  rateLimiter: {
    requestsPerMinute: 50,        // Tier 1: 50 RPM
    tokensPerMinute: 40_000,      // Tier 1: 40K TPM
    enableQueuing: true,
  },
});
```

---

## Testing Your Migration

### Test Script

```typescript
import { ProviderRegistry } from '@pcl/sdk';

async function testMigration() {
  const registry = new ProviderRegistry();

  // Register all your providers
  // ... (add your providers)

  // Test each provider
  for (const name of registry.list()) {
    console.log(`\nTesting ${name}...`);

    try {
      const response = await registry.generateWithTracking(name, {
        prompt: 'Say "hello" in one word',
        maxTokens: 10,
      });

      console.log(`✓ ${name} works!`);
      console.log(`  Response: ${response.content}`);
      console.log(`  Tokens: ${response.usage.totalTokens}`);
      console.log(`  Cost: $${registry.getProviderCost(name).toFixed(6)}`);
    } catch (error: any) {
      console.error(`✗ ${name} failed:`, error.message);
    }
  }

  // Test fallback
  console.log('\nTesting fallback chain...');
  const chain = registry.createSequentialFallback(...registry.list());
  const result = await chain.generateResponse({
    prompt: 'Hello',
  });
  console.log(`✓ Fallback works! Used: ${result.provider}`);

  // Print summary
  console.log('\n=== Summary ===');
  const stats = registry.getCostStats();
  console.log('Total cost:', `$${stats.global.totalCost.toFixed(6)}`);
  console.log('Total tokens:', stats.global.totalTokens);
  console.log('Providers:', registry.list().length);
}

testMigration().catch(console.error);
```

---

## Rollback Plan

If you need to rollback:

### Option 1: Keep Using Providers Directly

```typescript
// You can still use providers without the registry
import { OpenAIProvider } from '@pcl/sdk';

const openai = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await openai.generateResponse({ prompt });
// No registry features, but still works!
```

### Option 2: Downgrade Package

```bash
npm install @pcl/sdk@1.x
```

---

## Common Issues

### "Provider not found"

```typescript
// Make sure you registered it
registry.register(provider);

// Check it's registered
console.log('Registered:', registry.list());
```

### "API key is undefined"

```typescript
// Load .env file
import 'dotenv/config';

// Or check environment
console.log('Keys:', {
  openai: !!process.env.OPENAI_API_KEY,
  anthropic: !!process.env.ANTHROPIC_API_KEY,
});
```

### "Rate limit exceeded"

```typescript
// Configure rate limiting
registry.register(provider, {
  rateLimiter: {
    requestsPerMinute: 60,
    tokensPerMinute: 100_000,
    enableQueuing: true, // Queue instead of failing
  },
});
```

---

## Next Steps

1. **Read the Provider Guide**: [providers/README.md](./README.md)
2. **Try Examples**: [providers/examples.md](./examples.md)
3. **Optimize Costs**: Use cost tracking to find savings
4. **Set up Monitoring**: Enable health checks for reliability
5. **Create Fallback Chains**: Ensure high availability

---

**Need Help?**
- [Troubleshooting Guide](./troubleshooting.md)
- [Discord Community](https://discord.gg/pcl)
- [GitHub Issues](https://github.com/personalayer/pcl/issues)
