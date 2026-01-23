# PCL Provider System

**Multi-Provider Support for AI Models**

The PCL Provider System enables seamless integration with multiple AI model providers (Anthropic, OpenAI, Google, etc.) through a unified interface.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Provider Interface](#provider-interface)
4. [Built-in Providers](#built-in-providers)
5. [Using Providers](#using-providers)
6. [Creating Custom Providers](#creating-custom-providers)
7. [Provider Registry](#provider-registry)
8. [Advanced Features](#advanced-features)
9. [API Reference](#api-reference)

---

## Overview

### Features

- **Unified Interface**: Single API for all AI providers
- **8 Major Providers**: Anthropic, OpenAI, Google, DeepSeek, Ollama, Mistral AI, Groq, Cohere
- **Streaming**: Support for streaming responses across all providers
- **Function Calling**: Tool/function calling support where available
- **Vision**: Multimodal inputs (text + images) for supported models
- **Local Models**: Run models locally with Ollama (completely free)
- **Ultra-Fast Inference**: Groq provides 10x faster responses
- **European GDPR**: Mistral AI for privacy-conscious applications
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Retry Logic**: Automatic retries with exponential backoff
- **Error Handling**: Comprehensive error handling and recovery
- **Capability Detection**: Automatic capability detection per provider and model

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   PCL Application Layer                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                ┌──────────▼─────────────┐
                │   Provider Registry    │
                │   (8 Providers)        │
                └──────────┬─────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
  ┌─────▼──────┐    ┌──────▼──────┐   ┌──────▼──────┐
  │ Anthropic  │    │   OpenAI    │   │   Google    │
  │  (Claude)  │    │   (GPT)     │   │  (Gemini)   │
  └────────────┘    └─────────────┘   └─────────────┘
        │                  │                  │
  ┌─────▼──────┐    ┌──────▼──────┐   ┌──────▼──────┐
  │  DeepSeek  │    │   Ollama    │   │  Mistral AI │
  │(Chat/Coder)│    │   (Local)   │   │(Large/Small)│
  └────────────┘    └─────────────┘   └─────────────┘
        │                  │
  ┌─────▼──────┐    ┌──────▼──────┐
  │    Groq    │    │   Cohere    │
  │(Ultra-Fast)│    │ (Command R) │
  └────────────┘    └─────────────┘
```

---

## Quick Start

### Installation

The provider system is included in the PCL SDK:

```bash
npm install @pcl/sdk
```

### Basic Usage

```typescript
import { getProvider } from '@pcl/sdk/providers';

// Initialize provider
const provider = await getProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Generate completion
const response = await provider.complete({
  model: 'claude-3-5-sonnet-20241022',
  messages: [
    {
      role: 'user',
      content: 'Hello, Claude!',
    },
  ],
  maxTokens: 1024,
});

console.log(response.content);
// "Hello! How can I assist you today?"
```

### Streaming Response

```typescript
const stream = provider.stream({
  model: 'claude-3-5-sonnet-20241022',
  messages: [
    {
      role: 'user',
      content: 'Tell me a story',
    },
  ],
  maxTokens: 1024,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);

  if (chunk.done) {
    console.log('\n\nFinish reason:', chunk.finishReason);
    console.log('Tokens used:', chunk.usage?.totalTokens);
  }
}
```

---

## Provider Interface

All providers implement the `Provider` interface:

```typescript
interface Provider {
  // Provider metadata
  readonly name: string;
  readonly displayName: string;
  readonly version: string;

  // Lifecycle
  initialize(config: ProviderConfig): Promise<void>;
  shutdown(): Promise<void>;

  // Models
  getModels(): Promise<ModelInfo[]>;
  getModel(modelId: string): Promise<ModelInfo | null>;
  hasModel(modelId: string): Promise<boolean>;

  // Capabilities
  getCapabilities(): ProviderCapabilities;

  // Completion
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  stream(request: CompletionRequest): AsyncIterable<StreamChunk>;

  // Utilities
  countTokens(text: string, model?: string): Promise<number>;
  validateCredentials(): Promise<boolean>;
}
```

---

## Built-in Providers

### Anthropic (Claude)

**Models**:
- `claude-3-5-sonnet-20241022` - Most intelligent model
- `claude-3-5-haiku-20241022` - Fastest model
- `claude-3-opus-20240229` - Previous generation

**Capabilities**:
- ✅ Streaming
- ✅ Function calling
- ✅ Vision (Sonnet & Opus)
- ✅ System messages
- ✅ 200K context window
- ✅ Up to 8K output tokens

**Configuration**:

```typescript
const provider = await getProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY,
  // Optional:
  baseUrl: 'https://api.anthropic.com/v1', // Custom endpoint
  timeout: 30000, // Request timeout (ms)
  maxRetries: 3, // Max retry attempts
  retryDelay: 1000, // Retry delay (ms)
  debug: false, // Enable debug logging
});
```

**Example**:

```typescript
const response = await provider.complete({
  model: 'claude-3-5-sonnet-20241022',
  system: 'You are a helpful assistant',
  messages: [
    {
      role: 'user',
      content: 'Explain quantum computing',
    },
  ],
  maxTokens: 2048,
  temperature: 0.7,
});
```

### OpenAI (GPT)

**Models**:
- `gpt-4-turbo-2024-04-09` - Most capable GPT-4, 128K context
- `gpt-4o` - High intelligence flagship, multimodal ($2.50/$10 per million tokens)
- `gpt-4o-mini` - Affordable small model ($0.15/$0.60 per million tokens)
- `gpt-4-0125-preview` - Improved instruction following
- `gpt-3.5-turbo-0125` - Fast and cost-effective ($0.50/$1.50 per million tokens)

**Capabilities**:
- ✅ Streaming
- ✅ Function calling
- ✅ Vision (GPT-4 Turbo, GPT-4o models)
- ✅ JSON mode
- ✅ System messages
- ✅ Up to 128K context window
- ✅ Up to 16K output tokens (4K for most models)

**Configuration**:

```typescript
const provider = await getProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  // Optional:
  baseUrl: 'https://api.openai.com/v1', // Custom endpoint
  organization: 'org-xxxxx', // Organization ID
  timeout: 30000, // Request timeout (ms)
  maxRetries: 3, // Max retry attempts
  retryDelay: 1000, // Retry delay (ms)
  debug: false, // Enable debug logging
});
```

**Example**:

```typescript
const response = await provider.complete({
  model: 'gpt-4-turbo-2024-04-09',
  messages: [
    {
      role: 'system',
      content: 'You are a helpful assistant',
    },
    {
      role: 'user',
      content: 'Explain quantum computing',
    },
  ],
  maxTokens: 2048,
  temperature: 0.7,
});
```

**JSON Mode**:

```typescript
const response = await provider.complete({
  model: 'gpt-4-turbo-2024-04-09',
  messages: [
    {
      role: 'user',
      content: 'Generate a JSON object with name and age fields',
    },
  ],
  maxTokens: 1024,
  // Note: JSON mode requires specific request format
  // Check OpenAI docs for details
});
```

### Google (Gemini)

**Models**:
- `gemini-2.0-flash-exp` - Gemini 2.0 Flash (Experimental), next generation multimodal model
- `gemini-1.5-pro` - Gemini 1.5 Pro, advanced reasoning with 2M context window
- `gemini-1.5-flash` - Gemini 1.5 Flash, fast and efficient with 1M context window

**Capabilities**:
- ✅ Streaming
- ✅ Function calling
- ✅ Vision
- ✅ JSON mode
- ✅ System messages
- ✅ Up to 2M context window
- ✅ Up to 8K output tokens

**Configuration**:

```typescript
const provider = await getProvider('google', {
  apiKey: process.env.GOOGLE_API_KEY,
  // Optional:
  timeout: 30000, // Request timeout (ms)
  maxRetries: 3, // Max retry attempts
  retryDelay: 1000, // Retry delay (ms)
  debug: false, // Enable debug logging
});
```

**Example**:

```typescript
const response = await provider.complete({
  model: 'gemini-1.5-pro',
  system: 'You are a helpful assistant',
  messages: [
    {
      role: 'user',
      content: 'Explain quantum entanglement',
    },
  ],
  maxTokens: 2048,
  temperature: 0.7,
});
```

### DeepSeek

**Models**:
- `deepseek-chat` - DeepSeek Chat model with 64K context ($0.14/$0.28 per million tokens)
- `deepseek-coder` - DeepSeek Coder specialized for programming ($0.14/$0.28 per million tokens)

**Capabilities**:
- ✅ Streaming
- ✅ Function calling
- ✅ JSON mode
- ✅ System messages
- ✅ Up to 64K context window
- ✅ Up to 8K output tokens
- ✅ Very affordable pricing

**Configuration**:

```typescript
const provider = await getProvider('deepseek', {
  apiKey: process.env.DEEPSEEK_API_KEY,
  // Optional:
  baseUrl: 'https://api.deepseek.com/v1', // Custom endpoint
  timeout: 30000, // Request timeout (ms)
  maxRetries: 3, // Max retry attempts
  retryDelay: 1000, // Retry delay (ms)
  debug: false, // Enable debug logging
});
```

**Example**:

```typescript
const response = await provider.complete({
  model: 'deepseek-chat',
  messages: [
    {
      role: 'system',
      content: 'You are a helpful coding assistant',
    },
    {
      role: 'user',
      content: 'Write a Python function to calculate fibonacci numbers',
    },
  ],
  maxTokens: 2048,
  temperature: 0.7,
});
```

**Note**: DeepSeek uses OpenAI-compatible API format, making it easy to switch between providers.

### Ollama (Local Models)

**Models**:
- Dynamically discovered from your local Ollama installation
- Supports any Ollama model: Llama 3, Mistral, Gemma, Phi, Qwen, and more
- All models are **completely free** (local inference)

**Capabilities**:
- ✅ Streaming
- ✅ JSON mode
- ✅ System messages
- ✅ Context windows vary by model (4K-128K)
- ✅ Local inference (no API costs)
- ⚠️ Function calling support varies by model
- ⚠️ Vision support limited to specific models (llava, etc.)

**Configuration**:

```typescript
const provider = await getProvider('ollama', {
  // Optional:
  baseUrl: 'http://localhost:11434', // Ollama server URL (default)
  timeout: 30000, // Request timeout (ms)
  debug: false, // Enable debug logging
});

// Note: No API key required for local Ollama
```

**Example**:

```typescript
// First, ensure you have Ollama installed and running
// Install a model: ollama pull llama3

const response = await provider.complete({
  model: 'llama3', // or 'mistral', 'gemma', etc.
  messages: [
    {
      role: 'user',
      content: 'Explain machine learning in simple terms',
    },
  ],
  temperature: 0.7,
});

console.log(response.content);
```

**List Available Models**:

```typescript
const models = await provider.getModels();
models.forEach((model) => {
  console.log(`${model.name}: ${model.description}`);
});
```

**Context Size Detection**:

Ollama provider automatically detects context window size based on model name:
- Models with "128k" in name → 128K context
- Models with "32k" in name → 32K context
- Llama 3 models → 8K context
- Mistral/Gemma models → 8K context
- Default → 4K context

### Mistral AI

**Models**:
- `mistral-large-latest` - Flagship model with top-tier reasoning, 128K context ($2/$6 per million tokens)
- `mistral-small-latest` - Cost-efficient for simple tasks, 128K context ($0.20/$0.60 per million tokens)
- `codestral-latest` - Specialized for code generation, 32K context ($0.20/$0.60 per million tokens)
- `open-mistral-nemo` - Open-weight multilingual model, 128K context ($0.15/$0.15 per million tokens)

**Capabilities**:
- ✅ Streaming
- ✅ Function calling
- ✅ JSON mode
- ✅ System messages
- ✅ Up to 128K context window
- ✅ Up to 8K output tokens
- ✅ European (GDPR-compliant)

**Configuration**:

```typescript
const provider = await getProvider('mistral', {
  apiKey: process.env.MISTRAL_API_KEY,
  // Optional:
  baseUrl: 'https://api.mistral.ai/v1', // Custom endpoint
  timeout: 30000, // Request timeout (ms)
  maxRetries: 3, // Max retry attempts
  retryDelay: 1000, // Retry delay (ms)
  debug: false, // Enable debug logging
});
```

**Example**:

```typescript
const response = await provider.complete({
  model: 'mistral-large-latest',
  messages: [
    {
      role: 'system',
      content: 'You are a helpful assistant',
    },
    {
      role: 'user',
      content: 'Explain quantum computing',
    },
  ],
  maxTokens: 2048,
  temperature: 0.7,
});
```

**Note**: Mistral AI is based in Europe and offers GDPR-compliant AI services, making it ideal for European customers and privacy-conscious applications.

### Groq

**Models**:
- `llama-3.3-70b-versatile` - Meta Llama 3.3 70B with ultra-fast inference ($0.59/$0.79 per million tokens)
- `llama-3.1-70b-versatile` - Meta Llama 3.1 70B with 128K context ($0.59/$0.79 per million tokens)
- `llama-3.1-8b-instant` - Ultra-fast Llama 3.1 8B ($0.05/$0.08 per million tokens)
- `mixtral-8x7b-32768` - Mistral Mixtral 8x7B, 32K context ($0.24/$0.24 per million tokens)
- `gemma2-9b-it` - Google Gemma 2 9B instruction-tuned ($0.20/$0.20 per million tokens)

**Capabilities**:
- ✅ Streaming
- ✅ Function calling
- ✅ JSON mode
- ✅ System messages
- ✅ Up to 128K context window
- ✅ Ultra-fast inference (10x faster than typical APIs)
- ✅ OpenAI-compatible API

**Configuration**:

```typescript
const provider = await getProvider('groq', {
  apiKey: process.env.GROQ_API_KEY,
  // Optional:
  baseUrl: 'https://api.groq.com/openai/v1', // Custom endpoint
  timeout: 30000, // Request timeout (ms)
  maxRetries: 3, // Max retry attempts
  retryDelay: 1000, // Retry delay (ms)
  debug: false, // Enable debug logging
});
```

**Example**:

```typescript
const response = await provider.complete({
  model: 'llama-3.1-8b-instant', // Ultra-fast!
  messages: [
    {
      role: 'user',
      content: 'Quick question: what is 2+2?',
    },
  ],
  maxTokens: 100,
});

console.log(response.content); // Lightning-fast response
```

**Key Feature**: Groq provides **ultra-fast inference** (up to 10x faster than typical APIs) thanks to their custom LPU (Language Processing Unit) hardware. Ideal for real-time applications and interactive experiences.

### Cohere

**Models**:
- `command-r-plus` - Most powerful for complex tasks, 128K context ($2.50/$10 per million tokens)
- `command-r` - Balanced for most tasks, 128K context ($0.15/$0.60 per million tokens)
- `command-light` - Fast and efficient for simple tasks ($0.30/$0.60 per million tokens)

**Capabilities**:
- ✅ Streaming
- ✅ Function calling (Command R+ and R)
- ✅ System messages
- ✅ Top-K sampling support
- ✅ Up to 128K context window
- ✅ Strong multilingual capabilities
- ✅ Excellent for RAG (Retrieval Augmented Generation)

**Configuration**:

```typescript
const provider = await getProvider('cohere', {
  apiKey: process.env.COHERE_API_KEY,
  // Optional:
  baseUrl: 'https://api.cohere.ai/v1', // Custom endpoint
  timeout: 30000, // Request timeout (ms)
  maxRetries: 3, // Max retry attempts
  retryDelay: 1000, // Retry delay (ms)
  debug: false, // Enable debug logging
});
```

**Example**:

```typescript
const response = await provider.complete({
  model: 'command-r',
  messages: [
    {
      role: 'system',
      content: 'You are a helpful assistant',
    },
    {
      role: 'user',
      content: 'Summarize this document',
    },
  ],
  maxTokens: 1024,
  temperature: 0.7,
  topK: 50, // Cohere supports top-K!
});
```

**Note**: Cohere excels at RAG (Retrieval Augmented Generation) applications and provides excellent multilingual support across 100+ languages.

---

## Using Providers

### Configuration

```typescript
interface ProviderConfig {
  // Required
  apiKey?: string; // API key or authentication token

  // Optional
  baseUrl?: string; // Custom API endpoint
  timeout?: number; // Request timeout (ms), default: 30000
  maxRetries?: number; // Max retry attempts, default: 3
  retryDelay?: number; // Retry delay (ms), default: 1000
  headers?: Record<string, string>; // Custom headers
  debug?: boolean; // Enable debug logging, default: false

  // Provider-specific config
  [key: string]: unknown;
}
```

### Completion Request

```typescript
interface CompletionRequest {
  // Required
  model: string; // Model ID
  messages: Message[]; // Chat messages

  // Optional
  system?: string; // System message/instructions
  maxTokens?: number; // Max tokens to generate
  temperature?: number; // Temperature (0-1, higher = more random)
  topP?: number; // Top-p sampling (0-1)
  topK?: number; // Top-k sampling
  stopSequences?: string[]; // Stop sequences
  stream?: boolean; // Enable streaming
  tools?: ToolDefinition[]; // Available tools/functions
  metadata?: Record<string, unknown>; // Request metadata
}
```

### Messages

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string | MessageContent[];
  functionCall?: { name: string; arguments: string };
  functionResponse?: { name: string; content: string };
  metadata?: Record<string, unknown>;
}
```

### Multimodal (Text + Images)

```typescript
const response = await provider.complete({
  model: 'claude-3-5-sonnet-20241022',
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'What is in this image?',
        },
        {
          type: 'image',
          source: {
            type: 'base64',
            mediaType: 'image/png',
            data: 'iVBORw0KGgoAAAANSUhEUg...',
          },
        },
      ],
    },
  ],
  maxTokens: 1024,
});
```

### Function/Tool Calling

```typescript
const response = await provider.complete({
  model: 'claude-3-5-sonnet-20241022',
  messages: [
    {
      role: 'user',
      content: 'What is the weather in San Francisco?',
    },
  ],
  tools: [
    {
      name: 'get_weather',
      description: 'Get the current weather for a location',
      inputSchema: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City name',
          },
        },
        required: ['location'],
      },
    },
  ],
  maxTokens: 1024,
});

if (response.functionCall) {
  console.log('Function to call:', response.functionCall.name);
  console.log('Arguments:', response.functionCall.arguments);
}
```

---

## Creating Custom Providers

### Extend BaseProvider

```typescript
import { BaseProvider } from '@pcl/sdk/providers';
import type {
  ProviderConfig,
  ProviderCapabilities,
  ModelInfo,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
} from '@pcl/sdk/providers';

export class MyCustomProvider extends BaseProvider {
  readonly name = 'my-provider';
  readonly displayName = 'My Custom Provider';
  readonly version = '1.0.0';

  protected async doInitialize(config: ProviderConfig): Promise<void> {
    // Provider-specific initialization
  }

  protected validateConfig(config: ProviderConfig): void {
    // Validate required config
    if (!config.apiKey) {
      throw new Error('API key is required');
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    // Return available models
    return [
      {
        id: 'my-model-v1',
        name: 'My Model v1',
        capabilities: {
          streaming: true,
          functionCalling: false,
          vision: false,
          jsonMode: false,
          systemMessages: true,
          maxContextTokens: 4096,
          maxOutputTokens: 1024,
          temperature: true,
          topP: true,
          topK: false,
          stopSequences: true,
          chatHistory: true,
        },
      },
    ];
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      functionCalling: false,
      vision: false,
      jsonMode: false,
      systemMessages: true,
      maxContextTokens: 4096,
      maxOutputTokens: 1024,
      temperature: true,
      topP: true,
      topK: false,
      stopSequences: true,
      chatHistory: true,
    };
  }

  protected async doComplete(request: CompletionRequest): Promise<CompletionResponse> {
    // Implement completion logic
    const response = await this.fetch(`${this.config.baseUrl}/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        max_tokens: request.maxTokens,
      }),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const data = await this.parseJsonResponse<{
      content: string;
      usage: { input_tokens: number; output_tokens: number };
    }>(response);

    return {
      content: data.content,
      finishReason: 'stop',
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      model: request.model,
    };
  }

  protected async *doStream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    // Implement streaming logic
    // See AnthropicProvider for complete example
    yield { content: 'chunk', done: false };
    yield { content: '', done: true, finishReason: 'stop' };
  }

  async countTokens(text: string, model?: string): Promise<number> {
    // Estimate token count
    return Math.ceil(text.length / 4);
  }
}
```

### Register Custom Provider

```typescript
import { registerProvider } from '@pcl/sdk/providers';
import { MyCustomProvider } from './my-custom-provider';

