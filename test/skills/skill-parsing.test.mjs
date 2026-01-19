/**
 * Skill Parsing Tests
 * Tests the new skill syntax with instructions, examples, tools, dependencies
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../../dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(__dirname, '..', '..', 'examples', 'skills');

describe('Skill Parsing', () => {
  it('should parse skill with instructions', () => {
    const code = `
      skill TestSkill {
        name: "Test Skill"
        version: "1.0.0"
        instructions: """
        You are an expert in testing.
        Follow best practices.
        """
      }
    `;

    const result = parse(code);
    assert.ok(result.ok, 'Parse should succeed');
    const { program, errors } = result.value;
    assert.strictEqual(errors.length, 0, 'Should have no errors');

    const skill = program.statements[0];
    assert.strictEqual(skill.kind, 'SkillDeclaration');
    assert.strictEqual(skill.id.name, 'TestSkill');

    const instrMember = skill.body.members.find(m => m.kind === 'SkillInstructionsDeclaration');
    assert.ok(instrMember, 'Should have instructions declaration');
    assert.ok(instrMember.instructions.value.includes('expert in testing'));
  });

  it('should parse skill with examples', () => {
    const code = `
      skill CodeSkill {
        name: "Code Skill"
        examples: [
          {
            description: "Example 1",
            code: "console.log('hello')"
          },
          {
            description: "Example 2",
            code: "const x = 42"
          }
        ]
      }
    `;

    const result = parse(code);
    assert.ok(result.ok, 'Parse should succeed');
    const { program, errors } = result.value;
    assert.strictEqual(errors.length, 0, `Should have no errors, got: ${JSON.stringify(errors)}`);

    const skill = program.statements[0];
    const examplesMember = skill.body.members.find(m => m.kind === 'SkillExamplesDeclaration');
    assert.ok(examplesMember, 'Should have examples declaration');
    assert.strictEqual(examplesMember.examples.length, 2);
    assert.strictEqual(examplesMember.examples[0].description.value, 'Example 1');
    assert.strictEqual(examplesMember.examples[0].code.value, "console.log('hello')");
  });

  it('should parse skill with tools', () => {
    const code = `
      skill ToolSkill {
        name: "Tool Skill"
        tools: ["read", "write", "execute"]
      }
    `;

    const result = parse(code);
    assert.ok(result.ok, 'Parse should succeed');
    const { program, errors } = result.value;
    assert.strictEqual(errors.length, 0, 'Should have no errors');

    const skill = program.statements[0];
    const toolsMember = skill.body.members.find(m => m.kind === 'SkillToolsDeclaration');
    assert.ok(toolsMember, 'Should have tools declaration');
    assert.strictEqual(toolsMember.tools.length, 3);
    assert.strictEqual(toolsMember.tools[0].value, 'read');
  });

  it('should parse skill with dependencies', () => {
    const code = `
      skill DependentSkill {
        name: "Dependent Skill"
        dependencies: ["@pcl/skills/base", "@pcl/skills/helper"]
      }
    `;

    const result = parse(code);
    assert.ok(result.ok, 'Parse should succeed');
    const { program, errors } = result.value;
    assert.strictEqual(errors.length, 0, 'Should have no errors');

    const skill = program.statements[0];
    const depsMember = skill.body.members.find(m => m.kind === 'SkillDependenciesDeclaration');
    assert.ok(depsMember, 'Should have dependencies declaration');
    assert.strictEqual(depsMember.dependencies.length, 2);
  });

  it('should parse complete skill declaration', () => {
    const code = `
      skill CompleteSkill {
        name: "Complete Skill"
        version: "2.0.0"
        category: "technical"
        description: "A complete skill with all features"

        metadata: {
          author: "Test Author"
          license: "MIT"
          tags: ["test", "complete"]
        }

        instructions: """
        ## Instructions
        This is a complete skill.
        """

        examples: [
          {
            description: "Example usage",
            code: "// Example code"
          }
        ]

        tools: ["read", "write"]
        dependencies: []
      }
    `;

    const result = parse(code);
    assert.ok(result.ok, 'Parse should succeed');
    const { program, errors } = result.value;
    assert.strictEqual(errors.length, 0, 'Should have no errors');

    const skill = program.statements[0];
    assert.strictEqual(skill.kind, 'SkillDeclaration');
    assert.strictEqual(skill.id.name, 'CompleteSkill');

    // Check all members are present
    const memberKinds = skill.body.members.map(m => m.kind);
    assert.ok(memberKinds.includes('PropertyDeclaration')); // name, version, etc.
    assert.ok(memberKinds.includes('SkillInstructionsDeclaration'));
    assert.ok(memberKinds.includes('SkillExamplesDeclaration'));
    assert.ok(memberKinds.includes('SkillToolsDeclaration'));
    assert.ok(memberKinds.includes('SkillDependenciesDeclaration'));
  });

  it('should parse python-expert.skill.pcl file', () => {
    try {
      const filePath = join(examplesDir, 'python-expert.skill.pcl');
      const code = readFileSync(filePath, 'utf-8');

      const result = parse(code);
      assert.ok(result.ok, 'Parse should succeed');
      const { program, errors } = result.value;

      if (errors.length > 0) {
        console.error('Parse errors:', errors);
      }
      assert.strictEqual(errors.length, 0, 'Should have no errors');

      const skill = program.statements[0];
      assert.strictEqual(skill.kind, 'SkillDeclaration');
      assert.strictEqual(skill.id.name, 'PythonExpert');

      // Verify it has instructions
      const instrMember = skill.body.members.find(m => m.kind === 'SkillInstructionsDeclaration');
      assert.ok(instrMember, 'Should have instructions');
      assert.ok(instrMember.instructions.value.includes('Python Expertise'));

      // Verify it has examples
      const examplesMember = skill.body.members.find(m => m.kind === 'SkillExamplesDeclaration');
      assert.ok(examplesMember, 'Should have examples');
      assert.ok(examplesMember.examples.length > 0);

      // Verify it has tools
      const toolsMember = skill.body.members.find(m => m.kind === 'SkillToolsDeclaration');
      assert.ok(toolsMember, 'Should have tools');
      assert.ok(toolsMember.tools.length > 0);

      console.log('✅ Successfully parsed python-expert.skill.pcl');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('⚠️  File not found, skipping test:', error.message);
      } else {
        throw error;
      }
    }
  });
});
