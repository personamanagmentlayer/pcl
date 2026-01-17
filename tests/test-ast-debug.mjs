#!/usr/bin/env node

/**
 * Debug test to see what AST is generated for workflow conditionals
 */

import { parse } from '../dist/index.js';

const source = `
persona A { intent: "Test" }

workflow TestWorkflow {
  steps: if (true) then A else A
}
`;

console.log('Parsing PCL source...\n');

const result = parse(source, { source: 'test.pcl' });

if (!result.ok) {
  console.log('Parse errors:');
  result.error.forEach((e) => console.log('  -', e.message));
  process.exit(1);
}

console.log('Parse successful!');
console.log('Errors:', result.value.errors.length);
console.log('Warnings:', result.value.warnings.length);

// Find the workflow declaration
const workflow = result.value.program.statements.find(
  (s) => s.kind === 'WorkflowDeclaration'
);

if (!workflow) {
  console.log('\nNo workflow found!');
  process.exit(1);
}

console.log('\nWorkflow found:', workflow.id.name);

// Get the steps
const stepsDecl = workflow.body.members.find((m) => m.kind === 'WorkflowStepsDeclaration');

if (!stepsDecl) {
  console.log('No steps declaration found!');
  process.exit(1);
}

console.log('\nSteps expression kind:', stepsDecl.steps.kind);

if (stepsDecl.steps.kind === 'WorkflowConditionalExpr') {
  const cond = stepsDecl.steps;
  console.log('Condition kind:', cond.condition.kind);
  console.log('Condition value:', JSON.stringify(cond.condition, null, 2));
}
