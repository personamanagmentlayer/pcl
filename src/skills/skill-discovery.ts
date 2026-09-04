/**
 * Skill Discovery
 *
 * Enumerates skill entry points inside a search directory.
 *
 * Agent Skills v1.0 stores a skill as its own directory holding a SKILL.md.
 * The PCL standard library groups those directories by category, so a skill
 * file sits two levels below the library root:
 *
 *   stdlib/<category>/<skill-name>/SKILL.md
 *   .claude/skills/<skill-name>/SKILL.md
 *   .claude/skills/<skill-name>.md          (legacy flat file)
 *
 * All three shapes are recognised so that older layouts keep resolving.
 */

import { readdir, stat } from 'fs/promises';
import { join } from 'path';

/** How deep to look for `<dir>/.../SKILL.md` entry points. */
const MAX_DEPTH = 2;

/** Directory names that never contain a skill entry point. */
const IGNORED = new Set([
  'references',
  'scripts',
  'assets',
  'node_modules',
  'catalog',
  '.git',
]);

/**
 * List every skill entry point reachable from a search directory.
 *
 * @param dir - Directory to scan
 * @returns Absolute paths of skill files, sorted for deterministic results
 */
export async function findSkillFiles(dir: string): Promise<string[]> {
  const found: string[] = [];
  await collect(dir, 0, found);
  return found.sort();
}

async function collect(
  dir: string,
  depth: number,
  found: string[]
): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return; // Missing or unreadable directory is not an error here
  }

  const subdirectories: string[] = [];

  for (const entry of entries) {
    const full = join(dir, entry);

    if (entry.endsWith('.md')) {
      // At the top level a bare *.md is a legacy flat skill; deeper down only
      // SKILL.md is an entry point, everything else is supporting material.
      if (depth === 0 || entry === 'SKILL.md') {
        found.push(full);
      }
      continue;
    }

    if (depth >= MAX_DEPTH || IGNORED.has(entry) || entry.startsWith('.')) {
      continue;
    }

    try {
      if ((await stat(full)).isDirectory()) {
        subdirectories.push(full);
      }
    } catch {
      // Skip entries that cannot be stat'ed
    }
  }

  await Promise.all(
    subdirectories.map((sub) => collect(sub, depth + 1, found))
  );
}
