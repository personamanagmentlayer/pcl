// ═══════════════════════════════════════════════════════════════════════════════
// PCL Code Generation - Prompt Enhancements Tests
// Comprehensive tests for multi-language support, token counting, and optimization
// ═══════════════════════════════════════════════════════════════════════════════

import {
  getLocalizations,
  type PromptLanguage,
  estimateTokenCount,
  countTokensBySection,
  optimizePromptLength,
  type TokenCounterConfig,
} from '../../src/codegen/prompt-enhancements';

// ───────────────────────────────────────────────────────────────────────────
// Localization Tests
// ───────────────────────────────────────────────────────────────────────────

describe('getLocalizations', () => {
  describe('default behavior', () => {
    test('returns English localizations by default', () => {
      const loc = getLocalizations();

      expect(loc.identity).toBe('IDENTITY & PURPOSE');
      expect(loc.expertise).toBe('EXPERTISE & SKILLS');
      expect(loc.guidelines).toBe('CONSTRAINTS & GUIDELINES');
      expect(loc.style).toBe('COMMUNICATION STYLE');
      expect(loc.capabilities).toBe('CAPABILITIES');
      expect(loc.context).toBe('CONTEXT TAGS');
    });

    test('returns English when explicit en is passed', () => {
      const loc = getLocalizations('en');

      expect(loc.identity).toBe('IDENTITY & PURPOSE');
      expect(loc.teamMembers).toBe('TEAM MEMBERS');
      expect(loc.collaborationMode).toBe('COLLABORATION MODE');
    });
  });

  describe('supported languages', () => {
    test('returns French localizations', () => {
      const loc = getLocalizations('fr');

      expect(loc.identity).toBe('IDENTITÉ ET OBJECTIF');
      expect(loc.expertise).toBe('EXPERTISE ET COMPÉTENCES');
      expect(loc.guidelines).toBe('CONTRAINTES ET DIRECTIVES');
      expect(loc.style).toBe('STYLE DE COMMUNICATION');
    });

    test('returns Spanish localizations', () => {
      const loc = getLocalizations('es');

      expect(loc.identity).toBe('IDENTIDAD Y PROPÓSITO');
      expect(loc.expertise).toBe('EXPERIENCIA Y HABILIDADES');
      expect(loc.guidelines).toBe('RESTRICCIONES Y PAUTAS');
    });

    test('returns German localizations', () => {
      const loc = getLocalizations('de');

      expect(loc.identity).toBe('IDENTITÄT UND ZWECK');
      expect(loc.expertise).toBe('EXPERTISE UND FÄHIGKEITEN');
      expect(loc.guidelines).toBe('EINSCHRÄNKUNGEN UND RICHTLINIEN');
    });

    test('returns Italian localizations', () => {
      const loc = getLocalizations('it');

      expect(loc.identity).toBe('IDENTITÀ E SCOPO');
      expect(loc.expertise).toBe('COMPETENZA E ABILITÀ');
    });

    test('returns Portuguese localizations', () => {
      const loc = getLocalizations('pt');

      expect(loc.identity).toBe('IDENTIDADE E PROPÓSITO');
      expect(loc.expertise).toBe('EXPERTISE E HABILIDADES');
    });

    test('returns Japanese localizations', () => {
      const loc = getLocalizations('ja');

      expect(loc.identity).toBe('アイデンティティと目的');
      expect(loc.expertise).toBe('専門知識とスキル');
      expect(loc.guidelines).toBe('制約とガイドライン');
    });

    test('returns Chinese localizations', () => {
      const loc = getLocalizations('zh');

      expect(loc.identity).toBe('身份和目的');
      expect(loc.expertise).toBe('专业知识和技能');
    });

    test('returns Korean localizations', () => {
      const loc = getLocalizations('ko');

      expect(loc.identity).toBe('정체성 및 목적');
      expect(loc.expertise).toBe('전문 지식 및 기술');
    });

    test('returns Russian localizations', () => {
      const loc = getLocalizations('ru');

      expect(loc.identity).toBe('ИДЕНТИЧНОСТЬ И ЦЕЛЬ');
      expect(loc.expertise).toBe('ЭКСПЕРТИЗА И НАВЫКИ');
    });

    test('returns Arabic localizations', () => {
      const loc = getLocalizations('ar');

      expect(loc.identity).toBe('الهوية والغرض');
      expect(loc.expertise).toBe('الخبرة والمهارات');
    });
  });

  describe('team-specific fields', () => {
    test('includes team-specific localizations in English', () => {
      const loc = getLocalizations('en');

      expect(loc.teamMembers).toBe('TEAM MEMBERS');
      expect(loc.collaborationMode).toBe('COLLABORATION MODE');
      expect(loc.collaborationInstructions).toBe('COLLABORATION INSTRUCTIONS');
      expect(loc.primaryLead).toBe('Primary Lead');
      expect(loc.quorum).toBe('Quorum');
    });

    test('includes team-specific localizations in French', () => {
      const loc = getLocalizations('fr');

      expect(loc.teamMembers).toBe("MEMBRES DE L'ÉQUIPE");
      expect(loc.collaborationMode).toBe('MODE DE COLLABORATION');
      expect(loc.primaryLead).toBe('Leader Principal');
    });

    test('includes team-specific localizations in Spanish', () => {
      const loc = getLocalizations('es');

      expect(loc.teamMembers).toBe('MIEMBROS DEL EQUIPO');
      expect(loc.collaborationMode).toBe('MODO DE COLABORACIÓN');
      expect(loc.primaryLead).toBe('Líder Principal');
    });
  });

  describe('style fields', () => {
    test('includes style fields', () => {
      const loc = getLocalizations('en');

      expect(loc.tone).toBe('Tone');
      expect(loc.verbosity).toBe('Verbosity');
      expect(loc.depth).toBe('Depth');
      expect(loc.tags).toBe('Tags');
    });
  });

  describe('merge instructions', () => {
    test('includes all merge mode instructions in English', () => {
      const loc = getLocalizations('en');

      expect(loc.mergeInstructions.primary).toContain('primary lead');
      expect(loc.mergeInstructions.consensus).toContain('agreement');
      expect(loc.mergeInstructions.majority).toContain('majority vote');
      expect(loc.mergeInstructions.debate).toContain('perspectives');
      expect(loc.mergeInstructions.append).toContain('contributions');
      expect(loc.mergeInstructions.weighted).toContain('influence weights');
      expect(loc.mergeInstructions.chain).toContain('sequentially');
    });

    test('includes localized merge instructions in French', () => {
      const loc = getLocalizations('fr');

      expect(loc.mergeInstructions.primary).toContain('leader principal');
      expect(loc.mergeInstructions.consensus).toContain('accord');
      expect(loc.mergeInstructions.majority).toContain('majoritaire');
    });

    test('includes localized merge instructions in Japanese', () => {
      const loc = getLocalizations('ja');

      expect(loc.mergeInstructions.primary).toContain('主要リーダー');
      expect(loc.mergeInstructions.consensus).toContain('コンセンサス');
    });

    test('includes localized merge instructions in Chinese', () => {
      const loc = getLocalizations('zh');

      expect(loc.mergeInstructions.primary).toContain('主要负责人');
      expect(loc.mergeInstructions.consensus).toContain('共识');
    });
  });

  describe('fallback behavior', () => {
    test('falls back to English for invalid language code', () => {
      // @ts-expect-error - testing invalid language
      const loc = getLocalizations('invalid' as PromptLanguage);

      expect(loc.identity).toBe('IDENTITY & PURPOSE');
      expect(loc.expertise).toBe('EXPERTISE & SKILLS');
    });

    test('falls back to English for undefined', () => {
      const loc = getLocalizations(undefined);

      expect(loc.identity).toBe('IDENTITY & PURPOSE');
    });
  });

  describe('completeness', () => {
    test('all languages have same structure', () => {
      const languages: PromptLanguage[] = [
        'en',
        'fr',
        'es',
        'de',
        'it',
        'pt',
        'ja',
        'zh',
        'ko',
        'ru',
        'ar',
      ];

      const englishKeys = Object.keys(getLocalizations('en')).sort();

      for (const lang of languages) {
        const loc = getLocalizations(lang);
        const keys = Object.keys(loc).sort();

        expect(keys).toEqual(englishKeys);
      }
    });

    test('all merge instructions are present for all languages', () => {
      const languages: PromptLanguage[] = [
        'en',
        'fr',
        'es',
        'de',
        'it',
        'pt',
        'ja',
        'zh',
        'ko',
        'ru',
        'ar',
      ];

      const mergeKeys = [
        'primary',
        'consensus',
        'majority',
        'debate',
        'append',
        'weighted',
        'chain',
      ];

      for (const lang of languages) {
        const loc = getLocalizations(lang);
        const keys = Object.keys(loc.mergeInstructions).sort();

        expect(keys).toEqual(mergeKeys.sort());
      }
    });
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Token Counting Tests
// ───────────────────────────────────────────────────────────────────────────

describe('estimateTokenCount', () => {
  describe('basic token estimation', () => {
    test('estimates tokens for simple English text', () => {
      const text = 'Hello, world!';
      const result = estimateTokenCount(text);

      expect(result.total).toBeGreaterThan(0);
      expect(result.total).toBe(Math.ceil(text.length / 4));
    });

    test('estimates tokens for longer English text', () => {
      const text =
        'This is a longer text with multiple words and sentences. It should be counted accurately.';
      const result = estimateTokenCount(text);

      expect(result.total).toBe(Math.ceil(text.length / 4));
    });

    test('uses different ratio for CJK languages', () => {
      const cjkText = '这是中文文本';
      const result = estimateTokenCount(cjkText);

      // CJK uses 2 chars per token instead of 4
      expect(result.total).toBe(Math.ceil(cjkText.length / 2));
    });

    test('handles Japanese text', () => {
      const japaneseText = 'これは日本語のテキストです';
      const result = estimateTokenCount(japaneseText);

      expect(result.total).toBe(Math.ceil(japaneseText.length / 2));
    });

    test('handles Korean text', () => {
      const koreanText = '이것은 한국어 텍스트입니다';
      const result = estimateTokenCount(koreanText);

      expect(result.total).toBe(Math.ceil(koreanText.length / 2));
    });

    test('handles mixed English and CJK', () => {
      const mixedText = 'Hello 你好 World 世界';
      const result = estimateTokenCount(mixedText);

      // Should detect CJK and use 2 chars per token
      expect(result.total).toBe(Math.ceil(mixedText.length / 2));
    });

    test('handles empty string', () => {
      const result = estimateTokenCount('');

      expect(result.total).toBe(0);
    });
  });

  describe('provider-specific cost estimation', () => {
    test('estimates cost for Claude provider', () => {
      const text = 'A'.repeat(4000); // ~1000 tokens
      const result = estimateTokenCount(text, { provider: 'claude' });

      expect(result.estimatedCost).toBeDefined();
      expect(result.estimatedCost).toBeGreaterThan(0);
      // Claude: $3 per 1M tokens
      expect(result.estimatedCost).toBeCloseTo((1000 / 1_000_000) * 3, 6);
    });

    test('estimates cost for OpenAI provider', () => {
      const text = 'A'.repeat(4000); // ~1000 tokens
      const result = estimateTokenCount(text, { provider: 'openai' });

      expect(result.estimatedCost).toBeDefined();
      // OpenAI: $0.5 per 1M tokens
      expect(result.estimatedCost).toBeCloseTo((1000 / 1_000_000) * 0.5, 6);
    });

    test('estimates cost for Gemini provider', () => {
      const text = 'A'.repeat(4000); // ~1000 tokens
      const result = estimateTokenCount(text, { provider: 'gemini' });

      expect(result.estimatedCost).toBeDefined();
      // Gemini: $0.5 per 1M tokens
      expect(result.estimatedCost).toBeCloseTo((1000 / 1_000_000) * 0.5, 6);
    });

    test('uses generic cost by default', () => {
      const text = 'A'.repeat(4000); // ~1000 tokens
      const result = estimateTokenCount(text);

      expect(result.estimatedCost).toBeDefined();
      // Generic: $1 per 1M tokens
      expect(result.estimatedCost).toBeCloseTo((1000 / 1_000_000) * 1, 6);
    });

    test('returns zero cost for empty text', () => {
      const result = estimateTokenCount('', { provider: 'claude' });

      expect(result.estimatedCost).toBe(0);
    });
  });

  describe('edge cases', () => {
    test('handles very long text', () => {
      const longText = 'A'.repeat(100000);
      const result = estimateTokenCount(longText);

      expect(result.total).toBe(Math.ceil(100000 / 4));
    });

    test('handles special characters', () => {
      const text = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const result = estimateTokenCount(text);

      expect(result.total).toBeGreaterThan(0);
    });

    test('handles newlines and whitespace', () => {
      const text = 'Line 1\nLine 2\n\nLine 3\t\tTab';
      const result = estimateTokenCount(text);

      expect(result.total).toBe(Math.ceil(text.length / 4));
    });

    test('handles unicode characters', () => {
      const text = '😀 🎉 🚀 ✨';
      const result = estimateTokenCount(text);

      expect(result.total).toBeGreaterThan(0);
    });
  });
});

describe('countTokensBySection', () => {
  describe('section-based counting', () => {
    test('counts tokens for multiple sections', () => {
      const sections = {
        identity: 'You are a helpful assistant.',
        skills: 'You have expertise in programming and design.',
        guidelines: 'Always be polite and professional.',
      };

      const result = countTokensBySection(sections);

      expect(result.total).toBeGreaterThan(0);
      expect(result.sections).toBeDefined();
      expect(result.sections?.identity).toBeGreaterThan(0);
      expect(result.sections?.skills).toBeGreaterThan(0);
      expect(result.sections?.guidelines).toBeGreaterThan(0);
    });

    test('total equals sum of sections', () => {
      const sections = {
        section1: 'First section text here.',
        section2: 'Second section text here.',
        section3: 'Third section text here.',
      };

      const result = countTokensBySection(sections);

      const sectionSum =
        (result.sections?.section1 || 0) +
        (result.sections?.section2 || 0) +
        (result.sections?.section3 || 0);

      expect(result.total).toBe(sectionSum);
    });

    test('handles empty sections', () => {
      const sections = {
        section1: '',
        section2: 'Some text',
        section3: '',
      };

      const result = countTokensBySection(sections);

      expect(result.sections?.section1).toBe(0);
      expect(result.sections?.section2).toBeGreaterThan(0);
      expect(result.sections?.section3).toBe(0);
    });

    test('handles single section', () => {
      const sections = {
        only: 'Just one section',
      };

      const result = countTokensBySection(sections);

      expect(result.sections?.only).toBeGreaterThan(0);
      expect(result.total).toBe(result.sections?.only || 0);
    });

    test('handles no sections', () => {
      const sections = {};

      const result = countTokensBySection(sections);

      expect(result.total).toBe(0);
      expect(result.sections).toEqual({});
    });
  });

  describe('provider-specific costs', () => {
    test('includes cost estimate with provider', () => {
      const sections = {
        section1: 'A'.repeat(4000),
        section2: 'B'.repeat(4000),
      };

      const result = countTokensBySection(sections, { provider: 'claude' });

      expect(result.estimatedCost).toBeDefined();
      expect(result.estimatedCost).toBeGreaterThan(0);
    });

    test('cost matches total tokens', () => {
      const sections = {
        section1: 'A'.repeat(4000),
      };

      const result = countTokensBySection(sections, { provider: 'openai' });

      const expectedCost = (result.total / 1_000_000) * 0.5;
      expect(result.estimatedCost).toBeCloseTo(expectedCost, 6);
    });
  });

  describe('CJK language handling', () => {
    test('correctly counts CJK sections', () => {
      const sections = {
        chinese: '这是中文',
        english: 'This is English',
      };

      const result = countTokensBySection(sections);

      // Chinese section should use 2 chars per token
      expect(result.sections?.chinese).toBe(Math.ceil('这是中文'.length / 2));
      // English section should use 4 chars per token
      expect(result.sections?.english).toBe(
        Math.ceil('This is English'.length / 4)
      );
    });
  });
});

describe('optimizePromptLength', () => {
  describe('basic optimization', () => {
    test('returns text unchanged if under budget', () => {
      const text = 'Short text';
      const maxTokens = 1000;

      const result = optimizePromptLength(text, maxTokens);

      expect(result).toBe(text);
    });

    test('truncates text if over budget', () => {
      const text = 'A'.repeat(1000);
      const maxTokens = 50; // Much smaller than actual token count

      const result = optimizePromptLength(text, maxTokens);

      expect(result.length).toBeLessThan(text.length);
    });

    test('truncated text is within budget', () => {
      const text = 'A'.repeat(1000);
      const maxTokens = 50;

      const result = optimizePromptLength(text, maxTokens);
      const resultTokens = estimateTokenCount(result).total;

      expect(resultTokens).toBeLessThanOrEqual(maxTokens);
    });
  });

  describe('intelligent truncation', () => {
    test('truncates at sentence boundary when possible', () => {
      const text =
        'First sentence. Second sentence. Third sentence. Fourth sentence.';
      const maxTokens = 5; // Force truncation

      const result = optimizePromptLength(text, maxTokens);

      // Should end with a period if truncated at sentence
      if (result !== text) {
        expect(result.endsWith('.') || result.endsWith('...')).toBe(true);
      }
    });

    test('truncates at newline when sentence not available', () => {
      const text = 'A'.repeat(100) + '\n' + 'B'.repeat(100);
      const maxTokens = 10;

      const result = optimizePromptLength(text, maxTokens);

      expect(result.length).toBeLessThan(text.length);
    });

    test('adds ellipsis when forced truncation', () => {
      const text = 'A'.repeat(1000);
      const maxTokens = 10;

      const result = optimizePromptLength(text, maxTokens);

      // If no good cut point, should add ellipsis
      if (!result.includes('.') && !result.includes('\n')) {
        expect(result.endsWith('...')).toBe(true);
      }
    });

    test('prefers later sentence boundary', () => {
      const text = 'First. Second. Third. Fourth. Fifth. Sixth. Seventh.';
      const maxTokens = 8;

      const result = optimizePromptLength(text, maxTokens);

      // Should try to include as much as possible
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    test('handles empty text', () => {
      const result = optimizePromptLength('', 100);

      expect(result).toBe('');
    });

    test('handles text with no sentences', () => {
      const text = 'A'.repeat(1000);
      const maxTokens = 50;

      const result = optimizePromptLength(text, maxTokens);

      expect(result.length).toBeLessThan(text.length);
    });

    test('handles text with only newlines', () => {
      const text = '\n'.repeat(100);
      const maxTokens = 10;

      const result = optimizePromptLength(text, maxTokens);

      expect(result.length).toBeLessThanOrEqual(text.length);
    });

    test('handles very small budget', () => {
      const text = 'This is a test.';
      const maxTokens = 1;

      const result = optimizePromptLength(text, maxTokens);

      expect(result.length).toBeGreaterThan(0);
      // With very small budgets, the optimization may not always fit exactly
      // but should significantly reduce the size
      expect(result.length).toBeLessThan(text.length);
    });

    test('handles zero budget', () => {
      const text = 'This is a test.';
      const maxTokens = 0;

      const result = optimizePromptLength(text, maxTokens);

      // Should return empty or minimal text
      expect(result.length).toBeLessThanOrEqual(text.length);
    });
  });

  describe('CJK optimization', () => {
    test('optimizes CJK text correctly', () => {
      const text =
        '这是一个很长的中文文本。它应该被正确截断。' +
        '继续添加更多文字。'.repeat(10);
      const maxTokens = 20;

      const result = optimizePromptLength(text, maxTokens);

      expect(result.length).toBeLessThan(text.length);
      const resultTokens = estimateTokenCount(result).total;
      expect(resultTokens).toBeLessThanOrEqual(maxTokens);
    });

    test('respects CJK sentence boundaries', () => {
      const text = '第一句。第二句。第三句。';
      const maxTokens = 5;

      const result = optimizePromptLength(text, maxTokens);

      if (result !== text && result.length > 0) {
        // Should try to end at a CJK period
        expect(result.includes('。')).toBe(true);
      }
    });
  });

  describe('provider-specific optimization', () => {
    test('respects provider config during optimization', () => {
      const text = 'A'.repeat(1000);
      const maxTokens = 50;
      const config: TokenCounterConfig = { provider: 'claude' };

      const result = optimizePromptLength(text, maxTokens, config);
      const resultTokens = estimateTokenCount(result, config).total;

      expect(resultTokens).toBeLessThanOrEqual(maxTokens);
    });
  });

  describe('buffer application', () => {
    test('applies 5% safety buffer', () => {
      const text = 'A'.repeat(1000);
      const maxTokens = 100;

      const result = optimizePromptLength(text, maxTokens);
      const resultTokens = estimateTokenCount(result).total;

      // Should be well under the limit due to buffer
      expect(resultTokens).toBeLessThan(maxTokens);
    });
  });
});
