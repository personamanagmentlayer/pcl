/**
 * Demo of PCL Phase 2.3 - Memory & Context Features
 */

import { MemoryManager } from '../src/runtime/memory/index.js';

async function demoMemoryAndContext() {
  console.log('🚀 PCL v2.3 - Memory & Context Demo\n');

  // Create memory manager with default configuration
  const memoryManager = new MemoryManager({
    memory: {
      enabled: true,
      maxEntries: 1000,
      ttl: 0, // No expiration for demo
      persistToDisk: false, // In-memory for demo
      compressionEnabled: false,
      importanceDecay: true,
      decayRate: 0.95,
    },
    contextWindow: {
      maxTokens: 10000,
      compressionThreshold: 0.8,
      compressionRatio: 0.5,
      preserveRecent: 5,
      preserveImportant: 3,
      semanticDeduplication: true,
      deduplicationThreshold: 0.9,
    },
    knowledgeSharing: {
      enabled: true,
      maxEntries: 5000,
      ttl: 0, // No expiration for demo
      autoShare: true,
      shareThreshold: 0.8,
      relevanceScoring: true,
    },
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Demo 1: Long-Term Memory Storage
  // ═══════════════════════════════════════════════════════════════════════
  console.log('📚 Demo 1: Long-Term Memory Storage');
  console.log('─'.repeat(60));

  // Store some memories
  memoryManager.storeMemory({
    personaId: 'assistant',
    type: 'preference',
    content: 'User prefers TypeScript over JavaScript',
    importance: 0.9,
    tags: ['preference', 'language'],
    metadata: { source: 'conversation' },
  });

  memoryManager.storeMemory({
    personaId: 'assistant',
    type: 'fact',
    content: 'User is working on PCL project',
    importance: 0.85,
    tags: ['fact', 'project'],
    metadata: { source: 'context' },
  });

  console.log(`✅ Stored ${2} memories`);

  // Retrieve memories
  const memories = memoryManager.retrieveMemories({
    personaId: 'assistant',
    sortBy: 'importance',
    sortOrder: 'desc',
  });

  console.log(`📖 Retrieved ${memories.length} memories:`);
  memories.forEach((m, i) => {
    console.log(
      `  ${i + 1}. [${m.type}] ${m.content.substring(0, 50)}... (importance: ${m.importance.toFixed(2)})`
    );
  });

  // Get memory statistics
  const memStats = memoryManager.getMemoryStats('assistant');
  if (memStats) {
    console.log(`\n📊 Memory Stats:`);
    console.log(`  Total entries: ${memStats.totalEntries}`);
    console.log(`  Average importance: ${memStats.avgImportance.toFixed(2)}`);
  }

  console.log();

  // ═══════════════════════════════════════════════════════════════════════
  // Demo 2: Context Window Management
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🔄 Demo 2: Context Window Management');
  console.log('─'.repeat(60));

  // Simulate a conversation
  const messages = [
    { role: 'user' as const, content: 'What is PCL?', tokens: 4 },
    {
      role: 'assistant' as const,
      content: 'PCL is a domain-specific language for AI persona management',
      tokens: 12,
    },
    { role: 'user' as const, content: 'How do I define a persona?', tokens: 7 },
    {
      role: 'assistant' as const,
      content:
        'You can define a persona using the persona keyword in PCL syntax',
      tokens: 14,
    },
  ];

  for (const msg of messages) {
    memoryManager.addToContext({
      role: msg.role,
      content: msg.content,
      tokenCount: msg.tokens,
      metadata: {},
    });
  }

  const contextStats = memoryManager.getContextStats();
  console.log(`✅ Added ${messages.length} messages to context`);
  console.log(`📊 Context Stats:`);
  console.log(`  Current tokens: ${contextStats.currentTokens}`);
  console.log(`  Max tokens: ${contextStats.maxTokens}`);
  console.log(
    `  Utilization: ${(contextStats.utilizationPercentage * 100).toFixed(1)}%`
  );
  console.log(`  Message count: ${contextStats.messageCount}`);

  console.log();

  // ═══════════════════════════════════════════════════════════════════════
  // Demo 3: Cross-Persona Knowledge Sharing
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🤝 Demo 3: Cross-Persona Knowledge Sharing');
  console.log('─'.repeat(60));

  // Persona 1 shares knowledge
  memoryManager.shareKnowledge({
    sourcePersonaId: 'backend-expert',
    type: 'best-practice',
    content: 'Always use connection pooling for database efficiency',
    context: 'Database optimization discussion',
    confidence: 0.95,
    tags: ['database', 'performance'],
    relatedEntries: [],
  });

  // Persona 2 shares knowledge
  memoryManager.shareKnowledge({
    sourcePersonaId: 'frontend-expert',
    type: 'pattern',
    content: 'Use React hooks for state management in functional components',
    context: 'React best practices',
    confidence: 0.9,
    tags: ['react', 'frontend'],
    relatedEntries: [],
  });

  console.log(`✅ Shared ${2} knowledge entries`);

  // Retrieve knowledge by tags
  const dbKnowledge = memoryManager.retrieveKnowledge({
    tags: ['database'],
    minConfidence: 0.8,
  });

  console.log(`\n🔍 Knowledge about 'database':`);
  dbKnowledge.forEach((k, i) => {
    console.log(
      `  ${i + 1}. [${k.type}] ${k.content} (confidence: ${k.confidence.toFixed(2)})`
    );
  });

  const knowledgeStats = memoryManager.getKnowledgeStats();
  console.log(`\n📊 Knowledge Stats:`);
  console.log(`  Total entries: ${knowledgeStats.totalEntries}`);
  console.log(
    `  Average confidence: ${knowledgeStats.avgConfidence.toFixed(2)}`
  );
  console.log(`  Top contributors:`);
  knowledgeStats.topContributors.forEach((c) => {
    console.log(`    - ${c.personaId}: ${c.contributions} contributions`);
  });

  console.log();

  // ═══════════════════════════════════════════════════════════════════════
  // Demo 4: Conversation Threading
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🧵 Demo 4: Conversation Threading');
  console.log('─'.repeat(60));

  // Create a thread
  const thread = memoryManager.createThread('chatbot', {
    topic: 'PCL learning',
  });

  console.log(`✅ Created thread: ${thread.id}`);

  // Get active thread
  const activeThread = memoryManager.getActiveThread('chatbot');
  console.log(`📌 Active thread for 'chatbot': ${activeThread?.id}`);

  // Get all threads
  const threads = memoryManager.getThreads('chatbot');
  console.log(`📋 Total threads for 'chatbot': ${threads.length}`);

  console.log();

  // ═══════════════════════════════════════════════════════════════════════
  // Demo 5: Integrated Workflow
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🎯 Demo 5: Integrated Workflow');
  console.log('─'.repeat(60));

  // Process a message (uses all features together)
  const result = memoryManager.processMessage(
    'developer-persona',
    'How do I optimize database queries in my application?',
    'user'
  );

  console.log('✅ Processed message with full integration:');
  console.log(`  Message ID: ${result.message.id}`);
  console.log(`  Thread ID: ${result.threadId}`);
  console.log(
    `  Importance: ${result.message.importance.toFixed(2)} (auto-computed)`
  );
  console.log(`  Relevant memories: ${result.relevantMemories.length}`);
  console.log(`  Relevant knowledge: ${result.relevantKnowledge.length}`);

  if (result.relevantKnowledge.length > 0) {
    console.log('\n  📚 Relevant knowledge from other personas:');
    result.relevantKnowledge.forEach((k, i) => {
      console.log(
        `    ${i + 1}. [${k.sourcePersonaId}] ${k.content.substring(0, 60)}...`
      );
    });
  }

  console.log();

  // ═══════════════════════════════════════════════════════════════════════
  // Demo 6: Comprehensive Statistics
  // ═══════════════════════════════════════════════════════════════════════
  console.log('📈 Demo 6: Comprehensive Statistics');
  console.log('─'.repeat(60));

  const allStats = memoryManager.getStats('assistant');
  console.log('📊 All Statistics:');
  if (allStats.memory) {
    console.log(`\n  Memory:`);
    console.log(`    - Total entries: ${allStats.memory.totalEntries}`);
    console.log(
      `    - Average importance: ${allStats.memory.avgImportance.toFixed(2)}`
    );
  }
  console.log(`\n  Context:`);
  console.log(`    - Current tokens: ${allStats.context.currentTokens}`);
  console.log(
    `    - Utilization: ${(allStats.context.utilizationPercentage * 100).toFixed(1)}%`
  );
  console.log(`    - Messages: ${allStats.context.messageCount}`);

  console.log(`\n  Knowledge:`);
  console.log(`    - Total entries: ${allStats.knowledge.totalEntries}`);
  console.log(
    `    - Average confidence: ${allStats.knowledge.avgConfidence.toFixed(2)}`
  );

  console.log(`\n  Threads:`);
  console.log(`    - Total threads: ${allStats.threads.totalThreads}`);
  console.log(`    - Active threads: ${allStats.threads.activeThreads}`);

  console.log();
  console.log('✅ Demo completed successfully!\n');
}

// Run the demo
await demoMemoryAndContext();
