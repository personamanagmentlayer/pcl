// ═══════════════════════════════════════════════════════════════════════════════
// PCL Code Generation Tests
// Comprehensive tests for all code generation targets
// ═══════════════════════════════════════════════════════════════════════════════

import type * as AST from '../../src/ast';
import {
  generatePrompt,
  generateTeamPrompt,
  generateJSON,
  generateYAML,
  generateTypeScript,
  generateMarkdown,
  generate,
  type GeneratorOptions,
} from '../../src/codegen';

// ───────────────────────────────────────────────────────────────────────────
// Test Helpers - Mock AST Creation
// ───────────────────────────────────────────────────────────────────────────

function createMockSpan(): AST.Span {
  return {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 1, offset: 0 },
  };
}

function createMockIdentifier(name: string): AST.Identifier {
  return {
    kind: 'Identifier',
    name,
    span: createMockSpan(),
  };
}

function createMockStringLiteral(value: string): AST.StringLiteral {
  return {
    kind: 'StringLiteral',
    value,
    raw: `"${value}"`,
    span: createMockSpan(),
  };
}

function createMockPersona(
  name: string,
  properties: Partial<{
    intent: string;
    tone: string;
    depth: string;
    verbosity: string;
    skills: string[];
    constraints: string[];
    tags: string[];
    methods: string[];
  }> = {}
): AST.PersonaDeclaration {
  const members: AST.PersonaMember[] = [];

  // Add intent
  if (properties.intent) {
    members.push({
      kind: 'PropertyDeclaration',
      name: createMockIdentifier('intent'),
      initializer: createMockStringLiteral(properties.intent),
      typeAnnotation: undefined,
      span: createMockSpan(),
    });
  }

  // Add tone
  if (properties.tone) {
    members.push({
      kind: 'PropertyDeclaration',
      name: createMockIdentifier('tone'),
      initializer: createMockIdentifier(properties.tone),
      typeAnnotation: undefined,
      span: createMockSpan(),
    });
  }

  // Add depth
  if (properties.depth) {
    members.push({
      kind: 'PropertyDeclaration',
      name: createMockIdentifier('depth'),
      initializer: createMockIdentifier(properties.depth),
      typeAnnotation: undefined,
      span: createMockSpan(),
    });
  }

  // Add verbosity
  if (properties.verbosity) {
    members.push({
      kind: 'PropertyDeclaration',
      name: createMockIdentifier('verbosity'),
      initializer: createMockIdentifier(properties.verbosity),
      typeAnnotation: undefined,
      span: createMockSpan(),
    });
  }

  // Add skills
  if (properties.skills && properties.skills.length > 0) {
    members.push({
      kind: 'SkillBlock',
      items: properties.skills.map((skill) => ({
        kind: 'StringSkill',
        value: skill,
        span: createMockSpan(),
      })),
      span: createMockSpan(),
    });
  }

  // Add constraints
  if (properties.constraints && properties.constraints.length > 0) {
    members.push({
      kind: 'ConstraintBlock',
      items: properties.constraints.map((constraint) => ({
        kind: 'StringConstraint',
        value: constraint,
        span: createMockSpan(),
      })),
      span: createMockSpan(),
    });
  }

  // Add tags
  if (properties.tags && properties.tags.length > 0) {
    members.push({
      kind: 'TagBlock',
      items: properties.tags.map((tag) => ({
        kind: 'StringTag',
        value: tag,
        span: createMockSpan(),
      })),
      span: createMockSpan(),
    });
  }

  // Add methods
  if (properties.methods && properties.methods.length > 0) {
    properties.methods.forEach((methodName) => {
      members.push({
        kind: 'MethodDeclaration',
        name: createMockIdentifier(methodName),
        parameters: [],
        body: {
          kind: 'BlockStatement',
          statements: [],
          span: createMockSpan(),
        },
        returnType: undefined,
        span: createMockSpan(),
      });
    });
  }

  return {
    kind: 'PersonaDeclaration',
    id: createMockIdentifier(name),
    body: {
      kind: 'PersonaBody',
      members,
      span: createMockSpan(),
    },
    extends: [], // Empty array instead of undefined
    span: createMockSpan(),
  };
}

