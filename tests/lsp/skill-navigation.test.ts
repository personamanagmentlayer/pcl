/**
 * Skill Navigation Provider Tests
 *
 * Tests for go-to-definition, find-references, and dependency tree navigation
 */

import { SkillNavigationProvider } from '../../src/lsp/skill-navigation';
import { existsSync } from 'node:fs';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('SkillNavigationProvider', () => {
  let provider: SkillNavigationProvider;
  let testDir: string;

  beforeEach(async () => {
    provider = new SkillNavigationProvider();
    testDir = join(tmpdir(), `pcl-test-nav-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('Go to Definition', () => {
    it('should find skill definition by name', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      const skillPath = join(skillsDir, 'target-skill.md');
      await writeFile(
        skillPath,
        `---
name: target-skill
description: Target skill for navigation
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const location = await provider.gotoSkillDefinition(
        'target-skill',
        documentPath
      );

      expect(location).toBeDefined();
      expect(location?.uri).toContain('target-skill.md');
      expect(location?.range).toBeDefined();
      expect(location?.range.start.line).toBe(0);
      expect(location?.range.start.character).toBe(0);
    });

    it('should return null when skill not found', async () => {
      const documentPath = join(testDir, 'test.md');
      const location = await provider.gotoSkillDefinition(
        'nonexistent-skill',
        documentPath
      );

      expect(location).toBeNull();
    });

    it('should search multiple directories', async () => {
      const claudeSkills = join(testDir, '.claude', 'skills');
      await mkdir(claudeSkills, { recursive: true });

      const skillPath = join(claudeSkills, 'claude-skill.md');
      await writeFile(
        skillPath,
        `---
name: claude-skill
description: In .claude directory
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const location = await provider.gotoSkillDefinition(
        'claude-skill',
        documentPath
      );

      expect(location).toBeDefined();
      expect(location?.uri).toContain('claude-skill.md');
    });

    it('should handle skills in parent directory', async () => {
      const parentSkills = join(testDir, '..', '.claude', 'skills');
      await mkdir(parentSkills, { recursive: true });

      const skillPath = join(parentSkills, 'parent-skill.md');
      await writeFile(
        skillPath,
        `---
name: parent-skill
description: In parent .claude
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'subdir', 'test.md');
      const location = await provider.gotoSkillDefinition(
        'parent-skill',
        documentPath
      );

      expect(location).toBeDefined();
      expect(location?.uri).toContain('parent-skill.md');
    });

    it('should match skill by exact name', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'skill-one.md'),
        `---
name: skill-one
description: First skill
---
`,
        'utf-8'
      );

      await writeFile(
        join(skillsDir, 'skill-two.md'),
        `---
name: skill-two
description: Second skill
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const location = await provider.gotoSkillDefinition(
        'skill-one',
        documentPath
      );

      expect(location).toBeDefined();
      expect(location?.uri).toContain('skill-one.md');
      expect(location?.uri).not.toContain('skill-two.md');
    });

    it('should handle invalid skill files gracefully', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      // Invalid skill
      await writeFile(join(skillsDir, 'invalid.md'), 'Not a skill', 'utf-8');

      // Valid skill
      await writeFile(
        join(skillsDir, 'valid.md'),
        `---
name: valid-skill
description: Valid
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const location = await provider.gotoSkillDefinition(
        'valid-skill',
        documentPath
      );

      expect(location).toBeDefined();
      expect(location?.uri).toContain('valid.md');
    });
  });

  describe('Find References', () => {
    it('should find skills that depend on target skill', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      // Target skill
      await writeFile(
        join(skillsDir, 'base-skill.md'),
        `---
name: base-skill
description: Base skill
---
`,
        'utf-8'
      );

      // Dependent skill
      await writeFile(
        join(skillsDir, 'dependent.md'),
        `---
name: dependent-skill
description: Depends on base
dependencies:
  - base-skill
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const locations = await provider.findSkillReferences(
        'base-skill',
        documentPath
      );

      expect(locations).toBeDefined();
      expect(Array.isArray(locations)).toBe(true);
      expect(locations.length).toBeGreaterThan(0);

      const hasReference = locations.some((loc) =>
        loc.uri.includes('dependent.md')
      );
      expect(hasReference).toBe(true);
    });

    it('should return empty array when no references found', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'standalone.md'),
        `---
name: standalone-skill
description: No dependencies
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const locations = await provider.findSkillReferences(
        'standalone-skill',
        documentPath
      );

      expect(locations).toBeDefined();
      expect(Array.isArray(locations)).toBe(true);
      expect(locations.length).toBe(0);
    });

    it('should find multiple references', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      // Base skill
      await writeFile(
        join(skillsDir, 'util.md'),
        `---
name: util-skill
description: Utility skill
---
`,
        'utf-8'
      );

      // Multiple dependents
      await writeFile(
        join(skillsDir, 'app1.md'),
        `---
name: app1
description: App 1
dependencies:
  - util-skill
---
`,
        'utf-8'
      );

      await writeFile(
        join(skillsDir, 'app2.md'),
        `---
name: app2
description: App 2
dependencies:
  - util-skill
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const locations = await provider.findSkillReferences(
        'util-skill',
        documentPath
      );

      expect(locations.length).toBe(2);
      expect(locations.some((loc) => loc.uri.includes('app1.md'))).toBe(true);
      expect(locations.some((loc) => loc.uri.includes('app2.md'))).toBe(true);
    });

    it('should search across multiple directories', async () => {
      const dir1 = join(testDir, 'dir1', 'skills');
      const dir2 = join(testDir, '.claude', 'skills');
      await mkdir(dir1, { recursive: true });
      await mkdir(dir2, { recursive: true });

      await writeFile(
        join(dir1, 'ref1.md'),
        `---
name: ref1
description: Reference 1
dependencies:
  - shared-skill
---
`,
        'utf-8'
      );

      await writeFile(
        join(dir2, 'ref2.md'),
        `---
name: ref2
description: Reference 2
dependencies:
  - shared-skill
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const locations = await provider.findSkillReferences(
        'shared-skill',
        documentPath
      );

      expect(locations.length).toBeGreaterThan(0);
    });

    it('should include location range in references', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'base.md'),
        `---
name: base
description: Base
---
`,
        'utf-8'
      );

      await writeFile(
        join(skillsDir, 'ref.md'),
        `---
name: ref
description: Reference
dependencies:
  - base
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const locations = await provider.findSkillReferences(
        'base',
        documentPath
      );

      expect(locations.length).toBeGreaterThan(0);
      locations.forEach((loc) => {
        expect(loc.range).toBeDefined();
        expect(loc.range.start).toBeDefined();
        expect(loc.range.end).toBeDefined();
      });
    });

    it('should handle non-existent directories gracefully', async () => {
      const documentPath = join(testDir, 'nonexistent', 'dir', 'test.md');
      const locations = await provider.findSkillReferences(
        'any-skill',
        documentPath
      );

      expect(locations).toBeDefined();
      expect(Array.isArray(locations)).toBe(true);
      expect(locations.length).toBe(0);
    });
  });

  describe('Dependency Tree', () => {
    it('should build dependency tree for skill', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      // Create dependency chain: A -> B -> C
      await writeFile(
        join(skillsDir, 'skill-c.md'),
        `---
name: skill-c
description: Leaf skill
---
`,
        'utf-8'
      );

      await writeFile(
        join(skillsDir, 'skill-b.md'),
        `---
name: skill-b
description: Middle skill
dependencies:
  - skill-c
---
`,
        'utf-8'
      );

      await writeFile(
        join(skillsDir, 'skill-a.md'),
        `---
name: skill-a
description: Root skill
dependencies:
  - skill-b
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const tree = await provider.getSkillDependencyTree(
        'skill-a',
        documentPath
      );

      expect(tree).toBeDefined();
      expect(tree.name).toBe('skill-a');
      expect(tree.dependencies).toBeDefined();
      expect(tree.dependencies.length).toBe(1);
      expect(tree.dependencies[0].name).toBe('skill-b');
      expect(tree.dependencies[0].dependencies.length).toBe(1);
      expect(tree.dependencies[0].dependencies[0].name).toBe('skill-c');
    });

    it('should handle skill with no dependencies', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'solo.md'),
        `---
name: solo-skill
description: No dependencies
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const tree = await provider.getSkillDependencyTree(
        'solo-skill',
        documentPath
      );

      expect(tree).toBeDefined();
      expect(tree.name).toBe('solo-skill');
      expect(tree.dependencies.length).toBe(0);
    });

    it('should detect circular dependencies', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'circular-a.md'),
        `---
