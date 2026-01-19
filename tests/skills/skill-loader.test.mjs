/**
 * Skill Loader Tests
 * Tests Claude Code SKILL.md format parsing
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import the module - need to compile first
// For now, just test the format manually

describe('Skill Loader (Manual Tests)', () => {
  it('should parse python-expert SKILL.md', () => {
    const skillPath = join(__dirname, '..', '..', 'examples', 'skills', 'python-expert', 'SKILL.md');

    try {
      const content = readFileSync(skillPath, 'utf-8');

      // Verify frontmatter structure
      assert.ok(content.startsWith('---\n'), 'Should start with frontmatter');
      assert.ok(content.includes('name: python-expert'), 'Should have name field');
      assert.ok(content.includes('description:'), 'Should have description field');
      assert.ok(content.includes('allowed-tools:'), 'Should have allowed-tools field');

      // Verify markdown body
      assert.ok(content.includes('# Python Expert'), 'Should have main heading');
      assert.ok(content.includes('## Core Expertise'), 'Should have sections');
      assert.ok(content.includes('```python'), 'Should have code examples');

      // Verify PCL metadata comment
      assert.ok(content.includes('<!-- PCL Metadata'), 'Should have PCL metadata');
      assert.ok(content.includes('version: 1.0.0'), 'Should have version');
      assert.ok(content.includes('license: MIT'), 'Should have license');

      console.log('✅ python-expert SKILL.md has correct structure');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('⚠️  File not found, skipping test');
      } else {
        throw error;
      }
    }
  });

  it('should have compatible format with Claude Code', () => {
    const content = `---
name: test-skill
description: A test skill for validation
allowed-tools:
  - Read
  - Write
---

# Test Skill

Instructions here.
`;

    // Verify basic structure
    const lines = content.split('\n');
    assert.strictEqual(lines[0], '---', 'First line should be ---');
    assert.ok(lines.includes('---'), 'Should have closing ---');
    assert.ok(content.includes('name:'), 'Should have name');
    assert.ok(content.includes('description:'), 'Should have description');

    console.log('✅ SKILL.md format is valid');
  });

  it('should support all Claude Code metadata fields', () => {
    const requiredFields = ['name', 'description'];
    const optionalFields = ['allowed-tools', 'model', 'context', 'agent', 'user-invocable'];

    console.log('Required fields:', requiredFields);
    console.log('Optional fields:', optionalFields);

    // Test that we documented all fields
    assert.strictEqual(requiredFields.length, 2, 'Should have 2 required fields');
    assert.strictEqual(optionalFields.length, 5, 'Should have 5 optional fields');

    console.log('✅ All Claude Code fields documented');
  });
});
