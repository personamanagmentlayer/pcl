import { parse } from '../dist/index.js';

const source = `persona SEC {
  intent: "Security analysis"
  tone: cautious
}`;

console.log('Testing simple persona parsing...\n');

const result = parse(source);
console.log('Parse result:', result.ok ? 'SUCCESS' : 'FAILED');

if (result.ok) {
  const persona = result.value.program.statements[0];
  console.log(`Persona: ${persona.id?.name}`);
  console.log(`Body members: ${persona.body?.members?.length || 0}`);

  // Manual property extraction
  console.log('\nProperties:');
  for (const member of persona.body.members) {
    console.log(`  - ${member.kind}: ${member.name?.name || 'unnamed'}`);
    if (member.kind === 'PropertyDeclaration' && member.initializer) {
      console.log(
        `    Value: ${member.initializer.kind} - ${member.initializer.value || member.initializer.name}`
      );
    }
  }
} else {
  console.log('Errors:');
  result.error.forEach((err) => console.log(`  - ${err.message}`));
}
