#!/usr/bin/env node
/**
 * Tutorial 2: Team Collaboration
 * Test consensus mode with multiple personas
 */

import { parse, Runtime, MockProvider } from '../../../dist/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('Tutorial 2: Team Collaboration');
console.log('Testing Consensus Mode');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

// Load PCL
const source = readFileSync(join(__dirname, 'review-team.pcl'), 'utf-8');
const parseResult = parse(source);

if (!parseResult.ok) {
  console.error('Parse error:', parseResult.error);
  process.exit(1);
}

const program = parseResult.value.program;

// Setup runtime
const runtime = new Runtime();
runtime.setDefaultProvider(new MockProvider());
runtime.load(program);

// Get team
const team = runtime.getTeam('CodeReviewTeam');

console.log('✓ Team loaded:', team.getState().name);
console.log('✓ Member count:', team.getState().members.length);
console.log('✓ Merge mode:', team.getState().config.mergeMode);
console.log('\nSending code to team for review...\n');

// Process with team
const response = await team.process({
  id: 'msg-1',
  from: 'user',
  content: `
Review this authentication function:

function authenticate(username, password) {
  const user = db.query("SELECT * FROM users WHERE name='" + username + "'");
  if (user && user.password === password) {
    return { token: username + "_" + Date.now() };
  }
  return null;
}
  `,
  timestamp: new Date(),
});

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('TEAM CONSENSUS REVIEW');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log(response.content);
console.log('\n' + '═══════════════════════════════════════════════════════════════════════════════');
console.log('METADATA');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('Contributors:', response.metadata.contributors);
console.log('Merge mode:', response.metadata.mergeMode);
console.log('Confidence:', response.confidence);

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('✓ Tutorial 2 Complete!');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');
