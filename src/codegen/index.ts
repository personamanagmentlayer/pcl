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

export interface GeneratorOptions {
  target: GeneratorTarget;
  minify?: boolean;
  includeComments?: boolean;
  includeMetadata?: boolean;
  indentSize?: number;
  lineWidth?: number;
}

const DEFAULT_OPTIONS: Required<GeneratorOptions> = {
  target: 'prompt',
  minify: false,
  includeComments: true,
  includeMetadata: true,
  indentSize: 2,
  lineWidth: 80,
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

    // Header
    this.section('PERSONA CONFIGURATION');
    this.line(`Name: ${persona.id.name}`);

    // Extract properties
    const props = this.extractProperties(persona);

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
    skills: string[];
    constraints: string[];
    tags: string[];
    methods: Array<{ name: string; description: string | null }>;
  } {
    let intent: string | null = null;
    let tone: string | null = null;
    const skills: string[] = [];
    const constraints: string[] = [];
    const tags: string[] = [];
    const methods: Array<{ name: string; description: string | null }> = [];

    for (const member of persona.body.members) {
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

        case 'SkillBlock': {
          const block = member as AST.SkillBlock;
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
          const block = member as AST.ConstraintBlock;
          for (const item of block.items) {
            if (item.kind === 'StringConstraint') {
              constraints.push((item as { value: string }).value);
            }
          }
          break;
        }

        case 'TagBlock': {
          const block = member as AST.TagBlock;
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

    return { intent, tone, skills, constraints, tags, methods };
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
          const decl = member as AST.TeamMembersDeclaration;
          for (const ref of decl.members) {
            const name = this.getPersonaRefName(ref);
            if (name) members.push(name);
          }
          break;
        }

        case 'TeamPrimaryDeclaration': {
          const decl = member as AST.TeamPrimaryDeclaration;
          primary = this.getPersonaRefName(decl.primary);
          break;
        }

        case 'TeamMergeDeclaration': {
          const decl = member as AST.TeamMergeDeclaration;
          if (decl.mode.kind === 'SimpleMergeMode') {
            mergeMode = decl.mode.mode;
          }
          break;
        }

        case 'TeamQuorumDeclaration': {
          const decl = member as AST.TeamQuorumDeclaration;
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
          this.addPersona(config.personas, stmt as AST.PersonaDeclaration);
          break;
        case 'TeamDeclaration':
          this.addTeam(config.teams, stmt as AST.TeamDeclaration);
          break;
        case 'WorkflowDeclaration':
          this.addWorkflow(config.workflows, stmt as AST.WorkflowDeclaration);
          break;
        case 'SkillDeclaration':
          this.addSkill(config.skills, stmt as AST.SkillDeclaration);
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
          const block = member as AST.SkillBlock;
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
          const block = member as AST.ConstraintBlock;
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
          const block = member as AST.TagBlock;
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
          const method = member as AST.MethodDeclaration;
          if (!persona.methods) persona.methods = {};
          persona.methods[method.name.name] = {
            async: method.async,
            parameters: method.parameters.map((p) => ({
              name:
                p.name.kind === 'Identifier'
                  ? (p.name as AST.Identifier).name
                  : null,
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
          workflow.input = this.typeNodeToString(
            (member as AST.WorkflowInputDeclaration).type
          );
          break;
        }

        case 'WorkflowOutputDeclaration': {
          workflow.output = this.typeNodeToString(
            (member as AST.WorkflowOutputDeclaration).type
          );
          break;
        }

        case 'WorkflowStepsDeclaration': {
          workflow.steps = this.workflowExprToObject(
            (member as AST.WorkflowStepsDeclaration).steps
          );
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
      case 'ObjectExpression':
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
    let intent = '';
    let tone = 'balanced';

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
    }

    // Generate persona configuration
    this.line(`export const ${name}Config = {`);
    this.indent();
    this.line(`id: '${name}',`);
    this.line(`name: '${name}',`);
    this.line(`intent: ${JSON.stringify(intent)},`);
    this.line(`tone: '${tone}' as const,`);
    this.line(`skills: ${JSON.stringify(skills)},`);
    this.line(`constraints: ${JSON.stringify(constraints)},`);
    this.line(`tags: ${JSON.stringify(tags)},`);
    this.dedent();
    this.line('} as const;');
    this.blank();

    // Generate persona class/factory
    this.line(`export function create${name}() {`);
    this.indent();
    this.line(`return createPersona('${name}', '${name}', ${name}Config);`);
    this.dedent();
    this.line('}');
  }

  private generateTeam(decl: AST.TeamDeclaration): void {
    const name = decl.id.name;
    const members: string[] = [];
    let primary: string | null = null;
    let mergeMode = 'primary';

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
    this.dedent();
    this.line('} as const;');
    this.blank();

    this.line(`export function create${name}(personas: Map<string, any>) {`);
    this.indent();
    this.line(
      `const members = ${name}Config.members.map(m => personas.get(m)).filter(Boolean);`
    );
    this.line(`return createTeam('${name}', '${name}', members, {`);
    this.indent();
    this.line(`mergeMode: ${name}Config.mergeMode,`);
    this.dedent();
    this.line('});');
    this.dedent();
    this.line('}');
  }

  private generateWorkflow(decl: AST.WorkflowDeclaration): void {
    const name = decl.id.name;

    this.line(`export const ${name}Workflow = {`);
    this.indent();
    this.line(`id: '${name}',`);
    this.line(`name: '${name}',`);

    for (const member of decl.body.members) {
      if (member.kind === 'WorkflowInputDeclaration') {
        this.line(
          `// input: ${this.typeToString((member as AST.WorkflowInputDeclaration).type)}`
        );
      }
      if (member.kind === 'WorkflowOutputDeclaration') {
        this.line(
          `// output: ${this.typeToString((member as AST.WorkflowOutputDeclaration).type)}`
        );
      }
      if (member.kind === 'WorkflowStepsDeclaration') {
        this.line(
          `steps: ${JSON.stringify(this.workflowExprToArray((member as AST.WorkflowStepsDeclaration).steps))},`
        );
      }
    }

    this.dedent();
    this.line('} as const;');
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
              p.name.kind === 'Identifier'
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
            primary = (member as AST.TeamPrimaryDeclaration).primary.ref.id
              .name;
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

    if (depth === 0) {
      lines.push('graph LR');
    }

    const id = `n${depth}`;

    switch (expr.kind) {
      case 'WorkflowSequenceExpr': {
        const seq = expr as AST.WorkflowSequenceExpr;
        let prevId = '';
        for (let i = 0; i < seq.steps.length; i++) {
          const step = seq.steps[i];
          const stepId = this.getStepId(step, `${id}_${i}`);
          if (prevId) {
            lines.push(`    ${prevId} --> ${stepId}`);
          }
          prevId = stepId;
        }
        break;
      }
      case 'WorkflowParallelExpr': {
        const par = expr as AST.WorkflowParallelExpr;
        const startId = `${id}_start`;
        const endId = `${id}_end`;
        lines.push(`    ${startId}((start))`);
        for (let i = 0; i < par.branches.length; i++) {
          const branchId = this.getStepId(par.branches[i], `${id}_b${i}`);
          lines.push(`    ${startId} --> ${branchId}`);
          lines.push(`    ${branchId} --> ${endId}`);
        }
        lines.push(`    ${endId}((merge))`);
        break;
      }
      case 'WorkflowPersonaRef': {
        const ref = expr as AST.WorkflowPersonaRef;
        let name = 'unknown';
        if (ref.ref.ref.type === 'id') {
          name = ref.ref.ref.id.name;
        }
        lines.push(`    ${id}[${name}]`);
        break;
      }
    }

    return lines.join('\n');
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
    case 'prompt':
      // For prompt, generate for first persona
      const personas = program.statements.filter(
        (s) => s.kind === 'PersonaDeclaration'
      );
      if (personas.length > 0) {
        return generatePrompt(personas[0] as AST.PersonaDeclaration, options);
      }
      return '';
    case 'json':
      return generateJSON(program, options);
    case 'typescript':
    case 'javascript':
      return generateTypeScript(program, options);
    case 'markdown':
      return generateMarkdown(program, options);
    case 'yaml':
      // Would need YAML generator
      return generateJSON(program, options);
    default:
      throw new Error(`Unknown target: ${options.target}`);
  }
}