registerProvider({
  factory: (config) => new MyCustomProvider(),
  metadata: {
    name: 'my-provider',
    displayName: 'My Custom Provider',
    description: 'Custom AI provider integration',
    version: '1.0.0',
    homepage: 'https://example.com',
    documentation: 'https://docs.example.com',
  },
});

// Now use it
const provider = await getProvider('my-provider', {
  apiKey: 'my-api-key',
});
```

---

## Provider Registry

### List Providers

```typescript
import { listProviders } from '@pcl/sdk/providers';

const providers = listProviders();

providers.forEach((provider) => {
  console.log(`${provider.displayName} (${provider.name}) - ${provider.description}`);
});

// Output:
// Anthropic (anthropic) - Anthropic Claude models (3.5 Sonnet, 3.5 Haiku, 3 Opus)
// OpenAI (openai) - OpenAI GPT models (GPT-4 Turbo, GPT-4o, GPT-3.5 Turbo)
// Google (google) - Google Gemini models (Gemini 2.0 Flash, Gemini 1.5 Pro/Flash)
// DeepSeek (deepseek) - DeepSeek models (DeepSeek Chat, DeepSeek Coder)
// Ollama (ollama) - Ollama local models (Llama, Mistral, Gemma, and more)
// Mistral AI (mistral) - Mistral AI models (Large, Small, Codestral, Nemo)
// Groq (groq) - Groq ultra-fast inference (Llama, Mixtral, Gemma)
// Cohere (cohere) - Cohere models (Command R+, Command R, Command Light)
```

### Check Provider Availability

```typescript
import { getProviderRegistry } from '@pcl/sdk/providers';

