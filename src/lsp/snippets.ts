/**
 * PCL Language Server - Code Snippets
 *
 * Snippet templates for common PCL patterns
 */

import { SnippetDefinition } from './completion-types';

/**
 * All PCL snippets
 */
export const PCL_SNIPPETS: SnippetDefinition[] = [
  // Persona snippets
  {
    label: 'persona',
    detail: 'Create a new persona',
    documentation: 'Basic persona declaration with common properties',
    snippet: `persona \${1:PERSONA_NAME} {
  name: "\${2:Display Name}"
  version: "\${3:1.0.0}"

  metadata: {
    category: "\${4:general}"
    description: "\${5:Description of the persona}"
  }

  config: {
    model: "\${6:claude-sonnet-4}"
    temperature: \${7:0.7}
  }

  prompts: {
    system: """
    \${8:System prompt describing the persona's role and behavior}
    """
  }
}`,
    contexts: ['global'],
    sortPriority: 1,
  },

  {
    label: 'persona-minimal',
    detail: 'Create a minimal persona',
    documentation: 'Minimal persona with only required fields',
    snippet: `persona \${1:PERSONA_NAME} {
  config: {
    model: "\${2:claude-sonnet-4}"
  }

  prompts: {
    system: """
    \${3:System prompt}
    """
  }
}`,
    contexts: ['global'],
    sortPriority: 2,
  },

  // Team snippets
  {
    label: 'team',
    detail: 'Create a new team',
    documentation: 'Team declaration with multiple personas',
    snippet: `team \${1:TEAM_NAME} {
  name: "\${2:Team Display Name}"
  version: "\${3:1.0.0}"

  members: [\${4:PERSONA1}, \${5:PERSONA2}]
  primary: \${6:PERSONA1}

  merge: \${7:Primary}
}`,
    contexts: ['global'],
    sortPriority: 3,
  },

  {
    label: 'team-consensus',
    detail: 'Create a consensus-based team',
    documentation: 'Team using consensus merge strategy',
    snippet: `team \${1:TEAM_NAME} {
  name: "\${2:Team Display Name}"

  members: [\${3:PERSONA1}, \${4:PERSONA2}, \${5:PERSONA3}]

  merge: Consensus
  quorum: \${6:2}/\${7:3}
}`,
    contexts: ['global'],
    sortPriority: 4,
  },

  // Workflow snippets
  {
    label: 'workflow',
    detail: 'Create a new workflow',
    documentation: 'Sequential workflow declaration',
    snippet: `workflow \${1:WORKFLOW_NAME} {
  name: "\${2:Workflow Display Name}"
  version: "\${3:1.0.0}"

  steps: \${4:PERSONA1} -> \${5:PERSONA2}
}`,
    contexts: ['global'],
    sortPriority: 5,
  },

  {
    label: 'workflow-parallel',
    detail: 'Create a parallel workflow',
    documentation: 'Workflow with parallel execution',
    snippet: `workflow \${1:WORKFLOW_NAME} {
  name: "\${2:Workflow Display Name}"

  steps: \${3:PERSONA1} || \${4:PERSONA2} || \${5:PERSONA3}
}`,
    contexts: ['global'],
    sortPriority: 6,
  },

  {
    label: 'workflow-conditional',
    detail: 'Create a conditional workflow',
    documentation: 'Workflow with conditional branching',
    snippet: `workflow \${1:WORKFLOW_NAME} {
  name: "\${2:Workflow Display Name}"

  steps: if \${3:condition} then \${4:PERSONA1} else \${5:PERSONA2}
}`,
    contexts: ['global'],
    sortPriority: 7,
  },

  // Skill snippets
  {
    label: 'skill',
    detail: 'Create a new skill',
    documentation: 'Skill declaration with items',
    snippet: `skill \${1:SKILL_NAME} {
  category: "\${2:Technical}"
  items: [
    "\${3:skill-item-1}",
    "\${4:skill-item-2}"
  ]
}`,
    contexts: ['global'],
    sortPriority: 8,
  },

  // Property snippets
  {
    label: 'config',
    detail: 'Add config block',
    documentation: 'Configuration with model and parameters',
    snippet: `config: {
  model: "\${1:claude-sonnet-4}"
  temperature: \${2:0.7}
  max_tokens: \${3:2000}
}`,
    contexts: ['persona'],
    sortPriority: 10,
  },

  {
    label: 'metadata',
    detail: 'Add metadata block',
    documentation: 'Metadata with category and description',
    snippet: `metadata: {
  category: "\${1:general}"
  description: "\${2:Description}"
  tags: [\${3:"tag1", "tag2"}]
}`,
    contexts: ['persona', 'team', 'workflow'],
    sortPriority: 11,
  },

  {
    label: 'prompts',
    detail: 'Add prompts block',
    documentation: 'System and user prompts',
    snippet: `prompts: {
  system: """
  \${1:System prompt describing behavior}
  """
}`,
    contexts: ['persona'],
    sortPriority: 12,
  },

  // Import/Export snippets
  {
    label: 'import',
    detail: 'Import from another file',
    documentation: 'Import declarations from another PCL file',
    snippet: `import { \${1:PERSONA} } from "\${2:./file.pcl}"`,
    contexts: ['global'],
    sortPriority: 20,
  },

  {
    label: 'export',
    detail: 'Export declarations',
    documentation: 'Export declarations for use in other files',
    snippet: `export { \${1:PERSONA} }`,
    contexts: ['global'],
    sortPriority: 21,
  },

  // Comment snippets
  {
    label: 'comment-block',
    detail: 'Add a block comment',
    documentation: 'Multi-line comment block',
    snippet: `/**
 * \${1:Description}
 */`,
    contexts: ['global'],
    sortPriority: 30,
  },
];

/**
 * Get snippets applicable in the current context
 */
export function getSnippetsForContext(context: string): SnippetDefinition[] {
  return PCL_SNIPPETS.filter(
    (snippet) =>
      !snippet.contexts || snippet.contexts.includes(context) || snippet.contexts.includes('global')
  ).sort((a, b) => (a.sortPriority || 100) - (b.sortPriority || 100));
}