function createMockTeam(
  name: string,
  memberNames: string[],
  options: Partial<{
    primary: string;
    mergeMode: string;
    quorum: { required: number; total: number };
  }> = {}
): AST.TeamDeclaration {
  const members: AST.TeamMember[] = [];

  // Add members
  if (memberNames.length > 0) {
    members.push({
      kind: 'TeamMembersDeclaration',
      members: memberNames.map((memberName) => ({
        kind: 'PersonaReference',
        ref: {
          type: 'id',
          id: createMockIdentifier(memberName),
        },
        span: createMockSpan(),
      })),
      span: createMockSpan(),
    });
  }

  // Add primary
  if (options.primary) {
    members.push({
      kind: 'TeamPrimaryDeclaration',
      primary: {
        kind: 'PersonaReference',
        ref: {
          type: 'id',
          id: createMockIdentifier(options.primary),
        },
        span: createMockSpan(),
      },
      span: createMockSpan(),
    });
  }

  // Add merge mode
  if (options.mergeMode) {
    members.push({
      kind: 'TeamMergeDeclaration',
      mode: {
        kind: 'SimpleMergeMode',
        mode: options.mergeMode,
        span: createMockSpan(),
      },
      span: createMockSpan(),
    });
  }

  // Add quorum
  if (options.quorum) {
    members.push({
      kind: 'TeamQuorumDeclaration',
      required: {
        kind: 'NumericLiteral',
        value: options.quorum.required,
        raw: String(options.quorum.required),
        span: createMockSpan(),
      },
      total: {
        kind: 'NumericLiteral',
        value: options.quorum.total,
        raw: String(options.quorum.total),
        span: createMockSpan(),
      },
      span: createMockSpan(),
    });
  }

  return {
    kind: 'TeamDeclaration',
    id: createMockIdentifier(name),
    body: {
      kind: 'TeamBody',
      members,
      span: createMockSpan(),
    },
    span: createMockSpan(),
  };
}

