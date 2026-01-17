#!/usr/bin/env node
/**
 * Tutorial 1: Your First Persona
 * Test streaming responses with Anthropic (Claude)
 *
 * Usage:
 *   export ANTHROPIC_API_KEY="your-api-key"
 *   node test-streaming.mjs
 */

import { parse, Runtime, AnthropicProvider } from '../../../dist/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('Tutorial 1: Streaming Responses');
console.log('Watch the response appear in real-time!');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

// Check for API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ Error: ANTHROPIC_API_KEY environment variable not set\n');
  process.exit(1);
}

// Load PCL
const source = readFileSync(join(__dirname, 'custom-persona.pcl'), 'utf-8');
const parseResult = parse(source);

if (!parseResult.ok) {
  console.error('Parse error:', parseResult.error);
  process.exit(1);
}

const program = parseResult.value.program;

// Create provider
const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Create runtime
const runtime = new Runtime();
runtime.setDefaultProvider(provider);
runtime.load(program);

// Get persona
const mentor = runtime.getPersona('CasualMentor');

console.log('✓ Loaded persona:', mentor.getState().name);
console.log('✓ Tone:', mentor.getState().config.tone);
console.log('✓ Temperature:', mentor.getState().config.temperature);
console.log('\nAsking: "Explain async/await in JavaScript"\n');
console.log('─'.repeat(80));

// Stream response
process.stdout.write('Mentor: ');
for await (const chunk of mentor.processStream({
  id: 'msg-1',
  from: 'user',
  content: 'Explain async/await in JavaScript with a simple example',
  timestamp: new Date(),
})) {
  if (!chunk.done) {
    process.stdout.write(chunk.chunk);
  } else {
    console.log('\n' + '─'.repeat(80));
    console.log('Tokens used:', chunk.response?.metadata.tokensUsed);
    console.log('Duration:', chunk.response?.metadata.duration + 'ms');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('✓ Streaming Complete!');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  }
}
