/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Code Generator
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Generates output from PCL programs:
 * - System prompts for LLMs
 * - TypeScript/JavaScript code
 * - JSON configuration
 * - Markdown documentation
 *
 * @packageDocumentation
 * @module @pcl/codegen
 * @version 1.0.0
 */

import type * as AST from '../ast';

// ═══════════════════════════════════════════════════════════════════════════════
//                              GENERATOR OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type GeneratorTarget =
  | 'prompt' // System prompt for LLMs
  | 'typescript' // TypeScript code
  | 'javascript' // JavaScript code
  | 'json' // JSON configuration
  | 'markdown' // Documentation
  | 'yaml'; // YAML configuration

export type PromptProvider =
  | 'generic' // Generic format (default)
  | 'claude' // Anthropic Claude format
  | 'openai' // OpenAI GPT format
  | 'gemini'; // Google Gemini format

export interface GeneratorOptions {
  target: GeneratorTarget;
  provider?: PromptProvider; // For prompt generation
  language?: string; // Language for prompt generation (default: 'en')
  minify?: boolean;
  includeComments?: boolean;
  includeMetadata?: boolean;
  indentSize?: number;
  lineWidth?: number;
  maxTokens?: number; // Maximum token count for optimization
}

const DEFAULT_OPTIONS: Required<GeneratorOptions> = {
  target: 'prompt',
  provider: 'generic',
  language: 'en',
  minify: false,
  includeComments: true,
  includeMetadata: true,
  indentSize: 2,
  lineWidth: 80,
  maxTokens: 0, // 0 = no limit
};

// ═══════════════════════════════════════════════════════════════════════════════
//                              PROMPT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate system prompt from persona declaration
 */
export function generatePrompt(
  persona: AST.PersonaDeclaration,
  options: Partial<GeneratorOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options, target: 'prompt' as const };
  const generator = new PromptGenerator(opts);
  return generator.generate(persona);
}

/**
 * Generate system prompt from team declaration
 */
export function generateTeamPrompt(
  team: AST.TeamDeclaration,
  personas: Map<string, AST.PersonaDeclaration>,
  options: Partial<GeneratorOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options, target: 'prompt' as const };
  const generator = new PromptGenerator(opts);
  return generator.generateTeam(team, personas);
}

class PromptGenerator {
  private readonly options: Required<GeneratorOptions>;
  private output: string[] = [];

  constructor(options: Required<GeneratorOptions>) {
    this.options = options;
  }

  generate(persona: AST.PersonaDeclaration): string {
    this.output = [];

    // Extract properties
    const props = this.extractProperties(persona);

    // Generate based on provider format
    switch (this.options.provider) {
      case 'claude':
        return this.generateClaudeFormat(persona, props);
      case 'openai':
        return this.generateOpenAIFormat(persona, props);
      case 'gemini':
        return this.generateGeminiFormat(persona, props);
      default:
        return this.generateGenericFormat(persona, props);
    }
  }

  private generateGenericFormat(
    persona: AST.PersonaDeclaration,
    props: ReturnType<typeof this.extractProperties>
  ): string {
    this.output = [];

    // Header
    this.section('PERSONA CONFIGURATION');
    this.line(`Name: ${persona.id.name}`);

    // Identity
    if (props.intent) {
      this.blank();
      this.section('IDENTITY & PURPOSE');
      this.line(props.intent);
    }

    // Tone and style
    if (props.tone) {
      this.blank();
      this.section('COMMUNICATION STYLE');
      this.line(`Tone: ${props.tone}`);
    }

    // Skills
    if (props.skills.length > 0) {
      this.blank();
      this.section('EXPERTISE & SKILLS');
      for (const skill of props.skills) {
        this.bullet(skill);
      }
    }

    // Constraints
    if (props.constraints.length > 0) {
      this.blank();
      this.section('CONSTRAINTS & GUIDELINES');
      for (const constraint of props.constraints) {
        this.bullet(constraint);
      }
    }

    // Tags (as context)
    if (props.tags.length > 0 && this.options.includeMetadata) {
      this.blank();
      this.section('CONTEXT TAGS');
      this.line(`Tags: ${props.tags.join(', ')}`);
    }

    // Methods as capabilities
    if (props.methods.length > 0) {
      this.blank();
      this.section('CAPABILITIES');
      for (const method of props.methods) {
        this.bullet(
          `${method.name}: ${method.description || 'Available action'}`
        );
      }
    }

    return this.output.join('\n');
  }

  private generateClaudeFormat(
    persona: AST.PersonaDeclaration,
    props: ReturnType<typeof this.extractProperties>
  ): string {
    this.output = [];

    // Claude prefers XML-style tags for structure
    this.line('<persona>');
    this.line(`<name>${persona.id.name}</name>`);
    this.blank();

    // Identity and purpose
    if (props.intent) {
      this.line('<identity>');
      this.line(props.intent);
      this.line('</identity>');
      this.blank();
    }

    // Skills - Claude works well with explicit capability lists
    if (props.skills.length > 0) {
      this.line('<expertise>');
      for (const skill of props.skills) {
        this.line(`- ${skill}`);
      }
      this.line('</expertise>');
      this.blank();
    }

    // Constraints - Claude responds well to clear guidelines
    if (props.constraints.length > 0) {
      this.line('<guidelines>');
      for (const constraint of props.constraints) {
        this.line(`- ${constraint}`);
      }
      this.line('</guidelines>');
      this.blank();
    }

    // Communication style
    if (props.tone) {
      this.line('<style>');
      this.line(`Tone: ${props.tone}`);
      if (props.verbosity) {
        this.line(`Verbosity: ${props.verbosity}`);
      }
      if (props.depth) {
        this.line(`Depth: ${props.depth}`);
      }
      this.line('</style>');
      this.blank();
    }

    // Methods as tools
    if (props.methods.length > 0) {
      this.line('<capabilities>');
      for (const method of props.methods) {
        this.line(
          `- ${method.name}: ${method.description || 'Available action'}`
        );
      }
      this.line('</capabilities>');
      this.blank();
    }

    this.line('</persona>');

    return this.output.join('\n');
  }

  private generateOpenAIFormat(
    persona: AST.PersonaDeclaration,
    props: ReturnType<typeof this.extractProperties>
  ): string {
    this.output = [];

    // OpenAI prefers direct, imperative instructions
    this.line(`# ${persona.id.name}`);
    this.blank();

    // Identity - OpenAI responds well to "You are..." format
    if (props.intent) {
      this.line(`You are ${persona.id.name}.`);
      this.line(props.intent);
      this.blank();
    }

    // Skills as capabilities
    if (props.skills.length > 0) {
      this.line('## Your Expertise');
      this.blank();
      this.line('You have expertise in:');
      for (const skill of props.skills) {
        this.line(`- ${skill}`);
      }
      this.blank();
    }

    // Constraints as rules
    if (props.constraints.length > 0) {
      this.line('## Rules You Must Follow');
      this.blank();
      for (const constraint of props.constraints) {
        this.line(`- ${constraint}`);
      }
      this.blank();
    }

    // Communication style
    if (props.tone || props.verbosity || props.depth) {
      this.line('## Communication Style');
      this.blank();
      if (props.tone) {
        this.line(`- Use a ${props.tone} tone`);
      }
      if (props.verbosity) {
        this.line(`- Be ${props.verbosity} in your responses`);
      }
      if (props.depth) {
        this.line(`- Provide ${props.depth} explanations`);
      }
      this.blank();
    }

    // Methods as functions
    if (props.methods.length > 0) {
      this.line('## Available Functions');
      this.blank();
      this.line('You can perform the following actions:');
      for (const method of props.methods) {
        this.line(
          `- ${method.name}: ${method.description || 'Available action'}`
        );
      }
      this.blank();
    }

    return this.output.join('\n').trim();
  }

  private generateGeminiFormat(
    persona: AST.PersonaDeclaration,
    props: ReturnType<typeof this.extractProperties>
  ): string {
    this.output = [];

    // Gemini prefers conversational, context-rich prompts
    this.line(`Context: You are ${persona.id.name}`);
    this.blank();

    // Identity with context
    if (props.intent) {
      this.line('Your Purpose:');
      this.line(props.intent);
      this.blank();
    }

    // Skills as knowledge areas
    if (props.skills.length > 0) {
      this.line('Your Knowledge and Skills:');
      for (const skill of props.skills) {
        this.line(`• ${skill}`);
      }
      this.blank();
    }

    // Constraints as behavioral guidelines
    if (props.constraints.length > 0) {
      this.line('Behavioral Guidelines:');
      for (const constraint of props.constraints) {
        this.line(`• ${constraint}`);
      }
      this.blank();
    }

    // Communication preferences
    if (props.tone || props.verbosity || props.depth) {
      this.line('Communication Preferences:');
      if (props.tone) {
        this.line(`• Tone: ${props.tone}`);
      }
      if (props.verbosity) {
        this.line(`• Response length: ${props.verbosity}`);
      }
      if (props.depth) {
        this.line(`• Explanation depth: ${props.depth}`);
      }
      this.blank();
    }

    // Methods as capabilities
    if (props.methods.length > 0) {
      this.line('Your Capabilities:');
      for (const method of props.methods) {
        this.line(
          `• ${method.name}: ${method.description || 'Available action'}`
        );
      }
      this.blank();
    }

    // Gemini-specific: Add instruction footer
    this.line(
      'Instructions: Follow these guidelines in all your responses and interactions.'
    );

    return this.output.join('\n');
  }

  generateTeam(
    team: AST.TeamDeclaration,
    personas: Map<string, AST.PersonaDeclaration>
  ): string {
    this.output = [];

    // Header
    this.section('TEAM CONFIGURATION');
    this.line(`Team: ${team.id.name}`);

    // Extract team config
    const config = this.extractTeamConfig(team);

    // Members
    this.blank();
    this.section('TEAM MEMBERS');
    for (const memberName of config.members) {
      const persona = personas.get(memberName);
      if (persona) {
        const props = this.extractProperties(persona);
        this.blank();
        this.line(`## ${memberName}`);
        if (props.intent) {
          this.line(`Role: ${props.intent}`);
        }
        if (props.skills.length > 0) {
          this.line(`Skills: ${props.skills.slice(0, 3).join(', ')}`);
        }
      } else {
        this.line(`- ${memberName}`);
      }
    }

    // Collaboration mode
    this.blank();
    this.section('COLLABORATION MODE');
    this.line(`Merge Strategy: ${config.mergeMode}`);

    if (config.primary) {
      this.line(`Primary Lead: ${config.primary}`);
    }

    if (config.quorum) {
      this.line(
        `Quorum Required: ${config.quorum.required}/${config.quorum.total}`
      );
    }

    // Instructions
    this.blank();
    this.section('COLLABORATION INSTRUCTIONS');
    this.generateMergeInstructions(config.mergeMode);

    return this.output.join('\n');
  }

