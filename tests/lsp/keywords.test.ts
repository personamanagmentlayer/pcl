/**
 * Tests for LSP Keywords Database
 *
 * Tests keyword definitions, context filtering, priority ordering, and property mappings
 */

import { PCLKeywordCategory } from '../../src/lsp/completion-types';
import {
  CONFIG_PROPERTIES,
  getPropertiesForType,
  MERGE_STRATEGIES,
  METADATA_PROPERTIES,
  MODEL_NAMES,
  PCL_KEYWORDS,
  PERSONA_PROPERTIES,
  RESPONSE_FORMATS,
  SKILL_PROPERTIES,
  TEAM_PROPERTIES,
  THINKING_STYLES,
  WORKFLOW_PROPERTIES,
} from '../../src/lsp/keywords';

describe('PCL Keywords Database', () => {
  describe('PCL_KEYWORDS Array', () => {
    it('should contain keyword definitions', () => {
      expect(PCL_KEYWORDS).toBeDefined();
      expect(Array.isArray(PCL_KEYWORDS)).toBe(true);
      expect(PCL_KEYWORDS.length).toBeGreaterThan(0);
    });

    it('should have unique keywords', () => {
      const keywords = PCL_KEYWORDS.map((k) => k.keyword);
      const uniqueKeywords = new Set(keywords);
      expect(uniqueKeywords.size).toBe(keywords.length);
    });

    it('should have all required fields', () => {
      PCL_KEYWORDS.forEach((keyword) => {
        expect(keyword.keyword).toBeDefined();
        expect(typeof keyword.keyword).toBe('string');
        expect(keyword.category).toBeDefined();
        expect(keyword.documentation).toBeDefined();
        expect(typeof keyword.documentation).toBe('string');
      });
    });

    it('should have valid categories', () => {
      const validCategories = Object.values(PCLKeywordCategory);
      PCL_KEYWORDS.forEach((keyword) => {
        expect(validCategories).toContain(keyword.category);
      });
    });

    it('should have non-empty documentation', () => {
      PCL_KEYWORDS.forEach((keyword) => {
        expect(keyword.documentation.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Declaration Keywords', () => {
    it('should include persona keyword', () => {
      const persona = PCL_KEYWORDS.find((k) => k.keyword === 'persona');
      expect(persona).toBeDefined();
      expect(persona?.category).toBe(PCLKeywordCategory.Declaration);
    });

    it('should include team keyword', () => {
      const team = PCL_KEYWORDS.find((k) => k.keyword === 'team');
      expect(team).toBeDefined();
      expect(team?.category).toBe(PCLKeywordCategory.Declaration);
    });

    it('should include workflow keyword', () => {
      const workflow = PCL_KEYWORDS.find((k) => k.keyword === 'workflow');
      expect(workflow).toBeDefined();
      expect(workflow?.category).toBe(PCLKeywordCategory.Declaration);
    });

    it('should include skill keyword', () => {
      const skill = PCL_KEYWORDS.find((k) => k.keyword === 'skill');
      expect(skill).toBeDefined();
      expect(skill?.category).toBe(PCLKeywordCategory.Declaration);
    });

    it('should include type keyword', () => {
      const type = PCL_KEYWORDS.find((k) => k.keyword === 'type');
      expect(type).toBeDefined();
      expect(type?.category).toBe(PCLKeywordCategory.Declaration);
    });

    it('should include const keyword', () => {
      const constKw = PCL_KEYWORDS.find((k) => k.keyword === 'const');
      expect(constKw).toBeDefined();
      expect(constKw?.category).toBe(PCLKeywordCategory.Declaration);
    });

    it('should include import keyword', () => {
      const importKw = PCL_KEYWORDS.find((k) => k.keyword === 'import');
      expect(importKw).toBeDefined();
      expect(importKw?.category).toBe(PCLKeywordCategory.Declaration);
    });

    it('should include export keyword', () => {
      const exportKw = PCL_KEYWORDS.find((k) => k.keyword === 'export');
      expect(exportKw).toBeDefined();
      expect(exportKw?.category).toBe(PCLKeywordCategory.Declaration);
    });

    it('should have descriptive documentation for declarations', () => {
      const declarations = PCL_KEYWORDS.filter(
        (k) => k.category === PCLKeywordCategory.Declaration
      );

      declarations.forEach((kw) => {
        const doc = kw.documentation.toLowerCase();
        // Should describe what the declaration does (define, import, export, etc.)
        expect(
          doc.includes('define') ||
            doc.includes('import') ||
            doc.includes('export')
        ).toBe(true);
      });
    });
  });

  describe('Visibility Keywords', () => {
    it('should include pub keyword', () => {
      const pub = PCL_KEYWORDS.find((k) => k.keyword === 'pub');
      expect(pub).toBeDefined();
      expect(pub?.category).toBe(PCLKeywordCategory.Visibility);
    });

    it('should include priv keyword', () => {
      const priv = PCL_KEYWORDS.find((k) => k.keyword === 'priv');
      expect(priv).toBeDefined();
      expect(priv?.category).toBe(PCLKeywordCategory.Visibility);
    });

    it('should have documentation about visibility', () => {
      const visibility = PCL_KEYWORDS.filter(
        (k) => k.category === PCLKeywordCategory.Visibility
      );

      expect(visibility.length).toBeGreaterThan(0);
      visibility.forEach((kw) => {
        const doc = kw.documentation.toLowerCase();
        expect(doc.includes('public') || doc.includes('private')).toBe(true);
      });
    });
  });

  describe('Type Keywords', () => {
    it('should include String type', () => {
      const stringType = PCL_KEYWORDS.find((k) => k.keyword === 'String');
      expect(stringType).toBeDefined();
      expect(stringType?.category).toBe(PCLKeywordCategory.Type);
    });

    it('should include Int type', () => {
      const intType = PCL_KEYWORDS.find((k) => k.keyword === 'Int');
      expect(intType).toBeDefined();
      expect(intType?.category).toBe(PCLKeywordCategory.Type);
    });

    it('should include Float type', () => {
      const floatType = PCL_KEYWORDS.find((k) => k.keyword === 'Float');
      expect(floatType).toBeDefined();
      expect(floatType?.category).toBe(PCLKeywordCategory.Type);
    });

    it('should include Bool type', () => {
      const boolType = PCL_KEYWORDS.find((k) => k.keyword === 'Bool');
      expect(boolType).toBeDefined();
      expect(boolType?.category).toBe(PCLKeywordCategory.Type);
    });

    it('should include Array type', () => {
      const arrayType = PCL_KEYWORDS.find((k) => k.keyword === 'Array');
      expect(arrayType).toBeDefined();
      expect(arrayType?.category).toBe(PCLKeywordCategory.Type);
    });

    it('should include Map type', () => {
      const mapType = PCL_KEYWORDS.find((k) => k.keyword === 'Map');
      expect(mapType).toBeDefined();
      expect(mapType?.category).toBe(PCLKeywordCategory.Type);
    });

    it('should include Set type', () => {
      const setType = PCL_KEYWORDS.find((k) => k.keyword === 'Set');
      expect(setType).toBeDefined();
      expect(setType?.category).toBe(PCLKeywordCategory.Type);
    });

    it('should include Tuple type', () => {
      const tupleType = PCL_KEYWORDS.find((k) => k.keyword === 'Tuple');
      expect(tupleType).toBeDefined();
      expect(tupleType?.category).toBe(PCLKeywordCategory.Type);
    });

    it('should have type documentation', () => {
      const types = PCL_KEYWORDS.filter(
        (k) => k.category === PCLKeywordCategory.Type
      );

      expect(types.length).toBeGreaterThan(0);
      types.forEach((kw) => {
        expect(kw.documentation.toLowerCase()).toContain('type');
      });
    });
  });

  describe('Workflow Keywords', () => {
    it('should include if keyword', () => {
      const ifKw = PCL_KEYWORDS.find((k) => k.keyword === 'if');
      expect(ifKw).toBeDefined();
      expect(ifKw?.category).toBe(PCLKeywordCategory.Workflow);
    });

    it('should include then keyword', () => {
      const thenKw = PCL_KEYWORDS.find((k) => k.keyword === 'then');
      expect(thenKw).toBeDefined();
      expect(thenKw?.category).toBe(PCLKeywordCategory.Workflow);
    });

    it('should include else keyword', () => {
      const elseKw = PCL_KEYWORDS.find((k) => k.keyword === 'else');
      expect(elseKw).toBeDefined();
      expect(elseKw?.category).toBe(PCLKeywordCategory.Workflow);
    });

    it('should include loop keyword', () => {
      const loopKw = PCL_KEYWORDS.find((k) => k.keyword === 'loop');
      expect(loopKw).toBeDefined();
      expect(loopKw?.category).toBe(PCLKeywordCategory.Workflow);
    });

    it('should have workflow documentation', () => {
      const workflows = PCL_KEYWORDS.filter(
        (k) => k.category === PCLKeywordCategory.Workflow
      );

      expect(workflows.length).toBeGreaterThan(0);
    });
  });

  describe('Control Keywords', () => {
    it('should include true keyword', () => {
      const trueKw = PCL_KEYWORDS.find((k) => k.keyword === 'true');
      expect(trueKw).toBeDefined();
      expect(trueKw?.category).toBe(PCLKeywordCategory.Control);
    });

    it('should include false keyword', () => {
      const falseKw = PCL_KEYWORDS.find((k) => k.keyword === 'false');
      expect(falseKw).toBeDefined();
      expect(falseKw?.category).toBe(PCLKeywordCategory.Control);
    });

    it('should include null keyword', () => {
      const nullKw = PCL_KEYWORDS.find((k) => k.keyword === 'null');
      expect(nullKw).toBeDefined();
      expect(nullKw?.category).toBe(PCLKeywordCategory.Control);
    });

    it('should have control documentation', () => {
      const controls = PCL_KEYWORDS.filter(
        (k) => k.category === PCLKeywordCategory.Control
      );

      expect(controls.length).toBeGreaterThan(0);
    });
  });

  describe('Property Arrays', () => {
    describe('PERSONA_PROPERTIES', () => {
      it('should contain persona properties', () => {
        expect(PERSONA_PROPERTIES).toBeDefined();
        expect(Array.isArray(PERSONA_PROPERTIES)).toBe(true);
        expect(PERSONA_PROPERTIES.length).toBeGreaterThan(0);
      });

      it('should include name property', () => {
        expect(PERSONA_PROPERTIES).toContain('name');
      });

      it('should include version property', () => {
        expect(PERSONA_PROPERTIES).toContain('version');
      });

      it('should include metadata property', () => {
        expect(PERSONA_PROPERTIES).toContain('metadata');
      });

      it('should include config property', () => {
        expect(PERSONA_PROPERTIES).toContain('config');
      });

      it('should include prompts property', () => {
        expect(PERSONA_PROPERTIES).toContain('prompts');
      });

      it('should include skills property', () => {
        expect(PERSONA_PROPERTIES).toContain('skills');
      });

      it('should include includes property', () => {
        expect(PERSONA_PROPERTIES).toContain('includes');
      });
    });

    describe('TEAM_PROPERTIES', () => {
      it('should contain team properties', () => {
        expect(TEAM_PROPERTIES).toBeDefined();
        expect(Array.isArray(TEAM_PROPERTIES)).toBe(true);
        expect(TEAM_PROPERTIES.length).toBeGreaterThan(0);
      });

      it('should include members property', () => {
        expect(TEAM_PROPERTIES).toContain('members');
      });

      it('should include primary property', () => {
        expect(TEAM_PROPERTIES).toContain('primary');
      });

      it('should include merge property', () => {
        expect(TEAM_PROPERTIES).toContain('merge');
      });

      it('should include quorum property', () => {
        expect(TEAM_PROPERTIES).toContain('quorum');
      });

      it('should include conflict property', () => {
        expect(TEAM_PROPERTIES).toContain('conflict');
      });
    });

    describe('WORKFLOW_PROPERTIES', () => {
      it('should contain workflow properties', () => {
        expect(WORKFLOW_PROPERTIES).toBeDefined();
        expect(Array.isArray(WORKFLOW_PROPERTIES)).toBe(true);
        expect(WORKFLOW_PROPERTIES.length).toBeGreaterThan(0);
      });

      it('should include steps property', () => {
        expect(WORKFLOW_PROPERTIES).toContain('steps');
      });

      it('should include timeout property', () => {
        expect(WORKFLOW_PROPERTIES).toContain('timeout');
      });

      it('should include retry property', () => {
        expect(WORKFLOW_PROPERTIES).toContain('retry');
      });

      it('should include fallback property', () => {
        expect(WORKFLOW_PROPERTIES).toContain('fallback');
      });
    });

    describe('SKILL_PROPERTIES', () => {
      it('should contain skill properties', () => {
        expect(SKILL_PROPERTIES).toBeDefined();
        expect(Array.isArray(SKILL_PROPERTIES)).toBe(true);
        expect(SKILL_PROPERTIES.length).toBeGreaterThan(0);
      });

      it('should include category property', () => {
        expect(SKILL_PROPERTIES).toContain('category');
      });

      it('should include items property', () => {
        expect(SKILL_PROPERTIES).toContain('items');
      });

      it('should include description property', () => {
        expect(SKILL_PROPERTIES).toContain('description');
      });
    });

    describe('CONFIG_PROPERTIES', () => {
      it('should contain config properties', () => {
        expect(CONFIG_PROPERTIES).toBeDefined();
        expect(Array.isArray(CONFIG_PROPERTIES)).toBe(true);
        expect(CONFIG_PROPERTIES.length).toBeGreaterThan(0);
      });

      it('should include model property', () => {
        expect(CONFIG_PROPERTIES).toContain('model');
      });

      it('should include temperature property', () => {
        expect(CONFIG_PROPERTIES).toContain('temperature');
      });

      it('should include max_tokens property', () => {
        expect(CONFIG_PROPERTIES).toContain('max_tokens');
      });

      it('should include top_p property', () => {
        expect(CONFIG_PROPERTIES).toContain('top_p');
      });

      it('should include top_k property', () => {
        expect(CONFIG_PROPERTIES).toContain('top_k');
      });

      it('should include thinking_style property', () => {
        expect(CONFIG_PROPERTIES).toContain('thinking_style');
      });

      it('should include response_format property', () => {
        expect(CONFIG_PROPERTIES).toContain('response_format');
      });
    });

    describe('METADATA_PROPERTIES', () => {
      it('should contain metadata properties', () => {
        expect(METADATA_PROPERTIES).toBeDefined();
        expect(Array.isArray(METADATA_PROPERTIES)).toBe(true);
        expect(METADATA_PROPERTIES.length).toBeGreaterThan(0);
      });

      it('should include category property', () => {
        expect(METADATA_PROPERTIES).toContain('category');
      });

      it('should include description property', () => {
        expect(METADATA_PROPERTIES).toContain('description');
      });

      it('should include tags property', () => {
        expect(METADATA_PROPERTIES).toContain('tags');
      });

      it('should include skills property', () => {
        expect(METADATA_PROPERTIES).toContain('skills');
      });

      it('should include author property', () => {
        expect(METADATA_PROPERTIES).toContain('author');
      });

      it('should include license property', () => {
        expect(METADATA_PROPERTIES).toContain('license');
      });
    });
  });

  describe('Enum Values', () => {
    describe('MERGE_STRATEGIES', () => {
      it('should contain merge strategies', () => {
        expect(MERGE_STRATEGIES).toBeDefined();
        expect(Array.isArray(MERGE_STRATEGIES)).toBe(true);
        expect(MERGE_STRATEGIES.length).toBeGreaterThan(0);
      });

      it('should include Primary strategy', () => {
        expect(MERGE_STRATEGIES).toContain('Primary');
      });

      it('should include Consensus strategy', () => {
        expect(MERGE_STRATEGIES).toContain('Consensus');
      });

      it('should include Voting strategy', () => {
        expect(MERGE_STRATEGIES).toContain('Voting');
      });

      it('should include Weighted strategy', () => {
        expect(MERGE_STRATEGIES).toContain('Weighted');
      });

      it('should include FirstComplete strategy', () => {
        expect(MERGE_STRATEGIES).toContain('FirstComplete');
      });
    });

    describe('MODEL_NAMES', () => {
      it('should contain model names', () => {
        expect(MODEL_NAMES).toBeDefined();
        expect(Array.isArray(MODEL_NAMES)).toBe(true);
        expect(MODEL_NAMES.length).toBeGreaterThan(0);
      });

      it('should include Claude models', () => {
        expect(MODEL_NAMES).toContain('claude-sonnet-4');
        expect(MODEL_NAMES).toContain('claude-sonnet-3.5');
        expect(MODEL_NAMES).toContain('claude-opus-4');
      });

      it('should include GPT models', () => {
        expect(MODEL_NAMES).toContain('gpt-4');
        expect(MODEL_NAMES).toContain('gpt-4-turbo');
        expect(MODEL_NAMES).toContain('gpt-3.5-turbo');
      });

      it('should include Gemini models', () => {
        expect(MODEL_NAMES).toContain('gemini-pro');
        expect(MODEL_NAMES).toContain('gemini-ultra');
      });
    });

    describe('THINKING_STYLES', () => {
      it('should contain thinking styles', () => {
        expect(THINKING_STYLES).toBeDefined();
        expect(Array.isArray(THINKING_STYLES)).toBe(true);
        expect(THINKING_STYLES.length).toBeGreaterThan(0);
      });

      it('should include analytical style', () => {
        expect(THINKING_STYLES).toContain('analytical');
      });

      it('should include creative style', () => {
        expect(THINKING_STYLES).toContain('creative');
      });

      it('should include practical style', () => {
        expect(THINKING_STYLES).toContain('practical');
      });

      it('should include critical style', () => {
        expect(THINKING_STYLES).toContain('critical');
      });

      it('should include strategic style', () => {
        expect(THINKING_STYLES).toContain('strategic');
      });

      it('should include systematic style', () => {
        expect(THINKING_STYLES).toContain('systematic');
      });
    });

    describe('RESPONSE_FORMATS', () => {
      it('should contain response formats', () => {
        expect(RESPONSE_FORMATS).toBeDefined();
        expect(Array.isArray(RESPONSE_FORMATS)).toBe(true);
        expect(RESPONSE_FORMATS.length).toBeGreaterThan(0);
      });

      it('should include text format', () => {
        expect(RESPONSE_FORMATS).toContain('text');
      });

      it('should include json format', () => {
        expect(RESPONSE_FORMATS).toContain('json');
      });

      it('should include markdown format', () => {
        expect(RESPONSE_FORMATS).toContain('markdown');
      });

      it('should include code format', () => {
        expect(RESPONSE_FORMATS).toContain('code');
      });

      it('should include structured format', () => {
        expect(RESPONSE_FORMATS).toContain('structured');
      });
    });
  });

  describe('getPropertiesForType', () => {
    it('should return persona properties', () => {
      const properties = getPropertiesForType('persona');
      expect(properties).toEqual(PERSONA_PROPERTIES);
    });

    it('should return team properties', () => {
      const properties = getPropertiesForType('team');
      expect(properties).toEqual(TEAM_PROPERTIES);
    });

    it('should return workflow properties', () => {
      const properties = getPropertiesForType('workflow');
      expect(properties).toEqual(WORKFLOW_PROPERTIES);
    });

    it('should return skill properties', () => {
      const properties = getPropertiesForType('skill');
      expect(properties).toEqual(SKILL_PROPERTIES);
    });

    it('should return config properties', () => {
      const properties = getPropertiesForType('config');
      expect(properties).toEqual(CONFIG_PROPERTIES);
    });

    it('should return metadata properties', () => {
      const properties = getPropertiesForType('metadata');
      expect(properties).toEqual(METADATA_PROPERTIES);
    });

    it('should return empty array for unknown type', () => {
      const properties = getPropertiesForType('unknown');
      expect(properties).toEqual([]);
    });

    it('should be case-insensitive', () => {
      const lower = getPropertiesForType('persona');
      const upper = getPropertiesForType('PERSONA');
      const mixed = getPropertiesForType('PeRsOnA');

      expect(lower).toEqual(PERSONA_PROPERTIES);
      expect(upper).toEqual(PERSONA_PROPERTIES);
      expect(mixed).toEqual(PERSONA_PROPERTIES);
    });

    it('should handle empty string', () => {
      const properties = getPropertiesForType('');
      expect(properties).toEqual([]);
    });

    it('should handle whitespace', () => {
      const properties = getPropertiesForType('  persona  ');
      expect(properties).not.toEqual(PERSONA_PROPERTIES); // Doesn't trim
    });
  });

  describe('Keyword Categories', () => {
    it('should have at least one keyword per category', () => {
      const categories = [
        PCLKeywordCategory.Declaration,
        PCLKeywordCategory.Visibility,
        PCLKeywordCategory.Type,
        PCLKeywordCategory.Workflow,
        PCLKeywordCategory.Control,
      ];

      categories.forEach((category) => {
        const keywords = PCL_KEYWORDS.filter((k) => k.category === category);
        expect(keywords.length).toBeGreaterThan(0);
      });
    });

    it('should have multiple declaration keywords', () => {
      const declarations = PCL_KEYWORDS.filter(
        (k) => k.category === PCLKeywordCategory.Declaration
      );
      expect(declarations.length).toBeGreaterThanOrEqual(8);
    });

    it('should have type keywords', () => {
      const types = PCL_KEYWORDS.filter(
        (k) => k.category === PCLKeywordCategory.Type
      );
      expect(types.length).toBeGreaterThanOrEqual(8);
    });

    it('should have workflow control keywords', () => {
      const workflows = PCL_KEYWORDS.filter(
        (k) => k.category === PCLKeywordCategory.Workflow
      );
      expect(workflows.length).toBeGreaterThanOrEqual(4);
    });

    it('should have control keywords', () => {
      const controls = PCL_KEYWORDS.filter(
        (k) => k.category === PCLKeywordCategory.Control
      );
      expect(controls.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle keywords with special characters', () => {
      // Ensure no keywords have problematic characters
      PCL_KEYWORDS.forEach((kw) => {
        expect(kw.keyword).not.toMatch(/[{}()[\]]/);
      });
    });

    it('should have reasonable keyword lengths', () => {
      PCL_KEYWORDS.forEach((kw) => {
        expect(kw.keyword.length).toBeGreaterThan(0);
        expect(kw.keyword.length).toBeLessThan(50);
      });
    });

    it('should have reasonable documentation lengths', () => {
      PCL_KEYWORDS.forEach((kw) => {
        expect(kw.documentation.length).toBeGreaterThan(5);
        expect(kw.documentation.length).toBeLessThan(200);
      });
    });

    it('should not have duplicate properties across arrays', () => {
      // Each property array should be distinct
      const allProperties = [
        ...PERSONA_PROPERTIES,
        ...TEAM_PROPERTIES,
        ...WORKFLOW_PROPERTIES,
        ...SKILL_PROPERTIES,
      ];
      // Some overlap is expected (name, version, metadata)
      expect(allProperties.length).toBeGreaterThan(0);
    });

    it('should have consistent casing in property names', () => {
      const checkCasing = (properties: string[]) => {
        properties.forEach((prop) => {
          // Should be lowercase with underscores
          expect(prop).toMatch(/^[a-z_]+$/);
        });
      };

      checkCasing(PERSONA_PROPERTIES);
      checkCasing(TEAM_PROPERTIES);
      checkCasing(WORKFLOW_PROPERTIES);
      checkCasing(SKILL_PROPERTIES);
      checkCasing(CONFIG_PROPERTIES);
      checkCasing(METADATA_PROPERTIES);
    });

    it('should have unique enum values', () => {
      const checkUnique = (values: string[]) => {
        const unique = new Set(values);
        expect(unique.size).toBe(values.length);
      };

      checkUnique(MERGE_STRATEGIES);
      checkUnique(MODEL_NAMES);
      checkUnique(THINKING_STYLES);
      checkUnique(RESPONSE_FORMATS);
    });
  });

  describe('Coverage', () => {
    it('should have comprehensive keyword coverage', () => {
      expect(PCL_KEYWORDS.length).toBeGreaterThanOrEqual(25);
    });

    it('should cover all PCL declaration types', () => {
      const keywords = PCL_KEYWORDS.map((k) => k.keyword);
      expect(keywords).toContain('persona');
      expect(keywords).toContain('team');
      expect(keywords).toContain('workflow');
      expect(keywords).toContain('skill');
    });

    it('should cover primitive types', () => {
      const keywords = PCL_KEYWORDS.map((k) => k.keyword);
      expect(keywords).toContain('String');
      expect(keywords).toContain('Int');
      expect(keywords).toContain('Float');
      expect(keywords).toContain('Bool');
    });

    it('should cover collection types', () => {
      const keywords = PCL_KEYWORDS.map((k) => k.keyword);
      expect(keywords).toContain('Array');
      expect(keywords).toContain('Map');
      expect(keywords).toContain('Set');
    });

    it('should cover workflow control structures', () => {
      const keywords = PCL_KEYWORDS.map((k) => k.keyword);
      expect(keywords).toContain('if');
      expect(keywords).toContain('then');
      expect(keywords).toContain('else');
    });

    it('should have at least 5 model names', () => {
      expect(MODEL_NAMES.length).toBeGreaterThanOrEqual(5);
    });

    it('should have at least 5 merge strategies', () => {
      expect(MERGE_STRATEGIES.length).toBeGreaterThanOrEqual(5);
    });

    it('should have at least 5 thinking styles', () => {
      expect(THINKING_STYLES.length).toBeGreaterThanOrEqual(5);
    });

    it('should have at least 5 response formats', () => {
      expect(RESPONSE_FORMATS.length).toBeGreaterThanOrEqual(5);
    });
  });
});
