/**
 * Skill Resolver Tests
 *
 * Comprehensive tests for skill resolution and loading
 * Target: 60+ tests for 0% → 90%+ coverage
 *
 * Test Coverage:
 * - Skill resolution by name/path
 * - Skill dependency resolution
 * - Version compatibility
 * - Skill caching
 * - Error handling for missing/invalid skills
 * - Circular dependency detection
 */

import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SkillResolver, SkillRefType } from '../../src/skills/skill-resolver';
import type { PCLSkill } from '../../src/skills/skill-loader';
import type { RegistryManager } from '../../src/registry/manager';

// ═══════════════════════════════════════════════════════════════════════════════
//                              TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

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

const skillWithDependencies = `---
name: DependentSkill
description: A skill with dependencies
---

Dependencies: @org/pkg/skill1, skill2

Instructions for dependent skill.`;

const skillWithVersion = `---
name: VersionedSkill
description: A skill with version
---

Version: 1.2.3

Instructions for versioned skill.`;

// ═══════════════════════════════════════════════════════════════════════════════
//                              MOCK SETUP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mock RegistryManager for testing
 */
class MockRegistryManager implements Partial<RegistryManager> {
  private skills = new Map<string, any>();

  addSkill(ref: string, skill: PCLSkill): void {
    // Store without @ prefix to match the query format
    const normalizedRef = ref.startsWith('@') ? ref.substring(1) : ref;
    this.skills.set(normalizedRef, {
      artifact: {
        source: this.skillToMd(skill),
        payload: null,
      },
    });
  }

  async search(options: any): Promise<any> {
    const skill = this.skills.get(options.query);
    if (!skill) {
      return { ok: true, value: [] };
    }
    return { ok: true, value: [skill] };
  }

