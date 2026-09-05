/**
 * Skill Discovery Tests
 *
 * The standard library stores skills as <category>/<name>/SKILL.md, while
 * .claude/skills historically held flat <name>.md files. Discovery must find
 * both without mistaking supporting material (references/) for a skill.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { findSkillFiles } from '../../src/skills/skill-discovery';

let root: string;

function write(relative: string, content = '# skill\n'): void {
  const full = join(root, relative);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

beforeEach(() => {
  // mkdtempSync creates the directory atomically with a random suffix and
  // 0700 permissions. join(tmpdir(), <predictable name>) is world-readable
  // and racy: another user can pre-create or symlink the path.
  root = mkdtempSync(join(tmpdir(), 'pcl-skill-discovery-'));
});

afterEach(() => {
  if (existsSync(root)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('findSkillFiles', () => {
  it('finds flat *.md files at the top level', async () => {
    write('code-review.md');
    write('testing.md');

    const found = await findSkillFiles(root);

    expect(found).toHaveLength(2);
    expect(found.every((f) => f.endsWith('.md'))).toBe(true);
  });

  it('finds <name>/SKILL.md', async () => {
    write('python-expert/SKILL.md');

    const found = await findSkillFiles(root);

    expect(found).toHaveLength(1);
    expect(found[0]).toContain('python-expert');
  });

  it('finds <category>/<name>/SKILL.md', async () => {
    write('languages/python-expert/SKILL.md');
    write('devops/docker-expert/SKILL.md');

    const found = await findSkillFiles(root);

    expect(found).toHaveLength(2);
  });

  it('ignores reference material inside a skill', async () => {
    write('languages/python-expert/SKILL.md');
    write('languages/python-expert/references/EXAMPLES.md');
    write('languages/python-expert/references/CORE_CONCEPTS.md');

    const found = await findSkillFiles(root);

    expect(found).toHaveLength(1);
    expect(found[0]).toContain('SKILL.md');
  });

  it('ignores non-SKILL markdown below the top level', async () => {
    write('languages/README.md');
    write('languages/python-expert/SKILL.md');
    write('languages/python-expert/NOTES.md');

    const found = await findSkillFiles(root);

    expect(found).toHaveLength(1);
    expect(found[0]).toContain('python-expert');
  });

  it('returns an empty list for a missing directory', async () => {
    const found = await findSkillFiles(join(root, 'does-not-exist'));

    expect(found).toEqual([]);
  });

  it('returns results in a deterministic order', async () => {
    write('devops/docker-expert/SKILL.md');
    write('languages/python-expert/SKILL.md');
    write('api/graphql-expert/SKILL.md');

    const first = await findSkillFiles(root);
    const second = await findSkillFiles(root);

    expect(first).toEqual(second);
    expect(first).toEqual([...first].sort());
  });
});
