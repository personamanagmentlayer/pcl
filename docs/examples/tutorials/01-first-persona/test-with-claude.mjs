#!/usr/bin/env node
/**
 * Tutorial 1: Your First Persona
 * Test with Anthropic (Claude)
 *
 * Usage:
 *   export ANTHROPIC_API_KEY="your-api-key"
 *   node test-with-claude.mjs
 */

import { parse, Runtime, AnthropicProvider } from '../../../dist/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('Tutorial 1: Your First Persona');
console.log('Testing with Anthropic Claude');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

// Check for API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ Error: ANTHROPIC_API_KEY environment variable not set');
  console.error('\nSet it with:');
  console.error('  export ANTHROPIC_API_KEY="your-api-key-here"');
  console.error('\nOr use test-simple.mjs to test with MockProvider (no API key needed)\n');
  process.exit(1);
}

// Load PCL
const source = readFileSync(join(__dirname, 'simple-reviewer.pcl'), 'utf-8');
const parseResult = parse(source);

if (!parseResult.ok) {
  console.error('Parse error:', parseResult.error);
  process.exit(1);
}

const program = parseResult.value.program;

// Create Anthropic provider
const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  defaultModel: 'claude-3-5-sonnet-20241022',
});

// Create runtime
const runtime = new Runtime();
runtime.setDefaultProvider(provider);
runtime.load(program);

// Get persona
const reviewer = runtime.getPersona('CodeReviewer');

console.log('✓ Loaded persona:', reviewer.getState().name);
console.log('✓ Provider:', reviewer.getProvider()?.name);
console.log('✓ Model:', provider.getDefaultModel());
console.log('\nSending code for review...\n');

// Process message
const response = await reviewer.process({
  id: 'msg-1',
  from: 'user',
  content: `
Review this function:

function calculateTotal(items) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total = total + items[i].price * items[i].quantity;
  }
  return total;
}
  `,
  timestamp: new Date(),
});

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('CODE REVIEW');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log(response.content);
console.log('\n' + '═══════════════════════════════════════════════════════════════════════════════');
console.log('METADATA');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('Tokens used:', response.metadata.tokensUsed);
console.log('Duration:', response.metadata.duration + 'ms');
console.log('Model:', response.metadata.model);
console.log('Finish reason:', response.metadata.context?.finishReason);

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('✓ Tutorial 1 Complete!');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');
