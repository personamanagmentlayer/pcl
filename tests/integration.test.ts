/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Integration Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, expect, it } from 'vitest';
import {
  compile,
  execute,
  features,
  generateJSON,
  generateMarkdown,
  generatePrompt,
  generateTypeScript,
  parse,
  transpile,
  version,
} from '../src';
import type { PersonaDeclaration } from '../src/ast';

// ═══════════════════════════════════════════════════════════════════════════════
//                              INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PCL Integration', () => {
  describe('Full Compilation Pipeline', () => {
    // Simple persona declarations that the parser can handle
    const source = `
      persona SEC {
        intent: "Security analysis and risk assessment"
        skills {
          "Security analysis"
          "OWASP Top 10"
        }
      }

      persona DEV {}

      team REVIEW_TEAM {
        members: [SEC, DEV]
      }
    `;

    it('should compile complete PCL program', () => {
      const result = compile(source);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.program).toBeDefined();
        expect(result.value.analysis).toBeDefined();
        expect(result.value.program.statements.length).toBeGreaterThan(0);
      }
    });

    it('should generate system prompt', () => {
      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const persona = parseResult.value.program.statements.find(
        (s) =>
          s.kind === 'PersonaDeclaration' &&
          (s as PersonaDeclaration).id.name === 'SEC'
      ) as PersonaDeclaration;

      expect(persona).toBeDefined();

      const prompt = generatePrompt(persona);

      expect(prompt).toContain('SEC');
      expect(prompt).toContain('Security analysis');
      expect(prompt).toContain('OWASP');
    });

    it('should generate JSON configuration', () => {
      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const json = generateJSON(parseResult.value.program);
      const config = JSON.parse(json);

      expect(config.personas).toBeDefined();
      expect(config.personas.SEC).toBeDefined();
      expect(config.personas.DEV).toBeDefined();
      expect(config.teams).toBeDefined();
      expect(config.teams.REVIEW_TEAM).toBeDefined();
    });

    it('should generate TypeScript code', () => {
      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const ts = generateTypeScript(parseResult.value.program);

      expect(ts).toContain('export const SECConfig');
      expect(ts).toContain('export const DEVConfig');
      expect(ts).toContain('createPersona');
    });

    it('should generate Markdown documentation', () => {
      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const md = generateMarkdown(parseResult.value.program);

      expect(md).toContain('# PCL Documentation');
      expect(md).toContain('## Personas');
      expect(md).toContain('### SEC');
      expect(md).toContain('## Teams');
    });
  });

  describe('Runtime Execution', () => {
    it('should execute simple PCL program', async () => {
      const source = `
        persona CHAT {
          intent: "Helpful chat assistant"
          tone: friendly
        }
      `;

      const result = await execute(source);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const runtime = result.value;
        expect(runtime.getAllPersonas().length).toBe(1);

        const activateResult = runtime.activate('CHAT');
        expect(activateResult.ok).toBe(true);

        const persona = runtime.getPersona('CHAT');
        expect(persona?.getState().active).toBe(true);
      }
    });

    it('should handle runtime events', async () => {
      const events: any[] = [];

      const source = `
        persona TEST {
          intent: "Test persona"
        }
      `;

      const result = await execute(source, {
        onEvent: (event) => events.push(event),
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        result.value.activate('TEST');
        expect(events.some((e) => e.type === 'persona:activated')).toBe(true);
      }
    });
  });

  describe('Transpilation', () => {
    it('should transpile to prompt format', () => {
      const source = `
        persona HELPER {
          intent: "General assistance"
          skills { "Problem solving" }
        }
      `;

      const result = transpile(source, { target: 'prompt' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toContain('HELPER');
        expect(result.value).toContain('General assistance');
      }
    });

    it('should transpile to JSON format', () => {
      const source = `
        persona A { intent: "A" }
        persona B { intent: "B" }
      `;

      const result = transpile(source, { target: 'json' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const json = JSON.parse(result.value);
        expect(json.personas.A).toBeDefined();
        expect(json.personas.B).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should report parse errors', () => {
      const source = `
        persona INVALID {
          intent: "Missing closing brace"
      `;

      const result = compile(source);
      expect(result.ok).toBe(false);
    });

    it('should report duplicate declaration errors', () => {
      const source = `
        persona DUP { intent: "First" }
        persona DUP { intent: "Second" }
      `;

      const result = compile(source);
      expect(result.ok).toBe(false);
    });
  });

  describe('Version and Features', () => {
    it('should export version info', () => {
      expect(version.major).toBe(1);
      expect(version.minor).toBe(0);
      expect(version.patch).toBe(0);
      expect(version.full).toBe('1.0.0-alpha');
    });

    it('should export feature flags', () => {
      expect(features.personas).toBe(true);
      expect(features.teams).toBe(true);
      expect(features.workflows).toBe(true);
      expect(features.generics).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//                              END-TO-END SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════════

describe('End-to-End Scenarios', () => {
  describe('Security Review Scenario', () => {
    const securityReviewSource = `
      /// Security expert persona
      persona SECURITY {
        intent: "Identify security vulnerabilities and risks"
        tone: cautious
        depth: thorough

        skills {
          "OWASP Top 10"
          "STRIDE threat modeling"
          "Security code review"
          "Penetration testing concepts"
        }

        constraints {
          "Always consider worst-case scenarios"
          "Document all potential vulnerabilities"
          "Recommend mitigations for each finding"
        }
      }

      /// Code quality reviewer
      persona CODE_REVIEWER {
        intent: "Review code for quality and best practices"
        tone: professional

        skills {
          "Code review"
          "Design patterns"
          "Testing strategies"
        }
      }

      /// Security review team
      team SECURITY_REVIEW {
        members: [SECURITY, CODE_REVIEWER]
        primary: SECURITY
        merge: chain
      }
    `;

    it('should compile and load security review scenario', async () => {
      const result = await execute(securityReviewSource);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const runtime = result.value;

        // Verify personas loaded
        expect(runtime.getPersona('SECURITY')).toBeDefined();
        expect(runtime.getPersona('CODE_REVIEWER')).toBeDefined();

        // Verify team loaded
        expect(runtime.getTeam('SECURITY_REVIEW')).toBeDefined();

        // Activate team
        const activateResult = runtime.activateTeam('SECURITY_REVIEW');
        expect(activateResult.ok).toBe(true);

        // All team members should be active
        expect(runtime.getPersona('SECURITY')?.getState().active).toBe(true);
        expect(runtime.getPersona('CODE_REVIEWER')?.getState().active).toBe(
          true
        );
      }
    });

    it('should generate comprehensive prompt', () => {
      const parseResult = parse(securityReviewSource);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const securityPersona = parseResult.value.program.statements.find(
        (s) =>
          s.kind === 'PersonaDeclaration' &&
          (s as PersonaDeclaration).id.name === 'SECURITY'
      ) as PersonaDeclaration;

      const prompt = generatePrompt(securityPersona);

      // Verify all key information is in prompt
      expect(prompt).toContain('SECURITY');
      expect(prompt).toContain('vulnerabilities');
      expect(prompt).toContain('OWASP');
      expect(prompt).toContain('STRIDE');
      expect(prompt).toContain('worst-case');
    });
  });

  describe('Content Creation Scenario', () => {
    const contentSource = `
      persona WRITER {
        intent: "Create engaging written content"
        tone: creative

        skills {
          "Creative writing"
          "Storytelling"
          "Copywriting"
        }
      }

      persona EDITOR {
        intent: "Review and improve content quality"
        tone: critical

        skills {
          "Editing"
          "Grammar"
          "Style consistency"
        }
      }

      team CONTENT_TEAM {
        members: [WRITER, EDITOR]
        primary: WRITER
        merge: chain
      }

      workflow ContentPipeline {
        steps: WRITER -> EDITOR
      }
    `;

    it('should handle content creation workflow', async () => {
      const result = await execute(contentSource);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const runtime = result.value;

        // Activate personas
        runtime.activate('WRITER');
        runtime.activate('EDITOR');

        // Send message to writer
        const writerResponse = await runtime.send(
          'WRITER',
          'Write a product description'
        );
        expect(writerResponse.ok).toBe(true);

        // Team should be able to process
        const teamResponse = await runtime.sendToTeam(
          'CONTENT_TEAM',
          'Create blog post about AI'
        );
        expect(teamResponse.ok).toBe(true);
      }
    });
  });

  describe('Data Analysis Scenario', () => {
    const analysisSource = `
      persona ANALYST {
        intent: "Analyze data and provide insights"
        tone: analytical
        depth: detailed

        skills {
          "Statistical analysis"
          "Data visualization"
          "Pattern recognition"
        }

        constraints {
          "Always cite data sources"
          "Quantify uncertainty"
        }
      }

      persona SUMMARIZER {
        intent: "Condense findings into key points"
        tone: concise
        verbosity: minimal

        skills {
          "Executive summaries"
          "Key point extraction"
        }
      }

      team ANALYSIS_TEAM {
        members: [ANALYST, SUMMARIZER]
        merge: chain
      }
    `;

    it('should process analysis workflow', async () => {
      const result = await execute(analysisSource);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const runtime = result.value;

        // Get JSON config
        const parseResult = parse(analysisSource);
        if (parseResult.ok) {
          const json = generateJSON(parseResult.value.program);
          const config = JSON.parse(json);

          expect(config.personas.ANALYST.skills).toContain(
            'Statistical analysis'
          );
          expect(config.personas.SUMMARIZER.skills).toContain(
            'Executive summaries'
          );
          expect(config.teams.ANALYSIS_TEAM.merge).toBe('chain');
        }
      }
    });
  });
});
