#!/usr/bin/env node

/**
 * Test provider-specific prompt generation
 */

import { parse, generatePrompt } from '../dist/index.js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('  PCL - Provider-Specific Prompt Tests');
console.log('═══════════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;

// Sample persona for testing
const sampleCode = `
persona SecurityExpert {
  intent = "Provide expert security analysis and recommendations"
  skills {
    "Threat modeling"
    "Code review"
    "Penetration testing"
  }
  constraints {
    "Always assume breach"
    "Apply least privilege principle"
  }
}
`;

function test(name, provider, validator) {
  try {
    // Parse the code
    const parseResult = parse(sampleCode);
    if (!parseResult.ok) {
      console.log(`✗ ${name}`);
      console.log(`  Parse error:`, parseResult.error);
      console.log('');
      failed++;
      return;
    }

    // Get the persona declaration
    const persona = parseResult.value.program.statements.find(
      s => s.kind === 'PersonaDeclaration'
    );

    if (!persona) {
      console.log(`✗ ${name}`);
      console.log(`  No persona found in parsed code`);
      failed++;
      return;
    }

    // Generate prompt
    const prompt = generatePrompt(persona, { provider });

    // Validate
    const validationResult = validator(prompt);
    if (validationResult === true) {
      console.log(`✓ ${name}`);
      if (process.env.VERBOSE) {
        console.log('  Generated prompt:');
        console.log(prompt.split('\n').map(l => `    ${l}`).join('\n'));
      }
      passed++;
    } else {
      console.log(`✗ ${name}`);
      console.log(`  Validation failed: ${validationResult}`);
      console.log(`  Generated prompt:`);
      console.log(prompt.split('\n').map(l => `    ${l}`).join('\n'));
      failed++;
    }
    console.log('');
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Exception: ${err.message}`);
    console.log('');
    failed++;
  }
}

// Test 1: Generic format (default)
test('Generic format', 'generic', (prompt) => {
  if (!prompt.includes('PERSONA CONFIGURATION')) return 'Missing header';
  if (!prompt.includes('SecurityExpert')) return 'Missing persona name';
  if (!prompt.includes('IDENTITY & PURPOSE')) return 'Missing identity section';
  if (!prompt.includes('EXPERTISE & SKILLS')) return 'Missing skills section';
  if (!prompt.includes('CONSTRAINTS & GUIDELINES')) return 'Missing constraints section';
  if (!prompt.includes('Threat modeling')) return 'Missing threat modeling skill';
  if (!prompt.includes('Always assume breach')) return 'Missing breach constraint';
  return true;
});

// Test 2: Claude format
test('Claude XML format', 'claude', (prompt) => {
  if (!prompt.includes('<persona>')) return 'Missing opening persona tag';
  if (!prompt.includes('</persona>')) return 'Missing closing persona tag';
  if (!prompt.includes('<name>SecurityExpert</name>')) return 'Missing name tag';
  if (!prompt.includes('<identity>')) return 'Missing identity tag';
  if (!prompt.includes('</identity>')) return 'Missing closing identity tag';
  if (!prompt.includes('<expertise>')) return 'Missing expertise tag';
  if (!prompt.includes('</expertise>')) return 'Missing closing expertise tag';
  if (!prompt.includes('<guidelines>')) return 'Missing guidelines tag';
  if (!prompt.includes('</guidelines>')) return 'Missing closing guidelines tag';
  if (!prompt.includes('- Threat modeling')) return 'Missing skill in expertise';
  if (!prompt.includes('- Always assume breach')) return 'Missing constraint in guidelines';
  return true;
});

// Test 3: OpenAI format
test('OpenAI imperative format', 'openai', (prompt) => {
  if (!prompt.includes('# SecurityExpert')) return 'Missing header';
  if (!prompt.includes('You are SecurityExpert')) return 'Missing "You are" statement';
  if (!prompt.includes('## Your Expertise')) return 'Missing expertise section';
  if (!prompt.includes('## Rules You Must Follow')) return 'Missing rules section';
  if (!prompt.includes('You have expertise in:')) return 'Missing expertise intro';
  if (!prompt.includes('- Threat modeling')) return 'Missing skill';
  if (!prompt.includes('- Always assume breach')) return 'Missing constraint';
  return true;
});

// Test 4: Gemini format
test('Gemini contextual format', 'gemini', (prompt) => {
  if (!prompt.includes('Context: You are SecurityExpert')) return 'Missing context statement';
  if (!prompt.includes('Your Purpose:')) return 'Missing purpose section';
  if (!prompt.includes('Your Knowledge and Skills:')) return 'Missing skills section';
  if (!prompt.includes('Behavioral Guidelines:')) return 'Missing guidelines section';
  if (!prompt.includes('• Threat modeling')) return 'Missing skill bullet';
  if (!prompt.includes('• Always assume breach')) return 'Missing guideline bullet';
  if (!prompt.includes('Instructions:')) return 'Missing instruction footer';
  return true;
});

// Test 5: Claude format structure validation
test('Claude XML structure validation', 'claude', (prompt) => {
  // Validate XML-like structure
  const tags = ['<persona>', '</persona>', '<name>', '</name>', '<identity>', '</identity>'];
  for (const tag of tags) {
    if (!prompt.includes(tag)) return `Missing ${tag} tag`;
  }
  // Validate content is properly wrapped
  if (prompt.indexOf('<persona>') > 0) return 'persona tag should be at start';
  if (prompt.indexOf('</persona>') !== prompt.lastIndexOf('</persona>')) {
    return 'Multiple closing persona tags';
  }
  return true;
});

// Test 6: OpenAI with multiple skills
test('OpenAI with comprehensive skills', 'openai', (prompt) => {
  if (!prompt.includes('- Threat modeling')) return 'Missing first skill';
  if (!prompt.includes('- Code review')) return 'Missing second skill';
  if (!prompt.includes('- Penetration testing')) return 'Missing third skill';
  return true;
});

// Test 7: Gemini with constraints
test('Gemini with behavioral guidelines', 'gemini', (prompt) => {
  if (!prompt.includes('• Always assume breach')) return 'Missing first guideline';
  if (!prompt.includes('• Apply least privilege principle')) return 'Missing second guideline';
  return true;
});

// Test 8: Format comparison - all should contain persona name
test('All formats include persona name', 'generic', (prompt) => {
  const providers = ['generic', 'claude', 'openai', 'gemini'];
  const result = parse(sampleCode);
  const persona = result.value.program.statements.find(s => s.kind === 'PersonaDeclaration');

  for (const provider of providers) {
    const generated = generatePrompt(persona, { provider });
    if (!generated.includes('SecurityExpert')) {
      return `${provider} format missing persona name`;
    }
  }
  return true;
});

console.log('═══════════════════════════════════════════════════════════════');
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log('═══════════════════════════════════════════════════════════════\n');

if (failed === 0) {
  console.log('🎉 All provider-specific prompt tests passed!\n');
  process.exit(0);
} else {
  console.log('❌ Some provider-specific prompt tests failed.\n');
  process.exit(1);
}