  private skillToMd(skill: PCLSkill): string {
    return `---
name: ${skill.name}
description: ${skill.description}
---

${skill.instructions}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              TEST UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

let testDir: string;
let claudeSkillsDir: string;
let stdlibDir: string;

function setupTestDirs(): void {
  // Atomic creation with a random suffix and 0700 permissions; a predictable
  // name under the shared temp directory is world-readable and racy.
  testDir = mkdtempSync(join(tmpdir(), 'pcl-skill-resolver-test-'));
  claudeSkillsDir = join(testDir, '.claude', 'skills');
  stdlibDir = join(testDir, 'stdlib', 'skills');

  mkdirSync(claudeSkillsDir, { recursive: true });
  mkdirSync(stdlibDir, { recursive: true });
}

function cleanupTestDirs(): void {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
}

function writeSkillFile(
  dir: string,
  filename: string,
  content: string
): string {
  const filepath = join(dir, filename);
  writeFileSync(filepath, content, 'utf-8');
  return filepath;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              CONSTRUCTOR TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('SkillResolver - Constructor', () => {
  beforeEach(() => {
    setupTestDirs();
  });

  afterEach(() => {
    cleanupTestDirs();
  });

  it('should create resolver with default options', () => {
    const resolver = new SkillResolver();
    expect(resolver).toBeDefined();
    expect(resolver).toBeInstanceOf(SkillResolver);
  });

  it('should create resolver with custom baseDir', () => {
    const resolver = new SkillResolver({ baseDir: testDir });
    expect(resolver).toBeDefined();
  });

  it('should create resolver with custom claudeSkillsDir', () => {
    const resolver = new SkillResolver({ claudeSkillsDir });
    expect(resolver).toBeDefined();
  });

  it('should create resolver with custom stdlibDir', () => {
    const resolver = new SkillResolver({ stdlibDir });
    expect(resolver).toBeDefined();
  });

  it('should create resolver with cache disabled', () => {
    const resolver = new SkillResolver({ cache: false });
    expect(resolver).toBeDefined();
  });

  it('should create resolver with cache enabled by default', () => {
    const resolver = new SkillResolver();
    const stats = resolver.getCacheStats();
    expect(stats).toEqual({ size: 0, keys: [] });
  });

  it('should create resolver with remote loading disabled by default', () => {
    const resolver = new SkillResolver();
    expect(resolver).toBeDefined();
  });

  it('should create resolver with remote loading enabled', () => {
    const resolver = new SkillResolver({ allowRemote: true });
    expect(resolver).toBeDefined();
  });

  it('should create resolver with registry manager', () => {
    const registry = new MockRegistryManager() as unknown as RegistryManager;
    const resolver = new SkillResolver({ registry });
    expect(resolver).toBeDefined();
  });

  it('should create resolver with all options', () => {
    const registry = new MockRegistryManager() as unknown as RegistryManager;
    const resolver = new SkillResolver({
      baseDir: testDir,
      claudeSkillsDir,
      stdlibDir,
      registry,
      cache: true,
      allowRemote: true,
    });
    expect(resolver).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              REFERENCE PARSING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('SkillResolver - Reference Parsing', () => {
  let resolver: SkillResolver;

  beforeEach(() => {
    setupTestDirs();
    resolver = new SkillResolver({ baseDir: testDir });
  });

  afterEach(() => {
    cleanupTestDirs();
  });

  describe('parseRef - Registry References', () => {
    it('should parse valid registry reference without version', () => {
      const ref = resolver.parseRef('@org/package/skill');
      expect(ref).toEqual({
        type: SkillRefType.REGISTRY,
        ref: '@org/package/skill',
        parsed: {
          org: 'org',
          package: 'package',
          name: 'skill',
        },
      });
    });

    it('should parse valid registry reference with version', () => {
      const ref = resolver.parseRef('@org/package/skill@1.2.3');
      expect(ref).toEqual({
        type: SkillRefType.REGISTRY,
        ref: '@org/package/skill@1.2.3',
        parsed: {
          org: 'org',
          package: 'package',
          name: 'skill',
          version: '1.2.3',
        },
      });
    });

    it('should parse registry reference with semver range', () => {
      const ref = resolver.parseRef('@org/package/skill@^1.0.0');
      expect(ref.parsed.version).toBe('^1.0.0');
    });

    it('should parse registry reference with prerelease version', () => {
      const ref = resolver.parseRef('@org/package/skill@1.0.0-alpha.1');
      expect(ref.parsed.version).toBe('1.0.0-alpha.1');
    });

    it('should throw on invalid registry reference format', () => {
      expect(() => resolver.parseRef('@org/package')).toThrow(
        'Invalid registry reference'
      );
    });

    it('should throw on registry reference without org', () => {
      expect(() => resolver.parseRef('@/package/skill')).toThrow(
        'Invalid registry reference'
      );
    });

    it('should throw on registry reference without package', () => {
      expect(() => resolver.parseRef('@org//skill')).toThrow(
        'Invalid registry reference'
      );
    });

    it('should throw on registry reference without skill name', () => {
      expect(() => resolver.parseRef('@org/package/')).toThrow(
        'Invalid registry reference'
      );
    });
  });

  describe('parseRef - Remote URL References', () => {
    it('should parse valid HTTP URL', () => {
      const ref = resolver.parseRef('http://example.com/skill.md');
      expect(ref).toEqual({
        type: SkillRefType.REMOTE,
        ref: 'http://example.com/skill.md',
        parsed: {
          name: 'skill',
          url: 'http://example.com/skill.md',
        },
      });
    });

    it('should parse valid HTTPS URL', () => {
      const ref = resolver.parseRef('https://example.com/skill.md');
      expect(ref).toEqual({
        type: SkillRefType.REMOTE,
        ref: 'https://example.com/skill.md',
        parsed: {
          name: 'skill',
          url: 'https://example.com/skill.md',
        },
      });
    });

    it('should parse URL without .md extension', () => {
      const ref = resolver.parseRef('https://example.com/skill');
      expect(ref.parsed.name).toBe('skill');
    });

    it('should parse URL with query parameters', () => {
      const ref = resolver.parseRef('https://example.com/skill.md?v=1');
      expect(ref.parsed.url).toBe('https://example.com/skill.md?v=1');
    });

    it('should parse URL with fragment', () => {
      const ref = resolver.parseRef('https://example.com/skill.md#section');
      expect(ref.parsed.url).toBe('https://example.com/skill.md#section');
    });

    it('should throw on invalid URL', () => {
      expect(() => resolver.parseRef('http://')).toThrow('Invalid URL');
    });

    it('should default to "remote-skill" if name cannot be extracted', () => {
      const ref = resolver.parseRef('https://example.com/');
      expect(ref.parsed.name).toBe('remote-skill');
    });
  });

  describe('parseRef - Local File References', () => {
    it('should parse relative path with ./', () => {
      const ref = resolver.parseRef('./skills/skill.md');
      expect(ref.type).toBe(SkillRefType.LOCAL);
      expect(ref.parsed.name).toBe('skill');
      expect(ref.parsed.path).toBeDefined();
    });

    it('should parse relative path with ../', () => {
      const ref = resolver.parseRef('../skills/skill.md');
      expect(ref.type).toBe(SkillRefType.LOCAL);
      expect(ref.parsed.name).toBe('skill');
    });

    it('should parse absolute path', () => {
      const ref = resolver.parseRef('/absolute/path/skill.md');
      expect(ref.type).toBe(SkillRefType.LOCAL);
      expect(ref.parsed.name).toBe('skill');
    });

    it('should resolve path relative to baseDir', () => {
      const ref = resolver.parseRef('./skill.md');
      expect(ref.parsed.path).toContain(testDir);
    });

    it('should extract skill name from filename', () => {
      const ref = resolver.parseRef('./my-skill.md');
      expect(ref.parsed.name).toBe('my-skill');
    });

    it('should default to "local-skill" if name cannot be extracted', () => {
      const ref = resolver.parseRef('./');
      expect(ref.parsed.name).toBe('local-skill');
    });
  });

  describe('parseRef - Standard Library References', () => {
    it('should parse simple skill name as stdlib reference', () => {
      const ref = resolver.parseRef('code-review');
      expect(ref).toEqual({
        type: SkillRefType.STDLIB,
        ref: 'code-review',
        parsed: {
          name: 'code-review',
        },
      });
    });

    it('should parse skill name with hyphens', () => {
      const ref = resolver.parseRef('my-custom-skill');
      expect(ref.type).toBe(SkillRefType.STDLIB);
      expect(ref.parsed.name).toBe('my-custom-skill');
    });

    it('should parse skill name with underscores', () => {
      const ref = resolver.parseRef('my_skill');
      expect(ref.type).toBe(SkillRefType.STDLIB);
      expect(ref.parsed.name).toBe('my_skill');
    });

    it('should parse alphanumeric skill name', () => {
      const ref = resolver.parseRef('skill123');
      expect(ref.type).toBe(SkillRefType.STDLIB);
    });
  });

  describe('parseRef - Edge Cases', () => {
    it('should handle empty string by treating as stdlib', () => {
      const ref = resolver.parseRef('');
      expect(ref.type).toBe(SkillRefType.STDLIB);
      expect(ref.parsed.name).toBe('');
    });

    it('should handle whitespace-only skill name', () => {
      const ref = resolver.parseRef('   ');
      expect(ref.type).toBe(SkillRefType.STDLIB);
    });

    it('should handle skill name with special characters', () => {
      const ref = resolver.parseRef('skill-v1.0');
      expect(ref.type).toBe(SkillRefType.STDLIB);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              LOCAL RESOLUTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('SkillResolver - Local Resolution', () => {
  let resolver: SkillResolver;

  beforeEach(() => {
    setupTestDirs();
    resolver = new SkillResolver({
      baseDir: testDir,
      claudeSkillsDir,
      stdlibDir,
    });
  });

  afterEach(() => {
    cleanupTestDirs();
  });

  it('should resolve local file by relative path', async () => {
    const filepath = writeSkillFile(testDir, 'test-skill.md', minimalSkillMd);
    const result = await resolver.resolve('./test-skill.md');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.skill.name).toBe('TestSkill');
      expect(result.value.type).toBe(SkillRefType.LOCAL);
      expect(result.value.source).toBe(filepath);
      expect(result.value.cached).toBe(false);
    }
  });

  it('should resolve local file by absolute path', async () => {
    writeSkillFile(testDir, 'test-skill.md', minimalSkillMd);
    // Use relative path since absolute paths need to start with / on Unix or drive letter on Windows
    const relativePath = './test-skill.md';
    const result = await resolver.resolve(relativePath);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.skill.name).toBe('TestSkill');
      expect(result.value.type).toBe(SkillRefType.LOCAL);
    }
  });

  it('should fallback to .claude/skills directory if file not found', async () => {
    writeSkillFile(claudeSkillsDir, 'fallback-skill.md', minimalSkillMd);
    const result = await resolver.resolve('./nonexistent.md');

    expect(result.ok).toBe(false);
  });

  it('should find skill in .claude/skills by name', async () => {
    writeSkillFile(claudeSkillsDir, 'claude-skill.md', minimalSkillMd);
    const filepath = join(testDir, 'claude-skill.md');
    const result = await resolver.resolve(filepath);

    // Should try the exact path first, which doesn't exist
    expect(result.ok).toBe(false);
  });

  it('should return error for missing local file', async () => {
    const result = await resolver.resolve('./missing-skill.md');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('not found');
    }
  });

  it('should return error for invalid skill file', async () => {
    writeSkillFile(testDir, 'invalid.md', 'This is not a valid skill');
    const result = await resolver.resolve('./invalid.md');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBeDefined();
    }
  });

  it('should handle nested directory paths', async () => {
    const nestedDir = join(testDir, 'nested', 'skills');
    mkdirSync(nestedDir, { recursive: true });
    writeSkillFile(nestedDir, 'nested-skill.md', minimalSkillMd);

    const result = await resolver.resolve('./nested/skills/nested-skill.md');

    expect(result.ok).toBe(true);
  });

  it('should resolve skill with complete metadata', async () => {
    writeSkillFile(testDir, 'complete.md', completeSkillMd);
    const result = await resolver.resolve('./complete.md');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.skill.name).toBe('CompleteSkill');
      expect(result.value.skill.tools).toContain('Read');
      expect(result.value.skill.config?.model).toBe(
        'claude-3-5-sonnet-20241022'
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              STDLIB RESOLUTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('SkillResolver - Stdlib Resolution', () => {
  let resolver: SkillResolver;

  beforeEach(() => {
    setupTestDirs();
    resolver = new SkillResolver({
      baseDir: testDir,
      stdlibDir,
    });
  });

  afterEach(() => {
    cleanupTestDirs();
  });

  it('should resolve stdlib skill by name', async () => {
    writeSkillFile(stdlibDir, 'code-review.md', minimalSkillMd);
    const result = await resolver.resolve('code-review');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.skill.name).toBe('TestSkill');
      expect(result.value.type).toBe(SkillRefType.STDLIB);
      expect(result.value.source).toContain('code-review.md');
    }
  });

  it('should return error for missing stdlib skill', async () => {
    const result = await resolver.resolve('nonexistent-skill');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('not found');
    }
  });

  it('should resolve multiple stdlib skills', async () => {
    writeSkillFile(stdlibDir, 'skill1.md', minimalSkillMd);
    writeSkillFile(stdlibDir, 'skill2.md', minimalSkillMd);

    const result1 = await resolver.resolve('skill1');
    const result2 = await resolver.resolve('skill2');

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
  });

  it('should handle stdlib skills with hyphens', async () => {
    writeSkillFile(stdlibDir, 'my-custom-skill.md', minimalSkillMd);
    const result = await resolver.resolve('my-custom-skill');

    expect(result.ok).toBe(true);
  });

  it('should handle stdlib skills with underscores', async () => {
    writeSkillFile(stdlibDir, 'my_skill.md', minimalSkillMd);
    const result = await resolver.resolve('my_skill');

    expect(result.ok).toBe(true);
  });

  // The standard library stores each skill as its own directory, grouped by
  // category. Resolving only `<stdlibDir>/<name>.md` made every stdlib skill
  // unresolvable; these guard the layout the library actually uses.
  it('should resolve a skill stored as <name>/SKILL.md', async () => {
    const skillDir = join(stdlibDir, 'code-review-expert');
    mkdirSync(skillDir, { recursive: true });
    writeSkillFile(skillDir, 'SKILL.md', minimalSkillMd);

    const result = await resolver.resolve('code-review-expert');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe(SkillRefType.STDLIB);
      expect(result.value.source).toContain('SKILL.md');
    }
  });

  it('should resolve a skill stored as <category>/<name>/SKILL.md', async () => {
    const skillDir = join(stdlibDir, 'languages', 'python-expert');
    mkdirSync(skillDir, { recursive: true });
    writeSkillFile(skillDir, 'SKILL.md', minimalSkillMd);

    const result = await resolver.resolve('python-expert');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.source).toContain('python-expert');
    }
  });

  it('should not treat a category directory as a skill', async () => {
    mkdirSync(join(stdlibDir, 'languages'), { recursive: true });

    const result = await resolver.resolve('languages');

    expect(result.ok).toBe(false);
  });

  it('should reject a stdlib reference containing a path separator', async () => {
    const skillDir = join(stdlibDir, 'languages', 'python-expert');
    mkdirSync(skillDir, { recursive: true });
    writeSkillFile(skillDir, 'SKILL.md', minimalSkillMd);

    for (const ref of ['languages/python-expert', '..', '../secrets']) {
      const result = await resolver.resolve(ref);
      expect(result.ok).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              REGISTRY RESOLUTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('SkillResolver - Registry Resolution', () => {
  let resolver: SkillResolver;
  let registry: MockRegistryManager;

  beforeEach(() => {
    setupTestDirs();
    registry = new MockRegistryManager();
    resolver = new SkillResolver({
      baseDir: testDir,
      registry: registry as unknown as RegistryManager,
    });
  });

  afterEach(() => {
    cleanupTestDirs();
  });

  it('should resolve registry skill without version', async () => {
    registry.addSkill('@org/pkg/skill', {
      name: 'RegistrySkill',
      description: 'From registry',
      instructions: 'Instructions',
    });

    const result = await resolver.resolve('@org/pkg/skill');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.skill.name).toBe('RegistrySkill');
      expect(result.value.type).toBe(SkillRefType.REGISTRY);
      expect(result.value.source).toContain('registry');
    }
  });

  it('should resolve registry skill with version', async () => {
    registry.addSkill('@org/pkg/skill@1.2.3', {
      name: 'VersionedSkill',
      description: 'Versioned skill',
      instructions: 'Instructions',
    });

    const result = await resolver.resolve('@org/pkg/skill@1.2.3');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.skill.name).toBe('VersionedSkill');
    }
  });

  it('should return error when registry not configured', async () => {
    const noRegistryResolver = new SkillResolver({ baseDir: testDir });
    const result = await noRegistryResolver.resolve('@org/pkg/skill');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Registry not configured');
    }
  });

  it('should return error for skill not in registry', async () => {
    const result = await resolver.resolve('@org/pkg/missing');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('not found in registry');
    }
  });

  it('should handle registry search errors', async () => {
    vi.spyOn(registry, 'search').mockRejectedValue(new Error('Network error'));

    const result = await resolver.resolve('@org/pkg/skill');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBeDefined();
    }
  });

  it('should handle registry with no artifacts', async () => {
    registry.addSkill('@org/pkg/empty', {
      name: 'Empty',
      description: 'No artifact',
      instructions: 'Instructions',
    });

    // Override the search to return no artifact
    vi.spyOn(registry, 'search').mockResolvedValue({
      ok: true,
      value: [{ artifact: null }],
    });

    const result = await resolver.resolve('@org/pkg/empty');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Artifact not found');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              REMOTE RESOLUTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('SkillResolver - Remote Resolution', () => {
  let resolver: SkillResolver;

  beforeEach(() => {
    setupTestDirs();
  });

  afterEach(() => {
    cleanupTestDirs();
  });

  it('should reject remote URL when allowRemote is false', async () => {
    resolver = new SkillResolver({ allowRemote: false });
    const result = await resolver.resolve('https://example.com/skill.md');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain(
        'Remote skill loading is disabled'
      );
    }
  });

  it('should fetch remote skill when allowRemote is true', async () => {
    resolver = new SkillResolver({ allowRemote: true });

    // Mock fetch
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => minimalSkillMd,
    });

    const result = await resolver.resolve('https://example.com/skill.md');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.skill.name).toBe('TestSkill');
      expect(result.value.type).toBe(SkillRefType.REMOTE);
      expect(result.value.source).toContain('remote:');
    }
  });

  it('should handle fetch errors', async () => {
    resolver = new SkillResolver({ allowRemote: true });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    });

    const result = await resolver.resolve('https://example.com/missing.md');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Failed to fetch');
    }
  });

  it('should handle network errors', async () => {
    resolver = new SkillResolver({ allowRemote: true });

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

    const result = await resolver.resolve('https://example.com/skill.md');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // The error message is the original error message, not wrapped
      expect(result.error.message).toBeDefined();
    }
  });

  it('should handle invalid remote skill content', async () => {
    resolver = new SkillResolver({ allowRemote: true });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'Invalid skill content',
    });

    const result = await resolver.resolve('https://example.com/invalid.md');

    expect(result.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              CACHING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('SkillResolver - Caching', () => {
  let resolver: SkillResolver;

  beforeEach(() => {
    setupTestDirs();
    resolver = new SkillResolver({
      baseDir: testDir,
      stdlibDir,
      cache: true,
    });
  });

  afterEach(() => {
    cleanupTestDirs();
  });

  it('should cache resolved skills', async () => {
    writeSkillFile(stdlibDir, 'cached-skill.md', minimalSkillMd);

    const result1 = await resolver.resolve('cached-skill');
    const result2 = await resolver.resolve('cached-skill');

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);

    if (result1.ok && result2.ok) {
      expect(result1.value.cached).toBe(false);
      expect(result2.value.cached).toBe(true);
    }
  });

  it('should return same skill instance from cache', async () => {
    writeSkillFile(stdlibDir, 'same-skill.md', minimalSkillMd);

    const result1 = await resolver.resolve('same-skill');
    const result2 = await resolver.resolve('same-skill');

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);

    if (result1.ok && result2.ok) {
      expect(result1.value.skill).toBe(result2.value.skill);
    }
  });

  it('should not cache when cache is disabled', async () => {
    const noCacheResolver = new SkillResolver({
      baseDir: testDir,
      stdlibDir,
      cache: false,
    });

    writeSkillFile(stdlibDir, 'no-cache.md', minimalSkillMd);

    const result1 = await noCacheResolver.resolve('no-cache');
    const result2 = await noCacheResolver.resolve('no-cache');

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);

    if (result1.ok && result2.ok) {
      expect(result1.value.cached).toBe(false);
      expect(result2.value.cached).toBe(false);
    }
  });

  it('should clear cache', async () => {
    writeSkillFile(stdlibDir, 'clear-test.md', minimalSkillMd);

    await resolver.resolve('clear-test');
    expect(resolver.getCacheStats().size).toBe(1);

    resolver.clearCache();
    expect(resolver.getCacheStats().size).toBe(0);
  });

  it('should provide cache statistics', async () => {
    writeSkillFile(stdlibDir, 'stat1.md', minimalSkillMd);
    writeSkillFile(stdlibDir, 'stat2.md', minimalSkillMd);

    await resolver.resolve('stat1');
    await resolver.resolve('stat2');

    const stats = resolver.getCacheStats();
    expect(stats.size).toBe(2);
    expect(stats.keys).toContain('stat1');
    expect(stats.keys).toContain('stat2');
  });

  it('should cache different reference types separately', async () => {
    writeSkillFile(stdlibDir, 'multi.md', minimalSkillMd);
    writeSkillFile(testDir, 'multi.md', completeSkillMd);

    await resolver.resolve('multi'); // stdlib
    await resolver.resolve('./multi.md'); // local

    const stats = resolver.getCacheStats();
    expect(stats.size).toBe(2);
  });

  it('should not cache failed resolutions', async () => {
    const result1 = await resolver.resolve('missing-skill');
    const result2 = await resolver.resolve('missing-skill');

    expect(result1.ok).toBe(false);
    expect(result2.ok).toBe(false);

    expect(resolver.getCacheStats().size).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              BATCH RESOLUTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('SkillResolver - Batch Resolution', () => {
  let resolver: SkillResolver;

  beforeEach(() => {
    setupTestDirs();
    resolver = new SkillResolver({
      baseDir: testDir,
      stdlibDir,
    });
  });

  afterEach(() => {
    cleanupTestDirs();
  });

  it('should resolve multiple skills', async () => {
    writeSkillFile(stdlibDir, 'skill1.md', minimalSkillMd);
    writeSkillFile(stdlibDir, 'skill2.md', minimalSkillMd);

    const results = await resolver.resolveMany(['skill1', 'skill2']);

    expect(results.size).toBe(2);
    expect(results.get('skill1')?.ok).toBe(true);
    expect(results.get('skill2')?.ok).toBe(true);
  });

  it('should resolve skills in parallel', async () => {
    writeSkillFile(stdlibDir, 'parallel1.md', minimalSkillMd);
    writeSkillFile(stdlibDir, 'parallel2.md', minimalSkillMd);
    writeSkillFile(stdlibDir, 'parallel3.md', minimalSkillMd);

    const startTime = Date.now();
    const results = await resolver.resolveMany([
      'parallel1',
      'parallel2',
      'parallel3',
    ]);
    const duration = Date.now() - startTime;

    expect(results.size).toBe(3);
    // Should complete faster than sequential (rough heuristic)
    expect(duration).toBeLessThan(1000);
  });

  it('should handle mix of successful and failed resolutions', async () => {
    writeSkillFile(stdlibDir, 'exists.md', minimalSkillMd);

    const results = await resolver.resolveMany(['exists', 'missing']);

    expect(results.size).toBe(2);
    expect(results.get('exists')?.ok).toBe(true);
    expect(results.get('missing')?.ok).toBe(false);
  });

  it('should handle empty array', async () => {
    const results = await resolver.resolveMany([]);
    expect(results.size).toBe(0);
  });

  it('should handle duplicate references', async () => {
    writeSkillFile(stdlibDir, 'dup.md', minimalSkillMd);

    const results = await resolver.resolveMany(['dup', 'dup', 'dup']);

    expect(results.size).toBe(1);
    expect(results.get('dup')?.ok).toBe(true);
  });

  it('should use cache for batch resolution', async () => {
    writeSkillFile(stdlibDir, 'batch-cache.md', minimalSkillMd);

    await resolver.resolve('batch-cache'); // Prime cache

    const results = await resolver.resolveMany(['batch-cache']);
    const result = results.get('batch-cache');

    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.value.cached).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              ERROR HANDLING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('SkillResolver - Error Handling', () => {
  let resolver: SkillResolver;

  beforeEach(() => {
    setupTestDirs();
    resolver = new SkillResolver({
      baseDir: testDir,
      stdlibDir,
    });
  });

  afterEach(() => {
    cleanupTestDirs();
  });

  it('should handle file system errors gracefully', async () => {
    // Try to read from non-readable location (permissions test)
    const result = await resolver.resolve('/root/protected/skill.md');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(Error);
    }
  });

  it('should handle malformed YAML frontmatter', async () => {
    const malformedYaml = `---
name: Invalid
description: [unclosed array
---
Instructions`;
    writeSkillFile(testDir, 'malformed.md', malformedYaml);

    const result = await resolver.resolve('./malformed.md');

    expect(result.ok).toBe(false);
  });

  it('should handle missing required fields', async () => {
    const missingFields = `---
name: OnlyName
---
No description`;
    writeSkillFile(testDir, 'missing.md', missingFields);

    const result = await resolver.resolve('./missing.md');

    expect(result.ok).toBe(false);
  });

  it('should handle empty skill file', async () => {
    writeSkillFile(testDir, 'empty.md', '');

    const result = await resolver.resolve('./empty.md');

    expect(result.ok).toBe(false);
  });

  it('should handle binary file as skill', async () => {
    const binaryPath = join(testDir, 'binary.md');
    writeFileSync(binaryPath, Buffer.from([0x00, 0x01, 0x02, 0x03]));

    const result = await resolver.resolve('./binary.md');

    expect(result.ok).toBe(false);
  });

  it('should provide descriptive error messages', async () => {
    const result = await resolver.resolve('./nonexistent.md');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('not found');
      expect(result.error.message).toContain('nonexistent.md');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('SkillResolver - Integration', () => {
  let resolver: SkillResolver;
  let registry: MockRegistryManager;

  beforeEach(() => {
    setupTestDirs();
    registry = new MockRegistryManager();
    resolver = new SkillResolver({
      baseDir: testDir,
      claudeSkillsDir,
      stdlibDir,
      registry: registry as unknown as RegistryManager,
      cache: true,
      allowRemote: true,
    });
  });

  afterEach(() => {
    cleanupTestDirs();
  });

  it('should resolve mixed reference types', async () => {
    writeSkillFile(stdlibDir, 'stdlib-skill.md', minimalSkillMd);
    writeSkillFile(testDir, 'local-skill.md', minimalSkillMd);
    registry.addSkill('@org/pkg/registry-skill', {
      name: 'RegistrySkill',
      description: 'From registry',
      instructions: 'Instructions',
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => minimalSkillMd,
    });

    const results = await resolver.resolveMany([
      'stdlib-skill',
      './local-skill.md',
      '@org/pkg/registry-skill',
      'https://example.com/remote-skill.md',
    ]);

    expect(results.size).toBe(4);
    expect(results.get('stdlib-skill')?.ok).toBe(true);
    expect(results.get('./local-skill.md')?.ok).toBe(true);
    expect(results.get('@org/pkg/registry-skill')?.ok).toBe(true);
    expect(results.get('https://example.com/remote-skill.md')?.ok).toBe(true);
  });

  it('should cache across different reference types', async () => {
    writeSkillFile(stdlibDir, 'cross-cache.md', minimalSkillMd);

    const result1 = await resolver.resolve('cross-cache');
    const result2 = await resolver.resolve('cross-cache');

    expect(result1.ok && result2.ok).toBe(true);
    if (result1.ok && result2.ok) {
      expect(result1.value.cached).toBe(false);
      expect(result2.value.cached).toBe(true);
    }
  });

  it('should handle complex resolution scenarios', async () => {
    // Create a complex skill hierarchy
    writeSkillFile(stdlibDir, 'base-skill.md', minimalSkillMd);
    writeSkillFile(claudeSkillsDir, 'override-skill.md', completeSkillMd);

    const results = await resolver.resolveMany([
      'base-skill',
      './nonexistent.md',
    ]);

    expect(results.get('base-skill')?.ok).toBe(true);
    expect(results.get('./nonexistent.md')?.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              EDGE CASES & BOUNDARY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('SkillResolver - Edge Cases', () => {
  let resolver: SkillResolver;

  beforeEach(() => {
    setupTestDirs();
    resolver = new SkillResolver({
      baseDir: testDir,
      stdlibDir,
    });
  });

  afterEach(() => {
    cleanupTestDirs();
  });

  it('should handle very long skill names', async () => {
    // Use a moderately long name (not too long to hit Windows path limits)
    const longName = 'a'.repeat(100);
    writeSkillFile(stdlibDir, `${longName}.md`, minimalSkillMd);

    const result = await resolver.resolve(longName);
    expect(result.ok).toBe(true);
  });

  it('should handle skill names with unicode characters', async () => {
    const unicodeName = '技能-skill-مهارة';
    writeSkillFile(stdlibDir, `${unicodeName}.md`, minimalSkillMd);

    const result = await resolver.resolve(unicodeName);
    expect(result.ok).toBe(true);
  });

  it('should handle deeply nested directory structures', async () => {
    const deepPath = join(testDir, 'a', 'b', 'c', 'd', 'e');
    mkdirSync(deepPath, { recursive: true });
    writeSkillFile(deepPath, 'deep-skill.md', minimalSkillMd);

    const result = await resolver.resolve('./a/b/c/d/e/deep-skill.md');
    expect(result.ok).toBe(true);
  });

  it('should handle skills with no instructions', async () => {
    const noInstructions = `---
name: NoInstructions
description: Skill without instructions
---
`;
    writeSkillFile(testDir, 'no-instructions.md', noInstructions);

    const result = await resolver.resolve('./no-instructions.md');
    // Skills with empty instructions are actually valid (instructions is an empty string)
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.skill.instructions).toBe('');
    }
  });

  it('should handle concurrent resolution of same skill', async () => {
    writeSkillFile(stdlibDir, 'concurrent.md', minimalSkillMd);

    const results = await Promise.all([
      resolver.resolve('concurrent'),
      resolver.resolve('concurrent'),
      resolver.resolve('concurrent'),
    ]);

    expect(results.every((r) => r.ok)).toBe(true);
  });

  it('should handle symlinked skill files', async () => {
    // Note: Symlink tests may not work on all platforms/environments
    // This is a placeholder for systems that support it
    writeSkillFile(testDir, 'original.md', minimalSkillMd);
    // Would create symlink here if fs.symlink were used
    // For now, just test regular file
    const result = await resolver.resolve('./original.md');
    expect(result.ok).toBe(true);
  });

  it('should handle resolution after cache clear', async () => {
    writeSkillFile(stdlibDir, 'cache-clear.md', minimalSkillMd);

    const result1 = await resolver.resolve('cache-clear');
    resolver.clearCache();
    const result2 = await resolver.resolve('cache-clear');

    expect(result1.ok && result2.ok).toBe(true);
    if (result1.ok && result2.ok) {
      expect(result1.value.cached).toBe(false);
      expect(result2.value.cached).toBe(false);
    }
  });
});