const registry = getProviderRegistry();

if (registry.has('anthropic')) {
  console.log('Anthropic provider is available');
}
```

### Get Provider Metadata

```typescript
const metadata = registry.getMetadata('anthropic');
console.log(metadata);

// Output:
// {
//   name: 'anthropic',
//   displayName: 'Anthropic',
//   description: 'Anthropic Claude models (3.5 Sonnet, 3.5 Haiku, 3 Opus)',
//   version: '1.0.0',
//   homepage: 'https://anthropic.com',
//   documentation: 'https://docs.anthropic.com'
// }
```

### Shutdown Providers

```typescript
// Shutdown single provider
await provider.shutdown();

// Shutdown all active providers
await registry.shutdownAll();
```

---

## Advanced Features

### Retry Logic

The base provider includes automatic retry logic with exponential backoff:

```typescript
const provider = await getProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 3, // Max 3 retry attempts
  retryDelay: 1000, // Start with 1s delay
});

// Will retry on transient errors (5xx) with exponential backoff:
// Attempt 1: Immediate
// Attempt 2: After 1s
// Attempt 3: After 2s
// Attempt 4: After 4s
```

### Timeout Handling

```typescript
const provider = await getProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 10000, // 10 second timeout
});

try {
  const response = await provider.complete({ /* ... */ });
} catch (error) {
  if (error.message.includes('timeout')) {
    console.error('Request timed out');
  }
}
```

### Custom Headers

```typescript
const provider = await getProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY,
  headers: {
    'X-Custom-Header': 'value',
    'User-Agent': 'MyApp/1.0',
  },
});
```

### Debug Mode

```typescript
const provider = await getProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY,
  debug: true, // Enable debug logging
});

