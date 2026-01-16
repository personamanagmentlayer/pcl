import { parse, tokenize } from '../dist/index.js';

const source = `persona SEC {
  intent: "Security analysis"
  tone: cautious
  depth: thorough
  verbosity: detailed
  skills { "OWASP Top 10", "Threat Modeling" }
  constraints { "No false positives", "Focus on critical" }
  tags { security, audit, compliance }
}`;

console.log('PCL Source:\n', source);
console.log('\n=== TOKENIZATION ===\n');

// Step 1: Tokenize
const tokenResult = tokenize(source);

if (tokenResult.ok) {
  console.log(`✓ Scanned ${tokenResult.value.length} tokens`);
  console.log(
    `  First few tokens: ${tokenResult.value
      .slice(0, 5)
      .map((t) => t.type)
      .join(', ')}`
  );
} else {
  console.log('✗ Tokenization errors:');
  tokenResult.error.forEach((err) => {
    console.log(`  - ${err.message}`);
  });
}

console.log('\n=== PARSING ===\n');

// Step 2: Parse
const parseResult = parse(source);

if (parseResult.ok) {
  const program = parseResult.value.program;
  console.log(
    `✓ Successfully parsed ${program.statements.length} statement(s)`
  );

  if (program.statements.length > 0) {
    const persona = program.statements[0];
    console.log(`\nParsed persona:`);
    console.log(`  Kind: ${persona.kind}`);
    console.log(`  ID: ${persona.id?.name}`);
    console.log(`  Body members: ${persona.body?.members?.length || 0}`);

    if (persona.body?.members) {
      console.log(`\n  Members:`);
      persona.body.members.forEach((member, idx) => {
        console.log(`    [${idx}] ${member.kind}`);
      });
    }
  }
} else {
  console.log('✗ Parse errors:');
  parseResult.error.forEach((err) => {
    console.log(`  - ${err.message}`);
  });
}
