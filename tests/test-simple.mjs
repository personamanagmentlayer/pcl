import { parse } from '../dist/index.js';

console.log('Testing simple persona...\n');

const simpleSource = `persona SEC {
  intent: "Security"
}`;

console.log('Source:', simpleSource);
console.log('\nParsing...');

const result = parse(simpleSource);

console.log('Result:', result.ok ? '✓ SUCCESS' : '✗ FAILED');

if (result.ok) {
  console.log('Statements:', result.value.program.statements.length);
  console.log('First statement:', result.value.program.statements[0].kind);
} else {
  console.log('Errors:', result.error.length);
  result.error.forEach(err => console.log('  -', err.message));
}