  private extractProperties(persona: AST.PersonaDeclaration): {
    intent: string | null;
    tone: string | null;
    depth: string | null;
    verbosity: string | null;
    skills: string[];
    constraints: string[];
    tags: string[];
    methods: Array<{ name: string; description: string | null }>;
  } {
    let intent: string | null = null;
    let tone: string | null = null;
    let depth: string | null = null;
    let verbosity: string | null = null;
    const skills: string[] = [];
    const constraints: string[] = [];
    const tags: string[] = [];
    const methods: Array<{ name: string; description: string | null }> = [];

    for (const member of persona.body.members) {
      switch (member.kind) {
        case 'PropertyDeclaration': {
          const prop = member;
          if (
            prop.name.name === 'intent' &&
            prop.initializer?.kind === 'StringLiteral'
          ) {
            intent = (prop.initializer as AST.StringLiteral).value;
          }
          if (
            prop.name.name === 'tone' &&
            prop.initializer?.kind === 'Identifier'
          ) {
            tone = prop.initializer.name;
          }
          if (
            prop.name.name === 'depth' &&
            prop.initializer?.kind === 'Identifier'
          ) {
            depth = prop.initializer.name;
          }
          if (
            prop.name.name === 'verbosity' &&
            prop.initializer?.kind === 'Identifier'
          ) {
            verbosity = prop.initializer.name;
          }
          break;
        }

        case 'SkillBlock': {
          const block = member;
          for (const item of block.items) {
            if (item.kind === 'StringSkill') {
              skills.push((item as { value: string }).value);
            } else if (item.kind === 'IdentifierSkill') {
              skills.push((item as { name: AST.Identifier }).name.name);
            }
          }
          break;
        }

        case 'ConstraintBlock': {
          const block = member;
          for (const item of block.items) {
            if (item.kind === 'StringConstraint') {
              constraints.push((item as { value: string }).value);
            }
          }
          break;
        }

        case 'TagBlock': {
          const block = member;
          for (const item of block.items) {
            if (item.kind === 'StringTag') {
              tags.push((item as { value: string }).value);
            } else if (item.kind === 'IdentifierTag') {
              tags.push((item as { name: AST.Identifier }).name.name);
            }
          }
          break;
        }

        case 'MethodDeclaration': {
          const method = member as AST.MethodDeclaration;
          methods.push({
            name: method.name.name,
            description: null, // Would extract from doc comments
          });
          break;
        }
      }
    }

    return {
      intent,
      tone,
      depth,
      verbosity,
      skills,
      constraints,
      tags,
      methods,
    };
  }

  private extractTeamConfig(team: AST.TeamDeclaration): {
    members: string[];
    primary: string | null;
    mergeMode: string;
    quorum: { required: number; total: number } | null;
  } {
    const members: string[] = [];
    let primary: string | null = null;
    let mergeMode = 'primary';
    let quorum: { required: number; total: number } | null = null;

    for (const member of team.body.members) {
      switch (member.kind) {
        case 'TeamMembersDeclaration': {
          const decl = member;
          for (const ref of decl.members) {
            const name = this.getPersonaRefName(ref);
            if (name) members.push(name);
          }
          break;
        }

        case 'TeamPrimaryDeclaration': {
          const decl = member;
          primary = this.getPersonaRefName(decl.primary);
          break;
        }

        case 'TeamMergeDeclaration': {
          const decl = member;
          if (decl.mode.kind === 'SimpleMergeMode') {
            mergeMode = decl.mode.mode;
          }
          break;
        }

        case 'TeamQuorumDeclaration': {
          const decl = member;
          quorum = {
            required: decl.required.value,
            total: decl.total.value,
          };
          break;
        }
      }
    }

    return { members, primary, mergeMode, quorum };
  }

  private generateMergeInstructions(mode: string): void {
    switch (mode) {
      case 'primary':
        this.line(
          'The primary lead makes final decisions. Other members provide input and suggestions.'
        );
        break;
      case 'consensus':
        this.line(
          'All team members must reach agreement. Discuss until consensus is achieved.'
        );
        break;
      case 'majority':
        this.line(
          'Decisions are made by majority vote. Each member has equal weight.'
        );
        break;
      case 'debate':
        this.line(
          'Members should present different perspectives. Explore pros and cons thoroughly.'
        );
        break;
      case 'append':
        this.line(
          'Each member contributes their unique perspective. All contributions are included.'
        );
        break;
      case 'weighted':
        this.line(
          'Members have different influence weights. Higher-weighted opinions carry more impact.'
        );
        break;
      case 'chain':
        this.line(
          "Process sequentially. Each member builds on the previous member's output."
        );
        break;
      default:
        this.line(`Use ${mode} collaboration strategy.`);
    }
  }

  private getPersonaRefName(ref: AST.PersonaReference): string | null {
    if (ref.ref.type === 'id') {
      return ref.ref.id.name;
    }
    if (ref.ref.type === 'qualified') {
      return ref.ref.path.parts.map((p) => p.name).join('::');
    }
    if (ref.ref.type === 'spawn') {
      return ref.ref.persona.name;
    }
    return null;
  }

  private section(title: string): void {
    this.line('═'.repeat(title.length + 4));
    this.line(`  ${title}`);
    this.line('═'.repeat(title.length + 4));
  }

  private line(text: string): void {
    this.output.push(text);
  }

  private blank(): void {
    this.output.push('');
  }