// Logs provider operations:
// [anthropic] Provider initialized
// [anthropic] Retry attempt 1/3 after 1000ms
```

### Capability Detection

```typescript
const capabilities = provider.getCapabilities();

if (capabilities.streaming) {
  // Use streaming
  const stream = provider.stream({ /* ... */ });
} else {
  // Use non-streaming
  const response = await provider.complete({ /* ... */ });
}

if (capabilities.vision) {
  // Send images
  const response = await provider.complete({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this image' },
          { type: 'image', source: { /* ... */ } },
        ],
      },
    ],
  });
}
```

---

## API Reference

### Types

```typescript
// Provider
interface Provider {
  readonly name: string;
  readonly displayName: string;
  readonly version: string;
  initialize(config: ProviderConfig): Promise<void>;
  getModels(): Promise<ModelInfo[]>;
  getModel(modelId: string): Promise<ModelInfo | null>;
  hasModel(modelId: string): Promise<boolean>;
  getCapabilities(): ProviderCapabilities;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  stream(request: CompletionRequest): AsyncIterable<StreamChunk>;
  countTokens(text: string, model?: string): Promise<number>;
  validateCredentials(): Promise<boolean>;
  shutdown(): Promise<void>;
}

// Capabilities
interface ProviderCapabilities {
  streaming: boolean;
  functionCalling: boolean;
  vision: boolean;
  jsonMode: boolean;
  systemMessages: boolean;
  maxContextTokens: number;
  maxOutputTokens: number;
  temperature: boolean;
  topP: boolean;
  topK: boolean;
  stopSequences: boolean;
  chatHistory: boolean;
}

