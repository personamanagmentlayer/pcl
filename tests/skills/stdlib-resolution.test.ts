/**
 * Standard Library Resolution Test
 *
 * Guards the wiring between the resolver and the real stdlib tree: a skill
 * named in PCL source must resolve to the file that actually ships.
 */

import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { SkillResolver } from '../../src/skills/skill-resolver';

const stdlibDir = join(__dirname, '..', '..', 'stdlib');

describe('standard library resolution', () => {
  it('resolves shipped skills by bare name', async () => {
    const resolver = new SkillResolver({ stdlibDir, cache: false });

    for (const name of ['python-expert', 'legaltech-expert', 'webrtc-expert']) {
      const result = await resolver.resolve(name);
      expect(result.ok, `${name} should resolve`).toBe(true);
      if (result.ok) {
        expect(result.value.skill.name).toBe(name);
        expect(result.value.source).toContain('SKILL.md');
      }
    }
  });

  it('does not resolve a category directory or an unknown skill', async () => {
    const resolver = new SkillResolver({ stdlibDir, cache: false });

    for (const name of ['languages', 'no-such-expert']) {
      const result = await resolver.resolve(name);
      expect(result.ok, `${name} should not resolve`).toBe(false);
    }
  });
});
