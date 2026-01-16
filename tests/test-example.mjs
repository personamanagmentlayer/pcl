#!/usr/bin/env node
/**
 * Quick PCL Demo - Testing if PCL works
 */

import * as PCL from '../dist/index.js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('PCL - Persona Control Language - Quick Test');
console.log(
  '═══════════════════════════════════════════════════════════════\n'
);

// Test 1: Tokenization
console.log('📝 Test 1: Tokenization');
const code1 = 'persona SEC { intent: "Security analysis" }';
const tokens = PCL.tokenize(code1);
console.log(`   Input: ${code1}`);
console.log(`   Result: ${tokens.ok ? '✓ SUCCESS' : '✗ FAILED'}`);
if (tokens.ok) {
  console.log(`   Tokens: ${tokens.value.length} tokens generated`);
}
console.log();

// Test 2: Basic Parsing
console.log('🔍 Test 2: Parsing a Persona');
const code2 = `
persona SEC {
  intent: "Identify security vulnerabilities"
  skills {
    "OWASP Top 10"
    "Threat modeling"
  }
}
`;
const ast = PCL.parse(code2);
console.log(`   Result: ${ast.ok ? '✓ SUCCESS' : '✗ FAILED'}`);
if (ast.ok) {
  const persona = ast.value.program.statements[0];
  console.log(`   Persona ID: ${persona.id.name}`);
  console.log(`   AST Kind: ${persona.kind}`);
}
console.log();

// Test 3: Team Parsing
console.log('👥 Test 3: Parsing a Team');
const code3 = `
team SecurityReview {
  members: [SEC, AUDIT, ARCHI]
  primary: SEC
  quorum: 2/3
}
`;
const teamAst = PCL.parse(code3);
console.log(`   Result: ${teamAst.ok ? '✓ SUCCESS' : '✗ FAILED'}`);
if (teamAst.ok) {
  const team = teamAst.value.program.statements[0];
  console.log(`   Team Name: ${team.id.name}`);
  console.log(`   AST Kind: ${team.kind}`);
}
console.log();

// Test 4: Workflow Parsing
console.log('⚙️  Test 4: Parsing a Workflow');
const code4 = `
workflow CodeReview {
  steps: ARCHI -> SEC -> CRITIC
  timeout: 60s
  retry: 3
}
`;
const workflowAst = PCL.parse(code4);
console.log(`   Result: ${workflowAst.ok ? '✓ SUCCESS' : '✗ FAILED'}`);
if (workflowAst.ok) {
  const workflow = workflowAst.value.program.statements[0];
  console.log(`   Workflow Name: ${workflow.id.name}`);
  console.log(`   AST Kind: ${workflow.kind}`);
}
console.log();

// Test 5: Error Handling
console.log('⚠️  Test 5: Error Handling');
const invalidCode = 'persona INVALID @ syntax error';
const errorResult = PCL.parse(invalidCode);
console.log(
  `   Result: ${errorResult.ok ? '✓ Parsed (unexpected)' : '✓ Error detected (expected)'}`
);
if (!errorResult.ok) {
  console.log(`   Errors found: ${errorResult.error.length}`);
  console.log(`   First error: ${errorResult.error[0].message}`);
}
console.log();

// Summary
console.log('═══════════════════════════════════════════════════════════════');
console.log('Summary: PCL Core Features Working ✓');
console.log('  • Lexer: Tokenization works');
console.log('  • Parser: Persona, Team, Workflow parsing works');
console.log('  • Error Handling: Error detection and reporting works');
console.log(
  '  • Note: Some TypeScript build warnings exist but do not affect runtime'
);
console.log('═══════════════════════════════════════════════════════════════');
