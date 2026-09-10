/**
 * Skill Loader - Import/Export Claude Code SKILL.md format
 *
 * Provides bidirectional conversion between:
 * - Claude Code SKILL.md (YAML frontmatter + Markdown)
 * - PCL internal skill representation
 */

import { parse as parseYAML } from 'yaml';

/**
 * Skill metadata from YAML frontmatter
 * Supports both Claude Code and Agent Skills specifications
 */
export interface SkillMetadata {
  // Required fields (both specs)
  name: string;
  description: string;

  // Agent Skills spec
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  'allowed-tools'?: string | string[]; // Space-delimited or array

  // Claude Code specific
  model?: string;
  context?: 'fork';
  agent?: string;
  hooks?: Record<string, string>;
  'user-invocable'?: boolean;

  // PCL specific
  dependencies?: string | string[]; // Comma-delimited or array
  conflicts?: string | string[]; // Comma-delimited or array
  version?: string;
  category?: string;
  complexity?: 'low' | 'medium' | 'high';
}

/**
 * PCL Skill representation
 */
export interface PCLSkill {
  name: string;
  version?: string;
  description: string;
  category?: string;
  instructions: string;
  examples?: Array<{
    description: string;
    code: string;
  }>;
  tools?: string[];
  dependencies?: string[];
  complexity?: 'low' | 'medium' | 'high';
  conflicts?: string[];
  metadata?: {
    author?: string;
    license?: string;
    user_invocable?: boolean;
    [key: string]: any;
  };
  config?: {
    model?: string;
    context?: 'fork';
    agent?: string;
    [key: string]: any;
  };
}

/**
 * Parse a Claude Code SKILL.md file
 */
/**
 * Normalize a frontmatter value that may be a YAML list or a comma-delimited
 * string into a string array. Returns undefined when empty, so optional fields
 * stay absent rather than becoming empty arrays.
 */
function parseStringList(
  value: string | string[] | undefined
): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const raw = typeof value === 'string' ? value.split(',') : value;
  const parsed = raw.map((item) => String(item).trim()).filter(Boolean);

  return parsed.length > 0 ? parsed : undefined;
}

/**
 * Read back the "<!-- PCL Metadata ... -->" block that toSkillMd appends.
 */
function parsePclMetadataComment(markdownBody: string): {
  version?: string;
  category?: string;
  author?: string;
  license?: string;
  dependencies?: string;
  conflicts?: string;
} {
  const block = markdownBody.match(/<!--\s*PCL Metadata\s*([\s\S]*?)-->/);
  if (!block) {
    return {};
  }

  const fields: Record<string, string> = {};
  for (const line of block[1].split('\n')) {
    const entry = line.match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.+?)\s*$/);
    if (entry) {
      fields[entry[1]] = entry[2];
    }
  }

  return fields;
}

export function parseSkillMd(content: string): PCLSkill {
  // Split frontmatter and markdown body
  // Accept both LF and CRLF: SKILL.md files checked out on Windows (or with
  // core.autocrlf=true) end their lines with \r\n, and an LF-only pattern
  // would reject every one of them.
  const frontmatterMatch = content.match(
    /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/
  );

  if (!frontmatterMatch) {
    throw new Error('Invalid SKILL.md format: missing YAML frontmatter');
  }

  const [, frontmatterStr, markdownBody] = frontmatterMatch;

  // Parse YAML frontmatter
  const metadata = parseYAML(frontmatterStr) as SkillMetadata;

  if (!metadata.name || !metadata.description) {
    throw new Error('SKILL.md must have name and description fields');
  }

  // Parse allowed-tools
  let tools: string[] | undefined;
  if (metadata['allowed-tools']) {
    if (typeof metadata['allowed-tools'] === 'string') {
      tools = metadata['allowed-tools'].split(',').map((t) => t.trim());
    } else {
      tools = metadata['allowed-tools'];
    }
  }

  // PCL extension fields. toSkillMd writes some of these into the trailing
  // "<!-- PCL Metadata -->" comment block, so both sources are read back here
  // (frontmatter wins) — otherwise the round trip it advertises loses them.
  const trailing = parsePclMetadataComment(markdownBody);

  const dependencies = parseStringList(
    metadata.dependencies ?? trailing.dependencies
  );
  const conflicts = parseStringList(metadata.conflicts ?? trailing.conflicts);
  const version = metadata.version ?? trailing.version;
  const category = metadata.category ?? trailing.category;
  const complexity = metadata.complexity;

  // Extract examples from markdown
  const examples = extractExamples(markdownBody);

  // Build PCL skill
  const skill: PCLSkill = {
    name: metadata.name,
    description: metadata.description,
    instructions: markdownBody.trim(),
    examples,
    tools,
    dependencies,
    conflicts,
    version,
    category,
    complexity,
    metadata: {
      user_invocable: metadata['user-invocable'] ?? true,
      ...(trailing.author ? { author: trailing.author } : {}),
      ...((trailing.license ?? metadata.license)
        ? { license: trailing.license ?? metadata.license }
        : {}),
    },
  };

  // Add config if model/context specified
  if (metadata.model || metadata.context || metadata.agent) {
    skill.config = {
      model: metadata.model,
      context: metadata.context,
      agent: metadata.agent,
    };
  }

  return skill;
}

