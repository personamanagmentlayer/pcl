/**
 * Skill Loader Tests
 *
 * Comprehensive tests for SKILL.md parsing and conversion
 * Target: 55.81% → 80%+ coverage
 */

import { z } from 'zod';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  parseSkillMd,
  toSkillMd,
  loadSkillFromFile,
  saveSkillToFile,
  type PCLSkill,
} from '../../src/skills/skill-loader';

// Zod schemas for validation
const PCLSkillSchema = z.object({
  name: z.string().min(1),
  version: z.string().optional(),
  description: z.string().min(1),
  category: z.string().optional(),
  instructions: z.string().min(1),
  examples: z
    .array(
      z.object({
        description: z.string(),
        code: z.string(),
      })
    )
    .optional(),
  tools: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  complexity: z.enum(['low', 'medium', 'high']).optional(),
  conflicts: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  config: z.record(z.any()).optional(),
});

// Test fixtures
const minimalSkillMd = `---
name: TestSkill
description: A test skill for unit tests
---

This is the skill instructions.`;

const completeSkillMd = `---
name: CompleteSkill
description: A comprehensive test skill
allowed-tools:
  - Read
  - Write
  - Bash
model: claude-3-5-sonnet-20241022
context: fork
agent: developer
user-invocable: true
---

This is a comprehensive skill with all fields.

It has multiple paragraphs of instructions.

### Example 1

\`\`\`typescript
console.log('Hello World');
\`\`\`

### Example 2

\`\`\`python
print("Hello World")
\`\`\``;

const toolsStringSkillMd = `---
name: StringToolsSkill
description: Skill with string tools
allowed-tools: Read, Write, Bash
---

Instructions here.`;

const minimalPCLSkill: PCLSkill = {
  name: 'MinimalSkill',
  description: 'Minimal PCL skill',
  instructions: 'Simple instructions.',
};

const completePCLSkill: PCLSkill = {
  name: 'CompleteSkill',
  version: '1.0.0',
  description: 'Complete PCL skill',
  category: 'development',
  instructions: 'Detailed instructions with examples.',
  examples: [
    {
      description: 'Example 1',
      code: 'const x = 1;',
    },
    {
      description: 'Example 2',
      code: 'const y = 2;',
    },
  ],
  tools: ['Read', 'Write'],
  dependencies: ['BaseSkill'],
  complexity: 'medium',
  conflicts: ['OtherSkill'],
  metadata: {
    author: 'Test Author',
    license: 'MIT',
    user_invocable: true,
    custom_field: 'custom value',
  },
  config: {
    model: 'claude-3-5-sonnet-20241022',
    context: 'fork',
    agent: 'developer',
    custom_config: 'value',
  },
};

// Temp directory for file tests
const tempDir = path.join(__dirname, 'temp-skill-loader-tests');