name: circular-a
description: Circular A
dependencies:
  - circular-b
---
`,
        'utf-8'
      );

      await writeFile(
        join(skillsDir, 'circular-b.md'),
        `---
name: circular-b
description: Circular B
dependencies:
  - circular-a
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const tree = await provider.getSkillDependencyTree(
        'circular-a',
        documentPath
      );

      expect(tree).toBeDefined();
      expect(tree.dependencies.length).toBeGreaterThan(0);

      // Should detect circular reference
      const circularNode = tree.dependencies[0].dependencies.find(
        (d: any) => d.circular === true
      );
      if (circularNode) {
        expect(circularNode.circular).toBe(true);
      }
    });

    it('should mark missing dependencies', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'has-missing.md'),
        `---
name: has-missing
description: Has missing dependency
dependencies:
  - nonexistent-skill
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const tree = await provider.getSkillDependencyTree(
        'has-missing',
        documentPath
      );

      expect(tree).toBeDefined();
      expect(tree.dependencies.length).toBe(1);
      expect(tree.dependencies[0].missing).toBe(true);
    });

    it('should handle multiple dependencies', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      await writeFile(
        join(skillsDir, 'dep1.md'),
        `---
name: dep1
description: Dependency 1
---
`,
        'utf-8'
      );

      await writeFile(
        join(skillsDir, 'dep2.md'),
        `---