  private bullet(text: string): void {
    this.output.push(`• ${text}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              JSON GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate JSON configuration from PCL program
 */
export function generateJSON(
  program: AST.Program,
  options: Partial<GeneratorOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options, target: 'json' as const };
  const generator = new JSONGenerator(opts);
  return generator.generate(program);
}

class JSONGenerator {
  private readonly options: Required<GeneratorOptions>;

  constructor(options: Required<GeneratorOptions>) {
    this.options = options;
  }

  generate(program: AST.Program): string {
    const config: any = {
      $schema: 'https://pcl-lang.org/schema/v1.json',
      version: '1.0.0',
      personas: {},
      teams: {},
      workflows: {},
      skills: {},
    };

    for (const stmt of program.statements) {
      switch (stmt.kind) {
        case 'PersonaDeclaration':
          this.addPersona(config.personas, stmt);
          break;
        case 'TeamDeclaration':
          this.addTeam(config.teams, stmt);
          break;
        case 'WorkflowDeclaration':
          this.addWorkflow(config.workflows, stmt);
          break;
        case 'SkillDeclaration':
          this.addSkill(config.skills, stmt);
          break;
      }
    }

    // Clean up empty objects
    for (const key of Object.keys(config)) {
      if (
        typeof config[key] === 'object' &&
        Object.keys(config[key]).length === 0
      ) {
        delete config[key];
      }
    }

    return this.options.minify
      ? JSON.stringify(config)
      : JSON.stringify(config, null, this.options.indentSize);
  }

  private addPersona(target: any, decl: AST.PersonaDeclaration): void {
    const persona: any = {
      id: decl.id.name,
    };

    // Add extends
    if (decl.extends.length > 0) {
      persona.extends = decl.extends.map((e) =>
        e.typeName.parts.map((p) => p.name).join('::')
      );
    }

    // Extract members
    for (const member of decl.body.members) {
      switch (member.kind) {
        case 'PropertyDeclaration': {
          const prop = member as AST.PropertyDeclaration;
          const value = this.extractValue(prop.initializer);
          if (value !== undefined) {
            persona[prop.name.name] = value;
          }
          break;
        }

        case 'SkillBlock': {
          const block = member;
          persona.skills = block.items
            .map((item) => {
              if (item.kind === 'StringSkill') {
                return (item as { value: string }).value;
              }
              if (item.kind === 'IdentifierSkill') {
                return (item as { name: AST.Identifier }).name.name;
              }
              return null;
            })
            .filter(Boolean);
          break;
        }

        case 'ConstraintBlock': {
          const block = member;
          persona.constraints = block.items
            .map((item) => {
              if (item.kind === 'StringConstraint') {
                return (item as { value: string }).value;
              }
              return null;
            })
            .filter(Boolean);
          break;
        }

        case 'TagBlock': {
          const block = member;
          persona.tags = block.items
            .map((item) => {
              if (item.kind === 'StringTag') {
                return (item as { value: string }).value;
              }
              if (item.kind === 'IdentifierTag') {
                return (item as { name: AST.Identifier }).name.name;
              }
              return null;
            })
            .filter(Boolean);
          break;
        }

        case 'MethodDeclaration': {
          const method = member;
          if (!persona.methods) persona.methods = {};
          persona.methods[method.name.name] = {
            async: method.async,
            parameters: method.parameters.map((p) => ({
              name: p.name.kind === 'Identifier' ? p.name.name : null,
              optional: p.optional,
            })),
          };
          break;
        }
      }
    }

    target[decl.id.name] = persona;
  }

  private addTeam(target: any, decl: AST.TeamDeclaration): void {
    const team: any = {
      id: decl.id.name,
    };

    for (const member of decl.body.members) {
      switch (member.kind) {
        case 'TeamMembersDeclaration': {
          const membersDecl = member as AST.TeamMembersDeclaration;
          team.members = membersDecl.members.map((ref) =>
            this.personaRefToString(ref)
          );
          break;
        }

        case 'TeamPrimaryDeclaration': {
          const primaryDecl = member as AST.TeamPrimaryDeclaration;
          team.primary = this.personaRefToString(primaryDecl.primary);
          break;
        }

        case 'TeamMergeDeclaration': {
          const mergeDecl = member as AST.TeamMergeDeclaration;
          if (mergeDecl.mode.kind === 'SimpleMergeMode') {
            team.merge = mergeDecl.mode.mode;
          } else {
            team.merge = { mode: 'custom' }; // Simplified
          }
          break;
        }

        case 'TeamQuorumDeclaration': {
          const quorumDecl = member as AST.TeamQuorumDeclaration;
          team.quorum = {
            required: quorumDecl.required.value,
            total: quorumDecl.total.value,
          };
          break;
        }

        case 'TeamConflictDeclaration': {
          const conflictDecl = member as AST.TeamConflictDeclaration;
          team.conflictOrder = conflictDecl.order.map((ref) =>
            this.personaRefToString(ref)
          );
          break;
        }
      }
    }

    target[decl.id.name] = team;
  }

  private addWorkflow(target: any, decl: AST.WorkflowDeclaration): void {
    const workflow: any = {
      id: decl.id.name,
    };

    for (const member of decl.body.members) {
      switch (member.kind) {
        case 'WorkflowInputDeclaration': {
          workflow.input = this.typeNodeToString(member.type);
          break;
        }

        case 'WorkflowOutputDeclaration': {
          workflow.output = this.typeNodeToString(member.type);
          break;
        }

        case 'WorkflowStepsDeclaration': {
          workflow.steps = this.workflowExprToObject(member.steps);
          break;
        }

        case 'WorkflowTimeoutDeclaration': {
          const timeout = member as AST.WorkflowTimeoutDeclaration;
          workflow.timeout = `${timeout.duration.value}${timeout.duration.unit}`;
          break;
        }

        case 'WorkflowRetryDeclaration': {
          const retry = member as AST.WorkflowRetryDeclaration;
          if (retry.config.kind === 'NumberLiteral') {
            workflow.retry = (retry.config as AST.NumberLiteral).value;
          } else {
            workflow.retry = {
              count: (retry.config as AST.RetryConfigNode).count.value,
            };
          }
          break;
        }

        case 'WorkflowFallbackDeclaration': {
          const fallback = member as AST.WorkflowFallbackDeclaration;
          workflow.fallback = this.personaRefToString(fallback.fallback);
          break;
        }
      }
    }

    target[decl.id.name] = workflow;
  }

  private addSkill(target: any, decl: AST.SkillDeclaration): void {
    const skill: any = {
      id: decl.id.name,
      items: [],
    };

    for (const member of decl.body.members) {
      if (member.kind === 'SkillItemsDeclaration') {
        skill.items = (member as AST.SkillItemsDeclaration).items.map(
          (i) => i.value
        );
      }
      if (member.kind === 'SkillCategoryDeclaration') {
        skill.category = (
          member as AST.SkillCategoryDeclaration
        ).category.value;
      }
    }

    target[decl.id.name] = skill;
  }

  private extractValue(expr: AST.Expression | null): unknown {
    if (!expr) return undefined;

    switch (expr.kind) {
      case 'StringLiteral':
        return (expr as AST.StringLiteral).value;
      case 'NumberLiteral':
        return (expr as AST.NumberLiteral).value;
      case 'BooleanLiteral':
        return (expr as AST.BooleanLiteral).value;
      case 'NullLiteral':
        return null;
      case 'Identifier':
        return (expr as AST.Identifier).name;
      case 'ArrayExpression':
        return (expr as AST.ArrayExpression).elements
          .filter(
            (e): e is AST.Expression => e !== null && e.kind !== 'SpreadElement'
          )
          .map((e) => this.extractValue(e));
      case 'ObjectExpression': {
        const obj: any = {};
        for (const prop of (expr as AST.ObjectExpression).properties) {
          if (prop.kind === 'ObjectKeyValueProperty') {
            const kv = prop as AST.ObjectKeyValueProperty;
            const key =
              kv.key.kind === 'Identifier'
                ? (kv.key as AST.Identifier).name
                : kv.key.kind === 'StringLiteral'
                  ? (kv.key as AST.StringLiteral).value
                  : String((kv.key as AST.NumberLiteral).value);
            obj[key] = this.extractValue(kv.value);
          }
        }
        return obj;
      }
      default:
        return undefined;
    }
  }

  private personaRefToString(ref: AST.PersonaReference): string {
    if (ref.ref.type === 'id') {
      return ref.ref.id.name;
    }
    if (ref.ref.type === 'qualified') {
      return ref.ref.path.parts.map((p) => p.name).join('::');
    }
    if (ref.ref.type === 'spawn') {
      return `${ref.ref.count.value}x${ref.ref.persona.name}`;
    }
    return '';
  }

  private typeNodeToString(type: AST.TypeNode): string {
    switch (type.kind) {
      case 'TypeReference': {
        const ref = type as AST.TypeReference;
        const name = ref.typeName.parts.map((p) => p.name).join('::');
        if (ref.typeArguments.length > 0) {
          return `${name}<${ref.typeArguments.map((a) => this.typeNodeToString(a)).join(', ')}>`;
        }
        return name;
      }
      case 'UnionType':
        return (type as AST.UnionType).types
          .map((t) => this.typeNodeToString(t))
          .join(' | ');
      case 'IntersectionType':
        return (type as AST.IntersectionType).types
          .map((t) => this.typeNodeToString(t))
          .join(' & ');
      case 'ArrayType':
        return `${this.typeNodeToString((type as AST.ArrayType).elementType)}[]`;
      case 'TupleType':
        return `[${(type as AST.TupleType).elements.map((e) => this.typeNodeToString(e)).join(', ')}]`;
      default:
        return 'Unknown';
    }
  }

  private workflowExprToObject(expr: AST.WorkflowExpression): any {
    switch (expr.kind) {
      case 'WorkflowSequenceExpr':
        return {
          type: 'sequence',
          steps: (expr as AST.WorkflowSequenceExpr).steps.map((s) =>
            this.workflowExprToObject(s)
          ),
        };
      case 'WorkflowParallelExpr':
        return {
          type: 'parallel',
          branches: (expr as AST.WorkflowParallelExpr).branches.map((b) =>
            this.workflowExprToObject(b)
          ),
        };
      case 'WorkflowChoiceExpr':
        return {
          type: 'choice',
          branches: (expr as AST.WorkflowChoiceExpr).branches.map((b) =>
            this.workflowExprToObject(b)
          ),
        };
      case 'WorkflowPersonaRef':
        return {
          type: 'persona',
          ref: this.personaRefToString((expr as AST.WorkflowPersonaRef).ref),
        };
      case 'WorkflowMergeExpr':
        return {
          type: 'merge',
          mode:
            (expr as AST.WorkflowMergeExpr).mode.kind === 'SimpleMergeMode'
              ? (expr as AST.WorkflowMergeExpr).mode.mode
              : 'custom',
        };
      case 'WorkflowConditionalExpr': {
        const cond = expr as AST.WorkflowConditionalExpr;
        return {
          type: 'conditional',
          then: this.workflowExprToObject(cond.then),
          else: cond.else ? this.workflowExprToObject(cond.else) : null,
        };
      }
      case 'WorkflowLoopExpr': {
        const loop = expr as AST.WorkflowLoopExpr;
        return {
          type: 'loop',
          loopType: loop.loopType,
          body: this.workflowExprToObject(loop.body),
        };
      }
      case 'WorkflowGroupExpr':
        return this.workflowExprToObject((expr as AST.WorkflowGroupExpr).expr);
      default:
        return { type: 'unknown' };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              YAML GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate YAML configuration from PCL program
 */
export function generateYAML(
  program: AST.Program,
  options: Partial<GeneratorOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options, target: 'yaml' as const };
  const generator = new YAMLGenerator(opts);
  return generator.generate(program);
}

class YAMLGenerator {
  private readonly options: Required<GeneratorOptions>;
  private indentLevel = 0;

  constructor(options: Required<GeneratorOptions>) {
    this.options = options;
  }

  generate(program: AST.Program): string {
    const lines: string[] = [];

    // Header comment
    if (this.options.includeComments) {
      lines.push('# Generated by PCL Compiler');
      lines.push('# https://pcl-lang.org');
      lines.push('');
    }

    // Version and schema
    lines.push('version: "1.0.0"');
    if (this.options.includeMetadata) {
      lines.push('$schema: "https://pcl-lang.org/schema/v1.yaml"');
    }
    lines.push('');

    // Collect declarations by type
    const personas = program.statements.filter(
      (s) => s.kind === 'PersonaDeclaration'
    ) as AST.PersonaDeclaration[];
    const teams = program.statements.filter(
      (s) => s.kind === 'TeamDeclaration'
    ) as AST.TeamDeclaration[];
    const workflows = program.statements.filter(
      (s) => s.kind === 'WorkflowDeclaration'
    ) as AST.WorkflowDeclaration[];
    const skills = program.statements.filter(
      (s) => s.kind === 'SkillDeclaration'
    ) as AST.SkillDeclaration[];

    // Generate sections
    if (personas.length > 0) {
      lines.push('personas:');
      this.indentLevel++;
      for (const persona of personas) {
        lines.push(...this.generatePersona(persona));
      }
      this.indentLevel--;
      lines.push('');
    }

    if (teams.length > 0) {
      lines.push('teams:');
      this.indentLevel++;
      for (const team of teams) {
        lines.push(...this.generateTeam(team));
      }
      this.indentLevel--;
      lines.push('');
    }

    if (workflows.length > 0) {
      lines.push('workflows:');
      this.indentLevel++;
      for (const workflow of workflows) {
        lines.push(...this.generateWorkflow(workflow));
      }
      this.indentLevel--;
      lines.push('');
    }

    if (skills.length > 0) {
      lines.push('skills:');
      this.indentLevel++;
      for (const skill of skills) {
        lines.push(...this.generateSkill(skill));
      }
      this.indentLevel--;
      lines.push('');
    }

    return lines.join('\n').trim() + '\n';
  }

  private generatePersona(decl: AST.PersonaDeclaration): string[] {
    const lines: string[] = [];
    const indent = this.getIndent();

    lines.push(`${indent}${decl.id.name}:`);
    this.indentLevel++;
    const innerIndent = this.getIndent();

    // ID
    lines.push(`${innerIndent}id: ${decl.id.name}`);

    // Extends
    if (decl.extends.length > 0) {
      lines.push(`${innerIndent}extends:`);
      for (const ext of decl.extends) {
        const extName = ext.typeName.parts.map((p) => p.name).join('::');
        lines.push(`${innerIndent}  - ${extName}`);
      }
    }

    // Extract members
    for (const member of decl.body.members) {
      switch (member.kind) {
        case 'PropertyDeclaration': {
          const prop = member as AST.PropertyDeclaration;
          const value = this.extractValue(prop.initializer);
          if (value !== undefined) {
            lines.push(
              `${innerIndent}${prop.name.name}: ${this.formatValue(value)}`
            );
          }
          break;
        }

        case 'SkillBlock': {
          const block = member as AST.SkillBlock;
          const skills = block.items
            .map((item) => {
              if (item.kind === 'StringSkill') {
                return (item as { value: string }).value;
              }
              if (item.kind === 'IdentifierSkill') {
                return (item as { name: AST.Identifier }).name.name;
              }
              return null;
            })
            .filter(Boolean);

          if (skills.length > 0) {
            lines.push(`${innerIndent}skills:`);
            for (const skill of skills) {
              lines.push(`${innerIndent}  - ${this.formatValue(skill)}`);
            }
          }
          break;
        }

        case 'ConstraintBlock': {
          const block = member as AST.ConstraintBlock;
          const constraints = block.items
            .map((item) => {
              if (item.kind === 'StringConstraint') {
                return (item as { value: string }).value;
              }
              return null;
            })
            .filter(Boolean);

          if (constraints.length > 0) {
            lines.push(`${innerIndent}constraints:`);
            for (const constraint of constraints) {
              lines.push(`${innerIndent}  - ${this.formatValue(constraint)}`);
            }
          }
          break;
        }

        case 'TagBlock': {
          const block = member as AST.TagBlock;
          const tags = block.items
            .map((item) => {
              if (item.kind === 'StringTag') {
                return (item as { value: string }).value;
              }
              if (item.kind === 'IdentifierTag') {
                return (item as { name: AST.Identifier }).name.name;
              }
              return null;
            })
            .filter(Boolean);

          if (tags.length > 0) {
            lines.push(`${innerIndent}tags:`);
            for (const tag of tags) {
              lines.push(`${innerIndent}  - ${this.formatValue(tag)}`);
            }
          }
          break;
        }

        case 'MethodDeclaration': {
          const method = member as AST.MethodDeclaration;
          if (!lines.find((l) => l.includes('methods:'))) {
            lines.push(`${innerIndent}methods:`);
          }
          lines.push(`${innerIndent}  ${method.name.name}:`);
          lines.push(`${innerIndent}    async: ${method.async}`);
          if (method.parameters.length > 0) {
            lines.push(`${innerIndent}    parameters:`);
            for (const param of method.parameters) {
              const paramName =
                param.name.kind === 'Identifier'
                  ? (param.name as AST.Identifier).name
                  : 'unknown';
              lines.push(`${innerIndent}      - name: ${paramName}`);
              lines.push(`${innerIndent}        optional: ${param.optional}`);
            }
          }
          break;
        }
      }
    }

    this.indentLevel--;
    return lines;
  }

  private generateTeam(decl: AST.TeamDeclaration): string[] {
    const lines: string[] = [];
    const indent = this.getIndent();

    lines.push(`${indent}${decl.id.name}:`);
    this.indentLevel++;
    const innerIndent = this.getIndent();

    lines.push(`${innerIndent}id: ${decl.id.name}`);

    for (const member of decl.body.members) {
      switch (member.kind) {
        case 'TeamMembersDeclaration': {
          const membersDecl = member as AST.TeamMembersDeclaration;
          lines.push(`${innerIndent}members:`);
          for (const ref of membersDecl.members) {
            lines.push(`${innerIndent}  - ${this.personaRefToString(ref)}`);
          }
          break;
        }

        case 'TeamPrimaryDeclaration': {
          const primaryDecl = member as AST.TeamPrimaryDeclaration;
          lines.push(
            `${innerIndent}primary: ${this.personaRefToString(primaryDecl.primary)}`
          );
          break;
        }

        case 'TeamMergeDeclaration': {
          const mergeDecl = member as AST.TeamMergeDeclaration;
          if (mergeDecl.mode.kind === 'SimpleMergeMode') {
            lines.push(`${innerIndent}merge: ${mergeDecl.mode.mode}`);
          } else {
            lines.push(`${innerIndent}merge:`);
            lines.push(`${innerIndent}  mode: custom`);
          }
          break;
        }

        case 'TeamQuorumDeclaration': {
          const quorumDecl = member as AST.TeamQuorumDeclaration;
          lines.push(`${innerIndent}quorum:`);
          lines.push(`${innerIndent}  required: ${quorumDecl.required.value}`);
          lines.push(`${innerIndent}  total: ${quorumDecl.total.value}`);
          break;
        }

        case 'TeamConflictDeclaration': {
          const conflictDecl = member as AST.TeamConflictDeclaration;
          lines.push(`${innerIndent}conflictOrder:`);
          for (const ref of conflictDecl.order) {
            lines.push(`${innerIndent}  - ${this.personaRefToString(ref)}`);
          }
          break;
        }
      }
    }

    this.indentLevel--;
    return lines;
  }

  private generateWorkflow(decl: AST.WorkflowDeclaration): string[] {
    const lines: string[] = [];
    const indent = this.getIndent();

    lines.push(`${indent}${decl.id.name}:`);
    this.indentLevel++;
    const innerIndent = this.getIndent();

    lines.push(`${innerIndent}id: ${decl.id.name}`);

    for (const member of decl.body.members) {
      switch (member.kind) {
        case 'WorkflowInputDeclaration': {
          lines.push(
            `${innerIndent}input: ${this.typeNodeToString((member as AST.WorkflowInputDeclaration).type)}`
          );
          break;
        }

        case 'WorkflowOutputDeclaration': {
          lines.push(
            `${innerIndent}output: ${this.typeNodeToString((member as AST.WorkflowOutputDeclaration).type)}`
          );
          break;
        }

        case 'WorkflowStepsDeclaration': {
          lines.push(`${innerIndent}steps:`);
          const stepsYaml = this.workflowExprToYAML(
            (member as AST.WorkflowStepsDeclaration).steps,
            this.indentLevel + 1
          );
          lines.push(...stepsYaml);
          break;
        }

        case 'WorkflowTimeoutDeclaration': {
          const timeout = member as AST.WorkflowTimeoutDeclaration;
          lines.push(
            `${innerIndent}timeout: "${timeout.duration.value}${timeout.duration.unit}"`
          );
          break;
        }

        case 'WorkflowRetryDeclaration': {
          const retry = member as AST.WorkflowRetryDeclaration;
          if (retry.config.kind === 'NumberLiteral') {
            lines.push(
              `${innerIndent}retry: ${(retry.config as AST.NumberLiteral).value}`
            );
          } else {
            lines.push(`${innerIndent}retry:`);
            lines.push(
              `${innerIndent}  count: ${(retry.config as AST.RetryConfigNode).count.value}`
            );
          }
          break;
        }

        case 'WorkflowFallbackDeclaration': {
          const fallback = member as AST.WorkflowFallbackDeclaration;
          lines.push(
            `${innerIndent}fallback: ${this.personaRefToString(fallback.fallback)}`
          );
          break;
        }
      }
    }

    this.indentLevel--;
    return lines;
  }

  private generateSkill(decl: AST.SkillDeclaration): string[] {
    const lines: string[] = [];
    const indent = this.getIndent();

    lines.push(`${indent}${decl.id.name}:`);
    this.indentLevel++;
    const innerIndent = this.getIndent();

    lines.push(`${innerIndent}id: ${decl.id.name}`);

    for (const member of decl.body.members) {
      if (member.kind === 'SkillItemsDeclaration') {
        const items = (member as AST.SkillItemsDeclaration).items;
        lines.push(`${innerIndent}items:`);
        for (const item of items) {
          lines.push(`${innerIndent}  - ${this.formatValue(item.value)}`);
        }
      }
      if (member.kind === 'SkillCategoryDeclaration') {
        lines.push(
          `${innerIndent}category: ${this.formatValue((member as AST.SkillCategoryDeclaration).category.value)}`
        );
      }
    }

    this.indentLevel--;
    return lines;
  }

  private workflowExprToYAML(
    expr: AST.WorkflowExpression,
    baseIndent: number
  ): string[] {
    const lines: string[] = [];
    const indent = '  '.repeat(baseIndent);

    switch (expr.kind) {
      case 'WorkflowSequenceExpr': {
        const seq = expr as AST.WorkflowSequenceExpr;
        lines.push(`${indent}type: sequence`);
        lines.push(`${indent}steps:`);
        for (const step of seq.steps) {
          lines.push(`${indent}  -`);
          const stepLines = this.workflowExprToYAML(step, baseIndent + 2);
          lines.push(...stepLines.map((l) => `  ${l}`));
        }
        break;
      }

      case 'WorkflowParallelExpr': {
        const par = expr as AST.WorkflowParallelExpr;
        lines.push(`${indent}type: parallel`);
        lines.push(`${indent}branches:`);
        for (const branch of par.branches) {
          lines.push(`${indent}  -`);
          const branchLines = this.workflowExprToYAML(branch, baseIndent + 2);
          lines.push(...branchLines.map((l) => `  ${l}`));
        }
        break;
      }

      case 'WorkflowChoiceExpr': {
        const choice = expr as AST.WorkflowChoiceExpr;
        lines.push(`${indent}type: choice`);
        lines.push(`${indent}branches:`);
        for (const branch of choice.branches) {
          lines.push(`${indent}  -`);
          const branchLines = this.workflowExprToYAML(branch, baseIndent + 2);
          lines.push(...branchLines.map((l) => `  ${l}`));
        }
        break;
      }

      case 'WorkflowPersonaRef': {
        const ref = expr as AST.WorkflowPersonaRef;
        lines.push(`${indent}type: persona`);
        lines.push(`${indent}ref: ${this.personaRefToString(ref.ref)}`);
        break;
      }

      case 'WorkflowMergeExpr': {
        const merge = expr as AST.WorkflowMergeExpr;
        lines.push(`${indent}type: merge`);
        const mode =
          merge.mode.kind === 'SimpleMergeMode' ? merge.mode.mode : 'custom';
        lines.push(`${indent}mode: ${mode}`);
        break;
      }

      case 'WorkflowConditionalExpr': {
        const cond = expr as AST.WorkflowConditionalExpr;
        lines.push(`${indent}type: conditional`);
        lines.push(`${indent}then:`);
        const thenLines = this.workflowExprToYAML(cond.then, baseIndent + 1);
        lines.push(...thenLines);
        if (cond.else) {
          lines.push(`${indent}else:`);
          const elseLines = this.workflowExprToYAML(cond.else, baseIndent + 1);
          lines.push(...elseLines);
        }
        break;
      }

      case 'WorkflowLoopExpr': {
        const loop = expr as AST.WorkflowLoopExpr;
        lines.push(`${indent}type: loop`);
        lines.push(`${indent}loopType: ${loop.loopType}`);
        lines.push(`${indent}body:`);
        const bodyLines = this.workflowExprToYAML(loop.body, baseIndent + 1);
        lines.push(...bodyLines);
        break;
      }

      case 'WorkflowGroupExpr':
        return this.workflowExprToYAML(
          (expr as AST.WorkflowGroupExpr).expr,
          baseIndent
        );

      default:
        lines.push(`${indent}type: unknown`);
    }

    return lines;
  }

  private extractValue(expr: AST.Expression | null): unknown {
    if (!expr) return undefined;

    switch (expr.kind) {
      case 'StringLiteral':
        return (expr as AST.StringLiteral).value;
      case 'NumberLiteral':
        return (expr as AST.NumberLiteral).value;
      case 'BooleanLiteral':
        return (expr as AST.BooleanLiteral).value;
      case 'NullLiteral':
        return null;
      case 'Identifier':
        return (expr as AST.Identifier).name;
      case 'ArrayExpression':
        return (expr as AST.ArrayExpression).elements
          .filter(
            (e): e is AST.Expression => e !== null && e.kind !== 'SpreadElement'
          )
          .map((e) => this.extractValue(e));
      case 'ObjectExpression': {
        const obj: any = {};
        for (const prop of (expr as AST.ObjectExpression).properties) {
          if (prop.kind === 'ObjectKeyValueProperty') {
            const kv = prop as AST.ObjectKeyValueProperty;
            const key =
              kv.key.kind === 'Identifier'
                ? (kv.key as AST.Identifier).name
                : kv.key.kind === 'StringLiteral'
                  ? (kv.key as AST.StringLiteral).value
                  : String((kv.key as AST.NumberLiteral).value);
            obj[key] = this.extractValue(kv.value);
          }
        }
        return obj;
      }
      default:
        return undefined;
    }
  }

  private formatValue(value: unknown): string {
    if (value === null) {
      return 'null';
    }
    if (typeof value === 'string') {
      // Escape strings with special YAML characters
      if (
        value.includes(':') ||
        value.includes('#') ||
        value.includes('"') ||
        value.includes("'") ||
        value.includes('\n') ||
        value.startsWith(' ') ||
        value.endsWith(' ')
      ) {
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map((v) => this.formatValue(v)).join(', ')}]`;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private personaRefToString(ref: AST.PersonaReference): string {
    if (ref.ref.type === 'id') {
      return ref.ref.id.name;
    }
    if (ref.ref.type === 'qualified') {
      return ref.ref.path.parts.map((p) => p.name).join('::');
    }
    if (ref.ref.type === 'spawn') {
      return `${ref.ref.count.value}x${ref.ref.persona.name}`;
    }
    return '';
  }

  private typeNodeToString(type: AST.TypeNode): string {
    switch (type.kind) {
      case 'TypeReference': {
        const ref = type as AST.TypeReference;
        const name = ref.typeName.parts.map((p) => p.name).join('::');
        if (ref.typeArguments.length > 0) {
          return `${name}<${ref.typeArguments.map((a) => this.typeNodeToString(a)).join(', ')}>`;
        }
        return name;
      }
      case 'UnionType':
        return (type as AST.UnionType).types
          .map((t) => this.typeNodeToString(t))
          .join(' | ');
      case 'IntersectionType':
        return (type as AST.IntersectionType).types
          .map((t) => this.typeNodeToString(t))
          .join(' & ');
      case 'ArrayType':
        return `${this.typeNodeToString((type as AST.ArrayType).elementType)}[]`;
      case 'TupleType':
        return `[${(type as AST.TupleType).elements.map((e) => this.typeNodeToString(e)).join(', ')}]`;
      default:
        return 'Unknown';
    }
  }

  private getIndent(): string {
    return '  '.repeat(this.indentLevel);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPESCRIPT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate TypeScript code from PCL program
 */
export function generateTypeScript(
  program: AST.Program,
  options: Partial<GeneratorOptions> = {}
): string {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
    target: 'typescript' as const,
  };
  const generator = new TypeScriptGenerator(opts);
  return generator.generate(program);
}

class TypeScriptGenerator {
  private readonly options: Required<GeneratorOptions>;
  private output: string[] = [];
  private indentLevel = 0;

  constructor(options: Required<GeneratorOptions>) {
    this.options = options;
  }

  generate(program: AST.Program): string {
    this.output = [];

    // Header
    this.comment('Generated by PCL Compiler');
    this.comment('Do not edit manually');
    this.blank();

    // Imports
    this.line(
      "import { createRuntime, createPersona, createTeam } from '@pcl/runtime';"
    );
    this.blank();

    // Generate declarations
    for (const stmt of program.statements) {
      this.generateStatement(stmt);
      this.blank();
    }

    return this.output.join('\n');
  }

  private generateStatement(stmt: AST.Statement): void {
    switch (stmt.kind) {
      case 'PersonaDeclaration':
        this.generatePersona(stmt as AST.PersonaDeclaration);
        break;
      case 'TeamDeclaration':
        this.generateTeam(stmt as AST.TeamDeclaration);
        break;
      case 'WorkflowDeclaration':
        this.generateWorkflow(stmt as AST.WorkflowDeclaration);
        break;
      case 'TypeDeclaration':
        this.generateTypeDeclaration(stmt as AST.TypeDeclaration);
        break;
      case 'InterfaceDeclaration':
        this.generateInterface(stmt as AST.InterfaceDeclaration);
        break;
      case 'FunctionDeclaration':
        this.generateFunction(stmt as AST.FunctionDeclaration);
        break;
      case 'VariableDeclaration':
        this.generateVariable(stmt as AST.VariableDeclaration);
        break;
    }
  }

  private generatePersona(decl: AST.PersonaDeclaration): void {
    const name = decl.id.name;

    // Extract config
    const skills: string[] = [];
    const constraints: string[] = [];
    const tags: string[] = [];
    const methods: AST.MethodDeclaration[] = [];
    let intent = '';
    let tone = 'balanced';
    let depth = 'standard';
    let verbosity = 'balanced';
    let outputFormat = 'text';
    let maxTokens = 4096;
    let temperature = 0.7;
    let parentName: string | null = null;

    // Extract parent if extends
    if (decl.extends.length > 0) {
      const firstExtends = decl.extends[0];
      parentName = firstExtends.typeName.parts.map((p) => p.name).join('.');
    }

    for (const member of decl.body.members) {
      if (member.kind === 'PropertyDeclaration') {
        const prop = member as AST.PropertyDeclaration;
        if (
          prop.name.name === 'intent' &&
          prop.initializer?.kind === 'StringLiteral'
        ) {
          intent = (prop.initializer as AST.StringLiteral).value;
        }
        if (
          prop.name.name === 'tone' &&
          prop.initializer?.kind === 'Identifier'
        ) {
          tone = (prop.initializer as AST.Identifier).name;
        }
        if (
          prop.name.name === 'depth' &&
          prop.initializer?.kind === 'Identifier'
        ) {
          depth = (prop.initializer as AST.Identifier).name;
        }
        if (
          prop.name.name === 'verbosity' &&
          prop.initializer?.kind === 'Identifier'
        ) {
          verbosity = (prop.initializer as AST.Identifier).name;
        }
        if (
          prop.name.name === 'outputFormat' &&
          prop.initializer?.kind === 'Identifier'
        ) {
          outputFormat = (prop.initializer as AST.Identifier).name;
        }
        if (
          prop.name.name === 'maxTokens' &&
          prop.initializer?.kind === 'NumberLiteral'
        ) {
          maxTokens = (prop.initializer as AST.NumberLiteral).value;
        }
        if (
          prop.name.name === 'temperature' &&
          prop.initializer?.kind === 'NumberLiteral'
        ) {
          temperature = (prop.initializer as AST.NumberLiteral).value;
        }
      }
      if (member.kind === 'SkillBlock') {
        for (const item of (member as AST.SkillBlock).items) {
          if (item.kind === 'StringSkill') {
            skills.push((item as { value: string }).value);
          }
        }
      }
      if (member.kind === 'ConstraintBlock') {
        for (const item of (member as AST.ConstraintBlock).items) {
          if (item.kind === 'StringConstraint') {
            constraints.push((item as { value: string }).value);
          }
        }
      }
      if (member.kind === 'TagBlock') {
        for (const item of (member as AST.TagBlock).items) {
          if (item.kind === 'StringTag') {
            tags.push((item as { value: string }).value);
          }
        }
      }
      if (member.kind === 'MethodDeclaration') {
        methods.push(member as AST.MethodDeclaration);
      }
    }

    // Generate persona configuration
    this.line(`export const ${name}Config = {`);
    this.indent();
    this.line(`id: '${name}',`);
    this.line(`name: '${name}',`);
    this.line(`intent: ${JSON.stringify(intent)},`);
    this.line(`tone: '${tone}' as const,`);
    this.line(`depth: '${depth}' as const,`);
    this.line(`verbosity: '${verbosity}' as const,`);
    this.line(`outputFormat: '${outputFormat}' as const,`);
    this.line(`maxTokens: ${maxTokens},`);
    this.line(`temperature: ${temperature},`);
    this.line(`skills: ${JSON.stringify(skills)},`);
    this.line(`constraints: ${JSON.stringify(constraints)},`);
    this.line(`tags: ${JSON.stringify(tags)},`);
    this.dedent();
    this.line('} as const;');
    this.blank();

    // Generate persona class
    const extendsClause = parentName ? ` extends ${parentName}Persona` : '';
    this.line(`export class ${name}Persona${extendsClause} {`);
    this.indent();
    this.line(`private instance: ReturnType<typeof createPersona>;`);
    this.blank();

    // Constructor
    this.line(`constructor() {`);
    this.indent();
    if (parentName) {
      this.line(`super();`);
    }
    this.line(
      `this.instance = createPersona('${name}', '${name}', ${name}Config);`
    );
    this.dedent();
    this.line('}');
    this.blank();

    // Core methods
    this.line(`/** Activate this persona */`);
    this.line(`activate(): void {`);
    this.indent();
    this.line(`this.instance.activate();`);
    this.dedent();
    this.line('}');
    this.blank();

    this.line(`/** Deactivate this persona */`);
    this.line(`deactivate(): void {`);
    this.indent();
    this.line(`this.instance.deactivate();`);
    this.dedent();
    this.line('}');
    this.blank();

    this.line(`/** Get persona state */`);
    this.line(`getState() {`);
    this.indent();
    this.line(`return this.instance.getState();`);
    this.dedent();
    this.line('}');
    this.blank();

    this.line(`/** Process a message */`);
    this.line(`async process(message: string): Promise<string> {`);
    this.indent();
    this.line(`const msg = {`);
    this.indent();
    this.line(`id: \`msg-\${Date.now()}\`,`);
    this.line(`from: null,`);
    this.line(`to: '${name}',`);
    this.line(`content: message,`);
    this.line(`metadata: {},`);
    this.line(`timestamp: new Date(),`);
    this.dedent();
    this.line(`};`);
    this.line(`const response = await this.instance.process(msg);`);
    this.line(`return response.content;`);
    this.dedent();
    this.line('}');
    this.blank();

    this.line(`/** Configure this persona */`);
    this.line(`configure(config: Partial<typeof ${name}Config>): void {`);
    this.indent();
    this.line(`this.instance.configure(config as any);`);
    this.dedent();
    this.line('}');
    this.blank();

    this.line(`/** Set context value */`);
    this.line(`setContext(key: string, value: unknown): void {`);
    this.indent();
    this.line(`this.instance.setContext(key, value);`);
    this.dedent();
    this.line('}');
    this.blank();

    this.line(`/** Get context value */`);
    this.line(`getContext<T = unknown>(key: string): T | undefined {`);
    this.indent();
    this.line(`return this.instance.getContext(key) as T | undefined;`);
    this.dedent();
    this.line('}');
    this.blank();

    this.line(`/** Remember a fact */`);
    this.line(`remember(key: string, value: unknown): void {`);
    this.indent();
    this.line(`this.instance.remember(key, value);`);
    this.dedent();
    this.line('}');
    this.blank();

    this.line(`/** Recall a fact */`);
    this.line(`recall<T = unknown>(key: string): T | undefined {`);
    this.indent();
    this.line(`return this.instance.recall(key) as T | undefined;`);
    this.dedent();
    this.line('}');
    this.blank();

    this.line(`/** Subscribe to events */`);
    this.line(`on(handler: (event: any) => void): () => void {`);
    this.indent();
    this.line(`return this.instance.on(handler);`);
    this.dedent();
    this.line('}');

    // Generate custom methods
    for (const method of methods) {
      this.blank();
      this.line(
        `/** ${method.name.name} method (custom implementation needed) */`
      );
      const params = method.parameters
        .map((p) => {
          const pName =
            p.name.kind === 'Identifier'
              ? (p.name as AST.Identifier).name
              : '_';
          const pType = p.type ? this.typeToString(p.type) : 'any';
          const opt = p.optional ? '?' : '';
          return `${pName}${opt}: ${pType}`;
        })
        .join(', ');

      const returnType = method.returnType
        ? this.typeToString(method.returnType)
        : 'void';
      const async = method.async ? 'async ' : '';

      this.line(`${async}${method.name.name}(${params}): ${returnType} {`);
      this.indent();
      this.line(`// TODO: Implement custom ${method.name.name} logic`);
      this.line(
        `throw new Error("Method ${method.name.name} not implemented");`
      );
      this.dedent();
      this.line('}');
    }

    this.dedent();
    this.line('}');
    this.blank();

    // Generate factory function
    this.line(`/** Create a new ${name} persona instance */`);
    this.line(`export function create${name}(): ${name}Persona {`);
    this.indent();
    this.line(`return new ${name}Persona();`);
    this.dedent();
    this.line('}');
  }

  private generateTeam(decl: AST.TeamDeclaration): void {
    const name = decl.id.name;
    const members: string[] = [];
    let primary: string | null = null;
    let mergeMode = 'primary';
    let quorum: { required: number; total: number } | null = null;
    const topic: string | null = null;
    const timeout = 30000;

    for (const member of decl.body.members) {
      if (member.kind === 'TeamMembersDeclaration') {
        for (const ref of (member as AST.TeamMembersDeclaration).members) {
          if (ref.ref.type === 'id') {
            members.push(ref.ref.id.name);
          }
        }
      }
      if (member.kind === 'TeamPrimaryDeclaration') {
        const ref = (member as AST.TeamPrimaryDeclaration).primary;
        if (ref.ref.type === 'id') {
          primary = ref.ref.id.name;
        }
      }
      if (member.kind === 'TeamMergeDeclaration') {
        const merge = member as AST.TeamMergeDeclaration;
        if (merge.mode.kind === 'SimpleMergeMode') {
          mergeMode = merge.mode.mode;
        }
      }
      if (member.kind === 'TeamQuorumDeclaration') {
        const q = member as AST.TeamQuorumDeclaration;
        if (
          q.required.kind === 'NumberLiteral' &&
          q.total.kind === 'NumberLiteral'
        ) {
          quorum = {
            required: (q.required as AST.NumberLiteral).value,
            total: (q.total as AST.NumberLiteral).value,
          };
        }
      }
    }

    this.line(`export const ${name}Config = {`);
    this.indent();
    this.line(`id: '${name}',`);
    this.line(`name: '${name}',`);
    this.line(`members: ${JSON.stringify(members)},`);
    if (primary) {
      this.line(`primary: '${primary}',`);
    }
    this.line(`mergeMode: '${mergeMode}' as const,`);
    if (quorum) {
      this.line(
        `quorum: { required: ${quorum.required}, total: ${quorum.total} },`
      );
    } else {
      this.line(`quorum: null,`);
    }
    if (topic) {
      this.line(`topic: ${JSON.stringify(topic)},`);
    } else {
      this.line(`topic: null,`);
    }
    this.line(`timeout: ${timeout},`);
    this.dedent();
    this.line('} as const;');
    this.blank();

    // Generate team class
    this.line(`export class ${name}Team {`);
    this.indent();
    this.line(`private instance: ReturnType<typeof createTeam>;`);
    this.line(`private memberPersonas: Map<string, any>;`);
    this.blank();

    // Constructor
    this.line(`constructor(personas: Map<string, any>) {`);
    this.indent();
    this.line(`this.memberPersonas = personas;`);
    this.line(
      `const members = ${name}Config.members.map(m => personas.get(m)).filter(Boolean);`
    );
    this.line(`this.instance = createTeam('${name}', '${name}', members, {`);
    this.indent();
    this.line(`mergeMode: ${name}Config.mergeMode,`);
    if (quorum) {
      this.line(`quorum: ${name}Config.quorum,`);
    }
    if (topic) {
      this.line(`topic: ${name}Config.topic,`);
    }
    this.line(`timeout: ${name}Config.timeout,`);
    this.dedent();
    this.line(`});`);
    this.dedent();
    this.line('}');
    this.blank();

    // Core methods
    this.line(`/** Get team state */`);
    this.line(`getState() {`);
    this.indent();
    this.line(`return this.instance.getState();`);
    this.dedent();
    this.line('}');
    this.blank();

    this.line(`/** Process a message through the team */`);
    this.line(`async process(message: string): Promise<string> {`);
    this.indent();
    this.line(`const msg = {`);
    this.indent();
    this.line(`id: \`msg-\${Date.now()}\`,`);
    this.line(`from: null,`);
    this.line(`to: '${name}',`);
    this.line(`content: message,`);
    this.line(`metadata: {},`);
    this.line(`timestamp: new Date(),`);
    this.dedent();
    this.line(`};`);
    this.line(
      `const members = ${name}Config.members.map(m => this.memberPersonas.get(m)).filter(Boolean);`
    );
    this.line(`const response = await this.instance.process(msg, members);`);
    this.line(`return response.content;`);
    this.dedent();
    this.line('}');
    this.blank();

    this.line(`/** Configure this team */`);
    this.line(`configure(config: Partial<typeof ${name}Config>): void {`);
    this.indent();
    this.line(`this.instance.configure(config as any);`);
    this.dedent();
    this.line('}');
    this.blank();

    this.line(`/** Get team member states */`);
    this.line(`getMembers() {`);
    this.indent();
    this.line(`return this.instance.getState().members;`);
    this.dedent();
    this.line('}');
    this.blank();

    this.line(`/** Get primary member (if configured) */`);
    this.line(`getPrimary() {`);
    this.indent();
    this.line(`return this.instance.getState().primary;`);
    this.dedent();
    this.line('}');

    this.dedent();
    this.line('}');
    this.blank();

    // Generate factory function
    this.line(`/** Create a new ${name} team instance */`);
    this.line(
      `export function create${name}(personas: Map<string, any>): ${name}Team {`
    );
    this.indent();
    this.line(`return new ${name}Team(personas);`);
    this.dedent();
    this.line('}');
  }

  private generateWorkflow(decl: AST.WorkflowDeclaration): void {
    const name = decl.id.name;
    let inputType = 'any';
    let outputType = 'any';
    let steps: AST.WorkflowExpression | null = null;

    for (const member of decl.body.members) {
      if (member.kind === 'WorkflowInputDeclaration') {
        inputType = this.typeToString(
          (member as AST.WorkflowInputDeclaration).type
        );
      }
      if (member.kind === 'WorkflowOutputDeclaration') {
        outputType = this.typeToString(
          (member as AST.WorkflowOutputDeclaration).type
        );
      }
      if (member.kind === 'WorkflowStepsDeclaration') {
        steps = (member as AST.WorkflowStepsDeclaration).steps;
      }
    }

    // Generate workflow configuration
    this.line(`export const ${name}WorkflowConfig = {`);
    this.indent();
    this.line(`id: '${name}',`);
    this.line(`name: '${name}',`);
    if (steps) {
      this.line(`steps: ${JSON.stringify(this.workflowExprToArray(steps))},`);
    } else {
      this.line(`steps: [] as string[],`);
    }
    this.dedent();
    this.line('} as const;');
    this.blank();

    // Generate workflow class
    this.line(`export class ${name}Workflow {`);
    this.indent();
    this.line(
      `private status: 'pending' | 'running' | 'completed' | 'failed' = 'pending';`
    );
    this.line(`private currentStep = 0;`);
    this.line(`private result: ${outputType} | null = null;`);
    this.line(`private error: Error | null = null;`);
    this.blank();

    // Execute method
    this.line(`/** Execute the workflow */`);
    this.line(`async execute(input: ${inputType}): Promise<${outputType}> {`);
    this.indent();
    this.line(`this.status = 'running';`);
    this.line(`this.currentStep = 0;`);
    this.blank();
    this.line(`try {`);
    this.indent();
    this.line(`// TODO: Implement workflow execution logic`);
    this.line(`// Process steps: ${name}WorkflowConfig.steps`);
    this.line(`// Transform input to output through workflow steps`);
    this.blank();
    this.line(`// Placeholder implementation`);
    this.line(`const output = input as any as ${outputType};`);
    this.blank();
    this.line(`this.status = 'completed';`);
    this.line(`this.result = output;`);
    this.line(`return output;`);
    this.dedent();
    this.line(`} catch (err) {`);
    this.indent();
    this.line(`this.status = 'failed';`);
    this.line(`this.error = err as Error;`);
    this.line(`throw err;`);
    this.dedent();
    this.line(`}`);
    this.dedent();
    this.line('}');
    this.blank();

    // Status methods
    this.line(`/** Get current workflow status */`);
    this.line(`getStatus() {`);
    this.indent();
    this.line(`return {`);
    this.indent();
    this.line(`status: this.status,`);
    this.line(`currentStep: this.currentStep,`);
    this.line(`totalSteps: ${name}WorkflowConfig.steps.length,`);
    this.line(`result: this.result,`);
    this.line(`error: this.error?.message,`);
    this.dedent();
    this.line(`};`);
    this.dedent();
    this.line('}');
    this.blank();

    this.line(`/** Check if workflow is running */`);
    this.line(`isRunning(): boolean {`);
    this.indent();
    this.line(`return this.status === 'running';`);
    this.dedent();
    this.line('}');
    this.blank();

    this.line(`/** Check if workflow completed successfully */`);
    this.line(`isCompleted(): boolean {`);
    this.indent();
    this.line(`return this.status === 'completed';`);
    this.dedent();
    this.line('}');
    this.blank();

    this.line(`/** Check if workflow failed */`);
    this.line(`isFailed(): boolean {`);
    this.indent();
    this.line(`return this.status === 'failed';`);
    this.dedent();
    this.line('}');

    this.dedent();
    this.line('}');
    this.blank();

    // Generate factory function
    this.line(`/** Create a new ${name} workflow instance */`);
    this.line(`export function create${name}Workflow(): ${name}Workflow {`);
    this.indent();
    this.line(`return new ${name}Workflow();`);
    this.dedent();
    this.line('}');
  }

  private generateTypeDeclaration(decl: AST.TypeDeclaration): void {
    const name = decl.id.name;
    this.line(`export type ${name} = ${this.typeToString(decl.type)};`);
  }

  private generateInterface(decl: AST.InterfaceDeclaration): void {
    const name = decl.id.name;

    this.line(`export interface ${name} {`);
    this.indent();

    for (const member of decl.members) {
      if (member.kind === 'PropertySignature') {
        const prop = member as AST.PropertySignature;
        const propName =
          typeof prop.name === 'string'
            ? prop.name
            : (prop.name as AST.Identifier).name;
        const opt = prop.optional ? '?' : '';
        const readonly = prop.readonly ? 'readonly ' : '';
        this.line(
          `${readonly}${propName}${opt}: ${this.typeToString(prop.type)};`
        );
      }
    }

    this.dedent();
    this.line('}');
  }

  private generateFunction(decl: AST.FunctionDeclaration): void {
    const name = decl.id.name;
    const params = decl.parameters
      .map((p) => {
        const pName =
          p.name.kind === 'Identifier' ? (p.name as AST.Identifier).name : '_';
        const pType = p.type ? this.typeToString(p.type) : 'any';
        const opt = p.optional ? '?' : '';
        return `${pName}${opt}: ${pType}`;
      })
      .join(', ');

    const returnType = decl.returnType
      ? this.typeToString(decl.returnType)
      : 'void';
    const async = decl.async ? 'async ' : '';

    this.line(`export ${async}function ${name}(${params}): ${returnType} {`);
    this.indent();
    this.line('// TODO: Implement');
    this.line('throw new Error("Not implemented");');
    this.dedent();
    this.line('}');
  }

  private generateVariable(decl: AST.VariableDeclaration): void {
    const keyword = decl.declarationKind === 'const' ? 'const' : 'let';

    for (const declarator of decl.declarations) {
      if (declarator.id.kind === 'Identifier') {
        const name = (declarator.id as AST.Identifier).name;
        const type = declarator.type
          ? `: ${this.typeToString(declarator.type)}`
          : '';
        const init = declarator.init
          ? ` = ${this.exprToString(declarator.init)}`
          : '';
        this.line(`export ${keyword} ${name}${type}${init};`);
      }
    }
  }

  private typeToString(type: AST.TypeNode): string {
    switch (type.kind) {
      case 'TypeReference': {
        const ref = type as AST.TypeReference;
        const name = ref.typeName.parts.map((p) => p.name).join('.');
        const builtins: Record<string, string> = {
          String: 'string',
          Int: 'number',
          Float: 'number',
          Bool: 'boolean',
          Void: 'void',
          Any: 'any',
          Unknown: 'unknown',
          Never: 'never',
        };
        const tsName = builtins[name] ?? name;
        if (ref.typeArguments.length > 0) {
          return `${tsName}<${ref.typeArguments.map((a) => this.typeToString(a)).join(', ')}>`;
        }
        return tsName;
      }
      case 'UnionType':
        return (type as AST.UnionType).types
          .map((t) => this.typeToString(t))
          .join(' | ');
      case 'IntersectionType':
        return (type as AST.IntersectionType).types
          .map((t) => this.typeToString(t))
          .join(' & ');
      case 'ArrayType':
        return `${this.typeToString((type as AST.ArrayType).elementType)}[]`;
      case 'TupleType':
        return `[${(type as AST.TupleType).elements.map((e) => this.typeToString(e)).join(', ')}]`;
      case 'FunctionType': {
        const func = type as AST.FunctionType;
        const params = func.parameters
          .map((p) => {
            const name =
              p.name && p.name.kind === 'Identifier'
                ? (p.name as AST.Identifier).name
                : '_';
            return `${name}: ${p.type ? this.typeToString(p.type) : 'any'}`;
          })
          .join(', ');
        return `(${params}) => ${this.typeToString(func.returnType)}`;
      }
      case 'LiteralType': {
        const lit = type as AST.LiteralType;
        if (lit.literal.kind === 'StringLiteral')
          return `'${(lit.literal as AST.StringLiteral).value}'`;
        if (lit.literal.kind === 'NumberLiteral')
          return String((lit.literal as AST.NumberLiteral).value);
        if (lit.literal.kind === 'BooleanLiteral')
          return String((lit.literal as AST.BooleanLiteral).value);
        return 'unknown';
      }
      default:
        return 'unknown';
    }
  }

  private exprToString(expr: AST.Expression): string {
    switch (expr.kind) {
      case 'StringLiteral':
        return JSON.stringify((expr as AST.StringLiteral).value);
      case 'NumberLiteral':
        return String((expr as AST.NumberLiteral).value);
      case 'BooleanLiteral':
        return String((expr as AST.BooleanLiteral).value);
      case 'NullLiteral':
        return 'null';
      case 'Identifier':
        return (expr as AST.Identifier).name;
      case 'ArrayExpression':
        return `[${(expr as AST.ArrayExpression).elements.map((e) => (e ? this.exprToString(e as AST.Expression) : '')).join(', ')}]`;
      default:
        return 'undefined';
    }
  }

  private workflowExprToArray(expr: AST.WorkflowExpression): string[] {
    switch (expr.kind) {
      case 'WorkflowSequenceExpr':
        return (expr as AST.WorkflowSequenceExpr).steps.flatMap((s) =>
          this.workflowExprToArray(s)
        );
      case 'WorkflowParallelExpr':
        return [
          `parallel:${(expr as AST.WorkflowParallelExpr).branches.length}`,
        ];
      case 'WorkflowPersonaRef': {
        const ref = (expr as AST.WorkflowPersonaRef).ref;
        if (ref.ref.type === 'id') return [ref.ref.id.name];
        return ['unknown'];
      }
      case 'WorkflowGroupExpr':
        return this.workflowExprToArray((expr as AST.WorkflowGroupExpr).expr);
      default:
        return [];
    }
  }

  private indent(): void {
    this.indentLevel++;
  }

  private dedent(): void {
    this.indentLevel = Math.max(0, this.indentLevel - 1);
  }

  private line(text: string): void {
    const indent = ' '.repeat(this.indentLevel * this.options.indentSize);
    this.output.push(indent + text);
  }

  private blank(): void {
    this.output.push('');
  }

  private comment(text: string): void {
    this.line(`// ${text}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              MARKDOWN GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate Markdown documentation from PCL program
 */
export function generateMarkdown(
  program: AST.Program,
  options: Partial<GeneratorOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options, target: 'markdown' as const };
  const generator = new MarkdownGenerator(opts);
  return generator.generate(program);
}

class MarkdownGenerator {
  private readonly options: Required<GeneratorOptions>;
  private output: string[] = [];

  constructor(options: Required<GeneratorOptions>) {
    this.options = options;
  }

  generate(program: AST.Program): string {
    this.output = [];

    // Title
    this.h1('PCL Documentation');
    this.blank();

    // Table of contents
    this.h2('Contents');
    this.blank();

    const personas: AST.PersonaDeclaration[] = [];
    const teams: AST.TeamDeclaration[] = [];
    const workflows: AST.WorkflowDeclaration[] = [];

    for (const stmt of program.statements) {
      switch (stmt.kind) {
        case 'PersonaDeclaration':
          personas.push(stmt as AST.PersonaDeclaration);
          break;
        case 'TeamDeclaration':
          teams.push(stmt as AST.TeamDeclaration);
          break;
        case 'WorkflowDeclaration':
          workflows.push(stmt as AST.WorkflowDeclaration);
          break;
      }
    }

    if (personas.length > 0) {
      this.line('- [Personas](#personas)');
      for (const p of personas) {
        this.line(`  - [${p.id.name}](#${p.id.name.toLowerCase()})`);
      }
    }

    if (teams.length > 0) {
      this.line('- [Teams](#teams)');
      for (const t of teams) {
        this.line(`  - [${t.id.name}](#${t.id.name.toLowerCase()})`);
      }
    }

    if (workflows.length > 0) {
      this.line('- [Workflows](#workflows)');
      for (const w of workflows) {
        this.line(`  - [${w.id.name}](#${w.id.name.toLowerCase()})`);
      }
    }

    this.blank();

    // Personas section
    if (personas.length > 0) {
      this.h2('Personas');
      this.blank();

      for (const persona of personas) {
        this.generatePersonaDoc(persona);
      }
    }

    // Teams section
    if (teams.length > 0) {
      this.h2('Teams');
      this.blank();

      for (const team of teams) {
        this.generateTeamDoc(team);
      }
    }

    // Workflows section
    if (workflows.length > 0) {
      this.h2('Workflows');
      this.blank();

      for (const workflow of workflows) {
        this.generateWorkflowDoc(workflow);
      }
    }

    return this.output.join('\n');
  }

  private generatePersonaDoc(decl: AST.PersonaDeclaration): void {
    this.h3(decl.id.name);
    this.blank();

    // Extract properties
    let intent = '';
    let tone = '';
    const skills: string[] = [];
    const constraints: string[] = [];
    const tags: string[] = [];
    const methods: Array<{
      name: string;
      params: string[];
      returnType: string;
    }> = [];

    for (const member of decl.body.members) {
      switch (member.kind) {
        case 'PropertyDeclaration': {
          const prop = member as AST.PropertyDeclaration;
          if (
            prop.name.name === 'intent' &&
            prop.initializer?.kind === 'StringLiteral'
          ) {
            intent = (prop.initializer as AST.StringLiteral).value;
          }
          if (
            prop.name.name === 'tone' &&
            prop.initializer?.kind === 'Identifier'
          ) {
            tone = (prop.initializer as AST.Identifier).name;
          }
          break;
        }
        case 'SkillBlock':
          for (const item of (member as AST.SkillBlock).items) {
            if (item.kind === 'StringSkill')
              skills.push((item as { value: string }).value);
          }
          break;
        case 'ConstraintBlock':
          for (const item of (member as AST.ConstraintBlock).items) {
            if (item.kind === 'StringConstraint')
              constraints.push((item as { value: string }).value);
          }
          break;
        case 'TagBlock':
          for (const item of (member as AST.TagBlock).items) {
            if (item.kind === 'StringTag')
              tags.push((item as { value: string }).value);
            else if (item.kind === 'IdentifierTag')
              tags.push((item as { name: AST.Identifier }).name.name);
          }
          break;
        case 'MethodDeclaration': {
          const method = member as AST.MethodDeclaration;
          methods.push({
            name: method.name.name,
            params: method.parameters.map((p) =>
              p.name.kind === 'Identifier'
                ? (p.name as AST.Identifier).name
                : '_'
            ),
            returnType: method.returnType ? 'defined' : 'void',
          });
          break;
        }
      }
    }

    if (intent) {
      this.line(`**Purpose:** ${intent}`);
      this.blank();
    }

    if (tone) {
      this.line(`**Tone:** ${tone}`);
      this.blank();
    }

    if (decl.extends.length > 0) {
      const exts = decl.extends.map((e) =>
        e.typeName.parts.map((p) => p.name).join('::')
      );
      this.line(`**Extends:** ${exts.join(', ')}`);
      this.blank();
    }

    if (skills.length > 0) {
      this.h4('Skills');
      for (const skill of skills) {
        this.line(`- ${skill}`);
      }
      this.blank();
    }

    if (constraints.length > 0) {
      this.h4('Constraints');
      for (const constraint of constraints) {
        this.line(`- ${constraint}`);
      }
      this.blank();
    }

    if (tags.length > 0) {
      this.line(`**Tags:** ${tags.map((t) => `\`${t}\``).join(', ')}`);
      this.blank();
    }

    if (methods.length > 0) {
      this.h4('Methods');
      for (const method of methods) {
        this.line(`- \`${method.name}(${method.params.join(', ')})\``);
      }
      this.blank();
    }

    this.line('---');
    this.blank();
  }