// Model Info
interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  capabilities: ProviderCapabilities;
  inputTokenCost?: number;
  outputTokenCost?: number;
  version?: string;
  deprecated?: boolean;
}

// Request/Response
interface CompletionRequest { /* ... */ }
interface CompletionResponse { /* ... */ }
interface StreamChunk { /* ... */ }
```

### Functions

```typescript
// Get provider instance (singleton)
async function getProvider(name: string, config: ProviderConfig): Promise<Provider>

// Create new provider instance
async function createProvider(name: string, config: ProviderConfig): Promise<Provider>

// Register provider
function registerProvider(entry: ProviderRegistryEntry): void

// List providers
function listProviders(): ProviderRegistryEntry['metadata'][]

// Get registry
function getProviderRegistry(): ProviderRegistry
```

---

## Best Practices

### 1. Use Environment Variables for API Keys

```typescript
const provider = await getProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### 2. Handle Errors Gracefully

```typescript
try {
  const response = await provider.complete({ /* ... */ });
} catch (error) {
  if (error.status === 401) {
    console.error('Invalid API key');
  } else if (error.status === 429) {
    console.error('Rate limited');
  } else {
    console.error('Request failed:', error.message);
  }
}
```

### 3. Shutdown Providers

```typescript
// At application shutdown
await provider.shutdown();
// or
await registry.shutdownAll();
```