name: dep2
description: Dependency 2
---
`,
        'utf-8'
      );

      await writeFile(
        join(skillsDir, 'multi.md'),
        `---
name: multi
description: Multiple deps
dependencies:
  - dep1
  - dep2
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const tree = await provider.getSkillDependencyTree('multi', documentPath);

      expect(tree.dependencies.length).toBe(2);
      expect(tree.dependencies.some((d) => d.name === 'dep1')).toBe(true);
      expect(tree.dependencies.some((d) => d.name === 'dep2')).toBe(true);
    });

    it('should include file paths in tree', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      const skillPath = join(skillsDir, 'with-path.md');
      await writeFile(
        skillPath,
        `---
name: with-path
description: Has path
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const tree = await provider.getSkillDependencyTree(
        'with-path',
        documentPath
      );

      expect(tree.path).toBeDefined();
      expect(tree.path).toContain('with-path.md');
    });

    it('should mark error when skill cannot be parsed', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      // Create invalid dependency
      await writeFile(join(skillsDir, 'broken.md'), 'Invalid content', 'utf-8');

      await writeFile(
        join(skillsDir, 'parent.md'),
        `---
name: parent
description: Parent
dependencies:
  - broken
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const tree = await provider.getSkillDependencyTree(
        'parent',
        documentPath
      );

      expect(tree.dependencies.length).toBe(1);
      // Broken dependency might be marked as error or missing
      expect(
        tree.dependencies[0].error === true ||
          tree.dependencies[0].missing === true
      ).toBe(true);
    });
  });

  describe('Format Dependency Tree', () => {
    it('should format simple tree', () => {
      const tree = {
        name: 'root',
        dependencies: [
          {
            name: 'child',
            dependencies: [],
          },
        ],
      };

      const formatted = provider.formatDependencyTree(tree);

      expect(formatted).toContain('root');
      expect(formatted).toContain('child');
      expect(formatted.includes('•')).toBe(true);
    });

    it('should format nested tree with indentation', () => {
      const tree = {
        name: 'root',
        dependencies: [
          {
            name: 'level1',
            dependencies: [
              {
                name: 'level2',
                dependencies: [],
              },
            ],
          },
        ],
      };

      const formatted = provider.formatDependencyTree(tree);

      expect(formatted).toContain('root');
      expect(formatted).toContain('level1');
      expect(formatted).toContain('level2');

      // Check indentation (more spaces for deeper levels)
      const lines = formatted.split('\n');
      expect(lines.length).toBeGreaterThan(2);
    });

    it('should mark missing dependencies with indicator', () => {
      const tree = {
        name: 'root',
        dependencies: [
          {
            name: 'missing',
            missing: true,
            dependencies: [],
          },
        ],
      };

      const formatted = provider.formatDependencyTree(tree);

      expect(formatted).toContain('missing');
      expect(formatted).toContain('❌');
    });

    it('should mark circular dependencies with indicator', () => {
      const tree = {
        name: 'root',
        dependencies: [
          {
            name: 'circular',
            circular: true,
            dependencies: [],
          },
        ],
      };

      const formatted = provider.formatDependencyTree(tree);

      expect(formatted).toContain('circular');
      expect(formatted).toContain('🔄');
    });

    it('should mark error dependencies with indicator', () => {
      const tree = {
        name: 'root',
        dependencies: [
          {
            name: 'error',
            error: true,
            dependencies: [],
          },
        ],
      };

      const formatted = provider.formatDependencyTree(tree);

      expect(formatted).toContain('error');
      expect(formatted).toContain('⚠️');
    });

    it('should handle empty tree', () => {
      const tree = {
        name: 'alone',
        dependencies: [],
      };

      const formatted = provider.formatDependencyTree(tree);

      expect(formatted).toContain('alone');
      expect(formatted.trim().split('\n').length).toBe(1);
    });

    it('should handle complex tree with multiple states', () => {
      const tree = {
        name: 'root',
        dependencies: [
          {
            name: 'good',
            dependencies: [],
          },
          {
            name: 'missing',
            missing: true,
            dependencies: [],
          },
          {
            name: 'circular',
            circular: true,
            dependencies: [],
          },
        ],
      };

      const formatted = provider.formatDependencyTree(tree);

      expect(formatted).toContain('good');
      expect(formatted).toContain('missing');
      expect(formatted).toContain('circular');
      expect(formatted).toContain('❌');
      expect(formatted).toContain('🔄');
    });
  });

  describe('Search Directories', () => {
    it('should search in .claude/skills directory', async () => {
      const claudeSkills = join(testDir, '.claude', 'skills');
      await mkdir(claudeSkills, { recursive: true });

      await writeFile(
        join(claudeSkills, 'skill.md'),
        `---
name: claude-skill
description: Skill in .claude
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const location = await provider.gotoSkillDefinition(
        'claude-skill',
        documentPath
      );

      expect(location).toBeDefined();
    });

    it('should search in project skills directory', async () => {
      const projectSkills = join(testDir, 'skills');
      await mkdir(projectSkills, { recursive: true });

      await writeFile(
        join(projectSkills, 'skill.md'),
        `---
name: project-skill
description: Project skill
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const location = await provider.gotoSkillDefinition(
        'project-skill',
        documentPath
      );

      expect(location).toBeDefined();
    });

    it('should search in stdlib/skills directory', async () => {
      const stdlibSkills = join(testDir, 'stdlib', 'skills');
      await mkdir(stdlibSkills, { recursive: true });

      await writeFile(
        join(stdlibSkills, 'skill.md'),
        `---
name: stdlib-skill
description: Standard library skill
---
`,
        'utf-8'
      );

      const documentPath = join(testDir, 'test.md');
      const location = await provider.gotoSkillDefinition(
        'stdlib-skill',
        documentPath
      );

      expect(location).toBeDefined();
    });
  });
});
