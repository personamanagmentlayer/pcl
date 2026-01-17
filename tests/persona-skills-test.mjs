import { parse } from '../dist/index.js';

const source = `persona SEC {
  intent: "Security analysis"
  tone: cautious
  skills { "OWASP Top 10" }
}`;

console.log('Testing persona with properties and skills...\n');

const result = parse(source);
console.log('Parse result:', result.ok ? 'SUCCESS' : 'FAILED');

if (result.ok) {
  const persona = result.value.program.statements[0];
  console.log(`Persona: ${persona.id?.name}`);
  console.log(`Body members: ${persona.body?.members?.length || 0}`);

  console.log('\nMembers:');
  for (const member of persona.body.members) {
    console.log(`  - ${member.kind}`);
  }
} else {
  console.log('Errors:');
  result.error.forEach((err) => console.log(`  - ${err.message}`));
}