/**
 * Convert PCL skill to Claude Code SKILL.md format
 */
export function toSkillMd(skill: PCLSkill): string {
  const parts: string[] = [];

  // Build YAML frontmatter
  const frontmatter: Record<string, any> = {
    name: skill.name,
    description: skill.description,
  };

  if (skill.tools && skill.tools.length > 0) {
    frontmatter['allowed-tools'] = skill.tools;
  }

  if (skill.config?.model) {
    frontmatter.model = skill.config.model;
  }

  if (skill.config?.context) {
    frontmatter.context = skill.config.context;
  }

  if (skill.config?.agent) {
    frontmatter.agent = skill.config.agent;
  }

  if (skill.metadata?.user_invocable !== undefined) {
    frontmatter['user-invocable'] = skill.metadata.user_invocable;
  }

  // Serialize frontmatter
  parts.push('---');
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      parts.push(`${key}:`);
      for (const item of value) {
        parts.push(`  - ${item}`);
      }
    } else {
      parts.push(`${key}: ${JSON.stringify(value).replace(/^"|"$/g, '')}`);
    }
  }
  parts.push('---');
  parts.push('');

  // Add markdown body (instructions)
  parts.push(skill.instructions);

  // Add examples if present
  if (skill.examples && skill.examples.length > 0) {
    parts.push('');
    parts.push('## Examples');
    parts.push('');

    for (const example of skill.examples) {
      parts.push(`### ${example.description}`);
      parts.push('');
      parts.push('```');
      parts.push(example.code);
      parts.push('```');
      parts.push('');
    }
  }

  // Add PCL metadata as comment (for round-trip compatibility)
  if (
    skill.version ||
    skill.category ||
    skill.metadata?.author ||
    skill.metadata?.license ||
    skill.dependencies?.length ||
    skill.conflicts?.length
  ) {
    parts.push('---');
    parts.push('');
    parts.push('<!-- PCL Metadata');
    if (skill.version) parts.push(`version: ${skill.version}`);
    if (skill.category) parts.push(`category: ${skill.category}`);
    if (skill.metadata?.author) parts.push(`author: ${skill.metadata.author}`);
    if (skill.metadata?.license)
      parts.push(`license: ${skill.metadata.license}`);
    if (skill.dependencies && skill.dependencies.length > 0) {
      parts.push(`dependencies: ${skill.dependencies.join(', ')}`);
    }
    if (skill.conflicts && skill.conflicts.length > 0) {
      parts.push(`conflicts: ${skill.conflicts.join(', ')}`);
    }
    parts.push('-->');
  }

  return parts.join('\n');
}

/**
 * Extract code examples from markdown
 */
function extractExamples(
  markdown: string
): Array<{ description: string; code: string }> | undefined {
  const examples: Array<{ description: string; code: string }> = [];

  // Match ### headings followed by code blocks
  const pattern = /###\s+(.+?)\n\n```(?:\w+)?\n([\s\S]+?)\n```/g;
  let match;

  while ((match = pattern.exec(markdown)) !== null) {
    examples.push({
      description: match[1].trim(),
      code: match[2].trim(),
    });
  }

  return examples.length > 0 ? examples : undefined;
}

/**
 * Load skill from file path
 */
export async function loadSkillFromFile(filePath: string): Promise<PCLSkill> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(filePath, 'utf-8');

  if (filePath.endsWith('.md')) {
    return parseSkillMd(content);
  } else {
    throw new Error('Unsupported skill format. Use .md for Claude Code format');
  }
}

/**
 * Save skill to file
 */
export async function saveSkillToFile(
  skill: PCLSkill,
  filePath: string
): Promise<void> {
  const fs = await import('fs/promises');
  const content = toSkillMd(skill);
  await fs.writeFile(filePath, content, 'utf-8');
}
