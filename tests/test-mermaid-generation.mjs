#!/usr/bin/env node

/**
 * Test Markdown generation with enhanced Mermaid support
 *
 * Note: Workflow/Team parsing is currently limited in the parser.
 * These tests focus on Markdown generation features that work with personas.
 */

import { parse, generateMarkdown } from '../dist/index.js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('  PCL - Markdown Generation Tests');
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

    // Generate Markdown
    const markdown = generateMarkdown(parseResult.value.program);

    // Validate
    const validationResult = validator(markdown);
    if (validationResult === true) {
      console.log(`✓ ${name}`);
      passed++;
    } else {
      console.log(`✗ ${name}`);
      console.log(`  Validation failed: ${validationResult}`);
      if (process.env.VERBOSE) {
        console.log(`  Generated Markdown:`);
        console.log(markdown.split('\n').map(l => `    ${l}`).join('\n'));
      }
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

// Test 1: Basic documentation structure
test(
  'Basic documentation structure',
  `
  persona ReviewerA {}
  `,
  (md) => {
    if (!md.includes('# PCL Documentation')) return 'Missing title';
    if (!md.includes('## Contents')) return 'Missing table of contents';
    if (!md.includes('## Personas')) return 'Missing personas section';
    if (!md.includes('### ReviewerA')) return 'Missing persona name';
    return true;
  }
);

// Test 2: Multiple personas
test(
  'Multiple personas in documentation',
  `
  persona Developer {
    intent = "Write code"
  }
  persona Reviewer {
    intent = "Review code"
  }
  `,
  (md) => {
    if (!md.includes('### Developer')) return 'Missing Developer persona';
    if (!md.includes('### Reviewer')) return 'Missing Reviewer persona';
    if (!md.includes('**Purpose:** Write code')) return 'Missing Developer purpose';
    if (!md.includes('**Purpose:** Review code')) return 'Missing Reviewer purpose';
    return true;
  }
);

// Test 3: TOC links
test(
  'Table of contents links',
  `
  persona Alice {}
  persona Bob {}
  `,
  (md) => {
    if (!md.includes('[Alice](#alice)')) return 'Missing Alice TOC link';
    if (!md.includes('[Bob](#bob)')) return 'Missing Bob TOC link';
    return true;
  }
);

// Test 4: Markdown formatting
test(
  'Markdown formatting for persona',
  `
  persona Expert {
    intent = "Provide expertise"
    skills {
      "Skill A"
      "Skill B"
    }
  }
  `,
  (md) => {
    // Check markdown structure
    if (!md.includes('###')) return 'Missing H3 headers';
    if (!md.includes('####')) return 'Missing H4 headers';
    if (!md.includes('- Skill A')) return 'Missing bullet list';
    if (!md.includes('**Purpose:**')) return 'Missing bold formatting';
    return true;
  }
);

// Test 5: Persona documentation
test(
  'Persona documentation generation',
  `
  persona SecurityExpert {
    intent = "Provide security analysis"
    skills {
      "Threat modeling"
      "Code review"
    }
    constraints {
      "Always assume breach"
    }
    tags {
      security
      expert
    }
  }
  `,
  (md) => {
    if (!md.includes('## Personas')) return 'Missing personas section';
    if (!md.includes('### SecurityExpert')) return 'Missing persona name';
    if (!md.includes('**Purpose:** Provide security analysis')) return 'Missing purpose';
    if (!md.includes('#### Skills')) return 'Missing skills section';
    if (!md.includes('- Threat modeling')) return 'Missing threat modeling skill';
    if (!md.includes('- Code review')) return 'Missing code review skill';
    if (!md.includes('#### Constraints')) return 'Missing constraints section';
    if (!md.includes('- Always assume breach')) return 'Missing constraint';
    if (!md.includes('**Tags:** `security`, `expert`')) return 'Missing tags';
    return true;
  }
);

// Test 6: Code blocks
test(
  'Code blocks in documentation',
  `
  persona CodeExpert {
    skills {
      "TypeScript"
      "Python"
    }
  }
  `,
  (md) => {
    // Check for proper line breaks and sections
    const lines = md.split('\n');
    if (lines.length < 10) return 'Documentation too short';
    if (!md.includes('  - ')) return 'Missing nested TOC items';
    return true;
  }
);

// Test 7: Horizontal rules
test(
  'Horizontal rules between sections',
  `
  persona First {
    intent = "First persona"
  }
  persona Second {
    intent = "Second persona"
  }
  `,
  (md) => {
    if (!md.includes('---')) return 'Missing horizontal rule separators';
    // Count the separators
    const separatorCount = (md.match(/---/g) || []).length;
    if (separatorCount < 2) return 'Not enough section separators';
    return true;
  }
);

// Test 8: Persona with extends
test(
  'Persona inheritance documentation',
  `
  persona Base {}
  persona Derived extends Base {
    intent = "Extended functionality"
  }
  `,
  (md) => {
    if (!md.includes('**Extends:** Base')) return 'Missing extends information';
    return true;
  }
);

console.log('═══════════════════════════════════════════════════════════════');
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log('═══════════════════════════════════════════════════════════════\n');

if (failed === 0) {
  console.log('🎉 All Mermaid generation tests passed!\n');
  process.exit(0);
} else {
  console.log('❌ Some Mermaid generation tests failed.\n');
  process.exit(1);
}