  private generateTeamDoc(decl: AST.TeamDeclaration): void {
    this.h3(decl.id.name);
    this.blank();

    const members: string[] = [];
    let primary: string | null = null;
    let mergeMode = 'primary';
    let quorum: { required: number; total: number } | null = null;

    for (const member of decl.body.members) {
      switch (member.kind) {
        case 'TeamMembersDeclaration':
          for (const ref of (member as AST.TeamMembersDeclaration).members) {
            if (ref.ref.type === 'id') members.push(ref.ref.id.name);
          }
          break;
        case 'TeamPrimaryDeclaration':
          if (
            (member as AST.TeamPrimaryDeclaration).primary.ref.type === 'id'
          ) {
            primary = (
              (member as AST.TeamPrimaryDeclaration).primary.ref as {
                readonly type: 'id';
                readonly id: AST.Identifier;
              }
            ).id.name;
          }
          break;
        case 'TeamMergeDeclaration':
          if (
            (member as AST.TeamMergeDeclaration).mode.kind === 'SimpleMergeMode'
          ) {
            mergeMode = (member as AST.TeamMergeDeclaration).mode.mode;
          }
          break;
        case 'TeamQuorumDeclaration':
          quorum = {
            required: (member as AST.TeamQuorumDeclaration).required.value,
            total: (member as AST.TeamQuorumDeclaration).total.value,
          };
          break;
      }
    }

    this.h4('Members');
    for (const m of members) {
      const isPrimary = m === primary;
      this.line(`- ${m}${isPrimary ? ' *(primary)*' : ''}`);
    }
    this.blank();

    this.line(`**Merge Mode:** ${mergeMode}`);
    this.blank();

    if (quorum) {
      this.line(`**Quorum:** ${quorum.required}/${quorum.total}`);
      this.blank();
    }

    this.line('---');
    this.blank();
  }

