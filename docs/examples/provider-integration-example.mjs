#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL Provider Integration Example
 * Demonstrates how to use PCL with different AI providers
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  createPersona,
  createRuntime,
  MockProvider,
  // AnthropicProvider,
  // OpenAIProvider,
} from '../dist/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Example 1: Using MockProvider (No API Key Required)
// ─────────────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('Example 1: MockProvider - Testing Without API Keys');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

// Create a mock provider with predefined responses
const mockProvider = new MockProvider({
  responses: [
    'Hello! I am a security analyst persona. I can help identify and mitigate security vulnerabilities in your code.',
    'Based on my analysis, I recommend implementing input validation, using parameterized queries, and applying the principle of least privilege.',
    'Security is not just a feature, it\'s a continuous process. Regular audits and updates are essential.',
  ],
  delay: 100, // Simulate 100ms latency
  enableStreaming: true,
});

// Create a security analyst persona
const securityAnalyst = createPersona(
  'SEC',
  'Security Analyst',
  {
    intent: 'Identify and mitigate security vulnerabilities',
    tone: 'vigilant',
    depth: 'detailed',
    verbosity: 'normal',
    skills: [
      'OWASP Top 10',
      'STRIDE threat modeling',
      'Penetration testing',
      'Zero Trust architecture',
    ],
    constraints: [
      'Always assume breach',
      'Apply least privilege principle',
    ],
    outputFormat: 'markdown',
  },
  mockProvider
);

// Activate and interact with the persona
securityAnalyst.activate();

const message1 = {
  id: '1',
  from: 'user',
  to: 'SEC',
  content: 'Can you introduce yourself?',
  metadata: {},
  timestamp: new Date(),
};

console.log('📤 User: Can you introduce yourself?\n');

try {
  const response1 = await securityAnalyst.process(message1);
  console.log(`✅ ${response1.personaId}: ${response1.content}`);
  console.log(`   Confidence: ${response1.confidence}`);
  console.log(`   Tokens: ${response1.metadata.tokensUsed}`);
  console.log(`   Duration: ${response1.metadata.duration}ms\n`);
} catch (error) {
  console.error('❌ Error:', error.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 2: Streaming Response
// ─────────────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('Example 2: Streaming Response');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

const message2 = {
  id: '2',
  from: 'user',
  to: 'SEC',
  content: 'What are your top security recommendations?',
  metadata: {},
  timestamp: new Date(),
};

console.log('📤 User: What are your top security recommendations?\n');
console.log('✅ SEC (streaming): ');

try {
  process.stdout.write('   ');
  for await (const { chunk, done, response } of securityAnalyst.processStream(message2)) {
    if (!done) {
      process.stdout.write(chunk);
    } else {
      process.stdout.write(chunk + '\n');
      if (response) {
        console.log(`\n   Tokens: ${response.metadata.tokensUsed}`);
        console.log(`   Duration: ${response.metadata.duration}ms\n`);
      }
    }
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 3: Using Runtime with Default Provider
// ─────────────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('Example 3: Runtime with Default Provider');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

// Create runtime and set default provider
const runtime = createRuntime();
runtime.setDefaultProvider(mockProvider);

// Load personas (they will automatically get the default provider)
const devPersona = createPersona(
  'DEV',
  'Developer',
  {
    intent: 'Write clean, maintainable code',
    tone: 'pragmatic',
    depth: 'standard',
    verbosity: 'concise',
    skills: ['TypeScript', 'Node.js', 'Testing'],
    outputFormat: 'markdown',
  }
);

// Manually add to runtime
runtime['personas'].set('DEV', devPersona);
devPersona.setProvider(mockProvider);
devPersona.activate();

console.log('📤 User: How should I structure my TypeScript project?\n');

const devResponse = await runtime.send('DEV', 'How should I structure my TypeScript project?');

if (devResponse.ok) {
  const response = devResponse.value;
  console.log(`✅ ${response.personaId}: ${response.content}`);
  console.log(`   Confidence: ${response.confidence}`);
  console.log(`   Tokens: ${response.metadata.tokensUsed}\n`);
} else {
  console.error('❌ Error:', devResponse.error.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 4: Persona State and Stats
// ─────────────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('Example 4: Persona State and Statistics');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

const state = securityAnalyst.getState();
console.log('📊 Security Analyst Stats:');
console.log(`   Messages Processed: ${state.stats.messagesProcessed}`);
console.log(`   Total Tokens Used: ${state.stats.tokensUsed}`);
console.log(`   Average Response Time: ${state.stats.averageResponseTime.toFixed(2)}ms`);
console.log(`   Activation Count: ${state.stats.activationCount}`);
console.log(`   Active: ${state.active}`);
console.log(`   Short-term Memory: ${state.memory.shortTerm.length} messages\n`);

// ─────────────────────────────────────────────────────────────────────────────
// Example 5: System Prompt Generation
// ─────────────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('Example 5: How System Prompts Are Built');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

console.log('The PersonaInstance.buildSystemPrompt() method generates prompts from config:\n');
console.log('📝 Example System Prompt for Security Analyst:\n');
console.log('"""');
console.log('You are a persona with the following intent: Identify and mitigate security vulnerabilities\n');
console.log('Your communication tone should be: vigilant\n');
console.log('Provide thorough, detailed analysis.\n');
console.log('Use an appropriate level of detail.\n');
console.log('Your expertise includes: OWASP Top 10, STRIDE threat modeling, Penetration testing, Zero Trust architecture\n');
console.log('You must adhere to these constraints:');
console.log('- Always assume breach');
console.log('- Apply least privilege principle\n');
console.log('Format your response using Markdown syntax.');
console.log('"""\n');

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('Summary: Provider Integration Features');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

console.log('✅ Provider System Complete:');
console.log('   • MockProvider - Testing without API keys');
console.log('   • AnthropicProvider - Claude AI integration');
console.log('   • OpenAIProvider - GPT integration');
console.log('   • ProviderRegistry - Multi-provider management\n');

console.log('✅ PersonaInstance Enhanced:');
console.log('   • Provider injection via constructor');
console.log('   • Real LLM integration with generateResponse()');
console.log('   • System prompt building from persona config');
console.log('   • Streaming support with processStream()');
console.log('   • Token usage tracking\n');

console.log('✅ Runtime Enhanced:');
console.log('   • setDefaultProvider() - Set default for all personas');
console.log('   • setPersonaProvider() - Per-persona provider selection');
console.log('   • Automatic provider injection on load()\n');

console.log('🎯 Next Steps:');
console.log('   • Add ANTHROPIC_API_KEY to use Claude');
console.log('   • Add OPENAI_API_KEY to use GPT');
console.log('   • Create tutorials demonstrating workflows');
console.log('   • Implement condition evaluation for workflows\n');

console.log('═══════════════════════════════════════════════════════════════════════════════\n');