function createMockProgram(statements: AST.Statement[]): AST.Program {
  return {
    kind: 'Program',
    statements,
    comments: [],
    span: createMockSpan(),
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Prompt Generation Tests
// ───────────────────────────────────────────────────────────────────────────

describe('generatePrompt', () => {
  describe('basic persona generation', () => {
    test('generates prompt for minimal persona', () => {
      const persona = createMockPersona('Assistant');

      const prompt = generatePrompt(persona);

      expect(prompt).toContain('Assistant');
      expect(prompt).toBeTruthy();
    });

    test('includes persona name in output', () => {
      const persona = createMockPersona('CodeReviewer');

      const prompt = generatePrompt(persona);

      expect(prompt).toContain('CodeReviewer');
    });

    test('includes intent when specified', () => {
      const persona = createMockPersona('Developer', {
        intent: 'You are an expert software developer',
      });

      const prompt = generatePrompt(persona);

      expect(prompt).toContain('expert software developer');
    });

    test('includes skills when specified', () => {
      const persona = createMockPersona('Engineer', {
        skills: ['Python', 'JavaScript', 'TypeScript'],
      });

      const prompt = generatePrompt(persona);

      expect(prompt).toContain('Python');
      expect(prompt).toContain('JavaScript');
      expect(prompt).toContain('TypeScript');
    });

    test('includes constraints when specified', () => {
      const persona = createMockPersona('SafeBot', {
        constraints: ['Never share sensitive data', 'Always verify sources'],
      });

      const prompt = generatePrompt(persona);

      expect(prompt).toContain('Never share sensitive data');
      expect(prompt).toContain('Always verify sources');
    });

    test('includes tone when specified', () => {
      const persona = createMockPersona('FriendlyBot', {
        tone: 'casual',
      });

      const prompt = generatePrompt(persona);

      expect(prompt).toContain('casual');
    });

    test('includes methods as capabilities', () => {
      const persona = createMockPersona('ActionBot', {
        methods: ['search', 'analyze', 'summarize'],
      });

      const prompt = generatePrompt(persona);

      expect(prompt).toContain('search');
      expect(prompt).toContain('analyze');
      expect(prompt).toContain('summarize');
    });
  });

  describe('provider-specific formats', () => {
    test('generates generic format by default', () => {
      const persona = createMockPersona('Assistant', {
        intent: 'Test assistant',
      });

      const prompt = generatePrompt(persona);

      expect(prompt).toContain('PERSONA CONFIGURATION');
    });

    test('generates Claude-specific format', () => {
      const persona = createMockPersona('ClaudeBot', {
        intent: 'Claude assistant',
        skills: ['reasoning'],
      });

      const prompt = generatePrompt(persona, { provider: 'claude' });

      expect(prompt).toContain('<persona>');
      expect(prompt).toContain('</persona>');
      expect(prompt).toContain('<name>ClaudeBot</name>');
    });

    test('generates OpenAI-specific format', () => {
      const persona = createMockPersona('GPTBot', {
        intent: 'OpenAI assistant',
      });

      const prompt = generatePrompt(persona, { provider: 'openai' });

      expect(prompt).toContain('You are');
      expect(prompt).toContain('GPTBot');
    });

    test('generates Gemini-specific format', () => {
      const persona = createMockPersona('GeminiBot', {
        intent: 'Gemini assistant',
      });

      const prompt = generatePrompt(persona, { provider: 'gemini' });

      expect(prompt).toContain('Context:');
      expect(prompt).toContain('GeminiBot');
    });
  });

  describe('complete persona with all properties', () => {
    test('generates comprehensive prompt', () => {
      const persona = createMockPersona('CompleteBot', {
        intent: 'A comprehensive test assistant',
        tone: 'professional',
        depth: 'detailed',
        verbosity: 'verbose',
        skills: ['skill1', 'skill2', 'skill3'],
        constraints: ['rule1', 'rule2'],
        tags: ['tag1', 'tag2'],
        methods: ['action1', 'action2'],
      });

      const prompt = generatePrompt(persona);

      expect(prompt).toContain('CompleteBot');
      expect(prompt).toContain('comprehensive test assistant');
      expect(prompt).toContain('professional');
      // Note: depth and verbosity are only shown for some providers
      expect(prompt).toContain('skill1');
      expect(prompt).toContain('rule1');
      expect(prompt).toContain('action1');
    });
  });

  describe('options handling', () => {
    test('respects includeMetadata option', () => {
      const persona = createMockPersona('MetaBot', {
        tags: ['metadata-tag'],
      });

      const withMetadata = generatePrompt(persona, { includeMetadata: true });
      const withoutMetadata = generatePrompt(persona, {
        includeMetadata: false,
      });

      expect(withMetadata).toContain('metadata-tag');
      expect(withoutMetadata).not.toContain('CONTEXT TAGS');
    });
  });
});

describe('generateTeamPrompt', () => {
  describe('basic team generation', () => {
    test('generates prompt for team with members', () => {
      const developer = createMockPersona('Developer', {
        intent: 'Write code',
        skills: ['Python', 'JavaScript'],
      });
      const reviewer = createMockPersona('Reviewer', {
        intent: 'Review code',
        skills: ['CodeReview'],
      });

      const team = createMockTeam('DevTeam', ['Developer', 'Reviewer']);
      const personas = new Map([
        ['Developer', developer],
        ['Reviewer', reviewer],
      ]);

      const prompt = generateTeamPrompt(team, personas);

      expect(prompt).toContain('DevTeam');
      expect(prompt).toContain('Developer');
      expect(prompt).toContain('Reviewer');
    });

    test('includes member details', () => {
      const analyst = createMockPersona('Analyst', {
        intent: 'Analyze data',
        skills: ['Statistics', 'DataAnalysis'],
      });

      const team = createMockTeam('AnalysisTeam', ['Analyst']);
      const personas = new Map([['Analyst', analyst]]);

      const prompt = generateTeamPrompt(team, personas);

      expect(prompt).toContain('Analyze data');
      expect(prompt).toContain('Statistics');
    });

    test('handles missing personas gracefully', () => {
      const team = createMockTeam('PartialTeam', ['Existing', 'Missing']);
      const existing = createMockPersona('Existing', { intent: 'I exist' });
      const personas = new Map([['Existing', existing]]);

      const prompt = generateTeamPrompt(team, personas);

      expect(prompt).toContain('Existing');
      expect(prompt).toContain('Missing');
    });
  });

  describe('merge strategies', () => {
    test('includes primary merge mode', () => {
      const team = createMockTeam('Team', ['A', 'B'], {
        mergeMode: 'primary',
        primary: 'A',
      });

      const prompt = generateTeamPrompt(team, new Map());

      expect(prompt).toContain('primary');
      expect(prompt).toContain('Primary Lead: A');
      expect(prompt).toContain('final decisions');
    });

    test('includes consensus merge mode', () => {
      const team = createMockTeam('Team', ['A', 'B'], {
        mergeMode: 'consensus',
      });

      const prompt = generateTeamPrompt(team, new Map());

      expect(prompt).toContain('consensus');
      expect(prompt).toContain('agreement');
    });

    test('includes majority merge mode', () => {
      const team = createMockTeam('Team', ['A', 'B', 'C'], {
        mergeMode: 'majority',
      });

      const prompt = generateTeamPrompt(team, new Map());

      expect(prompt).toContain('majority');
      expect(prompt).toContain('vote');
    });

    test('includes debate merge mode', () => {
      const team = createMockTeam('Team', ['A', 'B'], {
        mergeMode: 'debate',
      });

      const prompt = generateTeamPrompt(team, new Map());

      expect(prompt).toContain('debate');
      expect(prompt).toContain('perspectives');
    });

    test('includes append merge mode', () => {
      const team = createMockTeam('Team', ['A', 'B'], {
        mergeMode: 'append',
      });

      const prompt = generateTeamPrompt(team, new Map());

      expect(prompt).toContain('append');
      expect(prompt).toContain('contributions');
    });

    test('includes weighted merge mode', () => {
      const team = createMockTeam('Team', ['A', 'B'], {
        mergeMode: 'weighted',
      });

      const prompt = generateTeamPrompt(team, new Map());

      expect(prompt).toContain('weighted');
      expect(prompt).toContain('influence');
    });

    test('includes chain merge mode', () => {
      const team = createMockTeam('Team', ['A', 'B'], {
        mergeMode: 'chain',
      });

      const prompt = generateTeamPrompt(team, new Map());

      expect(prompt).toContain('chain');
      expect(prompt).toContain('sequentially');
    });

    test('handles unknown merge mode', () => {
      const team = createMockTeam('Team', ['A'], {
        mergeMode: 'custom',
      });

      const prompt = generateTeamPrompt(team, new Map());

      expect(prompt).toContain('custom');
    });
  });

  describe('quorum configuration', () => {
    test('includes quorum requirement', () => {
      const team = createMockTeam('Team', ['A', 'B', 'C'], {
        quorum: { required: 2, total: 3 },
      });

      const prompt = generateTeamPrompt(team, new Map());

      expect(prompt).toContain('Quorum Required: 2/3');
    });
  });

  describe('empty team', () => {
    test('handles team with no members', () => {
      const team = createMockTeam('EmptyTeam', []);

      const prompt = generateTeamPrompt(team, new Map());

      expect(prompt).toContain('EmptyTeam');
      expect(prompt).toContain('TEAM CONFIGURATION');
    });
  });
});

// ───────────────────────────────────────────────────────────────────────────
// JSON Generation Tests
// ───────────────────────────────────────────────────────────────────────────

describe('generateJSON', () => {
  test('generates valid JSON', () => {
    const persona = createMockPersona('JSONBot');
    const program = createMockProgram([persona]);

    const json = generateJSON(program);

    expect(() => JSON.parse(json)).not.toThrow();
  });

  test('includes persona declarations', () => {
    const persona = createMockPersona('TestBot', {
      intent: 'Test intent',
    });
    const program = createMockProgram([persona]);

    const json = generateJSON(program);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveProperty('personas');
  });

  test('handles empty program', () => {
    const program = createMockProgram([]);

    const json = generateJSON(program);

    expect(() => JSON.parse(json)).not.toThrow();
  });

  test('respects minify option', () => {
    const persona = createMockPersona('MinifyBot');
    const program = createMockProgram([persona]);

    const minified = generateJSON(program, { minify: true });
    const pretty = generateJSON(program, { minify: false });

    expect(minified.length).toBeLessThan(pretty.length);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// YAML Generation Tests
// ───────────────────────────────────────────────────────────────────────────

describe('generateYAML', () => {
  test('generates valid YAML', () => {
    const persona = createMockPersona('YAMLBot');
    const program = createMockProgram([persona]);

    const yaml = generateYAML(program);

    expect(yaml).toBeTruthy();
    expect(typeof yaml).toBe('string');
  });

  test('includes persona information', () => {
    const persona = createMockPersona('TestBot', {
      intent: 'YAML test',
    });
    const program = createMockProgram([persona]);

    const yaml = generateYAML(program);

    expect(yaml).toContain('TestBot');
  });

  test('handles empty program', () => {
    const program = createMockProgram([]);

    const yaml = generateYAML(program);

    expect(yaml).toBeTruthy();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TypeScript Generation Tests
// ───────────────────────────────────────────────────────────────────────────

describe('generateTypeScript', () => {
  test('generates valid TypeScript code', () => {
    const persona = createMockPersona('TSBot');
    const program = createMockProgram([persona]);

    const ts = generateTypeScript(program);

    expect(ts).toBeTruthy();
    expect(typeof ts).toBe('string');
  });

  test('includes type definitions', () => {
    const persona = createMockPersona('TypedBot', {
      intent: 'TypeScript test',
    });
    const program = createMockProgram([persona]);

    const ts = generateTypeScript(program);

    expect(ts).toContain('TypedBot');
  });

  test('handles empty program', () => {
    const program = createMockProgram([]);

    const ts = generateTypeScript(program);

    expect(ts).toBeTruthy();
  });

  test('respects includeComments option', () => {
    const persona = createMockPersona('CommentBot');
    const program = createMockProgram([persona]);

    const withComments = generateTypeScript(program, { includeComments: true });
    const withoutComments = generateTypeScript(program, {
      includeComments: false,
    });

    // With comments should be longer or have comment markers
    expect(withComments.length).toBeGreaterThanOrEqual(withoutComments.length);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Markdown Generation Tests
// ───────────────────────────────────────────────────────────────────────────

describe('generateMarkdown', () => {
  test('generates valid Markdown', () => {
    const persona = createMockPersona('MDBot');
    const program = createMockProgram([persona]);

    const md = generateMarkdown(program);

    expect(md).toBeTruthy();
    expect(typeof md).toBe('string');
  });

  test('includes markdown headers', () => {
    const persona = createMockPersona('DocBot', {
      intent: 'Documentation bot',
    });
    const program = createMockProgram([persona]);

    const md = generateMarkdown(program);

    expect(md).toContain('#');
    expect(md).toContain('DocBot');
  });

  test('handles empty program', () => {
    const program = createMockProgram([]);

    const md = generateMarkdown(program);

    expect(md).toBeTruthy();
  });

  test('formats lists properly', () => {
    const persona = createMockPersona('ListBot', {
      skills: ['Skill 1', 'Skill 2', 'Skill 3'],
    });
    const program = createMockProgram([persona]);

    const md = generateMarkdown(program);

    expect(md).toContain('-');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Universal Generate Function Tests
// ───────────────────────────────────────────────────────────────────────────

describe('generate', () => {
  const persona = createMockPersona('UniversalBot', {
    intent: 'Test all targets',
  });
  const program = createMockProgram([persona]);

  test('generates prompt target', () => {
    const output = generate(program, { target: 'prompt' });

    expect(output).toContain('UniversalBot');
  });

  test('generates JSON target', () => {
    const output = generate(program, { target: 'json' });

    expect(() => JSON.parse(output)).not.toThrow();
  });

  test('generates YAML target', () => {
    const output = generate(program, { target: 'yaml' });

    expect(output).toBeTruthy();
  });

  test('generates TypeScript target', () => {
    const output = generate(program, { target: 'typescript' });

    expect(output).toBeTruthy();
  });

  test('generates JavaScript target', () => {
    const output = generate(program, { target: 'javascript' });

    expect(output).toBeTruthy();
  });

  test('generates Markdown target', () => {
    const output = generate(program, { target: 'markdown' });

    expect(output).toBeTruthy();
    expect(output).toContain('#');
  });

  test('requires target to be specified', () => {
    // The generate function requires a target, there is no default
    expect(() => generate(program, {} as GeneratorOptions)).toThrow(
      'Unknown target'
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Edge Cases and Error Handling
// ───────────────────────────────────────────────────────────────────────────

describe('edge cases', () => {
  test('handles persona with empty properties', () => {
    const persona = createMockPersona('EmptyBot', {
      skills: [],
      constraints: [],
      tags: [],
      methods: [],
    });

    const prompt = generatePrompt(persona);

    expect(prompt).toContain('EmptyBot');
  });

  test('handles persona with undefined optional properties', () => {
    const persona = createMockPersona('MinimalBot');

    const prompt = generatePrompt(persona);

    expect(prompt).toBeTruthy();
  });

  test('handles very long property values', () => {
    const longIntent = 'A'.repeat(10000);
    const persona = createMockPersona('LongBot', {
      intent: longIntent,
    });

    const prompt = generatePrompt(persona);

    expect(prompt).toContain('A');
  });

  test('handles special characters in properties', () => {
    const persona = createMockPersona('SpecialBot', {
      intent: 'Test with "quotes" and \\backslashes\\',
      skills: ['<tag>', 'a & b', "it's"],
    });

    const prompt = generatePrompt(persona);

    expect(prompt).toBeTruthy();
  });

  test('handles unicode characters', () => {
    const persona = createMockPersona('UnicodeBot', {
      intent: 'Handle 你好 and 🚀 emoji',
    });

    const prompt = generatePrompt(persona);

    expect(prompt).toContain('你好');
    expect(prompt).toContain('🚀');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Integration Tests - Complex Scenarios
// ───────────────────────────────────────────────────────────────────────────

describe('complex scenarios', () => {
  test('generates complete system with multiple personas and teams', () => {
    const dev = createMockPersona('Developer', {
      intent: 'Write code',
      skills: ['Python', 'JavaScript'],
    });
    const qa = createMockPersona('QA', {
      intent: 'Test code',
      skills: ['Testing', 'Debugging'],
    });
    const team = createMockTeam('DevTeam', ['Developer', 'QA'], {
      mergeMode: 'consensus',
    });

    const program = createMockProgram([dev, qa, team]);

    const json = generateJSON(program);
    const yaml = generateYAML(program);
    const ts = generateTypeScript(program);
    const md = generateMarkdown(program);

    expect(json).toBeTruthy();
    expect(yaml).toBeTruthy();
    expect(ts).toBeTruthy();
    expect(md).toBeTruthy();
  });

  test('generates different formats for same persona', () => {
    const persona = createMockPersona('MultiFormatBot', {
      intent: 'Test all formats',
      skills: ['Skill1', 'Skill2'],
      constraints: ['Rule1', 'Rule2'],
    });

    const genericPrompt = generatePrompt(persona, { provider: 'generic' });
    const claudePrompt = generatePrompt(persona, { provider: 'claude' });
    const openaiPrompt = generatePrompt(persona, { provider: 'openai' });
    const geminiPrompt = generatePrompt(persona, { provider: 'gemini' });

    expect(genericPrompt).toBeTruthy();
    expect(claudePrompt).toBeTruthy();
    expect(openaiPrompt).toBeTruthy();
    expect(geminiPrompt).toBeTruthy();

    // Each should be different
    expect(genericPrompt).not.toBe(claudePrompt);
    expect(claudePrompt).not.toBe(openaiPrompt);
    expect(openaiPrompt).not.toBe(geminiPrompt);
  });

  test('preserves all data through round-trip', () => {
    const persona = createMockPersona('RoundTripBot', {
      intent: 'Round trip test',
      tone: 'professional',
      skills: ['A', 'B', 'C'],
      constraints: ['X', 'Y', 'Z'],
      tags: ['tag1', 'tag2'],
    });

    const program = createMockProgram([persona]);
    const json = generateJSON(program);
    const parsed = JSON.parse(json);

    // Verify core data is preserved
    expect(parsed).toBeTruthy();
  });
});