  private generateWorkflowDoc(decl: AST.WorkflowDeclaration): void {
    this.h3(decl.id.name);
    this.blank();

    for (const member of decl.body.members) {
      switch (member.kind) {
        case 'WorkflowInputDeclaration':
          this.line(
            `**Input:** \`${this.typeToString((member as AST.WorkflowInputDeclaration).type)}\``
          );
          break;
        case 'WorkflowOutputDeclaration':
          this.line(
            `**Output:** \`${this.typeToString((member as AST.WorkflowOutputDeclaration).type)}\``
          );
          break;
        case 'WorkflowTimeoutDeclaration': {
          const timeout = member as AST.WorkflowTimeoutDeclaration;
          this.line(
            `**Timeout:** ${timeout.duration.value}${timeout.duration.unit}`
          );
          break;
        }
        case 'WorkflowRetryDeclaration': {
          const retry = member as AST.WorkflowRetryDeclaration;
          if (retry.config.kind === 'NumberLiteral') {
            this.line(
              `**Retries:** ${(retry.config as AST.NumberLiteral).value}`
            );
          }
          break;
        }
      }
    }
    this.blank();

    // Steps diagram
    for (const member of decl.body.members) {
      if (member.kind === 'WorkflowStepsDeclaration') {
        this.h4('Flow');
        this.code(
          'mermaid',
          this.generateMermaid((member as AST.WorkflowStepsDeclaration).steps)
        );
        this.blank();
      }
    }

    this.line('---');
    this.blank();
  }

