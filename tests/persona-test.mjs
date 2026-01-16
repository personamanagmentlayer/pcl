import { parse } from '../dist/index.js';

const source = `persona SEC {
  intent: "Security analysis"
  tone: cautious
  depth: thorough
  verbosity: detailed
  skills { "OWASP Top 10" }
}`;

const result = parse(source);
console.log('Parse result:', result.ok ? 'SUCCESS' : 'FAILED');
if (result.ok) {
  const persona = result.value.program.statements[0];
  console.log('Persona ID:', persona.id?.name);
  console.log('Body members:', persona.body?.members?.length || 0);
  if (persona.body?.members) {
    persona.body.members.forEach((member, idx) => {
      console.log(
        `  [${idx}] ${member.kind}: ${member.name?.name || 'unnamed'}`
      );
    });
  }
} else {
  console.log('Errors:', result.error.length);
  result.error.forEach((err) => console.log('  -', err.message));
}
