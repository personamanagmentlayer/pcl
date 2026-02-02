/**
 * PCL Language Server - Hover Documentation
 *
 * Documentation strings for properties and built-in types
 */

/**
 * Property documentation database
 */
const PROPERTY_DOCS: Record<string, string> = {
  // Common properties
  name: 'Display name of the entity.\n\nShould be human-readable and descriptive.',
  version:
    'Semantic version following [semver](https://semver.org/) format.\n\nExample: `"1.0.0"`, `"2.3.1-beta"`',

  // Metadata properties
  metadata:
    'Metadata block containing descriptive information.\n\nIncludes: `category`, `description`, `tags`, `skills`, `author`, `license`',
  category:
    'Category classification for organization and discovery.\n\nExamples: `"general"`, `"technical"`, `"domain"`',
  description:
    'Detailed description of the entity.\n\nShould explain purpose and behavior.',
  tags: 'Array of tags for search and discovery.\n\nExample: `["ai", "coding", "review"]`',
  skills:
    'List of skills associated with this entity.\n\nExample: `["Python", "JavaScript", "Code Review"]`',
  author:
    'Author name or organization.\n\nExample: `"Your Name"`, `"Acme Corp"`',
  license:
    'License identifier.\n\nExamples: `"MIT"`, `"Apache-2.0"`, `"Proprietary"`',

  // Persona properties
  config:
    'Configuration block for LLM model and parameters.\n\nRequired properties: `model`\nOptional: `temperature`, `max_tokens`, `top_p`, `top_k`, `thinking_style`, `response_format`',
  prompts:
    'Prompt templates for the persona.\n\nTypically includes: `system` (required), optionally `user` or other prompts.',
  includes:
    'Include other persona definitions or skill modules.\n\nExample: `[@pcl/skills/python-expert]`',

  // Config properties
  model:
    'LLM model identifier.\n\nExamples:\n- `"claude-sonnet-4"`\n- `"gpt-4"`\n- `"gemini-pro"`',
  temperature:
    'Temperature parameter for response randomness.\n\nRange: `0.0` (deterministic) to `1.0` (creative)\nDefault: `0.7`',
  max_tokens:
    'Maximum tokens in the response.\n\nTypical values: `1000` - `4000`',
  top_p:
    'Top-p (nucleus) sampling parameter.\n\nRange: `0.0` to `1.0`\nDefault: `0.95`',
  top_k:
    'Top-k sampling parameter.\n\nLimits vocabulary to top K tokens.\nTypical values: `40` - `100`',
  thinking_style:
    'Cognitive style for problem-solving.\n\nOptions:\n- `"analytical"` - Logical, systematic\n- `"creative"` - Innovative, exploratory\n- `"practical"` - Pragmatic, efficient\n- `"critical"` - Evaluative, questioning\n- `"strategic"` - Long-term, planned\n- `"systematic"` - Methodical, organized',
  response_format:
    'Expected format of responses.\n\nOptions:\n- `"text"` - Plain text\n- `"json"` - JSON object\n- `"markdown"` - Markdown formatted\n- `"code"` - Code snippet\n- `"structured"` - Structured data',

  // Team properties
  members:
    'Array of persona references that form the team.\n\nExample: `[DEVELOPER, REVIEWER, TESTER]`',
  primary:
    'Primary persona for decision-making.\n\nMust be one of the members.\nExample: `DEVELOPER`',
  merge:
    "Strategy for merging multiple persona responses.\n\nOptions:\n- `Primary` - Use primary persona's response\n- `Consensus` - Combine responses that agree\n- `Voting` - Majority vote\n- `Weighted` - Weighted combination\n- `FirstComplete` - First to complete",
  quorum:
    'Required number of members for consensus.\n\nFormat: `required/total`\nExample: `2/3` (2 out of 3 must agree)',
  conflict:
    'Priority order for conflict resolution.\n\nExample: `LEAD > SENIOR > JUNIOR`',

  // Workflow properties
  steps:
    'Workflow expression with personas and operators.\n\nOperators:\n- `->` Sequential\n- `||` Parallel\n- `|` Choice\n- `=>` Transform\n- `if...then...else` Conditional',
  timeout:
    'Timeout duration for the workflow.\n\nFormat: number with unit (ms, s, m, h)\nExample: `"30s"`, `"5m"`',
  retry:
    'Retry configuration for failed operations.\n\nProperties:\n- `count`: Number of retries\n- `delay`: Delay between retries\n- `backoff`: Backoff strategy (`exponential`, `linear`)',
  fallback:
    'Fallback persona if workflow fails.\n\nExample: `FALLBACK_PERSONA`',

  // Skill properties
  items:
    'List of skill items or capabilities.\n\nExample: `["Python", "TypeScript", "Code Review"]`',

  // Prompt properties
  system:
    'System prompt defining persona behavior.\n\nShould describe:\n- Role and responsibilities\n- Expertise and knowledge\n- Communication style\n- Constraints and limitations',
  user: 'User prompt template (optional).\n\nCan include placeholders for dynamic content.',
};

/**
 * Get documentation for a property
 */
export function getPropertyDocumentation(propertyName: string): string | null {
  return PROPERTY_DOCS[propertyName] || null;
}

/**
 * Get all property names
 */
export function getAllPropertyNames(): string[] {
  return Object.keys(PROPERTY_DOCS);
}

/**
 * Type documentation
 */
export const TYPE_DOCS: Record<string, string> = {
  String: 'Text string type.\n\nExamples: `"hello"`, `"world"`',
  Int: 'Integer number type.\n\nExamples: `42`, `-10`, `0`',
  Float: 'Floating-point number type.\n\nExamples: `3.14`, `-0.5`, `2.0`',
  Bool: 'Boolean type.\n\nValues: `true`, `false`',
  Array: 'Array/list type.\n\nExample: `[1, 2, 3]`, `["a", "b", "c"]`',
  Map: 'Map/dictionary type (key-value pairs).\n\nExample: `{ key1: value1, key2: value2 }`',
  Set: 'Set type (unique values).\n\nExample: `Set<String>`',
  Tuple: 'Tuple type (fixed-length array).\n\nExample: `Tuple<String, Int>`',
  Persona:
    'Persona type - AI agent with specific behavior.\n\nDefined with `persona` keyword.',
  Team: 'Team type - Collection of personas working together.\n\nDefined with `team` keyword.',
  Workflow:
    'Workflow type - Sequence of steps and transformations.\n\nDefined with `workflow` keyword.',
  Skill:
    'Skill type - Reusable capability or knowledge.\n\nDefined with `skill` keyword.',
};

/**
 * Get documentation for a type
 */
export function getTypeDocumentation(typeName: string): string | null {
  return TYPE_DOCS[typeName] || null;
}