  private generateMermaid(expr: AST.WorkflowExpression, depth = 0): string {
    const lines: string[] = [];
    const nodes: string[] = [];
    const edges: string[] = [];

    if (depth === 0) {
      lines.push('graph TD');
    }

    const counter = { value: 0 };
    this.generateMermaidNodes(expr, nodes, edges, counter, null, null);

    lines.push(...nodes);
    lines.push(...edges);

    return lines.join('\n');
  }

  private generateMermaidNodes(
    expr: AST.WorkflowExpression,
    nodes: string[],
    edges: string[],
    counter: { value: number },
    prevId: string | null,
    nextId: string | null
  ): string {
    const id = `n${counter.value++}`;

    switch (expr.kind) {
      case 'WorkflowSequenceExpr': {
        const seq = expr as AST.WorkflowSequenceExpr;
        let currentId = prevId;

        for (let i = 0; i < seq.steps.length; i++) {
          const step = seq.steps[i];
          const isLast = i === seq.steps.length - 1;
          const stepNextId = isLast ? nextId : null;
          const stepId = this.generateMermaidNodes(
            step,
            nodes,
            edges,
            counter,
            currentId,
            stepNextId
          );
          currentId = stepId;
        }

        return currentId || id;
      }

      case 'WorkflowParallelExpr': {
        const par = expr as AST.WorkflowParallelExpr;
        const startId = `${id}_start`;
        const endId = `${id}_end`;

        nodes.push(`    ${startId}((Fork))`);
        nodes.push(`    ${endId}((Join))`);

        if (prevId) {
          edges.push(`    ${prevId} --> ${startId}`);
        }

        for (let i = 0; i < par.branches.length; i++) {
          const branch = par.branches[i];
          this.generateMermaidNodes(
            branch,
            nodes,
            edges,
            counter,
            startId,
            endId
          );
        }

        if (nextId) {
          edges.push(`    ${endId} --> ${nextId}`);
        }

        return endId;
      }

      case 'WorkflowChoiceExpr': {
        const choice = expr as AST.WorkflowChoiceExpr;
        const choiceId = `${id}_choice`;
        const mergeId = `${id}_merge`;

        nodes.push(`    ${choiceId}{Choice}`);
        nodes.push(`    ${mergeId}((Merge))`);

        if (prevId) {
          edges.push(`    ${prevId} --> ${choiceId}`);
        }

        for (let i = 0; i < choice.branches.length; i++) {
          const branch = choice.branches[i];
          const branchLabel = `Option ${i + 1}`;
          const branchStartId = this.generateMermaidNodes(
            branch,
            nodes,
            edges,
            counter,
            null,
            mergeId
          );
          edges.push(`    ${choiceId} -->|${branchLabel}| ${branchStartId}`);
        }

        if (nextId) {
          edges.push(`    ${mergeId} --> ${nextId}`);
        }

        return mergeId;
      }

      case 'WorkflowConditionalExpr': {
        const cond = expr as AST.WorkflowConditionalExpr;
        const condId = `${id}_cond`;
        const mergeId = `${id}_merge`;

        nodes.push(`    ${condId}{Condition}`);
        if (cond.else) {
          nodes.push(`    ${mergeId}((Merge))`);
        }

        if (prevId) {
          edges.push(`    ${prevId} --> ${condId}`);
        }

        // Then branch
        const thenId = this.generateMermaidNodes(
          cond.then,
          nodes,
          edges,
          counter,
          null,
          cond.else ? mergeId : nextId
        );
        edges.push(`    ${condId} -->|Yes| ${thenId}`);

        // Else branch
        if (cond.else) {
          const elseId = this.generateMermaidNodes(
            cond.else,
            nodes,
            edges,
            counter,
            null,
            mergeId
          );
          edges.push(`    ${condId} -->|No| ${elseId}`);

          if (nextId) {
            edges.push(`    ${mergeId} --> ${nextId}`);
          }
          return mergeId;
        } else {
          // No else, direct to next
          if (nextId) {
            edges.push(`    ${condId} -->|No| ${nextId}`);
          }
          return condId;
        }
      }

      case 'WorkflowLoopExpr': {
        const loop = expr as AST.WorkflowLoopExpr;
        const loopId = `${id}_loop`;
        const exitId = `${id}_exit`;

        const loopType = loop.loopType === 'while' ? 'While' : 'Until';
        nodes.push(`    ${loopId}{${loopType}}`);
        nodes.push(`    ${exitId}((Exit))`);

        if (prevId) {
          edges.push(`    ${prevId} --> ${loopId}`);
        }

        // Loop body
        const bodyEndId = this.generateMermaidNodes(
          loop.body,
          nodes,
          edges,
          counter,
          null,
          loopId
        );

        edges.push(`    ${loopId} -->|Continue| ${bodyEndId}`);
        edges.push(`    ${loopId} -->|Exit| ${exitId}`);

        if (nextId) {
          edges.push(`    ${exitId} --> ${nextId}`);
        }

        return exitId;
      }

      case 'WorkflowMergeExpr': {
        const merge = expr as AST.WorkflowMergeExpr;
        const mergeId = `${id}_merge`;
        const mode =
          merge.mode.kind === 'SimpleMergeMode' ? merge.mode.mode : 'custom';

        nodes.push(`    ${mergeId}[Merge: ${mode}]`);

        if (prevId) {
          edges.push(`    ${prevId} --> ${mergeId}`);
        }

        if (nextId) {
          edges.push(`    ${mergeId} --> ${nextId}`);
        }

        return mergeId;
      }

      case 'WorkflowPersonaRef': {
        const ref = expr as AST.WorkflowPersonaRef;
        let name = 'unknown';

        if (ref.ref.ref.type === 'id') {
          name = ref.ref.ref.id.name;
        } else if (ref.ref.ref.type === 'qualified') {
          name = ref.ref.ref.path.parts.map((p) => p.name).join('::');
        } else if (ref.ref.ref.type === 'spawn') {
          name = `${ref.ref.ref.count.value}x${ref.ref.ref.persona.name}`;
        }

        const personaId = `${id}_${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        nodes.push(`    ${personaId}[${name}]`);

        if (prevId) {
          edges.push(`    ${prevId} --> ${personaId}`);
        }

        if (nextId) {
          edges.push(`    ${personaId} --> ${nextId}`);
        }

        return personaId;
      }

      case 'WorkflowGroupExpr': {
        // Unwrap group and process inner expression
        const group = expr as AST.WorkflowGroupExpr;
        return this.generateMermaidNodes(
          group.expr,
          nodes,
          edges,
          counter,
          prevId,
          nextId
        );
      }

      default:
        // Unknown workflow expression type
        nodes.push(`    ${id}[Unknown: ${expr.kind}]`);

        if (prevId) {
          edges.push(`    ${prevId} --> ${id}`);
        }

        if (nextId) {
          edges.push(`    ${id} --> ${nextId}`);
        }

        return id;
    }
  }

  private getStepId(expr: AST.WorkflowExpression, fallback: string): string {
    if (expr.kind === 'WorkflowPersonaRef') {
      const ref = expr as AST.WorkflowPersonaRef;
      if (ref.ref.ref.type === 'id') {
        return ref.ref.ref.id.name;
      }
    }
    return fallback;
  }

  private typeToString(type: AST.TypeNode): string {
    if (type.kind === 'TypeReference') {
      return (type as AST.TypeReference).typeName.parts
        .map((p) => p.name)
        .join('::');
    }
    return 'Unknown';
  }

  private h1(text: string): void {
    this.line(`# ${text}`);
  }

  private h2(text: string): void {
    this.line(`## ${text}`);
  }

  private h3(text: string): void {
    this.line(`### ${text}`);
  }

  private h4(text: string): void {
    this.line(`#### ${text}`);
  }

  private code(lang: string, content: string): void {
    this.line('```' + lang);
    this.line(content);
    this.line('```');
  }

  private line(text: string): void {
    this.output.push(text);
  }

  private blank(): void {
    this.output.push('');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              CODE GENERATION DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate code for a specific target
 */
export function generate(
  program: AST.Program,
  options: GeneratorOptions
): string {
  switch (options.target) {
    case 'prompt': {
      // For prompt, generate for first persona
      const personas = program.statements.filter(
        (s) => s.kind === 'PersonaDeclaration'
      );
      if (personas.length > 0) {
        return generatePrompt(personas[0] as AST.PersonaDeclaration, options);
      }
      return '';
    }
    case 'json':
      return generateJSON(program, options);
    case 'typescript':
    case 'javascript':
      return generateTypeScript(program, options);
    case 'markdown':
      return generateMarkdown(program, options);
    case 'yaml':
      return generateYAML(program, options);
    default:
      throw new Error(`Unknown target: ${options.target}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              PROMPT ENHANCEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export * from './prompt-enhancements.js';
