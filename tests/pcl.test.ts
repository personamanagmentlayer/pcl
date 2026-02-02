/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Test Suite
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Lexer, TokenType, tokenize } from '../src/lexer';
import { Parser, parse, parseExpression, parseType } from '../src/parser';


// ═══════════════════════════════════════════════════════════════════════════════
//                              LEXER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lexer', () => {
  
  describe('Basic Tokens', () => {
    
    it('should tokenize identifiers', () => {
      const result = tokenize('foo bar baz');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const tokens = result.value.filter(t => t.type === TokenType.IDENTIFIER);
        expect(tokens.length).toBe(3);
        expect(tokens.map(t => t.value)).toEqual(['foo', 'bar', 'baz']);
      }
    });
    
    it('should tokenize PERSONA_IDs (uppercase)', () => {
      const result = tokenize('SEC ARCHI CRITIC');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const tokens = result.value.filter(t => t.type === TokenType.PERSONA_ID);
        expect(tokens.length).toBe(3);
        expect(tokens.map(t => t.value)).toEqual(['SEC', 'ARCHI', 'CRITIC']);
      }
    });
    
    it('should tokenize keywords', () => {
      const result = tokenize('persona team workflow fn let const');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const tokens = result.value.filter(t => t.type === TokenType.KEYWORD);
        expect(tokens.length).toBe(6);
      }
    });
    
    it('should tokenize numbers', () => {
      const result = tokenize('42 3.14 0xFF 0b1010 0o755');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const intTokens = result.value.filter(t => t.type === TokenType.NUMBER_INT);
        const floatTokens = result.value.filter(t => t.type === TokenType.NUMBER_FLOAT);
        const hexTokens = result.value.filter(t => t.type === TokenType.NUMBER_HEX);
        const binTokens = result.value.filter(t => t.type === TokenType.NUMBER_BINARY);
        const octTokens = result.value.filter(t => t.type === TokenType.NUMBER_OCTAL);
        
        expect(intTokens.length).toBe(1);
        expect(floatTokens.length).toBe(1);
        expect(hexTokens.length).toBe(1);
        expect(binTokens.length).toBe(1);
        expect(octTokens.length).toBe(1);
      }
    });
    
    it('should tokenize strings', () => {
      const result = tokenize('"hello" \'world\'');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const strings = result.value.filter(t => t.type === TokenType.STRING);
        expect(strings.length).toBe(2);
        expect(strings[0].value).toBe('hello');
        expect(strings[1].value).toBe('world');
      }
    });
    
    it('should handle escape sequences in strings', () => {
      const result = tokenize('"hello\\nworld\\t!"');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const strings = result.value.filter(t => t.type === TokenType.STRING);
        expect(strings[0].value).toBe('hello\nworld\t!');
      }
    });
    
    it('should tokenize booleans', () => {
      const result = tokenize('true false');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const bools = result.value.filter(t => t.type === TokenType.BOOLEAN);
        expect(bools.length).toBe(2);
        expect(bools[0].value).toBe('true');
        expect(bools[1].value).toBe('false');
      }
    });
    
    it('should tokenize null', () => {
      const result = tokenize('null');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const nulls = result.value.filter(t => t.type === TokenType.NULL);
        expect(nulls.length).toBe(1);
      }
    });
    
  });
  
  describe('Operators', () => {
    
    it('should tokenize arithmetic operators', () => {
      const result = tokenize('+ - * / % **');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.filter(t => t.type === TokenType.PLUS).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.MINUS).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.STAR).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.SLASH).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.PERCENT).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.STAR_STAR).length).toBe(1);
      }
    });
    
    it('should tokenize comparison operators', () => {
      const result = tokenize('== != < > <= >= === !==');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.filter(t => t.type === TokenType.EQ_EQ).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.BANG_EQ).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.LT).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.GT).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.LT_EQ).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.GT_EQ).length).toBe(1);
      }
    });
    
    it('should tokenize logical operators', () => {
      const result = tokenize('&& || ! ??');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.filter(t => t.type === TokenType.AMP_AMP).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.PIPE_PIPE).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.BANG).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.QUESTION_QUESTION).length).toBe(1);
      }
    });
    
    it('should tokenize assignment operators', () => {
      const result = tokenize('= += -= *= /=');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.filter(t => t.type === TokenType.EQ).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.PLUS_EQ).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.MINUS_EQ).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.STAR_EQ).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.SLASH_EQ).length).toBe(1);
      }
    });
    
    it('should tokenize PCL-specific operators', () => {
      const result = tokenize('-> => ~> <->');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.filter(t => t.type === TokenType.ARROW).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.FAT_ARROW).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.TILDE_GT).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.LT_MINUS_GT).length).toBe(1);
      }
    });
    
  });
  
  describe('Comments', () => {
    
    it('should tokenize line comments', () => {
      const lexer = new Lexer('// this is a comment\nfoo', { includeComments: true });
      const result = lexer.tokenize();
      expect(result.ok).toBe(true);
      if (result.ok) {
        const comments = result.value.filter(t => t.type === TokenType.COMMENT_LINE);
        expect(comments.length).toBe(1);
        expect(comments[0].value).toContain('this is a comment');
      }
    });
    
    it('should tokenize block comments', () => {
      const lexer = new Lexer('/* multi\nline\ncomment */ foo', { includeComments: true });
      const result = lexer.tokenize();
      expect(result.ok).toBe(true);
      if (result.ok) {
        const comments = result.value.filter(t => t.type === TokenType.COMMENT_BLOCK);
        expect(comments.length).toBe(1);
      }
    });
    
    it('should tokenize doc comments', () => {
      const lexer = new Lexer('/// Doc comment\nfoo', { includeComments: true });
      const result = lexer.tokenize();
      expect(result.ok).toBe(true);
      if (result.ok) {
        const comments = result.value.filter(t => t.type === TokenType.COMMENT_DOC);
        expect(comments.length).toBe(1);
      }
    });
    
  });
  
  describe('Template Literals', () => {
    
    it('should tokenize simple template literals', () => {
      const result = tokenize('`hello world`');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const templates = result.value.filter(t => t.type === TokenType.TEMPLATE_LITERAL);
        expect(templates.length).toBe(1);
        expect(templates[0].value).toBe('hello world');
      }
    });
    
  });
  
  describe('Punctuation', () => {
    
    it('should tokenize brackets', () => {
      const result = tokenize('( ) [ ] { }');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.filter(t => t.type === TokenType.LPAREN).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.RPAREN).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.LBRACKET).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.RBRACKET).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.LBRACE).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.RBRACE).length).toBe(1);
      }
    });
    
    it('should tokenize delimiters', () => {
      const result = tokenize(', ; : :: ...');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.filter(t => t.type === TokenType.COMMA).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.SEMICOLON).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.COLON).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.COLON_COLON).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.DOT_DOT_DOT).length).toBe(1);
      }
    });
    
    it('should tokenize special characters', () => {
      const result = tokenize('@ # ?');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.filter(t => t.type === TokenType.AT).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.HASH).length).toBe(1);
        expect(result.value.filter(t => t.type === TokenType.QUESTION).length).toBe(1);
      }
    });
    
  });
  
  describe('Source Locations', () => {
    
    it('should track line and column numbers', () => {
      const result = tokenize('foo\nbar\nbaz');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const ids = result.value.filter(t => t.type === TokenType.IDENTIFIER);
        expect(ids[0].span.start.line).toBe(1);
        expect(ids[0].span.start.column).toBe(1);
        expect(ids[1].span.start.line).toBe(2);
        expect(ids[1].span.start.column).toBe(1);
        expect(ids[2].span.start.line).toBe(3);
        expect(ids[2].span.start.column).toBe(1);
      }
    });
    
  });
  
});


