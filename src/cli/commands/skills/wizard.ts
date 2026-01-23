/**
 * Interactive Skill Generator Wizard
 *
 * Step-by-step interactive skill creation
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import * as readline from 'readline';
import { formatError } from '../../utils/output';

interface WizardAnswers {
  name: string;
  template: 'language' | 'framework' | 'tool' | 'domain' | 'basic';
  description: string;
  category: string;
  complexity: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  tools: string[];
  includeExamples: boolean;
  exampleCount: number;
  author?: string;
  license?: string;
  version: string;
}

/**
 * Interactive skill creation wizard
 */
export async function skillWizardCommand(): Promise<void> {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   PCL Skill Generator Wizard                      ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  };

  try {
    // Step 1: Skill Name
    console.log('Step 1: Skill Name');
    console.log('───────────────────────────────────────────────────');
    let name = '';
    while (!name) {
      name = await question('Skill name (lowercase, hyphens allowed): ');
      const namePattern = /^[a-z][a-z0-9-]*$/;
      if (!namePattern.test(name)) {
        console.log('❌ Invalid name. Must start with lowercase letter and contain only lowercase letters, numbers, and hyphens.');
        name = '';
      }
    }

    // Step 2: Template Selection
    console.log('\nStep 2: Template Selection');
    console.log('───────────────────────────────────────────────────');
    console.log('Available templates:');
    console.log('  1. language    - Programming language expertise');
    console.log('  2. framework   - Framework development');
    console.log('  3. tool        - Tool usage and best practices');
    console.log('  4. domain      - Domain-specific knowledge');
    console.log('  5. basic       - General-purpose skill');

    let template: WizardAnswers['template'] = 'basic';
    const templateChoice = await question('Choose template (1-5) [5]: ');
    switch (templateChoice || '5') {
      case '1': template = 'language'; break;
      case '2': template = 'framework'; break;
      case '3': template = 'tool'; break;
      case '4': template = 'domain'; break;
      default: template = 'basic'; break;
    }

    // Step 3: Description
    console.log('\nStep 3: Description');
    console.log('───────────────────────────────────────────────────');
    const description = await question('Brief description: ') || `${name} skill`;

    // Step 4: Category
    console.log('\nStep 4: Category');
    console.log('───────────────────────────────────────────────────');
    console.log('Common categories:');
    console.log('  - language, framework, devops, domain, data');
    console.log('  - security, qa, api, cloud, ai, tools');
    const category = await question('Category [general]: ') || 'general';

    // Step 5: Complexity
    console.log('\nStep 5: Complexity Level');
    console.log('───────────────────────────────────────────────────');
    console.log('  1. beginner      - Basic concepts');
    console.log('  2. intermediate  - Moderate knowledge');
    console.log('  3. advanced      - Advanced expertise');
    console.log('  4. expert        - Specialized knowledge');

    let complexity: WizardAnswers['complexity'] = 'intermediate';
    const complexityChoice = await question('Choose complexity (1-4) [2]: ');
    switch (complexityChoice || '2') {
      case '1': complexity = 'beginner'; break;
      case '2': complexity = 'intermediate'; break;
      case '3': complexity = 'advanced'; break;
      case '4': complexity = 'expert'; break;
    }

    // Step 6: Tools
    console.log('\nStep 6: Required Tools');
    console.log('───────────────────────────────────────────────────');
    console.log('Common tools: Read, Write, Edit, Bash, Grep, WebSearch');
    const toolsInput = await question('Tools (comma-separated) [Read,Write]: ') || 'Read,Write';
    const tools = toolsInput.split(',').map(t => t.trim()).filter(t => t);

    // Step 7: Examples
    console.log('\nStep 7: Examples');
    console.log('───────────────────────────────────────────────────');
    const includeExamplesInput = await question('Include example templates? (y/n) [y]: ');
    const includeExamples = includeExamplesInput.toLowerCase() !== 'n';

    let exampleCount = 2;
    if (includeExamples) {
      const countInput = await question('Number of examples (1-5) [2]: ');
      exampleCount = Math.min(5, Math.max(1, parseInt(countInput) || 2));
    }

    // Step 8: Metadata (Optional)
    console.log('\nStep 8: Metadata (Optional)');
    console.log('───────────────────────────────────────────────────');
    const author = await question('Author name [skip]: ') || undefined;
    const license = await question('License [MIT]: ') || 'MIT';
    const version = await question('Version [1.0.0]: ') || '1.0.0';

    // Summary
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   Summary                                          ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    console.log(`  Name:        ${name}`);
    console.log(`  Template:    ${template}`);
    console.log(`  Description: ${description}`);
    console.log(`  Category:    ${category}`);
    console.log(`  Complexity:  ${complexity}`);
    console.log(`  Tools:       ${tools.join(', ')}`);
    console.log(`  Examples:    ${includeExamples ? exampleCount : 0}`);
    if (author) console.log(`  Author:      ${author}`);
    console.log(`  License:     ${license}`);
    console.log(`  Version:     ${version}`);

    const confirm = await question('\nCreate this skill? (y/n) [y]: ');
    if (confirm.toLowerCase() === 'n') {
      console.log('\n❌ Cancelled');
      rl.close();
      return;
    }

    // Generate skill content
    const content = generateSkillContent({
      name,
      template,
      description,
      category,
      complexity,
      tools,
      includeExamples,
      exampleCount,
      author,
      license,
      version,
    });

    // Ensure directory exists
    const skillsDir = join(process.cwd(), '.claude', 'skills');
    if (!existsSync(skillsDir)) {
      await mkdir(skillsDir, { recursive: true });
    }

    // Write file
    const filePath = join(skillsDir, `${name}.md`);
    await writeFile(filePath, content, 'utf-8');

    console.log('\n✓ Skill created successfully!');
    console.log(`  File: ${filePath}`);
    console.log('\nNext steps:');
    console.log(`  1. Edit: ${filePath}`);
    console.log(`  2. Validate: pcl skill validate ${filePath}`);
    console.log(`  3. Test: pcl skill test ${filePath}`);
    console.log(`  4. Publish: pcl skill publish ${filePath}`);

  } catch (error) {
    console.error(
      formatError(
        `Wizard error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  } finally {
    rl.close();
  }
}

/**
 * Generate skill content based on wizard answers
 */
function generateSkillContent(answers: WizardAnswers): string {
  const {
    name,
    template,
    description,
    category,
    complexity,
    tools,
    includeExamples,
    exampleCount,
    author,
    license,
    version,
  } = answers;

  const titleCase = name.split('-').map(w =>
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');

  // Build YAML frontmatter
  let frontmatter = `---
name: ${name}
description: ${description}
category: ${category}
complexity: ${complexity}
version: ${version}
license: ${license}
allowed-tools:
${tools.map(t => `  - ${t}`).join('\n')}
user-invocable: true`;

  if (author) {
    frontmatter += `\nauthor: ${author}`;
  }

  frontmatter += '\n---\n\n';

  // Template-specific content
  let content = '';

  switch (template) {
    case 'language':
      content = generateLanguageContent(titleCase, name);
      break;
    case 'framework':
      content = generateFrameworkContent(titleCase, name);
      break;
    case 'tool':
      content = generateToolContent(titleCase, name);
      break;
    case 'domain':
      content = generateDomainContent(titleCase, name);
      break;
    default:
      content = generateBasicContent(titleCase, name);
      break;
  }

  // Add examples if requested
  if (includeExamples) {
    content += '\n\n## Examples\n\n';
    for (let i = 1; i <= exampleCount; i++) {
      content += `### Example ${i}: [TODO: Add description]\n\n\`\`\`\n// TODO: Add example code\n\`\`\`\n\n`;
    }
  }

  return frontmatter + content;
}

