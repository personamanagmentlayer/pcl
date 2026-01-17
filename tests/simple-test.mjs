import { parse } from '../dist/index.js';

const result = parse('persona SEC { intent: "test" }');
console.log('Parse result:', result.ok ? 'SUCCESS' : 'FAILED');
if (result.ok) {
  console.log('Statements:', result.value.program.statements.length);
} else {
  console.log('Errors:', result.error.length);
  result.error.forEach((err) => console.log('  -', err.message));
}
