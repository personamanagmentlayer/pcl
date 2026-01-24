/**
 * Task classification for learned routing
 * Part of Q2 2025 Adaptive Intelligence - Phase 4
 */

import type { TaskFeatures, RoutingMessage } from './types.js';

/**
 * Classifies tasks for optimal provider selection
 */
export class TaskClassifier {
  /**
   * Classify a message to extract task features
   */
  classifyMessage(message: RoutingMessage): TaskFeatures {
    const content = message.content;

    return {
      messageLength: content.length,
      complexity: this.estimateComplexity(content),
      domain: this.detectDomain(content),
      requiredCapabilities: this.extractCapabilities(content, message.metadata),
      expectedOutputLength: this.estimateOutputLength(content),
      latencySensitivity: message.metadata?.latencySensitivity || 0.5,
      costSensitivity: message.metadata?.costSensitivity || 0.5,
    };
  }

  /**
   * Estimate task complexity
   */
  private estimateComplexity(content: string): number {
    let score = 0;

    // Code blocks increase complexity
    const codeBlocks = (content.match(/```/g) || []).length / 2;
    score += codeBlocks * 0.2;

    // Math expressions increase complexity
    const mathPatterns =
      content.match(/\$.*?\$|\\\(.*?\\\)|\\\[.*?\\\]/g) || [];
    score += mathPatterns.length * 0.15;

    // Long content increases complexity
    if (content.length > 2000) score += 0.2;
    if (content.length > 5000) score += 0.3;

    // Structured data (JSON, tables)
    if (content.includes('{') && content.includes('}')) score += 0.1;
    if (content.includes('|') && content.includes('\n')) score += 0.1;

    // Multiple questions/tasks
    const questionMarks = (content.match(/\?/g) || []).length;
    if (questionMarks > 3) score += 0.15;

    // Technical terms
    const technicalTerms = [
      'algorithm',
      'implementation',
      'optimization',
      'architecture',
      'performance',
      'scalability',
    ];
    const techCount = technicalTerms.filter((term) =>
      content.toLowerCase().includes(term)
    ).length;
    score += Math.min(0.2, techCount * 0.05);

    return Math.min(1, score);
  }

  /**
   * Detect domain from content
   */
  private detectDomain(
    content: string
  ): 'code' | 'analysis' | 'creative' | 'general' {
    const keywords = {
      code: [
        'function',
        'class',
        'const',
        'import',
        'export',
        'def',
        'public',
        'private',
        'async',
        'await',
        'return',
        'interface',
        'type',
      ],
      analysis: [
        'analyze',
        'data',
        'statistics',
        'trend',
        'correlation',
        'metric',
        'performance',
        'compare',
        'evaluate',
      ],
      creative: [
        'story',
        'poem',
        'creative',
        'imagine',
        'describe',
        'narrative',
        'character',
        'plot',
      ],
    };

    const scores: Record<string, number> = {
      code: 0,
      analysis: 0,
      creative: 0,
      general: 0,
    };

    const lowerContent = content.toLowerCase();

    // Count keyword matches
    for (const [domain, words] of Object.entries(keywords)) {
      scores[domain] = words.filter((w) => lowerContent.includes(w)).length;
    }

    // Check for code blocks
    if ((content.match(/```/g) || []).length >= 2) {
      scores.code += 5;
    }

    // Find domain with highest score
    const maxDomain = Object.entries(scores).reduce(
      (max, [domain, score]) => (score > max[1] ? [domain, score] : max),
      ['general', 0]
    );

    if (maxDomain[1] === 0) {
      return 'general';
    }

    return maxDomain[0] as 'code' | 'analysis' | 'creative' | 'general';
  }

  /**
   * Extract required capabilities
   */
  private extractCapabilities(content: string, metadata?: any): string[] {
    const caps: string[] = [];

    // Code capability
    if (content.includes('```')) {
      caps.push('code');
    }

    // Table capability
    if (content.includes('|') && content.includes('\n')) {
      caps.push('tables');
    }

    // JSON capability
    if (content.includes('{') || content.includes('[')) {
      caps.push('json');
    }

    // Vision capability (from attachments)
    if (metadata?.attachments?.some((a: any) => a.type === 'image')) {
      caps.push('vision');
    }

    // Math capability
    if (content.match(/\$.*?\$/)) {
      caps.push('math');
    }

    // Long context
    if (content.length > 10000) {
      caps.push('long_context');
    }

    return caps;
  }

  /**
   * Estimate expected output length
   */
  private estimateOutputLength(input: string): number {
    const inputLength = input.length;

    // Check for keywords indicating output length
    const summarizeKeywords = [
      'summarize',
      'brief',
      'tldr',
      'summary',
      'short',
    ];
    const expandKeywords = [
      'expand',
      'detailed',
      'comprehensive',
      'elaborate',
      'explain',
    ];

    const lowerInput = input.toLowerCase();

    if (summarizeKeywords.some((k) => lowerInput.includes(k))) {
      return inputLength * 0.3; // Shorter output
    }

    if (expandKeywords.some((k) => lowerInput.includes(k))) {
      return inputLength * 3; // Longer output
    }

    if (lowerInput.includes('code') || input.includes('```')) {
      return inputLength * 2; // Code tends to be longer
    }

    if (lowerInput.includes('list') || lowerInput.includes('examples')) {
      return inputLength * 1.5; // Lists are moderately longer
    }

    // Default assumption
    return inputLength * 1.5;
  }
}
