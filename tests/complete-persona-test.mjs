import { parse } from '../dist/index.js';

const source = `persona SEC {
  intent: "Security analysis"
  tone: cautious
  depth: thorough
  verbosity: detailed
  skills { "OWASP Top 10", "Threat Modeling" }
  constraints { "No false positives" }
  tags { security, audit }
}`;

console.log('Testing full persona parsing...\n');

const result = parse(source);
console.log('Parse result:', result.ok ? 'SUCCESS' : 'FAILED');

if (result.ok) {
  const persona = result.value.program.statements[0];
  console.log(`Persona: ${persona.id?.name}`);
  console.log(`Body members: ${persona.body?.members?.length || 0}`);

  // Manual property extraction
  console.log('\nExtracted Properties:');
  let intent = null,
    tone = null,
    depth = null,
    verbosity = null;
  const skills = [],
    constraints = [],
    tags = [];

  for (const member of persona.body.members) {
    if (member.kind === 'PropertyDeclaration') {
      if (
        member.name.name === 'intent' &&
        member.initializer?.kind === 'StringLiteral'
      ) {
        intent = member.initializer.value;
      }
      if (
        member.name.name === 'tone' &&
        member.initializer?.kind === 'Identifier'
      ) {
        tone = member.initializer.name;
      }
      if (
        member.name.name === 'depth' &&
        member.initializer?.kind === 'Identifier'
      ) {
        depth = member.initializer.name;
      }
      if (
        member.name.name === 'verbosity' &&
        member.initializer?.kind === 'Identifier'
      ) {
        verbosity = member.initializer.name;
      }
    } else if (member.kind === 'SkillBlock') {
      for (const item of member.items) {
        if (item.kind === 'StringSkill') {
          skills.push(item.value);
        }
      }
    } else if (member.kind === 'ConstraintBlock') {
      for (const item of member.items) {
        if (item.kind === 'StringConstraint') {
          constraints.push(item.value);
        }
      }
    } else if (member.kind === 'TagBlock') {
      for (const item of member.items) {
        if (item.kind === 'StringTag') {
          tags.push(item.value);
        } else if (item.kind === 'IdentifierTag') {
          tags.push(item.name.name);
        }
      }
    }
  }

  console.log(`Intent: ${intent}`);
  console.log(`Tone: ${tone}`);
  console.log(`Depth: ${depth}`);
  console.log(`Verbosity: ${verbosity}`);
  console.log(`Skills: [${skills.join(', ')}]`);
  console.log(`Constraints: [${constraints.join(', ')}]`);
  console.log(`Tags: [${tags.join(', ')}]`);
} else {
  console.log('Errors:');
  result.error.forEach((err) => console.log(`  - ${err.message}`));
}