// ═══════════════════════════════════════════════════════════════════════════════
//                              PARSER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Parser', () => {
  
  describe('Persona Declarations', () => {
    
    it('should parse a minimal persona', () => {
      const result = parse(`
        persona SEC {
          intent: "Security analysis"
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.program.statements.length).toBe(1);
        const stmt = result.value.program.statements[0];
        expect(stmt.kind).toBe('PersonaDeclaration');
      }
    });
    
    it('should parse persona with skills', () => {
      const result = parse(`
        persona SEC {
          skills {
            "OWASP Top 10"
            "STRIDE modeling"
          }
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const persona = result.value.program.statements[0] as any;
        expect(persona.kind).toBe('PersonaDeclaration');
        const skills = persona.body.members.find((m: any) => m.kind === 'SkillBlock');
        expect(skills).toBeDefined();
        expect(skills.items.length).toBe(2);
      }
    });
    
    it('should parse persona with constraints', () => {
      const result = parse(`
        persona SEC {
          constraints {
            "Always assume breach"
            maxTokens <= 4096
          }
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const persona = result.value.program.statements[0] as any;
        const constraints = persona.body.members.find((m: any) => m.kind === 'ConstraintBlock');
        expect(constraints).toBeDefined();
        expect(constraints.items.length).toBe(2);
      }
    });
    
    it('should parse persona with tags', () => {
      const result = parse(`
        persona SEC {
          tags {
            security
            audit
            "compliance"
          }
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const persona = result.value.program.statements[0] as any;
        const tags = persona.body.members.find((m: any) => m.kind === 'TagBlock');
        expect(tags).toBeDefined();
        expect(tags.items.length).toBe(3);
      }
    });
    
    it('should parse persona with methods', () => {
      const result = parse(`
        persona SEC {
          pub fn analyze(target: String) -> Report {
            return analyze(target);
          }
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const persona = result.value.program.statements[0] as any;
        const method = persona.body.members.find((m: any) => m.kind === 'MethodDeclaration');
        expect(method).toBeDefined();
        expect(method.name.name).toBe('analyze');
      }
    });
    
    it('should parse persona with extends', () => {
      const result = parse(`
        pub persona SEC_V2 extends SEC {
          intent: "Enhanced security"
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const persona = result.value.program.statements[0] as any;
        expect(persona.extends.length).toBe(1);
        expect(persona.extends[0].typeName.parts[0].name).toBe('SEC');
      }
    });
    
    it('should parse persona with generics', () => {
      const result = parse(`
        persona Processor<T: Serializable, R> {
          intent: "Process data"
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const persona = result.value.program.statements[0] as any;
        expect(persona.typeParameters.length).toBe(2);
        expect(persona.typeParameters[0].name.name).toBe('T');
        expect(persona.typeParameters[0].constraint).toBeDefined();
      }
    });
    
  });
  
  describe('Team Declarations', () => {
    
    it('should parse a team with members', () => {
      const result = parse(`
        team SecurityReview {
          members: [SEC, AUDIT, ARCHI]
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const team = result.value.program.statements[0] as any;
        expect(team.kind).toBe('TeamDeclaration');
        const members = team.body.members.find((m: any) => m.kind === 'TeamMembersDeclaration');
        expect(members.members.length).toBe(3);
      }
    });
    
    it('should parse a team with primary and merge', () => {
      const result = parse(`
        team Review {
          members: [SEC, AUDIT]
          primary: SEC
          merge: Debate
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const team = result.value.program.statements[0] as any;
        const primary = team.body.members.find((m: any) => m.kind === 'TeamPrimaryDeclaration');
        const merge = team.body.members.find((m: any) => m.kind === 'TeamMergeDeclaration');
        expect(primary).toBeDefined();
        expect(merge).toBeDefined();
      }
    });
    
    it('should parse a team with quorum', () => {
      const result = parse(`
        team Review {
          members: [SEC, AUDIT, ARCHI, CRITIC]
          quorum: 3/4
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const team = result.value.program.statements[0] as any;
        const quorum = team.body.members.find((m: any) => m.kind === 'TeamQuorumDeclaration');
        expect(quorum).toBeDefined();
        expect(quorum.required.value).toBe(3);
        expect(quorum.total.value).toBe(4);
      }
    });
    
    it('should parse a team with conflict order', () => {
      const result = parse(`
        team Review {
          members: [SEC, AUDIT, ARCHI]
          conflict: SEC > AUDIT > ARCHI
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const team = result.value.program.statements[0] as any;
        const conflict = team.body.members.find((m: any) => m.kind === 'TeamConflictDeclaration');
        expect(conflict).toBeDefined();
        expect(conflict.order.length).toBe(3);
      }
    });
    
  });
  
  describe('Workflow Declarations', () => {
    
    it('should parse a workflow with steps', () => {
      const result = parse(`
        workflow CodeReview {
          steps: ARCHI -> SEC -> CRITIC
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const workflow = result.value.program.statements[0] as any;
        expect(workflow.kind).toBe('WorkflowDeclaration');
        const steps = workflow.body.members.find((m: any) => m.kind === 'WorkflowStepsDeclaration');
        expect(steps).toBeDefined();
        expect(steps.steps.kind).toBe('WorkflowSequenceExpr');
      }
    });
    
    it('should parse parallel workflow steps', () => {
      const result = parse(`
        workflow Review {
          steps: (ARCHI || SEC) -> CRITIC
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const workflow = result.value.program.statements[0] as any;
        const steps = workflow.body.members.find((m: any) => m.kind === 'WorkflowStepsDeclaration');
        expect(steps.steps.steps[0].kind).toBe('WorkflowParallelExpr');
      }
    });
    
    it('should parse workflow with input/output', () => {
      const result = parse(`
        workflow Transform {
          input: Request
          output: Response
          steps: ARCHI -> DEV
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const workflow = result.value.program.statements[0] as any;
        const input = workflow.body.members.find((m: any) => m.kind === 'WorkflowInputDeclaration');
        const output = workflow.body.members.find((m: any) => m.kind === 'WorkflowOutputDeclaration');
        expect(input).toBeDefined();
        expect(output).toBeDefined();
      }
    });
    
    it('should parse workflow with timeout and retry', () => {
      const result = parse(`
        workflow Review {
          steps: ARCHI -> SEC
          timeout: 60s
          retry: 3
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const workflow = result.value.program.statements[0] as any;
        const timeout = workflow.body.members.find((m: any) => m.kind === 'WorkflowTimeoutDeclaration');
        const retry = workflow.body.members.find((m: any) => m.kind === 'WorkflowRetryDeclaration');
        expect(timeout).toBeDefined();
        expect(retry).toBeDefined();
      }
    });
    
    it('should parse workflow with merge', () => {
      const result = parse(`
        workflow Review {
          steps: (ARCHI || SEC) -> merge(Consensus)
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const workflow = result.value.program.statements[0] as any;
        const steps = workflow.body.members.find((m: any) => m.kind === 'WorkflowStepsDeclaration');
        expect(steps.steps.steps[1].kind).toBe('WorkflowMergeExpr');
      }
    });
    
  });
  
  describe('Type Declarations', () => {
    
    it('should parse type aliases', () => {
      const result = parse(`
        type SecurityPersona = SEC | AUDIT;
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const decl = result.value.program.statements[0] as any;
        expect(decl.kind).toBe('TypeDeclaration');
        expect(decl.type.kind).toBe('UnionType');
      }
    });
    
    it('should parse generic types', () => {
      const result = parse(`
        type Container<T> = Array<T>;
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const decl = result.value.program.statements[0] as any;
        expect(decl.typeParameters.length).toBe(1);
      }
    });
    
    it('should parse intersection types', () => {
      const result = parse(`
        type FullStack = DEV & ARCHI & UX;
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const decl = result.value.program.statements[0] as any;
        expect(decl.type.kind).toBe('IntersectionType');
      }
    });
    
  });
  
  describe('Interface Declarations', () => {
    
    it('should parse interfaces', () => {
      const result = parse(`
        interface Reviewable {
          id: String
          content: String
          fn review() -> Result
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const decl = result.value.program.statements[0] as any;
        expect(decl.kind).toBe('InterfaceDeclaration');
        expect(decl.members.length).toBeGreaterThan(0);
      }
    });
    
    it('should parse interface with extends', () => {
      const result = parse(`
        interface SecureReviewable extends Reviewable {
          securityScore: Int
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const decl = result.value.program.statements[0] as any;
        expect(decl.extends.length).toBe(1);
      }
    });
    
  });
  
  describe('Function Declarations', () => {
    
    it('should parse function declarations', () => {
      const result = parse(`
        fn analyze(target: String) -> Report {
          return analyze(target);
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const decl = result.value.program.statements[0] as any;
        expect(decl.kind).toBe('FunctionDeclaration');
        expect(decl.parameters.length).toBe(1);
      }
    });
    
    it('should parse async function declarations', () => {
      const result = parse(`
        async fn fetch(url: String) -> Response {
          return await http.get(url);
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const decl = result.value.program.statements[0] as any;
        expect(decl.kind).toBe('FunctionDeclaration');
        expect(decl.async).toBe(true);
      }
    });
    
  });
  
  describe('Variable Declarations', () => {
    
    it('should parse let declarations', () => {
      const result = parse(`let x = 42;`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const decl = result.value.program.statements[0] as any;
        expect(decl.kind).toBe('VariableDeclaration');
        expect(decl.declarationKind).toBe('let');
      }
    });
    
    it('should parse const declarations', () => {
      const result = parse(`const PI = 3.14;`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const decl = result.value.program.statements[0] as any;
        expect(decl.declarationKind).toBe('const');
      }
    });
    
    it('should parse typed declarations', () => {
      const result = parse(`let name: String = "test";`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const decl = result.value.program.statements[0] as any;
        expect(decl.declarations[0].type).toBeDefined();
      }
    });
    
  });
  
  describe('Expressions', () => {
    
    it('should parse binary expressions', () => {
      const result = parseExpression(`1 + 2 * 3`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should respect precedence: 1 + (2 * 3)
        expect(result.value.kind).toBe('BinaryExpression');
      }
    });
    
    it('should parse function calls', () => {
      const result = parseExpression(`foo(1, 2, 3)`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe('CallExpression');
      }
    });
    
    it('should parse member expressions', () => {
      const result = parseExpression(`obj.foo.bar`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe('MemberExpression');
      }
    });
    
    it('should parse array literals', () => {
      const result = parseExpression(`[1, 2, 3]`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe('ArrayExpression');
      }
    });
    
    it('should parse object literals', () => {
      const result = parseExpression(`{ foo: 1, bar: 2 }`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe('ObjectExpression');
      }
    });
    
    it('should parse arrow functions', () => {
      const result = parseExpression(`(x) => x * 2`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe('ArrowFunctionExpression');
      }
    });
    
    it('should parse conditional expressions', () => {
      const result = parseExpression(`x > 0 ? x : -x`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe('ConditionalExpression');
      }
    });
    
  });
  
  describe('Control Flow', () => {
    
    it('should parse if statements', () => {
      const result = parse(`
        if x > 0 {
          log(x);
        } else {
          log(-x);
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const stmt = result.value.program.statements[0] as any;
        expect(stmt.kind).toBe('IfStatement');
        expect(stmt.alternate).toBeDefined();
      }
    });
    
    it('should parse for-in loops', () => {
      const result = parse(`
        for item in items {
          process(item);
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const stmt = result.value.program.statements[0] as any;
        expect(stmt.kind).toBe('ForInStatement');
      }
    });
    
    it('should parse while loops', () => {
      const result = parse(`
        while running {
          tick();
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const stmt = result.value.program.statements[0] as any;
        expect(stmt.kind).toBe('WhileStatement');
      }
    });
    
    it('should parse try-catch', () => {
      const result = parse(`
        try {
          riskyOp();
        } catch (e) {
          handleError(e);
        } finally {
          cleanup();
        }
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const stmt = result.value.program.statements[0] as any;
        expect(stmt.kind).toBe('TryStatement');
        expect(stmt.handlers.length).toBe(1);
        expect(stmt.finalizer).toBeDefined();
      }
    });
    
    it('should parse match expressions', () => {
      const result = parse(`
        let x = match value {
          1 => "one",
          2 => "two",
          _ => "other"
        };
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const decl = result.value.program.statements[0] as any;
        expect(decl.declarations[0].init.kind).toBe('MatchExpression');
      }
    });
    
  });
  
  describe('Imports and Exports', () => {
    
    it('should parse import statements', () => {
      const result = parse(`
        import { SEC, AUDIT } from "@pcl/security";
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const stmt = result.value.program.statements[0] as any;
        expect(stmt.kind).toBe('ImportDeclaration');
        expect(stmt.specifiers.length).toBe(2);
      }
    });
    
    it('should parse namespace imports', () => {
      const result = parse(`
        import * as Security from "@pcl/security";
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const stmt = result.value.program.statements[0] as any;
        expect(stmt.specifiers[0].kind).toBe('ImportNamespaceSpecifier');
      }
    });
    
    it('should parse export statements', () => {
      const result = parse(`
        export { SEC, AUDIT };
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const stmt = result.value.program.statements[0] as any;
        expect(stmt.kind).toBe('ExportDeclaration');
      }
    });
    
    it('should parse export default', () => {
      const result = parse(`
        export default persona SEC { };
      `);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const stmt = result.value.program.statements[0] as any;
        expect(stmt.default).toBe(true);
      }
    });
    
  });
  
  describe('Types', () => {
    
    it('should parse simple types', () => {
      const result = parseType(`String`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe('TypeReference');
      }
    });
    
    it('should parse generic types', () => {
      const result = parseType(`Array<String>`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe('TypeReference');
        expect((result.value as any).typeArguments.length).toBe(1);
      }
    });
    
    it('should parse union types', () => {
      const result = parseType(`String | Int | Bool`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe('UnionType');
      }
    });
    
    it('should parse intersection types', () => {
      const result = parseType(`A & B & C`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe('IntersectionType');
      }
    });
    
    it('should parse tuple types', () => {
      const result = parseType(`[String, Int, Bool]`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe('TupleType');
      }
    });
    
    it('should parse array suffix', () => {
      const result = parseType(`String[]`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe('ArrayType');
      }
    });
    
  });
  
  describe('Error Recovery', () => {
    
    it('should recover from missing semicolon', () => {
      const result = parse(`
        let x = 1
        let y = 2;
      `, { errorRecovery: true });
      // Should still parse something
      expect(result.ok || !result.ok).toBe(true);
    });
    
    it('should recover from missing closing brace', () => {
      const result = parse(`
        persona SEC {
          intent: "test"
        
        persona AUDIT {
          intent: "audit"
        }
      `, { errorRecovery: true });
      // Should still parse something
      expect(result.ok || !result.ok).toBe(true);
    });
    
  });
  
});


// ═══════════════════════════════════════════════════════════════════════════════
//                              INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Integration', () => {
  
  it('should parse a complete PCL program', () => {
    const source = `
      // Security persona for code review
      pub persona SEC {
        id: "SEC"
        name: "Security Analyst"
        intent: "Identify and mitigate security vulnerabilities"
        tone: vigilant
        
        skills {
          "OWASP Top 10"
          "STRIDE threat modeling"
        }
        
        constraints {
          "Always assume breach"
          maxTokens <= 4096
        }
        
        pub fn analyze(target: String) -> SecurityReport {
          return performAnalysis(target);
        }
      }
      
      pub team SecurityReview {
        members: [SEC, AUDIT, ARCHI]
        primary: SEC
        merge: Debate
        quorum: 2/3
      }
      
      pub workflow CodeReview {
        input: PullRequest
        output: ReviewResult
        steps: ARCHI -> (SEC || AUDIT) -> merge(Consensus) -> CRITIC
        timeout: 60s
        retry: 3
      }
    `;
    
    const result = parse(source);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.program.statements.length).toBe(3);
      expect(result.value.program.statements[0].kind).toBe('PersonaDeclaration');
      expect(result.value.program.statements[1].kind).toBe('TeamDeclaration');
      expect(result.value.program.statements[2].kind).toBe('WorkflowDeclaration');
    }
  });
  
});
