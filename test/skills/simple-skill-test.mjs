import { parse } from '../../dist/index.js';

const code1 = `
skill TestSkill {
  name: "Test"
}
`;

console.log('Test 1: Simple skill with name');
const result1 = parse(code1);
console.log('Result:', result1);
if (result1.ok) {
  console.log('✅ Parse succeeded');
  console.log('Errors:', result1.value.errors);
  console.log('AST:', JSON.stringify(result1.value.program, null, 2));
} else {
  console.log('❌ Parse failed');
  console.log('Error:', result1.error);
}

console.log('\n---\n');

const code2 = `
skill TestSkill {
  name: "Test"
  version: "1.0.0"
  items: ["item1", "item2"]
}
`;

console.log('Test 2: Skill with items (old syntax)');
const result2 = parse(code2);
console.log('Result ok?', result2.ok);
if (result2.ok) {
  console.log('✅ Parse succeeded');
  console.log('Errors:', result2.value.errors);
} else {
  console.log('❌ Parse failed');
  console.log('Error:', result2.error);
}

console.log('\n---\n');

const code3 = `
skill TestSkill {
  name: "Test"
  instructions: """
  Hello world
  """
}
`;

console.log('Test 3: Skill with instructions');
const result3 = parse(code3);
console.log('Result ok?', result3.ok);
if (result3.ok) {
  console.log('✅ Parse succeeded');
  console.log('Errors:', result3.value.errors);
  if (result3.value.errors.length > 0) {
    console.log('Error details:', JSON.stringify(result3.value.errors, null, 2));
  }
} else {
  console.log('❌ Parse failed');
  console.log('Error:', result3.error);
}
