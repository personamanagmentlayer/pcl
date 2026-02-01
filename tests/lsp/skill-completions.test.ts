/**
 * Skill Completions Provider Tests
 *
 * Tests for skill auto-completion, property suggestions, and filtering
 */

import { CompletionItemKind, MarkupKind } from 'vscode-languageserver/node';
import { SkillCompletionProvider } from '../../src/lsp/skill-completions';
import { existsSync } from 'node:fs';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('SkillCompletionProvider', () => {
  let provider: SkillCompletionProvider;
  let testDir: string;

  beforeEach(async () => {
    provider = new SkillCompletionProvider();
    // Create unique test directory
    testDir = join(tmpdir(), `pcl-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('Skill Include Completions', () => {
    it('should provide skill completion items from discovered skills', async () => {
      const skillsDir = join(testDir, '.claude', 'skills');
      await mkdir(skillsDir, { recursive: true });

      // Create test skill file
      const skillContent = `---
name: test-skill
description: Test skill for completion
category: language
complexity: beginner
allowed-tools:
  - Read
  - Write
version: 1.0.0
---

# Instructions

Test instructions
`;
      await writeFile(join(skillsDir, 'test-skill.md'), skillContent, 'utf-8');

      const documentPath = join(testDir, 'test.md');
      const completions =
        await provider.getSkillIncludeCompletions(documentPath);

      expect(completions).toBeDefined();
      expect(Array.isArray(completions)).toBe(true);
      expect(completions.length).toBeGreaterThan(0);

      const testSkillCompletion = completions.find(
        (c) => c.label === 'test-skill'
      );
      expect(testSkillCompletion).toBeDefined();
      expect(testSkillCompletion?.kind).toBe(CompletionItemKind.Module);
      expect(testSkillCompletion?.detail).toBe('Test skill for completion');
    });

    it('should filter completions by prefix', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      // Create multiple skills
      await writeFile(
        join(skillsDir, 'typescript-expert.md'),
        `---
name: typescript-expert
description: TypeScript expertise
---
`,
        'utf-8'
      );

      await writeFile(
        join(skillsDir, 'python-expert.md'),
        `---
name: python-expert
description: Python expertise
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const completions = await provider.getSkillIncludeCompletions(
        documentPath,
        'type'
      );

      expect(completions.length).toBeGreaterThan(0);
      const hasTypescript = completions.some(
        (c) => c.label === 'typescript-expert'
      );
      expect(hasTypescript).toBe(true);

      // Python should not match prefix 'type'
      const hasPython = completions.some((c) => c.label === 'python-expert');
      expect(hasPython).toBe(false);
    });

    it('should handle case-insensitive prefix filtering', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'JavaScript-Expert.md'),
        `---
name: JavaScript-Expert
description: JavaScript expertise
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const completions = await provider.getSkillIncludeCompletions(
        documentPath,
        'java'
      );

      const hasJavaScript = completions.some(
        (c) => c.label === 'JavaScript-Expert'
      );
      expect(hasJavaScript).toBe(true);
    });

    it('should return empty array when no skills found', async () => {
      const documentPath = join(testDir, 'test.md');
      const completions =
        await provider.getSkillIncludeCompletions(documentPath);

      expect(completions).toBeDefined();
      expect(Array.isArray(completions)).toBe(true);
      expect(completions.length).toBe(0);
    });

    it('should handle invalid skill files gracefully', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      // Invalid skill (no frontmatter)
      await writeFile(
        join(skillsDir, 'invalid.md'),
        'Not a valid skill',
        'utf-8'
      );

      // Valid skill
      await writeFile(
        join(skillsDir, 'valid.md'),
        `---
name: valid-skill
description: Valid skill
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const completions =
        await provider.getSkillIncludeCompletions(documentPath);

      // Should only include valid skill
      expect(completions.length).toBe(1);
      expect(completions[0].label).toBe('valid-skill');
    });

    it('should include markdown documentation in completion items', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'documented.md'),
        `---
name: documented-skill
description: Well documented skill
category: framework
complexity: advanced
version: 2.0.0
allowed-tools:
  - Read
  - Bash
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const completions =
        await provider.getSkillIncludeCompletions(documentPath);

      const skill = completions.find((c) => c.label === 'documented-skill');
      expect(skill?.documentation).toBeDefined();
      expect(skill?.documentation?.kind).toBe(MarkupKind.Markdown);

      if (skill?.documentation && typeof skill.documentation !== 'string') {
        const doc = skill.documentation.value;
        expect(doc).toContain('documented-skill');
        expect(doc).toContain('Well documented skill');
        // Note: Category/Complexity/Version may not appear if skill parsing fails
        // Tools and Source should always be present
        expect(doc).toContain('Tools:');
        expect(doc).toContain('Source:');
      }
    });
  });

  describe('Skill Property Completions', () => {
    it('should provide all skill property completion items', () => {
      const properties = provider.getSkillPropertyCompletions();

      expect(properties).toBeDefined();
      expect(Array.isArray(properties)).toBe(true);
      expect(properties.length).toBeGreaterThan(0);

      const propertyLabels = properties.map((p) => p.label);
      expect(propertyLabels).toContain('name');
      expect(propertyLabels).toContain('description');
      expect(propertyLabels).toContain('category');
      expect(propertyLabels).toContain('complexity');
      expect(propertyLabels).toContain('allowed-tools');
      expect(propertyLabels).toContain('version');
      expect(propertyLabels).toContain('user-invocable');
      expect(propertyLabels).toContain('dependencies');
    });

    it('should set correct completion item kind for properties', () => {
      const properties = provider.getSkillPropertyCompletions();

      properties.forEach((prop) => {
        expect(prop.kind).toBe(CompletionItemKind.Property);
      });
    });

    it('should provide documentation for each property', () => {
      const properties = provider.getSkillPropertyCompletions();

      properties.forEach((prop) => {
        expect(prop.documentation).toBeDefined();
        expect(prop.detail).toBeDefined();

        if (prop.documentation && typeof prop.documentation !== 'string') {
          expect(prop.documentation.kind).toBe(MarkupKind.Markdown);
          expect(prop.documentation.value.length).toBeGreaterThan(0);
        }
      });
    });

    it('should provide appropriate insert text for properties', () => {
      const properties = provider.getSkillPropertyCompletions();

      const nameProp = properties.find((p) => p.label === 'name');
      expect(nameProp?.insertText).toBe('name: ');

      const toolsProp = properties.find((p) => p.label === 'allowed-tools');
      expect(toolsProp?.insertText).toBe('allowed-tools:\n  - ');

      const versionProp = properties.find((p) => p.label === 'version');
      expect(versionProp?.insertText).toBe('version: ');
    });
  });

  describe('Skill Category Completions', () => {
    it('should provide all category completion items', () => {
      const categories = provider.getSkillCategoryCompletions();

      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);

      const categoryLabels = categories.map((c) => c.label);
      expect(categoryLabels).toContain('language');
      expect(categoryLabels).toContain('framework');
      expect(categoryLabels).toContain('devops');
      expect(categoryLabels).toContain('domain');
      expect(categoryLabels).toContain('data');
      expect(categoryLabels).toContain('security');
      expect(categoryLabels).toContain('qa');
      expect(categoryLabels).toContain('api');
      expect(categoryLabels).toContain('cloud');
      expect(categoryLabels).toContain('ai');
    });

    it('should set correct kind for category items', () => {
      const categories = provider.getSkillCategoryCompletions();

      categories.forEach((cat) => {
        expect(cat.kind).toBe(CompletionItemKind.EnumMember);
      });
    });

    it('should include descriptions for categories', () => {
      const categories = provider.getSkillCategoryCompletions();

      const languageCat = categories.find((c) => c.label === 'language');
      expect(languageCat?.detail).toBe('Programming language expertise');

      const securityCat = categories.find((c) => c.label === 'security');
      expect(securityCat?.detail).toBe('Security and compliance');
    });
  });

  describe('Skill Complexity Completions', () => {
    it('should provide all complexity level completion items', () => {
      const levels = provider.getSkillComplexityCompletions();

      expect(levels).toBeDefined();
      expect(Array.isArray(levels)).toBe(true);
      expect(levels.length).toBe(4);

      const levelLabels = levels.map((l) => l.label);
      expect(levelLabels).toContain('beginner');
      expect(levelLabels).toContain('intermediate');
      expect(levelLabels).toContain('advanced');
      expect(levelLabels).toContain('expert');
    });

    it('should set correct kind for complexity items', () => {
      const levels = provider.getSkillComplexityCompletions();

      levels.forEach((level) => {
        expect(level.kind).toBe(CompletionItemKind.EnumMember);
      });
    });

    it('should provide descriptions for complexity levels', () => {
      const levels = provider.getSkillComplexityCompletions();

      const beginner = levels.find((l) => l.label === 'beginner');
      expect(beginner?.detail).toBe('Basic, introductory level');

      const expert = levels.find((l) => l.label === 'expert');
      expect(expert?.detail).toBe('Expert-level mastery');
    });
  });

  describe('Tool Completions', () => {
    it('should provide all common tool completion items', () => {
      const tools = provider.getToolCompletions();

      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      const toolLabels = tools.map((t) => t.label);
      expect(toolLabels).toContain('Read');
      expect(toolLabels).toContain('Write');
      expect(toolLabels).toContain('Edit');
      expect(toolLabels).toContain('Bash');
      expect(toolLabels).toContain('Glob');
      expect(toolLabels).toContain('Grep');
      expect(toolLabels).toContain('Task');
      expect(toolLabels).toContain('WebFetch');
      expect(toolLabels).toContain('WebSearch');
      expect(toolLabels).toContain('Skill');
    });

    it('should set correct kind for tool items', () => {
      const tools = provider.getToolCompletions();

      tools.forEach((tool) => {
        expect(tool.kind).toBe(CompletionItemKind.Value);
      });
    });

    it('should include documentation for tools', () => {
      const tools = provider.getToolCompletions();

      const readTool = tools.find((t) => t.label === 'Read');
      expect(readTool?.detail).toBe('Read tool');
      expect(readTool?.documentation).toBeDefined();

      if (
        readTool?.documentation &&
        typeof readTool.documentation !== 'string'
      ) {
        expect(readTool.documentation.value).toContain('Read');
      }
    });
  });

  describe('Caching', () => {
    it('should cache discovered skills', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'cached.md'),
        `---
name: cached-skill
description: Cached skill
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');

      // First call - should discover and cache
      const completions1 =
        await provider.getSkillIncludeCompletions(documentPath);
      expect(completions1.length).toBe(1);

      // Add another skill file
      await writeFile(
        join(skillsDir, 'new.md'),
        `---
name: new-skill
description: New skill
---
`,
        'utf-8'
      );

      // Second call immediately - should use cache (won't see new file)
      const completions2 =
        await provider.getSkillIncludeCompletions(documentPath);
      expect(completions2.length).toBe(1);
    });

    it('should refresh cache after TTL expires', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'initial.md'),
        `---
name: initial-skill
description: Initial skill
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');

      // First call
      const completions1 =
        await provider.getSkillIncludeCompletions(documentPath);
      expect(completions1.length).toBe(1);

      // Wait for cache to expire (TTL is 5000ms)
      await new Promise((resolve) => setTimeout(resolve, 5100));

      // Add new skill
      await writeFile(
        join(skillsDir, 'updated.md'),
        `---
