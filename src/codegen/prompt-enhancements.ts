/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Prompt Generator Enhancements
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Enhanced features for system prompt generation:
 * - Multi-language support
 * - Token counting and optimization
 * - Enhanced merge instructions
 *
 * @packageDocumentation
 * @module @pcl/codegen/enhancements
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
//                              MULTI-LANGUAGE SUPPORT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Supported languages for prompt generation
 */
export type PromptLanguage =
  | 'en' // English (default)
  | 'fr' // French
  | 'es' // Spanish
  | 'de' // German
  | 'it' // Italian
  | 'pt' // Portuguese
  | 'ja' // Japanese
  | 'zh' // Chinese
  | 'ko' // Korean
  | 'ru' // Russian
  | 'ar'; // Arabic

/**
 * Localized strings for prompt generation
 */
export interface PromptLocalizations {
  // Section headers
  identity: string;
  expertise: string;
  guidelines: string;
  style: string;
  capabilities: string;
  context: string;

  // Team headers
  teamMembers: string;
  collaborationMode: string;
  collaborationInstructions: string;
  primaryLead: string;
  quorum: string;

  // Merge instructions
  mergeInstructions: Record<string, string>;

  // Common terms
  tone: string;
  verbosity: string;
  depth: string;
  tags: string;
}

/**
 * Localization database
 */
