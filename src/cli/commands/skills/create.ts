/**
 * Skill Create CLI Command
 *
 * Create new skills from templates
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import { formatError } from '../../utils/output';

export interface SkillCreateOptions {
  template?: 'language' | 'framework' | 'tool' | 'domain' | 'basic';
  description?: string;
  category?: string;
  tools?: string;
  complexity?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  author?: string;
  output?: string;
}

/**
 * Skill templates
 */
const templates = {
  basic: (name: string, options: SkillCreateOptions) => `---
name: ${name}
description: ${options.description || `${name} skill`}
category: ${options.category || 'general'}
complexity: ${options.complexity || 'intermediate'}
allowed-tools:${options.tools ? '\n' + options.tools.split(',').map(t => `  - ${t.trim()}`).join('\n') : '\n  - Read\n  - Write'}
user-invocable: true
---

# ${name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}

${options.description || 'A comprehensive guide for ' + name + '.'}

## Core Concepts

### Key Principles

1. **Principle 1**: Description
2. **Principle 2**: Description
3. **Principle 3**: Description

### Best Practices

- Best practice 1
- Best practice 2
- Best practice 3

## Instructions

When working with ${name}, follow these guidelines:

1. **Step 1**: Action to take
2. **Step 2**: Action to take
3. **Step 3**: Action to take

### Important Considerations

- Consideration 1
- Consideration 2
- Consideration 3

## Examples

### Example 1: Basic Usage

\`\`\`
// Example code here
\`\`\`

### Example 2: Advanced Usage

\`\`\`
// Example code here
\`\`\`

## Common Patterns

### Pattern 1

Description of pattern 1.

\`\`\`
// Code example
\`\`\`

### Pattern 2

Description of pattern 2.

\`\`\`
// Code example
\`\`\`

## Anti-Patterns

### Anti-Pattern 1

**Problem**: Description of what not to do.

**Solution**: Better approach.

### Anti-Pattern 2

**Problem**: Description of what not to do.

**Solution**: Better approach.

## Troubleshooting

### Issue 1

**Symptoms**: Description of the issue.

**Solution**: How to resolve it.

### Issue 2

**Symptoms**: Description of the issue.

**Solution**: How to resolve it.

## Resources

- [Resource 1](https://example.com)
- [Resource 2](https://example.com)
- [Resource 3](https://example.com)
`,

  language: (name: string, options: SkillCreateOptions) => `---
name: ${name}
description: ${options.description || `Expert ${name} programming`}
category: language
complexity: ${options.complexity || 'advanced'}
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
user-invocable: true
---

# ${name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Expert

Expert programming in ${name} with modern best practices.

## Language Features

### Core Language Concepts

1. **Syntax & Semantics**: Core language syntax
2. **Type System**: Static vs dynamic typing
3. **Memory Management**: How memory is handled
4. **Concurrency**: Threading, async/await patterns

### Modern Features

- Feature 1
- Feature 2
- Feature 3

## Coding Standards

### Style Guide

Follow the official ${name} style guide:

1. **Naming Conventions**: camelCase, snake_case, etc.
2. **Formatting**: Indentation, line length, spacing
3. **Comments**: When and how to comment code
4. **Documentation**: Doc strings and type hints

### Best Practices

- Use meaningful variable names
- Keep functions small and focused
- Follow DRY (Don't Repeat Yourself)
- Write testable code
- Handle errors gracefully

## Common Tasks

### Task 1: Project Setup

\`\`\`bash
# Initialize project
# Install dependencies
# Configure tooling
\`\`\`

### Task 2: Development Workflow

\`\`\`
// Write code
// Run tests
// Debug issues
\`\`\`

## Testing

### Unit Testing

\`\`\`
// Unit test example
\`\`\`

### Integration Testing

\`\`\`
// Integration test example
\`\`\`

## Performance Optimization

### Profiling

How to profile ${name} code:

\`\`\`
// Profiling example
\`\`\`

### Optimization Techniques

1. **Technique 1**: Description
2. **Technique 2**: Description
3. **Technique 3**: Description

## Common Pitfalls

### Pitfall 1: Issue Description

**Problem**: What goes wrong.

**Solution**: How to avoid it.

### Pitfall 2: Issue Description

**Problem**: What goes wrong.

**Solution**: How to avoid it.

## Resources

- [Official Documentation](https://example.com)
- [Style Guide](https://example.com)
- [Best Practices](https://example.com)
- [Community Forum](https://example.com)
`,

  framework: (name: string, options: SkillCreateOptions) => `---
name: ${name}
description: ${options.description || `Expert ${name} framework development`}
category: framework
complexity: ${options.complexity || 'intermediate'}
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
user-invocable: true
---

# ${name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Framework Expert

Comprehensive ${name} framework development with modern patterns.

## Framework Overview

### Architecture

The ${name} framework follows these architectural principles:

1. **Component-Based**: Modular, reusable components
2. **Data Flow**: Unidirectional data flow pattern
3. **State Management**: Centralized state management
4. **Routing**: Client-side routing

### Core Concepts

- Concept 1
- Concept 2
- Concept 3

## Project Setup

### Installation

\`\`\`bash
# Create new project
# Install dependencies
# Configure framework
\`\`\`

### Project Structure

\`\`\`
project/
├── src/
│   ├── components/
│   ├── pages/
│   ├── utils/
│   └── app.js
├── tests/
└── config/
\`\`\`

## Component Development

### Creating Components

\`\`\`javascript
// Component example
\`\`\`

### Component Patterns

1. **Pattern 1**: Description
2. **Pattern 2**: Description
3. **Pattern 3**: Description

## State Management

### Managing State

\`\`\`javascript
// State management example
\`\`\`

### Best Practices

- Keep state minimal
- Use immutable updates
- Separate concerns
- Handle side effects properly

## Routing

### Route Configuration

\`\`\`javascript
// Routing example
\`\`\`

### Navigation

How to handle navigation in ${name}.

## Testing

### Component Testing

\`\`\`javascript
// Component test example
\`\`\`

### Integration Testing

\`\`\`javascript
// Integration test example
\`\`\`

## Performance Optimization

### Code Splitting

\`\`\`javascript
// Code splitting example
\`\`\`

### Lazy Loading

\`\`\`javascript
// Lazy loading example
\`\`\`

## Common Issues

### Issue 1

**Problem**: Description.

**Solution**: Resolution.

### Issue 2

**Problem**: Description.

**Solution**: Resolution.

## Resources

- [Official Documentation](https://example.com)
- [Tutorials](https://example.com)
- [Community](https://example.com)
`,

  tool: (name: string, options: SkillCreateOptions) => `---
name: ${name}
description: ${options.description || `Expert ${name} tool usage`}
category: tools
complexity: ${options.complexity || 'intermediate'}
allowed-tools:
  - Read
  - Write
  - Bash
user-invocable: true
---

# ${name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Tool Expert

Comprehensive guide to ${name} tool usage and best practices.

## Tool Overview

### What is ${name}?

${name} is a tool for [purpose]. It helps developers [benefit].

### Key Features

- Feature 1
- Feature 2
- Feature 3

## Installation

### Prerequisites

- Prerequisite 1
- Prerequisite 2

### Setup

\`\`\`bash
# Installation commands
\`\`\`

## Basic Usage

### Getting Started

\`\`\`bash
# Basic command
\`\`\`

### Common Commands

\`\`\`bash
# Command 1
# Command 2
# Command 3
\`\`\`

## Advanced Features

### Feature 1

\`\`\`bash
# Advanced usage example
\`\`\`

### Feature 2

\`\`\`bash
# Advanced usage example
\`\`\`

## Configuration

### Configuration File

\`\`\`yaml
# Configuration example
\`\`\`

### Environment Variables

- VAR1: Description
- VAR2: Description

## Integration

### With Other Tools

How to integrate ${name} with:

1. **Tool A**: Description
2. **Tool B**: Description
3. **Tool C**: Description

## Troubleshooting

### Common Issues

**Issue 1**: Description

**Solution**: Resolution

**Issue 2**: Description

**Solution**: Resolution

## Resources

- [Official Documentation](https://example.com)
- [GitHub Repository](https://example.com)
- [Tutorials](https://example.com)
`,

  domain: (name: string, options: SkillCreateOptions) => `---
name: ${name}
description: ${options.description || `Expert ${name} domain knowledge`}
category: domain
complexity: ${options.complexity || 'expert'}
allowed-tools:
  - Read
  - Write
user-invocable: true
---

# ${name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Domain Expert

Specialized knowledge and best practices for ${name} domain.

## Domain Overview

### Industry Context

The ${name} domain involves [description].

### Key Concepts

1. **Concept 1**: Definition and importance
2. **Concept 2**: Definition and importance
3. **Concept 3**: Definition and importance

## Domain Knowledge

### Fundamental Principles

- Principle 1
- Principle 2
- Principle 3

### Regulations & Compliance

- Regulation 1
- Regulation 2
- Regulation 3

## Common Scenarios

### Scenario 1

**Context**: Situation description.

**Approach**: How to handle it.

**Example**: Concrete example.

### Scenario 2

**Context**: Situation description.

**Approach**: How to handle it.

**Example**: Concrete example.

## Best Practices

### Practice 1

Description and rationale.

### Practice 2

Description and rationale.

### Practice 3

Description and rationale.

## Common Challenges

### Challenge 1

**Problem**: Description.

**Solution**: Approach to solve it.

### Challenge 2

**Problem**: Description.

**Solution**: Approach to solve it.

## Tools & Resources

### Recommended Tools

- Tool 1: Purpose
- Tool 2: Purpose
- Tool 3: Purpose

### Learning Resources

- [Resource 1](https://example.com)
- [Resource 2](https://example.com)
- [Resource 3](https://example.com)

## Industry Standards

### Standard 1

Description and application.

### Standard 2

Description and application.

## Resources

- [Official Guidelines](https://example.com)
- [Industry Documentation](https://example.com)
- [Professional Community](https://example.com)
`,
};

