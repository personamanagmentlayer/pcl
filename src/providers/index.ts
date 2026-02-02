/**
 * PCL Providers
 *
 * Multi-provider support for AI models (Anthropic, OpenAI, Google, etc.)
 */

// Export interfaces
export type {
  Provider,
  ProviderConfig,
  ProviderCapabilities,
  ProviderFactory,
  ProviderRegistryEntry,
  ModelInfo,
  Message,
  MessageRole,
  MessageContent,
  ToolDefinition,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
  TokenUsage,
} from './provider-interface';

// Export base provider
export { BaseProvider } from './base-provider';

// Export registry
export {
  ProviderRegistry,
  getProviderRegistry,
  registerProvider,
  getProvider,
  listProviders,
} from './provider-registry';

// Export providers
export { AnthropicProvider } from './anthropic-provider';
export { OpenAIProvider } from './openai-provider';
export { GoogleProvider } from './google-provider';
export { DeepSeekProvider } from './deepseek-provider';
export { OllamaProvider } from './ollama-provider';
export { MistralProvider } from './mistral-provider';
export { GroqProvider } from './groq-provider';
export { CohereProvider } from './cohere-provider';

// Auto-register built-in providers
import { AnthropicProvider } from './anthropic-provider';
import { OpenAIProvider } from './openai-provider';
import { GoogleProvider } from './google-provider';
import { DeepSeekProvider } from './deepseek-provider';
import { OllamaProvider } from './ollama-provider';
import { MistralProvider } from './mistral-provider';
import { GroqProvider } from './groq-provider';
import { CohereProvider } from './cohere-provider';
import { registerProvider } from './provider-registry';

// Register Anthropic provider
registerProvider({
  factory: (config) => new AnthropicProvider(),
  metadata: {
    name: 'anthropic',
    displayName: 'Anthropic',
    description: 'Anthropic Claude models (3.5 Sonnet, 3.5 Haiku, 3 Opus)',
    version: '1.0.0',
    homepage: 'https://anthropic.com',
    documentation: 'https://docs.anthropic.com',
  },
});

// Register OpenAI provider
registerProvider({
  factory: (config) => new OpenAIProvider(),
  metadata: {
    name: 'openai',
    displayName: 'OpenAI',
    description: 'OpenAI GPT models (GPT-4 Turbo, GPT-4o, GPT-3.5 Turbo)',
    version: '1.0.0',
    homepage: 'https://openai.com',
    documentation: 'https://platform.openai.com/docs',
  },
});

// Register Google provider
registerProvider({
  factory: (config) => new GoogleProvider(),
  metadata: {
    name: 'google',
    displayName: 'Google',
    description:
      'Google Gemini models (Gemini 2.0 Flash, Gemini 1.5 Pro/Flash)',
    version: '1.0.0',
    homepage: 'https://ai.google.dev',
    documentation: 'https://ai.google.dev/docs',
  },
});

// Register DeepSeek provider
registerProvider({
  factory: (config) => new DeepSeekProvider(),
  metadata: {
    name: 'deepseek',
    displayName: 'DeepSeek',
    description: 'DeepSeek models (DeepSeek Chat, DeepSeek Coder)',
    version: '1.0.0',
    homepage: 'https://www.deepseek.com',
    documentation: 'https://platform.deepseek.com/api-docs',
  },
});

// Register Ollama provider
registerProvider({
  factory: (config) => new OllamaProvider(),
  metadata: {
    name: 'ollama',
    displayName: 'Ollama',
    description: 'Ollama local models (Llama, Mistral, Gemma, and more)',
    version: '1.0.0',
    homepage: 'https://ollama.com',
    documentation: 'https://github.com/ollama/ollama/blob/main/docs/api.md',
  },
});

// Register Mistral AI provider
registerProvider({
  factory: (config) => new MistralProvider(),
  metadata: {
    name: 'mistral',
    displayName: 'Mistral AI',
    description: 'Mistral AI models (Large, Small, Codestral, Nemo)',
    version: '1.0.0',
    homepage: 'https://mistral.ai',
    documentation: 'https://docs.mistral.ai',
  },
});

// Register Groq provider
registerProvider({
  factory: (config) => new GroqProvider(),
  metadata: {
    name: 'groq',
    displayName: 'Groq',
    description: 'Groq ultra-fast inference (Llama, Mixtral, Gemma)',
    version: '1.0.0',
    homepage: 'https://groq.com',
    documentation: 'https://console.groq.com/docs',
  },
});

// Register Cohere provider
registerProvider({
  factory: (config) => new CohereProvider(),
  metadata: {
    name: 'cohere',
    displayName: 'Cohere',
    description: 'Cohere models (Command R+, Command R, Command Light)',
    version: '1.0.0',
    homepage: 'https://cohere.com',
    documentation: 'https://docs.cohere.com',
  },
});
