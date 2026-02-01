/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Parser Complex Structures Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tests parser's ability to handle complex nested and combined structures
 */

import { Parser } from '../../src/parser';

describe('Parser Complex Structures', () => {
  describe('Nested Personas', () => {
    it('should parse persona with nested persona', () => {
      const input = `
      persona Outer {
        intent: "outer persona"

        persona Inner {
          intent: "inner persona"
          skills { "data-analysis" }
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.program.statements).toHaveLength(1);
        const persona = result.value.program.statements[0];
        expect(persona.kind).toBe('PersonaDeclaration');
      }
    });

    it('should parse multiple levels of nesting', () => {
      const input = `
      persona Level1 {
        intent: "level 1"
        persona Level2 {
          intent: "level 2"
          persona Level3 {
            intent: "level 3"
          }
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Complex Type Annotations', () => {
    it('should parse nested generic types', () => {
      const input = `
      persona Test {
        data: Map<String, Array<Map<String, Int>>>
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse complex union types', () => {
      const input = `
      persona Test {
        status: "active" | "inactive" | "pending" | null
        data: String | Int | Float | Bool | Array<String>
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse complex intersection types', () => {
      const input = `
      persona Test {
        mixed: Base & Mixin1 & Mixin2
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse function types with generics', () => {
      const input = `
      persona Test {
        transform: <T>(input: T) -> Array<T>
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse conditional types', () => {
      const input = `
      type ExtractValue<T> = T extends { value: infer V } ? V : never`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse mapped types', () => {
      const input = `
      type Readonly<T> = { readonly [K in keyof T]: T[K] }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse template literal types', () => {
      const input = `
      type EventName = \`on\${string}\``;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Complex Expressions', () => {
    it('should parse nested object literals', () => {
      const input = `
      persona Test {
        config: {
          server: {
            host: "localhost",
            port: 8080,
            ssl: {
              enabled: true,
              cert: "./cert.pem"
            }
          }
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse complex array expressions', () => {
      const input = `
      persona Test {
        data: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9]
        ]
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse nested function calls', () => {
      const input = `
      persona Test {
        result: transform(
          filter(
            map(data, (x) => x * 2),
            (x) => x > 10
          ),
          (x) => String(x)
        )
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse complex ternary expressions', () => {
      const input = `
      persona Test {
        value: condition1 ? (
          condition2 ? value1 : value2
        ) : (
          condition3 ? value3 : value4
        )
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Complex Workflow Expressions', () => {
    it('should parse deeply nested workflow operators', () => {
      const input = `
      workflow Complex {
        steps: (A -> B -> C) | (D -> E -> F) | (G -> H -> I)
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse workflow with all operator types', () => {
      const input = `
      workflow AllOperators {
        steps: A -> B ~> C <-> D >>> [E, F] :: [G, H]
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse workflow with nested conditionals', () => {
      const input = `
      workflow Nested {
        steps: if (x > 10) then (
          if (y < 5) then A else B
        ) else (
          if (z == 0) then C else D
        )
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse workflow with nested loops', () => {
      const input = `
      workflow NestedLoops {
        steps: loop 3 times {
          A -> loop 2 times {
            B -> C
          } -> D
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse workflow with for loops', () => {
      const input = `
      workflow ForLoop {
        steps: for item in items {
          Process -> Validate -> Store
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse workflow with break and continue', () => {
      const input = `
      workflow LoopControl {
        steps: loop while condition {
          if (skip) then continue
          else if (done) then break
          else Process
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Complex Team Declarations', () => {
    it('should parse team with all configuration options', () => {
      const input = `
      team FullConfig {
        members: [Developer, Reviewer, Tester]
        primary: Developer
        merge: debate(rounds: 3, timeout: 30s, topic: "code-quality")
        quorum: 2 of 3
        conflict: [Developer, Reviewer, Tester]

        @onActivate
        fn init() {
          // Setup logic
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse team with complex merge configuration', () => {
      const input = `
      team Weighted {
        members: [A, B, C]
        merge: weighted {
          weights: [A: 0.5, B: 0.3, C: 0.2]
          timeout: 60s
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse team with spawned members', () => {
      const input = `
      team Parallel {
        members: [spawn 5 of Worker, Coordinator]
        merge: parallel
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Decorators and Modifiers', () => {
    it('should parse multiple decorators', () => {
      const input = `
      @cache(ttl: 3600)
      @validate
      @retry(attempts: 3)
      persona Test {
        intent: "test"
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse decorators with complex arguments', () => {
      const input = `
      @configure({
        timeout: 30s,
        retries: 3,
        fallback: DefaultPersona,
        options: {
          debug: true,
          verbose: 2
        }
      })
      persona Test {
        intent: "test"
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse all modifier combinations', () => {
      const input = `
      persona Test {
        pub static readonly data: String = "test"
        priv mut counter: Int = 0

        pub async fn process() -> String {
          return "result"
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Constraint Expressions', () => {
    it('should parse complex constraint combinations', () => {
      const input = `
      persona Test {
        constraints {
          max_tokens >= 100 && max_tokens <= 1000
          temperature >= 0.0 && temperature <= 1.0
          (model == "gpt-4" || model == "claude") && version >= "1.0"
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse constraints with function calls', () => {
      const input = `
      persona Test {
        constraints {
          length(input) <= 1000
          contains(tags, "approved")
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse constraints with member access', () => {
      const input = `
      persona Test {
        constraints {
          config.server.port > 1024
          user.permissions.includes("admin")
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Skill Declarations', () => {
    it('should parse skill with basic fields', () => {
      const input = `
      skill DataAnalysis {
        items: ["pandas", "numpy", "scipy"]
        category: "Data Science"
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Import and Export Statements', () => {
    it('should parse complex import statements', () => {
      const input = `
      import { Developer, Tester } from "./personas"
      import * as Skills from "./skills"
      import DefaultPersona from "./default"
      import type { PersonaType } from "./types"`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse export statements', () => {
      const input = `
      export persona Test { intent: "test" }
      export { Developer, Tester }
      export * from "./personas"
      export default MainPersona`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse module declarations', () => {
      const input = `
      module personas.coding {
        persona Developer { intent: "dev" }
        persona Tester { intent: "test" }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Pattern Matching', () => {
    it('should parse complex match expressions', () => {
      const input = `
      persona Test {
        fn process(input: any) -> String {
          return match input {
            { type: "user", id } => "User: " + id
            { type: "admin", name } => "Admin: " + name
            [first, ...rest] => "Array: " + first
            _ => "Unknown"
          }
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse pattern with guards', () => {
      const input = `
      persona Test {
        fn categorize(n: Int) -> String {
          return match n {
            x if x < 0 => "negative"
            x if x == 0 => "zero"
            x if x > 0 && x <= 10 => "small"
            x if x > 10 => "large"
          }
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });

  describe('Control Flow', () => {
    it('should parse complex if-else chains', () => {
      const input = `
      persona Test {
        fn process(x: Int) {
          if (x < 0) {
            return "negative"
          } else if (x == 0) {
            return "zero"
          } else if (x <= 10) {
            return "small"
          } else {
            return "large"
          }
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse nested loops', () => {
      const input = `
      persona Test {
        fn process() {
          for i in range(10) {
            for j in range(10) {
              if (i == j) {
                continue
              }
              process(i, j)
            }
          }
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });

    it('should parse try-catch-finally', () => {
      const input = `
      persona Test {
        fn process() {
          try {
            risky_operation()
          } catch (e: Error) {
            log(e)
          } catch (e) {
            fallback()
          } finally {
            cleanup()
          }
        }
      }`;
      const parser = new Parser(input);
      const result = parser.parse();

      expect(result.ok).toBe(true);
    });
  });
});