function generateBasicContent(title: string, name: string): string {
  return `# ${title}

## Overview

[TODO: Provide an overview of ${name}]

## Core Concepts

1. **Concept 1**: [TODO: Describe]
2. **Concept 2**: [TODO: Describe]
3. **Concept 3**: [TODO: Describe]

## Instructions

When working with ${name}:

1. **Step 1**: [TODO: Describe action]
2. **Step 2**: [TODO: Describe action]
3. **Step 3**: [TODO: Describe action]

## Best Practices

- [TODO: Best practice 1]
- [TODO: Best practice 2]
- [TODO: Best practice 3]

## Common Patterns

### Pattern 1

[TODO: Describe pattern]

### Pattern 2

[TODO: Describe pattern]

## Resources

- [Documentation](https://example.com)
- [Tutorial](https://example.com)`;
}

function generateLanguageContent(title: string, name: string): string {
  return `# ${title} Expert

Expert ${name} programming with modern best practices.

## Language Features

### Core Concepts

1. **Syntax**: [TODO: Core syntax features]
2. **Type System**: [TODO: Type system details]
3. **Memory Management**: [TODO: How memory works]

### Modern Features

- [TODO: Feature 1]
- [TODO: Feature 2]
- [TODO: Feature 3]

## Coding Standards

Follow official ${name} style guides and best practices.

## Common Tasks

[TODO: Add common development tasks]

## Performance

[TODO: Performance optimization tips]

## Resources

- [Official Docs](https://example.com)`;
}

function generateFrameworkContent(title: string, name: string): string {
  return `# ${title} Framework Expert

Modern ${name} framework development.

## Framework Overview

[TODO: Framework architecture and principles]

## Project Setup

[TODO: Setup instructions]

## Core Features

[TODO: Key framework features]

## Best Practices

[TODO: Framework-specific best practices]

## Resources

- [Framework Docs](https://example.com)`;
}

function generateToolContent(title: string, name: string): string {
  return `# ${title} Tool Expert

Comprehensive ${name} tool usage.

## Tool Overview

[TODO: What is ${name} and its purpose]

## Installation

[TODO: Installation steps]

## Basic Usage

[TODO: Common commands and usage]

## Advanced Features

[TODO: Advanced capabilities]

## Resources

- [Tool Documentation](https://example.com)`;
}

function generateDomainContent(title: string, name: string): string {
  return `# ${title} Domain Expert

Specialized expertise in ${name}.

## Domain Overview

[TODO: Industry context and importance]

## Key Concepts

[TODO: Fundamental domain concepts]

## Best Practices

[TODO: Domain-specific best practices]

## Common Scenarios

[TODO: Typical use cases and solutions]

## Resources

- [Industry Standards](https://example.com)`;
}
