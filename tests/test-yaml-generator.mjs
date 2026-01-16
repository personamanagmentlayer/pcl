#!/usr/bin/env node

/**
 * Test YAML code generation
 */

import { parse, generate } from '../dist/index.js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('  PCL - YAML Generator Test');
console.log('═══════════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;

function test(name, code, validator) {
  try {
    // Parse the code
    const parseResult = parse(code);
    if (!parseResult.ok) {
      console.log(`✗ ${name}`);
      console.log(`  Parse error:`, parseResult.error);
      console.log('');
      failed++;
      return;
    }

    // Generate YAML
    const yaml = generate(parseResult.value.program, { target: 'yaml' });

    // Validate
    const validationResult = validator(yaml);
    if (validationResult === true) {
      console.log(`✓ ${name}`);
      passed++;
    } else {
      console.log(`✗ ${name}`);
      console.log(`  Validation failed: ${validationResult}`);
      console.log(`  Generated YAML:`);
      console.log(yaml.split('\n').map(l => `    ${l}`).join('\n'));
      failed++;
    }
    console.log('');
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Exception: ${err.message}`);
    console.log('');
    failed++;
  }
}

// Test 1: Basic persona
test(
  'Basic persona YAML generation',
  `
  persona Assistant {
    intent = "Help users with tasks"
    maxTokens = 4096
  }
  `,
  (yaml) => {
    if (!yaml.includes('version: "1.0.0"')) return 'Missing version';
    if (!yaml.includes('personas:')) return 'Missing personas section';
    if (!yaml.includes('Assistant:')) return 'Missing persona name';
    if (!yaml.includes('intent: Help users with tasks')) return 'Missing intent';
    if (!yaml.includes('maxTokens: 4096')) return 'Missing maxTokens';
    return true;
  }
);

// Test 2: Persona with skills
test(
  'Persona with skills',
  `
  persona Developer {
    intent = "Write code"
    skills {
      "TypeScript"
      "JavaScript"
      "Python"
    }
  }
  `,
  (yaml) => {
    if (!yaml.includes('skills:')) return 'Missing skills section';
    if (!yaml.includes('- TypeScript')) return 'Missing TypeScript skill';
    if (!yaml.includes('- JavaScript')) return 'Missing JavaScript skill';
    if (!yaml.includes('- Python')) return 'Missing Python skill';
    return true;
  }
);

// Test 3: Persona with constraints
test(
  'Persona with constraints',
  `
  persona SecurityExpert {
    constraints {
      "Always assume breach"
      "Apply least privilege"
    }
  }
  `,
  (yaml) => {
    if (!yaml.includes('constraints:')) return 'Missing constraints section';
    if (!yaml.includes('- Always assume breach')) return 'Missing first constraint';
    if (!yaml.includes('- Apply least privilege')) return 'Missing second constraint';
    return true;
  }
);

// Test 4: Multiple personas
test(
  'Multiple personas',
  `
  persona Lead {
    intent = "Lead the team"
  }
  persona Dev {
    intent = "Write code"
  }
  `,
  (yaml) => {
    if (!yaml.includes('Lead:')) return 'Missing Lead persona';
    if (!yaml.includes('Dev:')) return 'Missing Dev persona';
    if (!yaml.includes('intent: Lead the team')) return 'Missing Lead intent';
    if (!yaml.includes('intent: Write code')) return 'Missing Dev intent';
    return true;
  }
);

// Test 5: Persona with multiple properties
test(
  'Persona with multiple properties',
  `
  persona Assistant {
    intent = "Help users"
    maxTokens = 4096
    temperature = 0.7
    model = "claude-3-sonnet"
  }
  `,
  (yaml) => {
    if (!yaml.includes('intent: Help users')) return 'Missing intent';
    if (!yaml.includes('maxTokens: 4096')) return 'Missing maxTokens';
    if (!yaml.includes('temperature: 0.7')) return 'Missing temperature';
    if (!yaml.includes('model: claude-3-sonnet')) return 'Missing model';
    return true;
  }
);

// Test 6: Persona with tags
test(
  'Persona with tags',
  `
  persona Developer {
    tags {
      "backend"
      "api"
      security
    }
  }
  `,
  (yaml) => {
    if (!yaml.includes('tags:')) return 'Missing tags section';
    if (!yaml.includes('- backend')) return 'Missing backend tag';
    if (!yaml.includes('- api')) return 'Missing api tag';
    if (!yaml.includes('- security')) return 'Missing security tag';
    return true;
  }
);

// Test 7: Complex persona with extends
test(
  'Persona with inheritance',
  `
  persona Base {}
  persona Derived extends Base {
    intent = "Extended functionality"
  }
  `,
  (yaml) => {
    if (!yaml.includes('extends:')) return 'Missing extends';
    if (!yaml.includes('- Base')) return 'Missing Base in extends';
    return true;
  }
);

// Test 8: String escaping
test(
  'String with special characters',
  `
  persona Test {
    intent = "Use: special #characters"
  }
  `,
  (yaml) => {
    // Should escape strings with colons
    if (!yaml.includes('"Use: special #characters"')) return 'String not properly escaped';
    return true;
  }
);

console.log('═══════════════════════════════════════════════════════════════');
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log('═══════════════════════════════════════════════════════════════\n');

if (failed === 0) {
  console.log('🎉 All YAML generator tests passed!\n');
  process.exit(0);
} else {
  console.log('❌ Some YAML generator tests failed.\n');
  process.exit(1);
}