const LOCALIZATIONS: Record<PromptLanguage, PromptLocalizations> = {
  en: {
    identity: 'IDENTITY & PURPOSE',
    expertise: 'EXPERTISE & SKILLS',
    guidelines: 'CONSTRAINTS & GUIDELINES',
    style: 'COMMUNICATION STYLE',
    capabilities: 'CAPABILITIES',
    context: 'CONTEXT TAGS',
    teamMembers: 'TEAM MEMBERS',
    collaborationMode: 'COLLABORATION MODE',
    collaborationInstructions: 'COLLABORATION INSTRUCTIONS',
    primaryLead: 'Primary Lead',
    quorum: 'Quorum',
    tone: 'Tone',
    verbosity: 'Verbosity',
    depth: 'Depth',
    tags: 'Tags',
    mergeInstructions: {
      primary:
        'The primary lead makes final decisions. Other members provide input and suggestions.',
      consensus:
        'All team members must reach agreement. Discuss until consensus is achieved.',
      majority:
        'Decisions are made by majority vote. Each member has equal weight.',
      debate:
        'Members should present different perspectives. Explore pros and cons thoroughly.',
      append:
        'Each member contributes their unique perspective. All contributions are included.',
      weighted:
        'Members have different influence weights. Higher-weighted opinions carry more impact.',
      chain:
        "Process sequentially. Each member builds on the previous member's output.",
    },
  },

  fr: {
    identity: 'IDENTITÉ ET OBJECTIF',
    expertise: 'EXPERTISE ET COMPÉTENCES',
    guidelines: 'CONTRAINTES ET DIRECTIVES',
    style: 'STYLE DE COMMUNICATION',
    capabilities: 'CAPACITÉS',
    context: 'BALISES DE CONTEXTE',
    teamMembers: "MEMBRES DE L'ÉQUIPE",
    collaborationMode: 'MODE DE COLLABORATION',
    collaborationInstructions: 'INSTRUCTIONS DE COLLABORATION',
    primaryLead: 'Leader Principal',
    quorum: 'Quorum',
    tone: 'Ton',
    verbosity: 'Verbosité',
    depth: 'Profondeur',
    tags: 'Balises',
    mergeInstructions: {
      primary:
        'Le leader principal prend les décisions finales. Les autres membres fournissent des suggestions.',
      consensus:
        "Tous les membres doivent parvenir à un accord. Discutez jusqu'à ce qu'un consensus soit atteint.",
      majority:
        'Les décisions sont prises par vote majoritaire. Chaque membre a un poids égal.',
      debate:
        'Les membres doivent présenter différentes perspectives. Explorez les avantages et les inconvénients en profondeur.',
      append:
        'Chaque membre apporte sa perspective unique. Toutes les contributions sont incluses.',
      weighted:
        "Les membres ont des poids d'influence différents. Les opinions pondérées ont plus d'impact.",
      chain:
        "Traiter séquentiellement. Chaque membre s'appuie sur la sortie du membre précédent.",
    },
  },

  es: {
    identity: 'IDENTIDAD Y PROPÓSITO',
    expertise: 'EXPERIENCIA Y HABILIDADES',
    guidelines: 'RESTRICCIONES Y PAUTAS',
    style: 'ESTILO DE COMUNICACIÓN',
    capabilities: 'CAPACIDADES',
    context: 'ETIQUETAS DE CONTEXTO',
    teamMembers: 'MIEMBROS DEL EQUIPO',
    collaborationMode: 'MODO DE COLABORACIÓN',
    collaborationInstructions: 'INSTRUCCIONES DE COLABORACIÓN',
    primaryLead: 'Líder Principal',
    quorum: 'Quórum',
    tone: 'Tono',
    verbosity: 'Verbosidad',
    depth: 'Profundidad',
    tags: 'Etiquetas',
    mergeInstructions: {
      primary:
        'El líder principal toma las decisiones finales. Otros miembros proporcionan sugerencias.',
      consensus:
        'Todos los miembros deben llegar a un acuerdo. Discuta hasta que se logre un consenso.',
      majority:
        'Las decisiones se toman por votación mayoritaria. Cada miembro tiene igual peso.',
      debate:
        'Los miembros deben presentar diferentes perspectivas. Explore a fondo pros y contras.',
      append:
        'Cada miembro aporta su perspectiva única. Todas las contribuciones están incluidas.',
      weighted:
        'Los miembros tienen diferentes pesos de influencia. Las opiniones ponderadas tienen más impacto.',
      chain:
        'Procesar secuencialmente. Cada miembro se basa en la salida del miembro anterior.',
    },
  },

  de: {
    identity: 'IDENTITÄT UND ZWECK',
    expertise: 'EXPERTISE UND FÄHIGKEITEN',
    guidelines: 'EINSCHRÄNKUNGEN UND RICHTLINIEN',
    style: 'KOMMUNIKATIONSSTIL',
    capabilities: 'FÄHIGKEITEN',
    context: 'KONTEXT-TAGS',
    teamMembers: 'TEAMMITGLIEDER',
    collaborationMode: 'KOLLABORATIONSMODUS',
    collaborationInstructions: 'KOLLABORATIONSANWEISUNGEN',
    primaryLead: 'Hauptverantwortlicher',
    quorum: 'Quorum',
    tone: 'Ton',
    verbosity: 'Ausführlichkeit',
    depth: 'Tiefe',
    tags: 'Tags',
    mergeInstructions: {
      primary:
        'Der Hauptverantwortliche trifft die endgültigen Entscheidungen. Andere Mitglieder geben Vorschläge.',
      consensus:
        'Alle Teammitglieder müssen eine Einigung erzielen. Diskutieren Sie bis ein Konsens erreicht ist.',
      majority:
        'Entscheidungen werden per Mehrheitsbeschluss getroffen. Jedes Mitglied hat gleiches Gewicht.',
      debate:
        'Mitglieder sollten verschiedene Perspektiven präsentieren. Erkunden Sie Vor- und Nachteile gründlich.',
      append:
        'Jedes Mitglied trägt seine einzigartige Perspektive bei. Alle Beiträge sind enthalten.',
      weighted:
        'Mitglieder haben unterschiedliche Einflussgewichte. Höher gewichtete Meinungen haben mehr Einfluss.',
      chain:
        'Sequenziell verarbeiten. Jedes Mitglied baut auf der Ausgabe des vorherigen Mitglieds auf.',
    },
  },

  it: {
    identity: 'IDENTITÀ E SCOPO',
    expertise: 'COMPETENZA E ABILITÀ',
    guidelines: 'VINCOLI E LINEE GUIDA',
    style: 'STILE DI COMUNICAZIONE',
    capabilities: 'CAPACITÀ',
    context: 'TAG DI CONTESTO',
    teamMembers: 'MEMBRI DEL TEAM',
    collaborationMode: 'MODALITÀ DI COLLABORAZIONE',
    collaborationInstructions: 'ISTRUZIONI DI COLLABORAZIONE',
    primaryLead: 'Leader Principale',
    quorum: 'Quorum',
    tone: 'Tono',
    verbosity: 'Verbosità',
    depth: 'Profondità',
    tags: 'Tag',
    mergeInstructions: {
      primary:
        'Il leader principale prende le decisioni finali. Altri membri forniscono suggerimenti.',
      consensus:
        'Tutti i membri del team devono raggiungere un accordo. Discutere fino al raggiungimento del consenso.',
      majority:
        'Le decisioni sono prese a maggioranza. Ogni membro ha peso uguale.',
      debate:
        'I membri dovrebbero presentare diverse prospettive. Esplora a fondo pro e contro.',
      append:
        'Ogni membro contribuisce con la propria prospettiva unica. Tutti i contributi sono inclusi.',
      weighted:
        'I membri hanno pesi di influenza diversi. Le opinioni ponderate hanno più impatto.',
      chain:
        "Elaborare sequenzialmente. Ogni membro si basa sull'output del membro precedente.",
    },
  },

  pt: {
    identity: 'IDENTIDADE E PROPÓSITO',
    expertise: 'EXPERTISE E HABILIDADES',
    guidelines: 'RESTRIÇÕES E DIRETRIZES',
    style: 'ESTILO DE COMUNICAÇÃO',
    capabilities: 'CAPACIDADES',
    context: 'TAGS DE CONTEXTO',
    teamMembers: 'MEMBROS DA EQUIPE',
    collaborationMode: 'MODO DE COLABORAÇÃO',
    collaborationInstructions: 'INSTRUÇÕES DE COLABORAÇÃO',
    primaryLead: 'Líder Principal',
    quorum: 'Quórum',
    tone: 'Tom',
    verbosity: 'Verbosidade',
    depth: 'Profundidade',
    tags: 'Tags',
    mergeInstructions: {
      primary:
        'O líder principal toma as decisões finais. Outros membros fornecem sugestões.',
      consensus:
        'Todos os membros da equipe devem chegar a um acordo. Discuta até que o consenso seja alcançado.',
      majority:
        'As decisões são tomadas por voto majoritário. Cada membro tem peso igual.',
      debate:
        'Os membros devem apresentar diferentes perspectivas. Explore prós e contras minuciosamente.',
      append:
        'Cada membro contribui com sua perspectiva única. Todas as contribuições estão incluídas.',
      weighted:
        'Os membros têm pesos de influência diferentes. Opiniões ponderadas têm mais impacto.',
      chain:
        'Processar sequencialmente. Cada membro se baseia na saída do membro anterior.',
    },
  },

  ja: {
    identity: 'アイデンティティと目的',
    expertise: '専門知識とスキル',
    guidelines: '制約とガイドライン',
    style: 'コミュニケーションスタイル',
    capabilities: '機能',
    context: 'コンテキストタグ',
    teamMembers: 'チームメンバー',
    collaborationMode: 'コラボレーションモード',
    collaborationInstructions: 'コラボレーション指示',
    primaryLead: '主要リーダー',
    quorum: '定足数',
    tone: 'トーン',
    verbosity: '冗長性',
    depth: '深さ',
    tags: 'タグ',
    mergeInstructions: {
      primary:
        '主要リーダーが最終決定を行います。他のメンバーは提案を提供します。',
      consensus:
        'すべてのチームメンバーが合意に達する必要があります。コンセンサスが達成されるまで議論してください。',
      majority:
        '決定は多数決によって行われます。各メンバーは同等の重みを持ちます。',
      debate:
        'メンバーは異なる視点を提示する必要があります。長所と短所を徹底的に探求してください。',
      append: '各メンバーは独自の視点を提供します。すべての貢献が含まれます。',
      weighted:
        'メンバーは異なる影響力の重みを持っています。より重み付けされた意見はより大きな影響を与えます。',
      chain:
        '順次処理します。各メンバーは前のメンバーの出力に基づいて構築します。',
    },
  },

  zh: {
    identity: '身份和目的',
    expertise: '专业知识和技能',
    guidelines: '约束和指南',
    style: '沟通风格',
    capabilities: '能力',
    context: '上下文标签',
    teamMembers: '团队成员',
    collaborationMode: '协作模式',
    collaborationInstructions: '协作说明',
    primaryLead: '主要负责人',
    quorum: '法定人数',
    tone: '语气',
    verbosity: '冗长度',
    depth: '深度',
    tags: '标签',
    mergeInstructions: {
      primary: '主要负责人做出最终决定。其他成员提供建议。',
      consensus: '所有团队成员必须达成一致。讨论直到达成共识。',
      majority: '决策通过多数投票做出。每个成员权重相等。',
      debate: '成员应提出不同的观点。彻底探讨利弊。',
      append: '每个成员贡献其独特的观点。包括所有贡献。',
      weighted: '成员具有不同的影响权重。权重更高的意见影响更大。',
      chain: '依次处理。每个成员基于前一个成员的输出构建。',
    },
  },

  ko: {
    identity: '정체성 및 목적',
    expertise: '전문 지식 및 기술',
    guidelines: '제약 및 가이드라인',
    style: '커뮤니케이션 스타일',
    capabilities: '능력',
    context: '컨텍스트 태그',
    teamMembers: '팀 구성원',
    collaborationMode: '협업 모드',
    collaborationInstructions: '협업 지침',
    primaryLead: '주요 리더',
    quorum: '정족수',
    tone: '톤',
    verbosity: '자세함',
    depth: '깊이',
    tags: '태그',
    mergeInstructions: {
      primary:
        '주요 리더가 최종 결정을 내립니다. 다른 구성원은 제안을 제공합니다.',
      consensus:
        '모든 팀 구성원이 합의에 도달해야 합니다. 합의가 이루어질 때까지 논의하세요.',
      majority: '다수결로 결정합니다. 각 구성원은 동등한 가중치를 갖습니다.',
      debate:
        '구성원은 다른 관점을 제시해야 합니다. 장단점을 철저히 탐구하세요.',
      append: '각 구성원은 고유한 관점을 제공합니다. 모든 기여가 포함됩니다.',
      weighted:
        '구성원은 서로 다른 영향 가중치를 갖습니다. 더 높은 가중치의 의견이 더 큰 영향을 미칩니다.',
      chain:
        '순차적으로 처리합니다. 각 구성원은 이전 구성원의 출력을 기반으로 빌드합니다.',
    },
  },

  ru: {
    identity: 'ИДЕНТИЧНОСТЬ И ЦЕЛЬ',
    expertise: 'ЭКСПЕРТИЗА И НАВЫКИ',
    guidelines: 'ОГРАНИЧЕНИЯ И РЕКОМЕНДАЦИИ',
    style: 'СТИЛЬ ОБЩЕНИЯ',
    capabilities: 'ВОЗМОЖНОСТИ',
    context: 'ТЕГИ КОНТЕКСТА',
    teamMembers: 'ЧЛЕНЫ КОМАНДЫ',
    collaborationMode: 'РЕЖИМ СОТРУДНИЧЕСТВА',
    collaborationInstructions: 'ИНСТРУКЦИИ ПО СОТРУДНИЧЕСТВУ',
    primaryLead: 'Главный руководитель',
    quorum: 'Кворум',
    tone: 'Тон',
    verbosity: 'Подробность',
    depth: 'Глубина',
    tags: 'Теги',
    mergeInstructions: {
      primary:
        'Главный руководитель принимает окончательные решения. Другие члены предоставляют предложения.',
      consensus:
        'Все члены команды должны прийти к соглашению. Обсуждайте, пока не будет достигнут консенсус.',
      majority:
        'Решения принимаются большинством голосов. Каждый член имеет равный вес.',
      debate:
        'Члены должны представлять разные точки зрения. Тщательно изучите плюсы и минусы.',
      append:
        'Каждый член вносит свою уникальную перспективу. Включены все вклады.',
      weighted:
        'Члены имеют разные веса влияния. Взвешенные мнения имеют больше влияния.',
      chain:
        'Обрабатывать последовательно. Каждый член строит на основе выхода предыдущего члена.',
    },
  },

  ar: {
    identity: 'الهوية والغرض',
    expertise: 'الخبرة والمهارات',
    guidelines: 'القيود والإرشادات',
    style: 'أسلوب التواصل',
    capabilities: 'القدرات',
    context: 'علامات السياق',
    teamMembers: 'أعضاء الفريق',
    collaborationMode: 'وضع التعاون',
    collaborationInstructions: 'تعليمات التعاون',
    primaryLead: 'القائد الرئيسي',
    quorum: 'النصاب',
    tone: 'النبرة',
    verbosity: 'الإسهاب',
    depth: 'العمق',
    tags: 'العلامات',
    mergeInstructions: {
      primary:
        'القائد الرئيسي يتخذ القرارات النهائية. الأعضاء الآخرون يقدمون الاقتراحات.',
      consensus:
        'يجب على جميع أعضاء الفريق التوصل إلى اتفاق. ناقش حتى يتم التوصل إلى توافق.',
      majority: 'تُتخذ القرارات بالأغلبية. كل عضو له وزن متساوٍ.',
      debate:
        'يجب على الأعضاء تقديم وجهات نظر مختلفة. استكشف الإيجابيات والسلبيات بشكل شامل.',
      append: 'يساهم كل عضو بمنظوره الفريد. جميع المساهمات مضمنة.',
      weighted:
        'الأعضاء لديهم أوزان تأثير مختلفة. الآراء ذات الوزن الأعلى لها تأثير أكبر.',
      chain: 'معالجة بشكل متسلسل. كل عضو يبني على مخرجات العضو السابق.',
    },
  },
};