describe('Skill Loader', () => {
  beforeAll(async () => {
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('parseSkillMd', () => {
    it('should parse minimal SKILL.md', () => {
      const skill = parseSkillMd(minimalSkillMd);

      const validated = PCLSkillSchema.parse(skill);
      expect(validated.name).toBe('TestSkill');
      expect(validated.description).toBe('A test skill for unit tests');
      expect(validated.instructions).toContain('skill instructions');
    });

    it('should parse complete SKILL.md with all fields', () => {
      const skill = parseSkillMd(completeSkillMd);

      expect(skill.name).toBe('CompleteSkill');
      expect(skill.description).toBe('A comprehensive test skill');
      expect(skill.tools).toEqual(['Read', 'Write', 'Bash']);
      expect(skill.config?.model).toBe('claude-3-5-sonnet-20241022');
      expect(skill.config?.context).toBe('fork');
      expect(skill.config?.agent).toBe('developer');
      expect(skill.metadata?.user_invocable).toBe(true);
    });

    it('should extract examples from markdown', () => {
      const skill = parseSkillMd(completeSkillMd);

      expect(skill.examples).toBeDefined();
      expect(skill.examples).toHaveLength(2);
      expect(skill.examples![0].description).toBe('Example 1');
      expect(skill.examples![0].code).toContain('Hello World');
      expect(skill.examples![1].description).toBe('Example 2');
      expect(skill.examples![1].code).toContain('print');
    });

    it('should parse comma-separated tools string', () => {
      const skill = parseSkillMd(toolsStringSkillMd);

      expect(skill.tools).toEqual(['Read', 'Write', 'Bash']);
    });

    it('should throw on missing frontmatter', () => {
      const invalidMd = 'Just markdown without frontmatter';

      expect(() => parseSkillMd(invalidMd)).toThrow('missing YAML frontmatter');
    });

    it('should throw on missing name field', () => {
      const invalidMd = `---
description: Missing name
---

Content`;

      expect(() => parseSkillMd(invalidMd)).toThrow('name and description');
    });

    it('should throw on missing description field', () => {
      const invalidMd = `---
name: MissingDescription
---

Content`;

      expect(() => parseSkillMd(invalidMd)).toThrow('name and description');
    });

    it('should handle empty tools array', () => {
      const md = `---
name: EmptyTools
description: No tools
allowed-tools: []
---

Instructions`;

      const skill = parseSkillMd(md);
      expect(skill.tools).toEqual([]);
    });

    it('should handle no config fields', () => {
      const skill = parseSkillMd(minimalSkillMd);

      expect(skill.config).toBeUndefined();
    });

    it('should default user_invocable to true', () => {
      const skill = parseSkillMd(minimalSkillMd);

      expect(skill.metadata?.user_invocable).toBe(true);
    });

    it('should respect user_invocable: false', () => {
      const md = `---
name: NonInvocable
description: Not user invocable
user-invocable: false
---

Instructions`;

      const skill = parseSkillMd(md);
      expect(skill.metadata?.user_invocable).toBe(false);
    });

    it('should handle skill with only model config', () => {
      const md = `---
name: ModelOnly
description: Only model config
model: gpt-4
---

Instructions`;

      const skill = parseSkillMd(md);
      expect(skill.config?.model).toBe('gpt-4');
      expect(skill.config?.context).toBeUndefined();
      expect(skill.config?.agent).toBeUndefined();
    });

    it('should handle skill with only context config', () => {
      const md = `---
name: ContextOnly
description: Only context config
context: fork
---

Instructions`;

      const skill = parseSkillMd(md);
      expect(skill.config?.context).toBe('fork');
      expect(skill.config?.model).toBeUndefined();
    });

    it('should handle skill with only agent config', () => {
      const md = `---
name: AgentOnly
description: Only agent config
agent: developer
---

Instructions`;

      const skill = parseSkillMd(md);
      expect(skill.config?.agent).toBe('developer');
      expect(skill.config?.model).toBeUndefined();
    });

    it('should handle markdown with no examples', () => {
      const skill = parseSkillMd(minimalSkillMd);

      expect(skill.examples).toBeUndefined();
    });

    it('should trim whitespace from instructions', () => {
      const md = `---
name: Whitespace
description: Test whitespace
---


Instructions with whitespace
  `;

      const skill = parseSkillMd(md);
      expect(skill.instructions).not.toMatch(/^\s+/);
      expect(skill.instructions).not.toMatch(/\s+$/);
    });
  });

  describe('toSkillMd', () => {
    it('should convert minimal PCL skill to SKILL.md', () => {
      const md = toSkillMd(minimalPCLSkill);

      expect(md).toContain('---');
      expect(md).toContain('name: MinimalSkill');
      expect(md).toContain('description: Minimal PCL skill');
      expect(md).toContain('Simple instructions.');
    });

    it('should convert complete PCL skill to SKILL.md', () => {
      const md = toSkillMd(completePCLSkill);

      expect(md).toContain('name: CompleteSkill');
      expect(md).toContain('description: Complete PCL skill');
      expect(md).toContain('allowed-tools:');
      expect(md).toContain('- Read');
      expect(md).toContain('- Write');
      expect(md).toContain('model: claude-3-5-sonnet-20241022');
      expect(md).toContain('context: fork');
      expect(md).toContain('agent: developer');
      expect(md).toContain('user-invocable: true');
    });

    it('should include examples section', () => {
      const md = toSkillMd(completePCLSkill);

      expect(md).toContain('## Examples');
      expect(md).toContain('### Example 1');
      expect(md).toContain('const x = 1;');
      expect(md).toContain('### Example 2');
      expect(md).toContain('const y = 2;');
    });

    it('should include PCL metadata as comment', () => {
      const md = toSkillMd(completePCLSkill);

      expect(md).toContain('<!-- PCL Metadata');
      expect(md).toContain('version: 1.0.0');
      expect(md).toContain('category: development');
      expect(md).toContain('author: Test Author');
      expect(md).toContain('license: MIT');
      expect(md).toContain('dependencies: BaseSkill');
      expect(md).toContain('-->');
    });

    it('should handle skill without tools', () => {
      const skill: PCLSkill = {
        ...minimalPCLSkill,
        tools: undefined,
      };

      const md = toSkillMd(skill);

      expect(md).not.toContain('allowed-tools');
    });

    it('should handle skill with empty tools array', () => {
      const skill: PCLSkill = {
        ...minimalPCLSkill,
        tools: [],
      };

      const md = toSkillMd(skill);

      expect(md).not.toContain('allowed-tools');
    });

    it('should handle skill without config', () => {
      const md = toSkillMd(minimalPCLSkill);

      expect(md).not.toContain('model:');
      expect(md).not.toContain('context:');
      expect(md).not.toContain('agent:');
    });

    it('should handle skill without examples', () => {
      const md = toSkillMd(minimalPCLSkill);

      expect(md).not.toContain('## Examples');
    });

    it('should handle skill with empty examples array', () => {
      const skill: PCLSkill = {
        ...minimalPCLSkill,
        examples: [],
      };

      const md = toSkillMd(skill);

      expect(md).not.toContain('## Examples');
    });

    it('should not include metadata comment if no metadata fields', () => {
      const md = toSkillMd(minimalPCLSkill);

      expect(md).not.toContain('<!-- PCL Metadata');
    });

    it('should handle user_invocable: false', () => {
      const skill: PCLSkill = {
        ...minimalPCLSkill,
        metadata: { user_invocable: false },
      };

      const md = toSkillMd(skill);

      expect(md).toContain('user-invocable: false');
    });

    it('should not include user-invocable if undefined', () => {
      const skill: PCLSkill = {
        ...minimalPCLSkill,
        metadata: {},
      };

      const md = toSkillMd(skill);

      expect(md).not.toContain('user-invocable');
    });

    it('should properly format arrays in frontmatter', () => {
      const skill: PCLSkill = {
        ...minimalPCLSkill,
        tools: ['Tool1', 'Tool2', 'Tool3'],
      };

      const md = toSkillMd(skill);

      expect(md).toMatch(/allowed-tools:\s+- Tool1\s+- Tool2\s+- Tool3/);
    });

    it('should escape special characters in values', () => {
      const skill: PCLSkill = {
        name: 'Test: Skill',
        description: 'Description with "quotes"',
        instructions: 'Instructions',
      };

      const md = toSkillMd(skill);

      // Should handle special characters
      expect(md).toContain('Test: Skill');
    });
  });

  describe('Round-trip conversion', () => {
    it('should maintain minimal skill through round-trip', () => {
      const md1 = toSkillMd(minimalPCLSkill);
      const skill = parseSkillMd(md1);

      expect(skill.name).toBe(minimalPCLSkill.name);
      expect(skill.description).toBe(minimalPCLSkill.description);
      expect(skill.instructions).toBe(minimalPCLSkill.instructions);
    });

    it('should maintain tools through round-trip', () => {
      const skillWithTools: PCLSkill = {
        ...minimalPCLSkill,
        tools: ['Read', 'Write', 'Bash'],
      };

      const md = toSkillMd(skillWithTools);
      const parsed = parseSkillMd(md);

      expect(parsed.tools).toEqual(['Read', 'Write', 'Bash']);
    });

    it('should maintain config through round-trip', () => {
      const skillWithConfig: PCLSkill = {
        ...minimalPCLSkill,
        config: {
          model: 'claude-3-5-sonnet-20241022',
          context: 'fork',
          agent: 'developer',
        },
      };

      const md = toSkillMd(skillWithConfig);
      const parsed = parseSkillMd(md);

      expect(parsed.config?.model).toBe('claude-3-5-sonnet-20241022');
      expect(parsed.config?.context).toBe('fork');
      expect(parsed.config?.agent).toBe('developer');
    });

    it('should maintain examples through round-trip', () => {
      const skillWithExamples: PCLSkill = {
        ...minimalPCLSkill,
        examples: [
          { description: 'Test 1', code: 'code1' },
          { description: 'Test 2', code: 'code2' },
        ],
      };

      const md = toSkillMd(skillWithExamples);
      const parsed = parseSkillMd(md);

      expect(parsed.examples).toHaveLength(2);
      expect(parsed.examples![0].description).toBe('Test 1');
      expect(parsed.examples![1].description).toBe('Test 2');
    });
  });

  describe('File operations', () => {
    const testSkillPath = path.join(tempDir, 'test-skill.md');

    afterEach(async () => {
      try {
        await fs.unlink(testSkillPath);
      } catch {
        // Ignore if file doesn't exist
      }
    });

    it('should load skill from .md file', async () => {
      await fs.writeFile(testSkillPath, completeSkillMd, 'utf-8');

      const skill = await loadSkillFromFile(testSkillPath);

      expect(skill.name).toBe('CompleteSkill');
      expect(skill.tools).toEqual(['Read', 'Write', 'Bash']);
    });

    it('should throw on unsupported file format', async () => {
      const invalidPath = path.join(tempDir, 'skill.txt');

      // Create the file first so it's not a "file not found" error
      await fs.writeFile(invalidPath, 'test content', 'utf-8');

      await expect(loadSkillFromFile(invalidPath)).rejects.toThrow(
        'Unsupported skill format'
      );

      await fs.unlink(invalidPath);
    });

    it('should throw on non-existent file', async () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist.md');

      await expect(loadSkillFromFile(nonExistentPath)).rejects.toThrow();
    });

    it('should save skill to file', async () => {
      await saveSkillToFile(minimalPCLSkill, testSkillPath);

      const content = await fs.readFile(testSkillPath, 'utf-8');

      expect(content).toContain('name: MinimalSkill');
      expect(content).toContain('description: Minimal PCL skill');
    });

    it('should create file if it does not exist', async () => {
      const newFilePath = path.join(tempDir, 'new-skill.md');

      await saveSkillToFile(minimalPCLSkill, newFilePath);

      const exists = await fs
        .access(newFilePath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);

      await fs.unlink(newFilePath);
    });

    it('should overwrite existing file', async () => {
      await fs.writeFile(testSkillPath, 'old content', 'utf-8');

      await saveSkillToFile(minimalPCLSkill, testSkillPath);

      const content = await fs.readFile(testSkillPath, 'utf-8');

      expect(content).not.toContain('old content');
      expect(content).toContain('MinimalSkill');
    });

    it('should handle round-trip file operations', async () => {
      await saveSkillToFile(completePCLSkill, testSkillPath);
      const loaded = await loadSkillFromFile(testSkillPath);

      expect(loaded.name).toBe('CompleteSkill');
      expect(loaded.tools).toEqual(['Read', 'Write']);
      expect(loaded.config?.model).toBe('claude-3-5-sonnet-20241022');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long skill names', () => {
      const longName = 'A'.repeat(1000);
      const md = `---
name: ${longName}
description: Test
---

Content`;

      const skill = parseSkillMd(md);
      expect(skill.name).toBe(longName);
    });

    it('should handle very long descriptions', () => {
      const longDesc = 'Description '.repeat(500);
      const md = `---
name: Test
description: ${longDesc}
---

Content`;

      const skill = parseSkillMd(md);
      expect(skill.description.length).toBeGreaterThan(1000);
    });

    it('should handle markdown with special characters', () => {
      const md = `---
name: SpecialChars
description: Test special chars
---

Instructions with **bold**, *italic*, and \`code\`.

- List item 1
- List item 2

> Blockquote`;

      const skill = parseSkillMd(md);
      expect(skill.instructions).toContain('**bold**');
      expect(skill.instructions).toContain('> Blockquote');
    });

    it('should handle empty instructions', () => {
      const md = `---
name: Empty
description: Empty instructions
---

`;

      const skill = parseSkillMd(md);
      expect(skill.instructions).toBe('');
    });

    it('should handle skill with many tools', () => {
      const manyTools = Array.from({ length: 100 }, (_, i) => `Tool${i}`);
      const skill: PCLSkill = {
        ...minimalPCLSkill,
        tools: manyTools,
      };

      const md = toSkillMd(skill);
      const parsed = parseSkillMd(md);

      expect(parsed.tools).toHaveLength(100);
    });

    it('should handle example with multi-line code', () => {
      const md = `---
name: MultiLine
description: Multi-line example
---

Instructions

### Example

\`\`\`typescript
function test() {
  console.log('line 1');
  console.log('line 2');
  console.log('line 3');
}
\`\`\``;

      const skill = parseSkillMd(md);

      expect(skill.examples![0].code).toContain('line 1');
      expect(skill.examples![0].code).toContain('line 2');
      expect(skill.examples![0].code).toContain('line 3');
    });
  });
});
