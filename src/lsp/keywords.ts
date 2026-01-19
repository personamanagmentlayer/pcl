/**
 * PCL Language Server - Keywords Database
 *
 * Complete list of PCL keywords with documentation
 */

import { PCLKeyword, PCLKeywordCategory } from './completion-types';

/**
 * All PCL keywords
 */
export const PCL_KEYWORDS: PCLKeyword[] = [
  // Declaration keywords
  {
    keyword: 'persona',
    category: PCLKeywordCategory.Declaration,
    documentation: 'Define a persona (AI agent with specific behavior and configuration)',
    detail: 'Declaration',
  },
  {
    keyword: 'team',
    category: PCLKeywordCategory.Declaration,
    documentation: 'Define a team (collection of personas working together)',
    detail: 'Declaration',
  },
  {
    keyword: 'workflow',
    category: PCLKeywordCategory.Declaration,
    documentation: 'Define a workflow (sequence of steps and transformations)',
    detail: 'Declaration',
  },
  {
    keyword: 'skill',
    category: PCLKeywordCategory.Declaration,
    documentation: 'Define a skill (reusable capability or knowledge)',
    detail: 'Declaration',
  },
  {
    keyword: 'type',
    category: PCLKeywordCategory.Declaration,
    documentation: 'Define a custom type alias',
    detail: 'Declaration',
  },
  {
    keyword: 'const',
    category: PCLKeywordCategory.Declaration,
    documentation: 'Define a constant value',
    detail: 'Declaration',
  },
  {
    keyword: 'import',
    category: PCLKeywordCategory.Declaration,
    documentation: 'Import declarations from another file',
    detail: 'Declaration',
  },
  {
    keyword: 'export',
    category: PCLKeywordCategory.Declaration,
    documentation: 'Export declarations for use in other files',
    detail: 'Declaration',
  },

  // Visibility keywords
  {
    keyword: 'pub',
    category: PCLKeywordCategory.Visibility,
    documentation: 'Make a declaration public (accessible from outside)',
    detail: 'Visibility modifier',
  },
  {
    keyword: 'priv',
    category: PCLKeywordCategory.Visibility,
    documentation: 'Make a declaration private (internal use only)',
    detail: 'Visibility modifier',
  },

  // Type keywords
  {
    keyword: 'String',
    category: PCLKeywordCategory.Type,
    documentation: 'Text string type',
    detail: 'Primitive type',
  },
  {
    keyword: 'Int',
    category: PCLKeywordCategory.Type,
    documentation: 'Integer number type',
    detail: 'Primitive type',
  },
  {
    keyword: 'Float',
    category: PCLKeywordCategory.Type,
    documentation: 'Floating-point number type',
    detail: 'Primitive type',
  },
  {
    keyword: 'Bool',
    category: PCLKeywordCategory.Type,
    documentation: 'Boolean type (true or false)',
    detail: 'Primitive type',
  },
  {
    keyword: 'Array',
    category: PCLKeywordCategory.Type,
    documentation: 'Array/list type',
    detail: 'Collection type',
  },
  {
    keyword: 'Map',
    category: PCLKeywordCategory.Type,
    documentation: 'Map/dictionary type (key-value pairs)',
    detail: 'Collection type',
  },
  {
    keyword: 'Set',
    category: PCLKeywordCategory.Type,
    documentation: 'Set type (unique values)',
    detail: 'Collection type',
  },
  {
    keyword: 'Tuple',
    category: PCLKeywordCategory.Type,
    documentation: 'Tuple type (fixed-length array)',
    detail: 'Collection type',
  },

  // Workflow keywords
  {
    keyword: 'if',
    category: PCLKeywordCategory.Workflow,
    documentation: 'Conditional workflow expression',
    detail: 'Workflow control',
  },
  {
    keyword: 'then',
    category: PCLKeywordCategory.Workflow,
    documentation: 'Then branch of conditional',
    detail: 'Workflow control',
  },
  {
    keyword: 'else',
    category: PCLKeywordCategory.Workflow,
    documentation: 'Else branch of conditional',
    detail: 'Workflow control',
  },
  {
    keyword: 'loop',
    category: PCLKeywordCategory.Workflow,
    documentation: 'Loop workflow expression',
    detail: 'Workflow control',
  },

  // Control keywords
  {
    keyword: 'true',
    category: PCLKeywordCategory.Control,
    documentation: 'Boolean true value',
    detail: 'Boolean literal',
  },
  {
    keyword: 'false',
    category: PCLKeywordCategory.Control,
    documentation: 'Boolean false value',
    detail: 'Boolean literal',
  },
  {
    keyword: 'null',
    category: PCLKeywordCategory.Control,
    documentation: 'Null value',
    detail: 'Special value',
  },
];

/**
 * Property keywords for different declaration types
 */
export const PERSONA_PROPERTIES: string[] = [
  'name',
  'version',
  'metadata',
  'config',
  'prompts',
  'skills',
  'includes',
];

export const TEAM_PROPERTIES: string[] = [
  'name',
  'version',
  'metadata',
  'members',
  'primary',
  'merge',
  'quorum',
  'conflict',
];

export const WORKFLOW_PROPERTIES: string[] = [
  'name',
  'version',
  'metadata',
  'steps',
  'timeout',
  'retry',
  'fallback',
];

export const SKILL_PROPERTIES: string[] = [
  'name',
  'version',
  'category',
  'items',
  'description',
];

export const CONFIG_PROPERTIES: string[] = [
  'model',
  'temperature',
  'max_tokens',
  'top_p',
  'top_k',
  'thinking_style',
  'response_format',
];

export const METADATA_PROPERTIES: string[] = [
  'category',
  'description',
  'tags',
  'skills',
  'author',
  'license',
];

/**
 * Merge strategies for teams
 */
export const MERGE_STRATEGIES: string[] = [
  'Primary',
  'Consensus',
  'Voting',
  'Weighted',
  'FirstComplete',
];

/**
 * Common model names
 */
export const MODEL_NAMES: string[] = [
  'claude-sonnet-4',
  'claude-sonnet-3.5',
  'claude-opus-4',
  'gpt-4',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'gemini-pro',
  'gemini-ultra',
];

/**
 * Thinking styles
 */
export const THINKING_STYLES: string[] = [
  'analytical',
  'creative',
  'practical',
  'critical',
  'strategic',
  'systematic',
];

/**
 * Response formats
 */
export const RESPONSE_FORMATS: string[] = [
  'text',
  'json',
  'markdown',
  'code',
  'structured',
];

/**
 * Get properties for declaration type
 */
export function getPropertiesForType(declarationType: string): string[] {
  switch (declarationType.toLowerCase()) {
    case 'persona':
      return PERSONA_PROPERTIES;
    case 'team':
      return TEAM_PROPERTIES;
    case 'workflow':
      return WORKFLOW_PROPERTIES;
    case 'skill':
      return SKILL_PROPERTIES;
    case 'config':
      return CONFIG_PROPERTIES;
    case 'metadata':
      return METADATA_PROPERTIES;
    default:
      return [];
  }
}
