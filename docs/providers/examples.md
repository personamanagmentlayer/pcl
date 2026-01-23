# Provider Examples

Complete working examples for all PCL providers.

## Table of Contents

- [Basic Examples](#basic-examples)
- [Provider-Specific Examples](#provider-specific-examples)
- [Advanced Patterns](#advanced-patterns)
- [Real-World Use Cases](#real-world-use-cases)

---

## Basic Examples

### Simple Chat Completion

```typescript
import { GeminiProvider } from '@pcl/sdk';

const provider = new GeminiProvider({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
});

const response = await provider.generateResponse({
  prompt: 'What is the capital of France?',
});

console.log(response.content);
// Output: "The capital of France is Paris."
```

### Streaming Response

```typescript
import { DeepSeekProvider } from '@pcl/sdk';

const provider = new DeepSeekProvider({
  apiKey: process.env.DEEPSEEK_API_KEY!,
});

console.log('Response: ');
for await (const chunk of provider.streamResponse({
  prompt: 'Count from 1 to 10',
})) {
  process.stdout.write(chunk.content);

  if (chunk.done) {
    console.log('\n✓ Complete');
  }
}
```

### With System Prompt and Temperature

```typescript
import { AnthropicProvider } from '@pcl/sdk';

const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const response = await provider.generateResponse({
  systemPrompt: 'You are a helpful Python coding assistant.',
  prompt: 'How do I read a CSV file?',
  temperature: 0.3, // More deterministic for code
  maxTokens: 500,
});

console.log(response.content);
```

---

## Provider-Specific Examples

### Google Gemini: Multimodal (Vision)

```typescript
import { GeminiProvider } from '@pcl/sdk';
import fs from 'fs';

const provider = new GeminiProvider({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
  defaultModel: 'gemini-1.5-pro',
});

// Note: This is a simplified example
// Actual implementation may vary based on SDK version
const response = await provider.generateResponse({
  prompt: 'Describe this image in detail',
  // Image handling would go here
});
```

### DeepSeek: Code Generation

```typescript
import { DeepSeekProvider } from '@pcl/sdk';

const provider = new DeepSeekProvider({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  defaultModel: 'deepseek-coder',
});

const response = await provider.generateResponse({
  systemPrompt: 'You are an expert programmer. Provide clean, efficient code with comments.',
  prompt: `Write a TypeScript function that:
- Takes an array of numbers
- Removes duplicates
- Sorts in descending order
- Returns the top 5 values`,
  temperature: 0.2,
});

console.log(response.content);
console.log(`\nCost: $${(response.usage.totalTokens / 1_000_000 * 0.14).toFixed(6)}`);
```

### Ollama: Local LLM Management

```typescript
import { OllamaProvider } from '@pcl/sdk';

const provider = new OllamaProvider({
  host: 'http://localhost:11434',
});

// Check if server is running
const isRunning = await provider.isServerRunning();
if (!isRunning) {
  throw new Error('Ollama server is not running. Start it with: ollama serve');
}

// List available models
const models = await provider.listModels();
console.log('Available models:', models);

// Pull a new model if needed
if (!models.includes('llama3')) {
  console.log('Pulling llama3...');
  await provider.pullModel('llama3');
}

// Use the model
const response = await provider.generateResponse({
  model: 'llama3',
  prompt: 'Explain Docker in simple terms',
});

console.log(response.content);
console.log('Cost: FREE (local)');
```

### Azure OpenAI: Enterprise Setup

```typescript
import { AzureOpenAIProvider } from '@pcl/sdk';

const provider = new AzureOpenAIProvider({
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  resourceName: process.env.AZURE_RESOURCE_NAME!, // e.g., 'my-company-openai'
  deployment: process.env.AZURE_DEPLOYMENT_NAME!, // e.g., 'gpt-4-turbo'
  apiVersion: '2024-02-15-preview',
});

const response = await provider.generateResponse({
  systemPrompt: 'You are a corporate compliance assistant.',
  prompt: 'Summarize GDPR data retention requirements',
  temperature: 0.1, // Very deterministic for compliance
  maxTokens: 1000,
});

console.log(response.content);
console.log('Deployment:', response.metadata?.deployment);
```

### AWS Bedrock: Multi-Model Access

```typescript
import { BedrockProvider } from '@pcl/sdk';

const provider = new BedrockProvider({
  region: 'us-east-1',
  // Uses AWS credentials from environment or IAM role
});

// Try Claude 3 Haiku (fast and cheap)
const haikuResponse = await provider.generateResponse({
  model: 'anthropic.claude-3-haiku-20240307-v1:0',
  prompt: 'Write a haiku about coding',
  maxTokens: 100,
});

console.log('Haiku:\n', haikuResponse.content);

// Try Amazon Titan (AWS native)
const titanResponse = await provider.generateResponse({
  model: 'amazon.titan-text-express-v1',
  prompt: 'What are the benefits of serverless computing?',
  maxTokens: 500,
});

console.log('\nTitan:', titanResponse.content);
```

---

## Advanced Patterns

### Multi-Turn Conversation

```typescript
import { OpenAIProvider } from '@pcl/sdk';

const provider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
});

const conversation = {
  system: 'You are a math tutor. Be patient and encouraging.',
  messages: [] as Array<{ from: 'user' | 'assistant'; content: string }>,
};

async function chat(userMessage: string) {
  conversation.messages.push({ from: 'user', content: userMessage });

  const response = await provider.generateResponse({
    systemPrompt: conversation.system,
    history: conversation.messages.slice(0, -1),
    prompt: userMessage,
  });

  conversation.messages.push({ from: 'assistant', content: response.content });

  return response.content;
}

// Use it
console.log(await chat('What is 15 * 7?'));
// "15 * 7 = 105. Great question!"

console.log(await chat('How did you calculate that?'));
// "I multiplied 15 by 7. You can break it down as..."

console.log(await chat('Can you show me the steps?'));
// "Of course! Here are the steps..."
```

### Tool Calling (Function Calling)

```typescript
import { AnthropicProvider } from '@pcl/sdk';

const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  defaultModel: 'claude-3-5-sonnet-20241022',
});

// Define tools
const tools = [
  {
    name: 'get_weather',
    description: 'Get current weather for a location',
    parameters: {
      type: 'object' as const,
      properties: {
        location: {
          type: 'string',
          description: 'City name, e.g., "San Francisco"',
        },
        unit: {
          type: 'string',
          enum: ['celsius', 'fahrenheit'],
        },
      },
      required: ['location'],
    },
  },
  {
    name: 'get_time',
    description: 'Get current time for a timezone',
    parameters: {
      type: 'object' as const,
      properties: {
        timezone: {
          type: 'string',
          description: 'Timezone, e.g., "America/New_York"',
        },
      },
      required: ['timezone'],
    },
  },
];

// Tool implementations
const toolImplementations = {
  get_weather: (args: { location: string; unit?: string }) => {
    // In real app, call weather API
    return `Weather in ${args.location}: 72°F, Sunny`;
  },
  get_time: (args: { timezone: string }) => {
    // In real app, get actual time
    return `Current time in ${args.timezone}: 2:30 PM`;
  },
};

// Agent loop
async function runAgent(prompt: string) {
  let response = await provider.generateResponse({
    prompt,
    tools,
  });

  // Handle tool calls
  while (response.toolCalls && response.toolCalls.length > 0) {
    console.log('Tool calls:', response.toolCalls);

    for (const call of response.toolCalls) {
      const implementation = toolImplementations[call.name as keyof typeof toolImplementations];
      const result = implementation(call.arguments as any);

      console.log(`${call.name}(${JSON.stringify(call.arguments)}) => ${result}`);
    }

    // In a real implementation, you'd feed the tool results back
    // to the model for the next turn
    break;
  }

  return response.content;
}

// Use it
await runAgent('What is the weather in Tokyo and what time is it there?');
```

### Fallback Chain with Cost Optimization

```typescript
import { ProviderRegistry, GeminiProvider, DeepSeekProvider, AnthropicProvider } from '@pcl/sdk';

const registry = new ProviderRegistry();

// Register providers in order of cost (cheapest first)
registry.register(new DeepSeekProvider({ apiKey: process.env.DEEPSEEK_API_KEY! }));
registry.register(new GeminiProvider({ apiKey: process.env.GOOGLE_AI_API_KEY! }));
registry.register(new AnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY! }));

// Create fallback chain
const chain = registry.createSequentialFallback(
  'deepseek',   // Try cheapest first
  'gemini',     // Then medium cost
  'anthropic'   // Finally premium
);

// Generate with automatic fallback
const response = await chain.generateResponse({
  prompt: 'Explain quantum computing',
  maxTokens: 500,
});

console.log('Content:', response.result.content);
console.log('Used provider:', response.provider);
console.log('Attempts:', response.attemptCount);
console.log('Errors:', response.errors);

// Get total cost
const stats = registry.getCostStats();
console.log('Total cost: $' + stats.global.totalCost.toFixed(6));
```

### Rate Limiting and Queueing

```typescript
import { ProviderRegistry, OpenAIProvider } from '@pcl/sdk';

const registry = new ProviderRegistry();

// Register with strict rate limits
registry.register(new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
}), {
  rateLimiter: {
    requestsPerMinute: 10,
    tokensPerMinute: 50_000,
    enableQueuing: true, // Queue excess requests
    maxQueueSize: 100,
  },
});

// Fire off many requests
const promises = Array.from({ length: 50 }, (_, i) =>
  registry.generateWithTracking('openai', {
    prompt: `Question ${i + 1}: What is ${i} + ${i}?`,
  })
);

// They'll be automatically queued and rate-limited
const responses = await Promise.all(promises);

console.log('Completed:', responses.length);

// Check rate limit stats
const stats = registry.getRateLimitStats('openai');
console.log('Requests processed:', stats?.requestsInWindow);
console.log('Tokens used:', stats?.tokensInWindow);
```

### Health Monitoring and Auto-Recovery

```typescript
import { ProviderRegistry, GeminiProvider, OpenAIProvider } from '@pcl/sdk';

const registry = new ProviderRegistry();

registry.register(new GeminiProvider({ apiKey: process.env.GOOGLE_AI_API_KEY! }));
registry.register(new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY! }));

// Start health monitoring (check every 5 minutes)
registry.startHealthMonitoring(300_000);

// Create health-based fallback (tries healthiest first)
const chain = registry.createHealthBasedFallback('gemini', 'openai');

// Generate responses - will automatically avoid unhealthy providers
setInterval(async () => {
  try {
    const response = await chain.generateResponse({
      prompt: 'Hello, how are you?',
    });

    console.log('✓ Response from:', response.provider);
  } catch (error) {
    console.error('✗ All providers failed:', error);
  }

  // Check health status
  const status = registry.getHealthStatus();
  for (const [name, health] of status) {
    console.log(`${name}: ${health.status} (${health.successRate}% success)`);
  }
}, 10_000);

// Stop monitoring when done
// registry.stopHealthMonitoring();
```

---

## Real-World Use Cases

### Use Case 1: Content Generation Pipeline

```typescript
import { ProviderRegistry, GeminiProvider, AnthropicProvider } from '@pcl/sdk';

const registry = new ProviderRegistry();

// Use cheap model for drafts
const draftProvider = new GeminiProvider({
  apiKey: process.env.GOOGLE_AI_API_KEY!,
  defaultModel: 'gemini-1.5-flash', // Cheap and fast
});

// Use premium model for final polish
const polishProvider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  defaultModel: 'claude-3-5-sonnet-20241022',
});

registry.register(draftProvider);
registry.register(polishProvider);

async function generateBlogPost(topic: string) {
  // Step 1: Generate draft (cheap)
  console.log('Generating draft...');
  const draft = await registry.generateWithTracking('gemini', {
    systemPrompt: 'You are a blog writer. Write engaging, informative content.',
    prompt: `Write a 500-word blog post about: ${topic}`,
    temperature: 0.8, // More creative
  });

  console.log('Draft generated. Cost:', `$${registry.getProviderCost('gemini').toFixed(6)}`);

  // Step 2: Polish with premium model
  console.log('Polishing...');
  const polished = await registry.generateWithTracking('anthropic', {
    systemPrompt: 'You are an expert editor. Improve the writing while keeping the core message.',
    prompt: `Improve this blog post:\n\n${draft.content}`,
    temperature: 0.3, // More focused
  });

  console.log('Polished. Cost:', `$${registry.getProviderCost('anthropic').toFixed(6)}`);

  return {
    draft: draft.content,
    final: polished.content,
    totalCost: registry.getCostStats().global.totalCost,
  };
}

// Use it
const result = await generateBlogPost('The Future of AI');
console.log('Final post:', result.final);
console.log('Total cost:', `$${result.totalCost.toFixed(6)}`);
```

### Use Case 2: Code Review Assistant

```typescript
import { DeepSeekProvider } from '@pcl/sdk';
import fs from 'fs/promises';

const provider = new DeepSeekProvider({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  defaultModel: 'deepseek-coder',
});

async function reviewCode(filePath: string) {
  const code = await fs.readFile(filePath, 'utf-8');

  const response = await provider.generateResponse({
    systemPrompt: `You are an expert code reviewer. Analyze code for:
- Bugs and potential errors
- Performance issues
- Security vulnerabilities
- Code style and best practices
- Improvement suggestions

Provide specific, actionable feedback.`,
    prompt: `Review this code:\n\n\`\`\`typescript\n${code}\n\`\`\``,
    temperature: 0.2,
  });

  return response.content;
}

// Use it
const review = await reviewCode('./src/index.ts');
console.log('Code Review:\n', review);
```

### Use Case 3: Multi-Language Support

```typescript
import { ProviderRegistry, GeminiProvider, DeepSeekProvider } from '@pcl/sdk';

const registry = new ProviderRegistry();

// Gemini is good for all languages
registry.register(new GeminiProvider({ apiKey: process.env.GOOGLE_AI_API_KEY! }));

// DeepSeek excels at Chinese
registry.register(new DeepSeekProvider({ apiKey: process.env.DEEPSEEK_API_KEY! }));

async function translate(text: string, targetLang: string) {
  // Use DeepSeek for Chinese, Gemini for others
  const provider = targetLang === 'zh' ? 'deepseek' : 'gemini';

  const response = await registry.generateWithTracking(provider, {
    prompt: `Translate this to ${targetLang}:\n\n${text}`,
    temperature: 0.3,
  });

  return response.content;
}

// Use it
console.log(await translate('Hello, world!', 'zh'));
console.log(await translate('Hello, world!', 'es'));
console.log(await translate('Hello, world!', 'fr'));
```

### Use Case 4: Local Development with Ollama

```typescript
import { OllamaProvider } from '@pcl/sdk';

const provider = new OllamaProvider({
  host: 'http://localhost:11434',
  defaultModel: 'codellama',
});

// Check server
if (!await provider.isServerRunning()) {
  console.error('Start Ollama with: ollama serve');
  process.exit(1);
}

// Ensure model is available
const models = await provider.listModels();
if (!models.includes('codellama')) {
  console.log('Pulling codellama...');
  await provider.pullModel('codellama');
}

// Use for development (FREE)
async function explainCode(code: string) {
  const response = await provider.generateResponse({
    systemPrompt: 'Explain code clearly and concisely.',
    prompt: `Explain this code:\n\n${code}`,
  });

  return response.content;
}

// No API costs during development!
const explanation = await explainCode(`
  function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  }
`);

console.log(explanation);
console.log('Cost: FREE (local)');
```

---

## Next Steps

- [Provider Guide](./README.md) - Complete provider documentation
- [API Reference](../api/providers.md) - Detailed API docs
- [Troubleshooting](./troubleshooting.md) - Common issues

---

**More Examples?**
- Check the [examples/](../../examples/) directory
- Join our [Discord](https://discord.gg/pcl) for community examples
- Contribute your examples via [GitHub](https://github.com/personalayer/pcl)
