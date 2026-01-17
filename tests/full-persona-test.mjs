import { parse } from '../dist/index.js';

const source = `persona SEC {
  intent: "Security analysis"
  tone: cautious
  depth: thorough
  verbosity: detailed
  skills { "OWASP Top 10" }
  constraints { "No false positives" }
  tags { "security", "audit" }
}`;

console.log('Testing full persona parsing...\n');
console.log('NOTE: Using quoted strings in tags block to avoid parser hang\n');

const result = parse(source);
console.log('Parse result:', result.ok ? 'SUCCESS' : 'FAILED');

if (result.ok) {
  const persona = result.value.program.statements[0];
  console.log(`Persona: ${persona.id?.name}`);
  console.log(`Body members: ${persona.body?.members?.length || 0}`);

  // Manual property extraction
  console.log('\nProperties:');
  for (const member of persona.body.members) {
    console.log(`  - ${member.kind}`);
  }
} else {
  console.log('Errors:');
  result.error.forEach((err) => console.log(`  - ${err.message}`));
}