/**
 * Create a new skill from template
 */
export async function skillCreateCommand(
  name: string,
  options: SkillCreateOptions = {}
): Promise<void> {
  try {
    // Validate name
    const namePattern = /^[a-z][a-z0-9-]*$/;
    if (!namePattern.test(name)) {
      console.error(
        formatError(
          'Invalid skill name. Must start with lowercase letter and contain only lowercase letters, numbers, and hyphens.'
        )
      );
      process.exit(1);
    }

    // Select template
    const templateType = options.template || 'basic';
    const template = templates[templateType];

    if (!template) {
      console.error(
        formatError(
          `Unknown template: ${templateType}. Available: ${Object.keys(templates).join(', ')}`
        )
      );
      process.exit(1);
    }

    // Generate skill content
    const content = template(name, options);

    // Determine output path
    const outputPath =
      options.output || join(process.cwd(), '.claude', 'skills', `${name}.md`);

    // Write file
    await writeFile(outputPath, content, 'utf-8');

    console.log('✓ Skill created successfully!');
    console.log(`  Name: ${name}`);
    console.log(`  Template: ${templateType}`);
    console.log(`  File: ${outputPath}`);
    console.log('\nNext steps:');
    console.log(`  1. Edit the skill: ${outputPath}`);
    console.log(`  2. Validate: pcl skill validate ${outputPath}`);
    console.log(`  3. Compile: pcl skill compile ${outputPath}`);
  } catch (error) {
    console.error(
      formatError(
        `Failed to create skill: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}
