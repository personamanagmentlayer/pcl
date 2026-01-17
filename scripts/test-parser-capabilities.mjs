import { parse } from './dist/index.js';

console.log('Testing PCL Parser Capabilities...\n');

function testParse(testName, code) {
  console.log(`=== ${testName} ===`);
  const result = parse(code);

  if (result.ok) {
    const { program, errors } = result.value;
    console.log('✅ Parse succeeded');
    console.log('   Errors:', errors.length);
    console.log('   Statements:', program.statements.map(s => s.kind).join(', '));
    return { success: true, program, errors };
  } else {
    console.log('❌ Parse failed');
    console.log('   Errors:', result.error);
    return { success: false, error: result.error };
  }
}

// Test 1: Team parsing
const teamCode = `
team ReviewTeam {
  members: [ReviewerA, ReviewerB, ReviewerC]
  primary: ReviewerA
  quorum: 2
}
`;

const teamResult = testParse('TEST 1: Team Declaration', teamCode);
if (teamResult.success && teamResult.program.statements.length > 0) {
  const team = teamResult.program.statements[0];
  console.log('   Team name:', team.id.name);
  console.log('   Team body members:', team.body?.members.length || 0);
}
console.log();

// Test 2: Workflow parsing
const workflowCode = `
workflow CodeReview {
  steps: A -> B -> C
}
`;

const workflowResult = testParse('TEST 2: Workflow Declaration', workflowCode);
if (workflowResult.success && workflowResult.program.statements.length > 0) {
  const workflow = workflowResult.program.statements[0];
  console.log('   Workflow name:', workflow.id.name);
  console.log('   Workflow body members:', workflow.body?.members.length || 0);
}
console.log();

// Test 3: Skill declaration
const skillCode = `
skill ThreatModeling {
  description: "Identify security threats"
}
`;

const skillResult = testParse('TEST 3: Skill Declaration', skillCode);
console.log();

// Test 4: Persona with methods
const personaMethodCode = `
persona Analyst {
  intent = "Analyze data"

  method analyze(input: String): String {
    return "Analysis: " + input
  }
}
`;

const methodResult = testParse('TEST 4: Persona with Method', personaMethodCode);
if (methodResult.success && methodResult.program.statements.length > 0) {
  const persona = methodResult.program.statements[0];
  console.log('   Persona name:', persona.id.name);
  console.log('   Persona members:', persona.members.map(m => m.kind).join(', '));
}
console.log();

// Summary
console.log('=== SUMMARY ===');
console.log('Team parsing:', teamResult.success ? '✅ Works' : '❌ Failed');
console.log('Workflow parsing:', workflowResult.success ? '✅ Works' : '❌ Failed');
console.log('Skill parsing:', skillResult.success ? '✅ Works' : '❌ Failed');
console.log('Method parsing:', methodResult.success ? '✅ Works' : '❌ Failed');
