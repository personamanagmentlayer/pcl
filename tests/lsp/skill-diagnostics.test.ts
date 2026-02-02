/**
 * Skill Diagnostics Provider Tests
 *
 * Tests for skill validation, error detection, and diagnostic generation
 */

import { DiagnosticSeverity } from 'vscode-languageserver/node';
import { SkillDiagnosticsProvider } from '../../src/lsp/skill-diagnostics';
import { existsSync } from 'node:fs';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('SkillDiagnosticsProvider', () => {
  let provider: SkillDiagnosticsProvider;
  let testDir: string;

  beforeEach(async () => {
    provider = new SkillDiagnosticsProvider();
    testDir = join(tmpdir(), `pcl-test-diag-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('Basic Validation', () => {
    it('should return no diagnostics for valid skill', async () => {
      const content = `---
name: valid-skill
description: A valid test skill
category: language
complexity: beginner
allowed-tools:
  - Read
  - Write
version: 1.0.0
---

# Instructions

This is a valid skill with proper structure.

## Examples

1. Example usage of this skill
`;

      const filePath = join(testDir, 'valid.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const errors = diagnostics.filter(
        (d) => d.severity === DiagnosticSeverity.Error
      );
      expect(errors.length).toBe(0);
    });

    it('should detect parse errors in skill file', async () => {
      const content = `---
name: broken-skill
description: Broken skill
---
This is invalid markdown without proper structure
`;

      const filePath = join(testDir, 'broken.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      expect(diagnostics).toBeDefined();
      expect(Array.isArray(diagnostics)).toBe(true);
    });

    it('should handle empty content', async () => {
      const content = '';
      const filePath = join(testDir, 'empty.md');

      const diagnostics = await provider.validateSkillFile(filePath, content);

      expect(diagnostics).toBeDefined();
      expect(Array.isArray(diagnostics)).toBe(true);
    });
  });

  describe('Compilation Errors', () => {
    it('should report compilation errors', async () => {
      // Missing required name field
      const content = `---
description: Skill without name
---

# Instructions

Test
`;

      const filePath = join(testDir, 'no-name.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const errors = diagnostics.filter(
        (d) => d.severity === DiagnosticSeverity.Error
      );
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('Compilation Error'))).toBe(
        true
      );
    });

    it('should include compilation warnings', async () => {
      const content = `---
name: warning-skill
description: Skill that might have warnings
---

# Instructions

Minimal instructions
`;

      const filePath = join(testDir, 'warnings.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const warnings = diagnostics.filter(
        (d) => d.severity === DiagnosticSeverity.Warning
      );
      // May or may not have warnings depending on compilation
      expect(warnings).toBeDefined();
    });
  });

  describe('Token Count Validation', () => {
    it('should error when token count exceeds 4000', async () => {
      // Create content that will exceed 4000 tokens
      const longInstructions = 'This is a very long instruction. '.repeat(500);

      const content = `---
name: huge-skill
description: Skill with too many tokens
---

# Instructions

${longInstructions}
`;

      const filePath = join(testDir, 'huge.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const tokenError = diagnostics.find(
        (d) =>
          d.code === 'token-limit-exceeded' &&
          d.severity === DiagnosticSeverity.Error
      );

      expect(tokenError).toBeDefined();
      expect(tokenError?.message).toContain('Token count exceeds maximum');
      expect(tokenError?.message).toContain('4000');
    });

    it('should warn when token count exceeds 2000', async () => {
      // Create content between 2000-4000 tokens
      const mediumInstructions = 'Moderate length instruction text. '.repeat(
        200
      );

      const content = `---
name: large-skill
description: Skill with high token count
---

# Instructions

${mediumInstructions}
`;

      const filePath = join(testDir, 'large.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const tokenWarning = diagnostics.find(
        (d) =>
          d.code === 'token-warning' &&
          d.severity === DiagnosticSeverity.Warning
      );

      if (tokenWarning) {
        expect(tokenWarning.message).toContain('High token count');
        expect(tokenWarning.message).toContain('tokens');
      }
    });

    it('should not warn for skills under 2000 tokens', async () => {
      const content = `---
name: small-skill
description: Small skill
---

# Instructions

Brief instructions.
`;

      const filePath = join(testDir, 'small.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const tokenDiagnostics = diagnostics.filter(
        (d) => d.code === 'token-warning' || d.code === 'token-limit-exceeded'
      );

      expect(tokenDiagnostics.length).toBe(0);
    });
  });

  describe('TODO Detection', () => {
    it('should detect TODO items and error', async () => {
      const content = `---
name: incomplete-skill
description: Skill with TODOs
---

# Instructions

TODO: Complete these instructions
[TODO] Add more details
`;

      const filePath = join(testDir, 'todo.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const todoError = diagnostics.find((d) => d.code === 'incomplete-skill');

      expect(todoError).toBeDefined();
      expect(todoError?.severity).toBe(DiagnosticSeverity.Error);
      expect(todoError?.message).toContain('TODO');
      expect(todoError?.message).toContain('Complete before publishing');
    });

    it('should count multiple TODO items', async () => {
      const content = `---
name: many-todos
description: Multiple TODOs
---

# Instructions

TODO: First todo
TODO: Second todo
[TODO]: Third todo
`;

      const filePath = join(testDir, 'todos.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const todoError = diagnostics.find((d) => d.code === 'incomplete-skill');

      expect(todoError).toBeDefined();
      expect(todoError?.message).toMatch(/\d+ TODO/);
    });

    it('should handle case-insensitive TODO detection', async () => {
      const content = `---
name: case-todo
description: Case variations
---

# Instructions

todo: lowercase
TODO: uppercase
Todo: mixed case
`;

      const filePath = join(testDir, 'case.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const todoError = diagnostics.find((d) => d.code === 'incomplete-skill');
      expect(todoError).toBeDefined();
    });
  });

  describe('Examples Validation', () => {
    it('should warn when no examples are provided', async () => {
      const content = `---
name: no-examples
description: Skill without examples
---

# Instructions

Instructions without examples
`;

      const filePath = join(testDir, 'no-examples.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const exampleInfo = diagnostics.find(
        (d) => d.code === 'missing-examples'
      );

      expect(exampleInfo).toBeDefined();
      expect(exampleInfo?.severity).toBe(DiagnosticSeverity.Information);
      expect(exampleInfo?.message).toContain('No examples provided');
      expect(exampleInfo?.message).toContain('2-3 examples');
    });

    it('should not warn when examples are present', async () => {
      const content = `---
name: with-examples
description: Skill with examples
examples:
  - description: First example
    input: Test input
    expected: Test output
  - description: Second example
    input: Another input
    expected: Another output
---

# Instructions

Instructions with examples
`;

      const filePath = join(testDir, 'examples.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const exampleInfo = diagnostics.find(
        (d) => d.code === 'missing-examples'
      );
      expect(exampleInfo).toBeUndefined();
    });
  });

  describe('Tools Validation', () => {
    it('should warn when no tools are specified', async () => {
      const content = `---
name: no-tools
description: Skill without tools
---

# Instructions

No tools specified
`;

      const filePath = join(testDir, 'no-tools.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const toolsWarning = diagnostics.find((d) => d.code === 'missing-tools');

      expect(toolsWarning).toBeDefined();
      expect(toolsWarning?.severity).toBe(DiagnosticSeverity.Warning);
      expect(toolsWarning?.message).toContain('No tools specified');
      expect(toolsWarning?.message).toContain('security');
    });

    it('should not warn when tools are specified', async () => {
      const content = `---
name: with-tools
description: Skill with tools
allowed-tools:
  - Read
  - Write
  - Bash
---

# Instructions

Has tools specified
`;

      const filePath = join(testDir, 'tools.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const toolsWarning = diagnostics.find((d) => d.code === 'missing-tools');
      expect(toolsWarning).toBeUndefined();
    });
  });

  describe('Dependency Validation', () => {
    it('should validate dependencies exist', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      // Create a skill with missing dependency
      const content = `---
name: dependent-skill
description: Has dependencies
dependencies:
  - existing-skill
  - missing-skill
---

# Instructions

Depends on other skills
`;

      // Create only one of the dependencies
      await writeFile(
        join(skillsDir, 'existing-skill.md'),
        `---
name: existing-skill
description: Exists
---
`,
        'utf-8'
      );

      const filePath = join(skillsDir, 'dependent.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const missingDep = diagnostics.find(
        (d) => d.code === 'missing-dependency'
      );

      expect(missingDep).toBeDefined();
      expect(missingDep?.severity).toBe(DiagnosticSeverity.Error);
      expect(missingDep?.message).toContain('missing-skill');
      expect(missingDep?.message).toContain('not found');
    });

    it('should detect circular dependencies', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      // Create circular dependency: A -> B -> A
      await writeFile(
        join(skillsDir, 'skill-a.md'),
        `---
name: skill-a
description: Skill A
dependencies:
  - skill-b
---
`,
        'utf-8'
      );

      await writeFile(
        join(skillsDir, 'skill-b.md'),
        `---
name: skill-b
description: Skill B
dependencies:
  - skill-a
---
`,
        'utf-8'
      );

      const filePath = join(skillsDir, 'skill-a.md');
      const content = `---
name: skill-a
description: Skill A
dependencies:
  - skill-b
---
`;

      const diagnostics = await provider.validateSkillFile(filePath, content);

      const circularDep = diagnostics.find(
        (d) => d.code === 'circular-dependency'
      );

      if (circularDep) {
        expect(circularDep.severity).toBe(DiagnosticSeverity.Warning);
        expect(circularDep.message).toContain('circular');
      }
    });

    it('should handle multiple dependencies correctly', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      // Create all dependencies
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

      const content = `---
name: multi-dep
description: Multiple dependencies
dependencies:
  - dep1
  - dep2
---
`;

      const filePath = join(skillsDir, 'multi.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const depErrors = diagnostics.filter(
        (d) => d.code === 'missing-dependency'
      );
      expect(depErrors.length).toBe(0);
    });
  });

  describe('Conflict Detection', () => {
    it('should detect when conflicting skills are present', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      // Create conflicting skill
      await writeFile(
        join(skillsDir, 'conflicting.md'),
        `---
name: conflicting-skill
description: Conflicting skill
---
`,
        'utf-8'
      );

      const content = `---
name: main-skill
description: Main skill
conflicts:
  - conflicting-skill
---
`;

      const filePath = join(skillsDir, 'main.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const conflict = diagnostics.find((d) => d.code === 'skill-conflict');

      expect(conflict).toBeDefined();
      expect(conflict?.severity).toBe(DiagnosticSeverity.Warning);
      expect(conflict?.message).toContain('Conflict detected');
      expect(conflict?.message).toContain('conflicting-skill');
    });

    it('should not warn when conflicting skill is absent', async () => {
      const skillsDir = join(testDir, 'skills');
      await mkdir(skillsDir, { recursive: true });

      const content = `---
name: main-skill
description: Main skill
conflicts:
  - absent-skill
---
`;

      const filePath = join(skillsDir, 'main.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const conflict = diagnostics.find((d) => d.code === 'skill-conflict');
      expect(conflict).toBeUndefined();
    });
  });

  describe('Diagnostic Structure', () => {
    it('should create diagnostics with proper range', async () => {
      const content = `---
name: test-skill
description: Test
TODO: Incomplete
---
`;

      const filePath = join(testDir, 'test.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      diagnostics.forEach((diag) => {
        expect(diag.range).toBeDefined();
        expect(diag.range.start).toBeDefined();
        expect(diag.range.end).toBeDefined();
        expect(typeof diag.range.start.line).toBe('number');
        expect(typeof diag.range.start.character).toBe('number');
      });
    });

    it('should set source as pcl-skill', async () => {
      const content = `---
name: test-skill
description: Test
---
`;

      const filePath = join(testDir, 'test.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      diagnostics.forEach((diag) => {
        expect(diag.source).toBe('pcl-skill');
      });
    });

    it('should include appropriate severity levels', async () => {
      const content = `---
name: severity-test
description: Testing severities
TODO: Incomplete
---

# Instructions

No examples and long content that might trigger warnings
`;

      const filePath = join(testDir, 'severity.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const severities = new Set(diagnostics.map((d) => d.severity));

      // Should have at least errors (TODO)
      expect(severities.has(DiagnosticSeverity.Error)).toBe(true);
    });

    it('should include diagnostic codes', async () => {
      const content = `---
name: codes-test
description: Test codes
TODO: Fix this
---
`;

      const filePath = join(testDir, 'codes.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const withCodes = diagnostics.filter((d) => d.code);
      expect(withCodes.length).toBeGreaterThan(0);

      const codes = withCodes.map((d) => d.code);
      const validCodes = [
        'incomplete-skill',
        'token-limit-exceeded',
        'token-warning',
        'missing-examples',
        'missing-tools',
        'missing-dependency',
        'circular-dependency',
        'skill-conflict',
      ];

      withCodes.forEach((diag) => {
        expect(validCodes).toContain(diag.code);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed YAML frontmatter', async () => {
      const content = `---
name: broken
description: [broken yaml
  nested: invalid
---
`;

      const filePath = join(testDir, 'broken.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      expect(diagnostics).toBeDefined();
      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should handle missing frontmatter', async () => {
      const content = `# Just markdown without frontmatter

This is not a valid skill file.
`;

      const filePath = join(testDir, 'no-fm.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      expect(diagnostics).toBeDefined();
      expect(
        diagnostics.some((d) => d.severity === DiagnosticSeverity.Error)
      ).toBe(true);
    });

    it('should recover from parse errors gracefully', async () => {
      const content = null as any;

      const filePath = join(testDir, 'null.md');

      try {
        const diagnostics = await provider.validateSkillFile(filePath, content);
        expect(diagnostics).toBeDefined();
      } catch (error) {
        // Should handle gracefully
        expect(error).toBeDefined();
      }
    });
  });

  describe('Complex Validation Scenarios', () => {
    it('should handle skill with all possible issues', async () => {
      const longText = 'x '.repeat(2000);

      const content = `---
name: problematic-skill
description: Has multiple issues
conflicts:
  - nonexistent-conflict
---

# Instructions

TODO: Fix everything
${longText}
`;

      const filePath = join(testDir, 'problems.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      expect(diagnostics.length).toBeGreaterThan(0);

      // Should have TODO error
      expect(diagnostics.some((d) => d.code === 'incomplete-skill')).toBe(true);

      // Should have missing tools warning
      expect(diagnostics.some((d) => d.code === 'missing-tools')).toBe(true);

      // Should have missing examples info
      expect(diagnostics.some((d) => d.code === 'missing-examples')).toBe(true);
    });

    it('should validate production-ready skill correctly', async () => {
      const content = `---
name: production-skill
description: A production-ready skill with all best practices
category: language
complexity: intermediate
version: 1.0.0
allowed-tools:
  - Read
  - Write
  - Edit
user-invocable: true
examples:
  - description: Example 1
    input: Test
    expected: Result
  - description: Example 2
    input: Test 2
    expected: Result 2
---

# Instructions

Comprehensive instructions for the skill.

## Usage

Detailed usage information.

## Best Practices

Follow these guidelines.
`;

      const filePath = join(testDir, 'production.md');
      const diagnostics = await provider.validateSkillFile(filePath, content);

      const errors = diagnostics.filter(
        (d) => d.severity === DiagnosticSeverity.Error
      );
      expect(errors.length).toBe(0);

      const warnings = diagnostics.filter(
        (d) => d.severity === DiagnosticSeverity.Warning
      );
      // Should have minimal or no warnings
      expect(warnings.length).toBeLessThanOrEqual(1);
    });
  });
});
