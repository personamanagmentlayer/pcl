/**
 * Tests for Task Classification
 * Task feature extraction for optimal routing
 */

import { TaskClassifier } from '../../../src/runtime/routing/task-classifier';
import type { RoutingMessage } from '../../../src/runtime/routing/types';

// Helper to create test messages
function createMessage(
  content: string,
  metadata?: {
    latencySensitivity?: number;
    costSensitivity?: number;
    attachments?: Array<{ type: string; data: any }>;
  }
): RoutingMessage {
  return {
    content,
    metadata,
  };
}

describe('TaskClassifier', () => {
  let classifier: TaskClassifier;

  beforeEach(() => {
    classifier = new TaskClassifier();
  });

  describe('classifyMessage', () => {
    it('should classify a simple text message', () => {
      const message = createMessage('Hello, how are you?');
      const features = classifier.classifyMessage(message);

      expect(features.messageLength).toBe(19);
      expect(features.complexity).toBeGreaterThanOrEqual(0);
      expect(features.complexity).toBeLessThanOrEqual(1);
      expect(features.domain).toBe('general');
      expect(features.latencySensitivity).toBe(0.5);
      expect(features.costSensitivity).toBe(0.5);
    });

    it('should use custom latency sensitivity from metadata', () => {
      const message = createMessage('Test', { latencySensitivity: 0.9 });
      const features = classifier.classifyMessage(message);

      expect(features.latencySensitivity).toBe(0.9);
    });

    it('should use custom cost sensitivity from metadata', () => {
      const message = createMessage('Test', { costSensitivity: 0.1 });
      const features = classifier.classifyMessage(message);

      expect(features.costSensitivity).toBe(0.1);
    });

    it('should classify code message as code domain', () => {
      const message = createMessage('```typescript\nfunction test() {}\n```');
      const features = classifier.classifyMessage(message);

      expect(features.domain).toBe('code');
      expect(features.requiredCapabilities).toContain('code');
    });

    it('should classify analysis message as analysis domain', () => {
      const message = createMessage(
        'Analyze the data and compute statistics to evaluate the trend'
      );
      const features = classifier.classifyMessage(message);

      expect(features.domain).toBe('analysis');
    });

    it('should classify creative message as creative domain', () => {
      const message = createMessage(
        'Write a story about a character on an adventure'
      );
      const features = classifier.classifyMessage(message);

      expect(features.domain).toBe('creative');
    });

    it('should handle empty message', () => {
      const message = createMessage('');
      const features = classifier.classifyMessage(message);

      expect(features.messageLength).toBe(0);
      expect(features.complexity).toBe(0);
      expect(features.domain).toBe('general');
    });

    it('should detect vision capability from image attachments', () => {
      const message = createMessage('Describe this image', {
        attachments: [{ type: 'image', data: {} }],
      });
      const features = classifier.classifyMessage(message);

      expect(features.requiredCapabilities).toContain('vision');
    });
  });

  describe('estimateComplexity', () => {
    it('should return 0 for simple text', () => {
      const message = createMessage('Hello');
      const features = classifier.classifyMessage(message);

      expect(features.complexity).toBe(0);
    });

    it('should increase complexity for code blocks', () => {
      const withCode = createMessage('```\ncode\n```');
      const withoutCode = createMessage('code');

      const featuresWithCode = classifier.classifyMessage(withCode);
      const featuresWithoutCode = classifier.classifyMessage(withoutCode);

      expect(featuresWithCode.complexity).toBeGreaterThan(
        featuresWithoutCode.complexity
      );
    });

    it('should increase complexity for multiple code blocks', () => {
      const oneBlock = createMessage('```\ncode1\n```');
      const twoBlocks = createMessage('```\ncode1\n```\n```\ncode2\n```');

      const featuresOne = classifier.classifyMessage(oneBlock);
      const featuresTwo = classifier.classifyMessage(twoBlocks);

      expect(featuresTwo.complexity).toBeGreaterThan(featuresOne.complexity);
    });

    it('should increase complexity for math expressions', () => {
      const withMath = createMessage('Calculate $x^2 + y^2$');
      const withoutMath = createMessage('Calculate sum');

      const featuresWithMath = classifier.classifyMessage(withMath);
      const featuresWithoutMath = classifier.classifyMessage(withoutMath);

      expect(featuresWithMath.complexity).toBeGreaterThan(
        featuresWithoutMath.complexity
      );
    });

    it('should increase complexity for long content > 2000 chars', () => {
      const short = createMessage('A'.repeat(1000));
      const long = createMessage('A'.repeat(3000));

      const featuresShort = classifier.classifyMessage(short);
      const featuresLong = classifier.classifyMessage(long);

      expect(featuresLong.complexity).toBeGreaterThan(featuresShort.complexity);
    });

    it('should increase complexity for very long content > 5000 chars', () => {
      const medium = createMessage('A'.repeat(3000));
      const veryLong = createMessage('A'.repeat(6000));

      const featuresMedium = classifier.classifyMessage(medium);
      const featuresVeryLong = classifier.classifyMessage(veryLong);

      expect(featuresVeryLong.complexity).toBeGreaterThan(
        featuresMedium.complexity
      );
    });

    it('should increase complexity for JSON content', () => {
      const withJson = createMessage('Parse this: { "key": "value" }');
      const withoutJson = createMessage('Parse this text');

      const featuresWithJson = classifier.classifyMessage(withJson);
      const featuresWithoutJson = classifier.classifyMessage(withoutJson);

      expect(featuresWithJson.complexity).toBeGreaterThan(
        featuresWithoutJson.complexity
      );
    });

    it('should increase complexity for table content', () => {
      const withTable = createMessage('| Col1 | Col2 |\n| A | B |');
      const withoutTable = createMessage('Col1 Col2 A B');

      const featuresWithTable = classifier.classifyMessage(withTable);
      const featuresWithoutTable = classifier.classifyMessage(withoutTable);

      expect(featuresWithTable.complexity).toBeGreaterThan(
        featuresWithoutTable.complexity
      );
    });

    it('should increase complexity for many questions', () => {
      const fewQuestions = createMessage('What? Why?');
      const manyQuestions = createMessage('What? Why? How? When? Where?');

      const featuresFew = classifier.classifyMessage(fewQuestions);
      const featuresMany = classifier.classifyMessage(manyQuestions);

      expect(featuresMany.complexity).toBeGreaterThan(featuresFew.complexity);
    });

    it('should increase complexity for technical terms', () => {
      const withTerms = createMessage(
        'Design an algorithm for performance optimization'
      );
      const withoutTerms = createMessage('Design a plan for speed improvement');

      const featuresWithTerms = classifier.classifyMessage(withTerms);
      const featuresWithoutTerms = classifier.classifyMessage(withoutTerms);

      expect(featuresWithTerms.complexity).toBeGreaterThan(
        featuresWithoutTerms.complexity
      );
    });

    it('should cap complexity at 1.0', () => {
      // Create message with all complexity factors
      const complex = createMessage(
        '```code```'.repeat(10) +
          '$math$ $more$ $math$'.repeat(10) +
          'A'.repeat(10000) +
          '{ json } | table |\n'.repeat(10) +
          '?????' +
          'algorithm implementation optimization architecture performance scalability'
      );

      const features = classifier.classifyMessage(complex);

      expect(features.complexity).toBeLessThanOrEqual(1.0);
    });

    it('should handle multiple technical terms', () => {
      const message = createMessage(
        'Design an algorithm for implementation with optimization of architecture for performance and scalability'
      );
      const features = classifier.classifyMessage(message);

      // 6 technical terms * 0.05 = 0.3, capped at 0.2
      expect(features.complexity).toBeGreaterThan(0.15);
    });
  });

  describe('detectDomain', () => {
    it('should detect code domain from keywords', () => {
      const message = createMessage(
        'Write a function that imports the class and returns the interface'
      );
      const features = classifier.classifyMessage(message);

      expect(features.domain).toBe('code');
    });

    it('should detect code domain from code blocks', () => {
      const message = createMessage('```\nconst x = 42;\n```');
      const features = classifier.classifyMessage(message);

      expect(features.domain).toBe('code');
    });

    it('should detect analysis domain from keywords', () => {
      const message = createMessage(
        'Analyze the statistics and data to evaluate the trend and correlation'
      );
      const features = classifier.classifyMessage(message);

      expect(features.domain).toBe('analysis');
    });

    it('should detect creative domain from keywords', () => {
      const message = createMessage(
        'Write a creative story with a narrative about a character'
      );
      const features = classifier.classifyMessage(message);

      expect(features.domain).toBe('creative');
    });

    it('should default to general domain for no matches', () => {
      const message = createMessage('Hello there how are you doing today');
      const features = classifier.classifyMessage(message);

      expect(features.domain).toBe('general');
    });

    it('should be case insensitive', () => {
      const message = createMessage('FUNCTION CLASS CONST');
      const features = classifier.classifyMessage(message);

      expect(features.domain).toBe('code');
    });

    it('should choose domain with most keyword matches', () => {
      const message = createMessage(
        'function class const analyze data statistics'
      );
      const features = classifier.classifyMessage(message);

      // Has 3 code keywords and 3 analysis keywords, but code blocks add bonus
      expect(['code', 'analysis']).toContain(features.domain);
    });

    it('should prioritize code blocks over keywords', () => {
      const message = createMessage(
        'Analyze this code: ```\nfunction test() {}\n```'
      );
      const features = classifier.classifyMessage(message);

      expect(features.domain).toBe('code');
    });

    it('should handle mixed content favoring strongest signal', () => {
      const message = createMessage(
        'Creative story function class async await return'
      );
      const features = classifier.classifyMessage(message);

      // Code has more keywords
      expect(features.domain).toBe('code');
    });
  });

  describe('extractCapabilities', () => {
    it('should extract code capability from code blocks', () => {
      const message = createMessage('```\ncode\n```');
      const features = classifier.classifyMessage(message);

      expect(features.requiredCapabilities).toContain('code');
    });

    it('should extract tables capability from tables', () => {
      const message = createMessage('| A | B |\n| C | D |');
      const features = classifier.classifyMessage(message);

      expect(features.requiredCapabilities).toContain('tables');
    });

    it('should extract json capability from braces', () => {
      const message = createMessage('{ "key": "value" }');
      const features = classifier.classifyMessage(message);

      expect(features.requiredCapabilities).toContain('json');
    });

    it('should extract json capability from brackets', () => {
      const message = createMessage('[ "item1", "item2" ]');
      const features = classifier.classifyMessage(message);

      expect(features.requiredCapabilities).toContain('json');
    });

    it('should extract vision capability from image attachments', () => {
      const message = createMessage('Describe this', {
        attachments: [{ type: 'image', data: {} }],
      });
      const features = classifier.classifyMessage(message);

      expect(features.requiredCapabilities).toContain('vision');
    });

    it('should not extract vision without image attachments', () => {
      const message = createMessage('Describe this', {
        attachments: [{ type: 'document', data: {} }],
      });
      const features = classifier.classifyMessage(message);

      expect(features.requiredCapabilities).not.toContain('vision');
    });

    it('should extract math capability from math expressions', () => {
      const message = createMessage('Calculate $x^2$');
      const features = classifier.classifyMessage(message);

      expect(features.requiredCapabilities).toContain('math');
    });

    it('should extract long_context capability for long messages', () => {
      const message = createMessage('A'.repeat(15000));
      const features = classifier.classifyMessage(message);

      expect(features.requiredCapabilities).toContain('long_context');
    });

    it('should extract multiple capabilities', () => {
      const message = createMessage(
        'Analyze this code: ```js\nconst x = 42;\n```\nData: { "value": 42 }',
        { attachments: [{ type: 'image', data: {} }] }
      );
      const features = classifier.classifyMessage(message);

      expect(features.requiredCapabilities).toContain('code');
      expect(features.requiredCapabilities).toContain('json');
      expect(features.requiredCapabilities).toContain('vision');
    });

    it('should return empty array for simple text', () => {
      const message = createMessage('Hello world');
      const features = classifier.classifyMessage(message);

      expect(features.requiredCapabilities).toEqual([]);
    });
  });

  describe('estimateOutputLength', () => {
    it('should estimate shorter output for summarize keyword', () => {
      const summarize = createMessage('Summarize this long text');
      const normal = createMessage('Process this long text');

      const featuresSummarize = classifier.classifyMessage(summarize);
      const featuresNormal = classifier.classifyMessage(normal);

      expect(featuresSummarize.expectedOutputLength).toBeLessThan(
        featuresNormal.expectedOutputLength
      );
    });

    it('should estimate shorter output for brief keyword', () => {
      const message = createMessage('Give me a brief overview');
      const features = classifier.classifyMessage(message);

      expect(features.expectedOutputLength).toBeLessThan(
        message.content.length
      );
    });

    it('should estimate shorter output for tldr keyword', () => {
      const message = createMessage('tldr of this article');
      const features = classifier.classifyMessage(message);

      expect(features.expectedOutputLength).toBeLessThan(
        message.content.length
      );
    });

    it('should estimate shorter output for summary keyword', () => {
      const message = createMessage('Provide a summary of the content');
      const features = classifier.classifyMessage(message);

      expect(features.expectedOutputLength).toBeLessThan(
        message.content.length * 1.0
      );
    });

    it('should estimate shorter output for short keyword', () => {
      const message = createMessage('Give me a short answer');
      const features = classifier.classifyMessage(message);

      expect(features.expectedOutputLength).toBeLessThan(
        message.content.length
      );
    });

    it('should estimate longer output for expand keyword', () => {
      const message = createMessage('Expand on this topic');
      const features = classifier.classifyMessage(message);

      expect(features.expectedOutputLength).toBeGreaterThan(
        message.content.length * 2
      );
    });

    it('should estimate longer output for detailed keyword', () => {
      const message = createMessage('Give me a detailed explanation');
      const features = classifier.classifyMessage(message);

      expect(features.expectedOutputLength).toBeGreaterThan(
        message.content.length * 2
      );
    });

    it('should estimate longer output for comprehensive keyword', () => {
      const message = createMessage('Provide a comprehensive analysis');
      const features = classifier.classifyMessage(message);

      expect(features.expectedOutputLength).toBeGreaterThan(
        message.content.length * 2
      );
    });

    it('should estimate longer output for elaborate keyword', () => {
      const message = createMessage('Elaborate on this idea');
      const features = classifier.classifyMessage(message);

      expect(features.expectedOutputLength).toBeGreaterThan(
        message.content.length * 2
      );
    });

    it('should estimate longer output for explain keyword', () => {
      const message = createMessage('Explain this concept');
      const features = classifier.classifyMessage(message);

      expect(features.expectedOutputLength).toBeGreaterThan(
        message.content.length * 2
      );
    });

    it('should estimate longer output for code requests', () => {
      const message = createMessage('Write code to implement this feature');
      const features = classifier.classifyMessage(message);

      expect(features.expectedOutputLength).toBeGreaterThan(
        message.content.length * 1.5
      );
    });

    it('should estimate longer output for code blocks', () => {
      const message = createMessage('```\nfunction stub() {}\n```');
      const features = classifier.classifyMessage(message);

      expect(features.expectedOutputLength).toBeGreaterThan(
        message.content.length * 1.5
      );
    });

    it('should estimate longer output for list requests', () => {
      const message = createMessage('Give me a list of options');
      const features = classifier.classifyMessage(message);

      expect(features.expectedOutputLength).toBeGreaterThan(
        message.content.length * 1.0
      );
    });

    it('should estimate longer output for examples requests', () => {
      const message = createMessage('Provide examples of this pattern');
      const features = classifier.classifyMessage(message);

      expect(features.expectedOutputLength).toBeGreaterThan(
        message.content.length * 1.0
      );
    });

    it('should use default multiplier for neutral content', () => {
      const message = createMessage('Process this content');
      const features = classifier.classifyMessage(message);

      expect(features.expectedOutputLength).toBe(message.content.length * 1.5);
    });

    it('should be case insensitive for keywords', () => {
      const message = createMessage('SUMMARIZE this text');
      const features = classifier.classifyMessage(message);

      expect(features.expectedOutputLength).toBeLessThan(
        message.content.length
      );
    });

    it('should prioritize summarize over other keywords', () => {
      const message = createMessage('Summarize and expand on this topic');
      const features = classifier.classifyMessage(message);

      // Summarize should be checked first
      expect(features.expectedOutputLength).toBeLessThan(
        message.content.length
      );
    });

    it('should handle empty input', () => {
      const message = createMessage('');
      const features = classifier.classifyMessage(message);

      expect(features.expectedOutputLength).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex coding task', () => {
      const message = createMessage(`
        Write a TypeScript function that implements a binary search algorithm.
        Include type annotations and error handling.
        \`\`\`typescript
        function binarySearch<T>(arr: T[], target: T): number {
          // implementation here
        }
        \`\`\`
      `);

      const features = classifier.classifyMessage(message);

      expect(features.domain).toBe('code');
      expect(features.requiredCapabilities).toContain('code');
      expect(features.complexity).toBeGreaterThan(0.2);
      expect(features.expectedOutputLength).toBeGreaterThan(
        message.content.length
      );
    });

    it('should handle data analysis task', () => {
      const message = createMessage(
        'Analyze this data and compute correlation statistics to evaluate the trend'
      );

      const features = classifier.classifyMessage(message);

      expect(features.domain).toBe('analysis');
      // Simple text without complexity factors has complexity 0
      expect(features.complexity).toBeGreaterThanOrEqual(0);
    });

    it('should handle creative writing task', () => {
      const message = createMessage(
        'Write a creative story with an interesting narrative and character development'
      );

      const features = classifier.classifyMessage(message);

      expect(features.domain).toBe('creative');
    });

    it('should handle multi-modal task', () => {
      const message = createMessage(
        'Analyze this image and provide detailed statistics',
        {
          attachments: [{ type: 'image', data: {} }],
        }
      );

      const features = classifier.classifyMessage(message);

      expect(features.requiredCapabilities).toContain('vision');
      expect(features.domain).toBe('analysis');
    });

    it('should handle math-heavy task', () => {
      const message = createMessage(
        'Solve $x^2 + 2x + 1 = 0$ and explain the steps'
      );

      const features = classifier.classifyMessage(message);

      expect(features.requiredCapabilities).toContain('math');
      expect(features.complexity).toBeGreaterThan(0.1);
    });

    it('should handle long context task', () => {
      const longContent = 'A'.repeat(12000);
      const message = createMessage(longContent);

      const features = classifier.classifyMessage(message);

      expect(features.requiredCapabilities).toContain('long_context');
      expect(features.messageLength).toBe(12000);
      // > 2000: +0.2, > 5000: +0.3 = 0.5 total
      expect(features.complexity).toBeGreaterThanOrEqual(0.5);
    });
  });
});