### 4. Use Streaming for Long Responses

```typescript
// Use streaming for better UX
const stream = provider.stream({ /* ... */ });
for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

### 5. Check Capabilities

```typescript
const capabilities = provider.getCapabilities();

if (!capabilities.vision && request.hasImages) {
  throw new Error('This model does not support vision');
}
```

---

## Examples

### Multi-Turn Conversation

```typescript
const messages = [
  { role: 'user', content: 'What is 2+2?' },
];

const response1 = await provider.complete({
  model: 'claude-3-5-sonnet-20241022',
  messages,
  maxTokens: 1024,
});

messages.push({ role: 'assistant', content: response1.content });
messages.push({ role: 'user', content: 'Multiply that by 3' });

const response2 = await provider.complete({
  model: 'claude-3-5-sonnet-20241022',
  messages,
  maxTokens: 1024,
});

console.log(response2.content); // "12"
```

### Error Handling

```typescript
try {
  const response = await provider.complete({
    model: 'claude-3-5-sonnet-20241022',
    messages: [{ role: 'user', content: 'Hello' }],
    maxTokens: 1024,
  });

  console.log(response.content);
} catch (error) {
  if (error.status) {
    // HTTP error
    console.error(`HTTP ${error.status}: ${error.message}`);
  } else {
    // Other error (network, timeout, etc.)
    console.error('Request failed:', error.message);
  }
}
```

---

## Troubleshooting

### Issue: "Provider not initialized"

**Solution**: Call `initialize()` before using the provider:

```typescript
const provider = new AnthropicProvider();
await provider.initialize({ apiKey: 'key' });
```

Or use `getProvider()` which auto-initializes:

```typescript
const provider = await getProvider('anthropic', { apiKey: 'key' });
```

### Issue: "Request timeout"

**Solution**: Increase timeout or check network:

```typescript
const provider = await getProvider('anthropic', {
  apiKey: 'key',
  timeout: 60000, // 60 seconds
});
```

### Issue: Rate limiting (429 errors)

**Solution**: Implement backoff or reduce request rate:

```typescript
const provider = await getProvider('anthropic', {
  apiKey: 'key',
  maxRetries: 5, // More retries
  retryDelay: 2000, // Longer delay
});
```

---

## Roadmap

### Available Providers

- ✅ Anthropic (Claude) - **Available Now**
- ✅ OpenAI (GPT-4, GPT-3.5) - **Available Now**
- ✅ Google (Gemini 2.0 Flash, Gemini 1.5 Pro/Flash) - **Available Now**
- ✅ DeepSeek (Chat, Coder) - **Available Now**
- ✅ Ollama (Local models: Llama, Mistral, Gemma, etc.) - **Available Now**
- ✅ Mistral AI (Large, Small, Codestral, Nemo) - **Available Now**
- ✅ Groq (Ultra-fast Llama, Mixtral, Gemma) - **Available Now**
- ✅ Cohere (Command R+, Command R, Command Light) - **Available Now**

### Coming Soon

- 🚧 Azure OpenAI
- 🚧 AWS Bedrock
- 🚧 Hugging Face Inference
- 🚧 Perplexity AI

### Future Features

- Provider auto-detection
- Load balancing across providers
- Cost tracking and optimization
- Response caching
- Provider-specific optimizations
- Batch request support
- Provider comparison tools

---

## Resources

### Provider Documentation

- [Anthropic API Documentation](https://docs.anthropic.com)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [DeepSeek API Documentation](https://platform.deepseek.com/api-docs)
- [Ollama Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Mistral AI API Documentation](https://docs.mistral.ai)
- [Groq API Documentation](https://console.groq.com/docs)
- [Cohere API Documentation](https://docs.cohere.com)

### PCL Resources

- [PCL GitHub Repository](https://github.com/personalayer/pcl)
- [Provider Examples](../examples/providers/)

---

**Questions?** Open an issue on [GitHub](https://github.com/pcl-lang/pcl/issues).