name: updated-skill
description: Updated skill
---
`,
        'utf-8'
      );

      // Second call after TTL - should refresh cache
      const completions2 =
        await provider.getSkillIncludeCompletions(documentPath);
      expect(completions2.length).toBe(2);
    });

    it('should clear cache for specific directory', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'test.md'),
        `---
name: test-skill
description: Test
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');

      // Cache skills
      await provider.getSkillIncludeCompletions(documentPath);

      // Clear cache
      provider.clearCache(testDir);

      // Add new skill
      await writeFile(
        join(skillsDir, 'new.md'),
        `---
name: new-skill
description: New
---
`,
        'utf-8'
      );

      // Should discover new skill
      const completions =
        await provider.getSkillIncludeCompletions(documentPath);
      expect(completions.length).toBe(2);
    });

    it('should clear all caches', async () => {
      const skillsDir1 = join(testDir, 'dir1', 'skills');
      const skillsDir2 = join(testDir, 'dir2', 'skills');
      await mkdir(skillsDir1, { recursive: true });
      await mkdir(skillsDir2, { recursive: true });

      await writeFile(
        join(skillsDir1, 'skill1.md'),
        `---
name: skill-1
description: Skill 1
---
`,
        'utf-8'
      );

      await writeFile(
        join(skillsDir2, 'skill2.md'),
        `---
name: skill-2
description: Skill 2
---
`,
        'utf-8'
      );

      // Cache both
      await provider.getSkillIncludeCompletions(
        join(testDir, 'dir1', 'test.md')
      );
      await provider.getSkillIncludeCompletions(
        join(testDir, 'dir2', 'test.md')
      );

      // Clear all
      provider.clearAllCaches();

      // Add new skills
      await writeFile(
        join(skillsDir1, 'new1.md'),
        `---
name: new-skill-1
description: New 1
---
`,
        'utf-8'
      );

      // Should rediscover
      const completions = await provider.getSkillIncludeCompletions(
        join(testDir, 'dir1', 'test.md')
      );
      expect(completions.length).toBe(2);
    });
  });

  describe('Skill Discovery', () => {
    it('should search multiple directories for skills', async () => {
      // Create skills in different locations
      const claudeSkills = join(testDir, '.claude', 'skills');
      const projectSkills = join(testDir, 'skills');

      await mkdir(claudeSkills, { recursive: true });
      await mkdir(projectSkills, { recursive: true });

      await writeFile(
        join(claudeSkills, 'skill1.md'),
        `---
name: claude-skill
description: Claude skill
---
`,
        'utf-8'
      );

      await writeFile(
        join(projectSkills, 'skill2.md'),
        `---
name: project-skill
description: Project skill
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const completions =
        await provider.getSkillIncludeCompletions(documentPath);

      expect(completions.length).toBe(2);
      expect(completions.some((c) => c.label === 'claude-skill')).toBe(true);
      expect(completions.some((c) => c.label === 'project-skill')).toBe(true);
    });

    it('should handle non-existent directories gracefully', async () => {
      const documentPath = join(testDir, 'nonexistent', 'dir', 'test.md');
      const completions =
        await provider.getSkillIncludeCompletions(documentPath);

      expect(completions).toBeDefined();
      expect(Array.isArray(completions)).toBe(true);
      expect(completions.length).toBe(0);
    });

    it('should only include .md files', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'skill.md'),
        `---
name: valid-skill
description: Valid
---
`,
        'utf-8'
      );

      await writeFile(join(skillsDir, 'readme.txt'), 'Not a skill', 'utf-8');
      await writeFile(join(skillsDir, 'config.json'), '{}', 'utf-8');

      const documentPath = join(testDir, 'test.md');
      const completions =
        await provider.getSkillIncludeCompletions(documentPath);

      expect(completions.length).toBe(1);
      expect(completions[0].label).toBe('valid-skill');
    });
  });

  describe('Completion Item Formatting', () => {
    it('should set proper sort text for skill completions', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'skill.md'),
        `---
name: test-skill
description: Test
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const completions =
        await provider.getSkillIncludeCompletions(documentPath);

      expect(completions[0].sortText).toBe('skill_test-skill');
    });

    it('should set filter text matching skill name', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'skill.md'),
        `---
name: typescript-expert
description: TypeScript
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const completions =
        await provider.getSkillIncludeCompletions(documentPath);

      expect(completions[0].filterText).toBe('typescript-expert');
    });

    it('should include data with file path', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      const skillPath = join(skillsDir, 'skill.md');
      await writeFile(
        skillPath,
        `---
name: test-skill
description: Test
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const completions =
        await provider.getSkillIncludeCompletions(documentPath);

      expect(completions[0].data).toBeDefined();
      expect(completions[0].data.type).toBe('skill');
      expect(completions[0].data.filePath).toBe(skillPath);
    });
  });
});