/**
 * Get localized strings for a language
 *
 * @param language - Target language (defaults to 'en')
 * @returns Localized strings
 *
 * @example
 * ```typescript
 * const loc = getLocalizations('fr');
 * console.log(loc.identity); // "IDENTITÉ ET OBJECTIF"
 * ```
 */
export function getLocalizations(
  language: PromptLanguage = 'en'
): PromptLocalizations {
  return LOCALIZATIONS[language] || LOCALIZATIONS.en;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              TOKEN COUNTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Token counter configuration
 */
export interface TokenCounterConfig {
  /** Encoding method (affects token count) */
  encoding?: 'cl100k_base' | 'p50k_base' | 'gpt2';
  /** Provider-specific adjustments */
  provider?: 'claude' | 'openai' | 'gemini' | 'generic';
}

/**
 * Token count result
 */
export interface TokenCount {
  /** Total token count */
  total: number;
  /** Breakdown by section */
  sections?: Record<string, number>;
  /** Estimated cost (if provider specified) */
  estimatedCost?: number;
}

/**
 * Estimate token count for text
 *
 * Uses a simple approximation:
 * - ~4 characters per token (English)
 * - ~2 characters per token (CJK languages)
 *
 * For precise counting, integrate with tiktoken or similar library.
 *
 * @param text - Text to count
 * @param config - Counter configuration
 * @returns Token count estimate
 *
 * @example
 * ```typescript
 * const prompt = generatePrompt(persona);
 * const count = estimateTokenCount(prompt);
 * console.log(`Estimated tokens: ${count.total}`);
 * ```
 */
export function estimateTokenCount(
  text: string,
  config: TokenCounterConfig = {}
): TokenCount {
  // Detect language type
  const hasCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(
    text
  );

  // Base estimation
  const charsPerToken = hasCJK ? 2 : 4;
  const total = Math.ceil(text.length / charsPerToken);

  // Provider-specific cost estimation (per 1M tokens)
  const costPer1M: Record<string, number> = {
    claude: 3.0, // Claude 3 Sonnet
    openai: 0.5, // GPT-3.5
    gemini: 0.5, // Gemini Pro
    generic: 1.0,
  };

  const provider = config.provider || 'generic';
  const estimatedCost = (total / 1_000_000) * costPer1M[provider];

  return {
    total,
    estimatedCost,
  };
}

/**
 * Count tokens with section breakdown
 *
 * @param sections - Text sections to count
 * @param config - Counter configuration
 * @returns Token count with breakdown
 *
 * @example
 * ```typescript
 * const count = countTokensBySection({
 *   identity: identityText,
 *   skills: skillsText,
 *   guidelines: guidelinesText
 * });
 *
 * console.log(count.total); // Total tokens
 * console.log(count.sections); // { identity: 50, skills: 100, ... }
 * ```
 */
export function countTokensBySection(
  sections: Record<string, string>,
  config: TokenCounterConfig = {}
): TokenCount {
  const sectionCounts: Record<string, number> = {};
  let total = 0;

  for (const [name, text] of Object.entries(sections)) {
    const count = estimateTokenCount(text, config).total;
    sectionCounts[name] = count;
    total += count;
  }

  // Provider-specific cost estimation
  const costPer1M: Record<string, number> = {
    claude: 3.0,
    openai: 0.5,
    gemini: 0.5,
    generic: 1.0,
  };

  const provider = config.provider || 'generic';
  const estimatedCost = (total / 1_000_000) * costPer1M[provider];

  return {
    total,
    sections: sectionCounts,
    estimatedCost,
  };
}

/**
 * Optimize prompt to fit token budget
 *
 * @param text - Original prompt text
 * @param maxTokens - Maximum allowed tokens
 * @param config - Counter configuration
 * @returns Optimized text within budget
 *
 * @example
 * ```typescript
 * const optimized = optimizePromptLength(longPrompt, 2000);
 * console.log(`Reduced from ${longPrompt.length} to ${optimized.length} chars`);
 * ```
 */
export function optimizePromptLength(
  text: string,
  maxTokens: number,
  config: TokenCounterConfig = {}
): string {
  const current = estimateTokenCount(text, config).total;

  if (current <= maxTokens) {
    return text;
  }

  // Simple truncation based on ratio
  const ratio = maxTokens / current;
  const targetLength = Math.floor(text.length * ratio * 0.95); // 5% buffer

  // Try to truncate at sentence boundary
  const truncated = text.substring(0, targetLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastNewline = truncated.lastIndexOf('\n');
  const cutPoint = Math.max(lastPeriod, lastNewline);

  if (cutPoint > targetLength * 0.8) {
    return text.substring(0, cutPoint + 1);
  }

  return truncated + '...';
}
