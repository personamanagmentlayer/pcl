/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — PERSONA CONTROL LANGUAGE
 * Runtime Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createRuntime,
  createPersona,
  createTeam,
  PersonaInstance,
  TeamInstance,
  Runtime,
} from '../src/runtime';
import { parse } from '../src/parser';


// ═══════════════════════════════════════════════════════════════════════════════
//                              PERSONA INSTANCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('PersonaInstance', () => {
  let persona: PersonaInstance;
  
  beforeEach(() => {
    persona = createPersona('test-persona', 'TestPersona', {
      intent: 'Test persona for unit testing',
      tone: 'balanced',
      skills: ['testing', 'mocking'],
      constraints: ['be helpful', 'be accurate'],
    });
  });
  
  describe('state management', () => {
    it('should initialize with correct state', () => {
      const state = persona.getState();
      
      expect(state.id).toBe('test-persona');
      expect(state.name).toBe('TestPersona');
      expect(state.active).toBe(false);
      expect(state.config.intent).toBe('Test persona for unit testing');
      expect(state.config.tone).toBe('balanced');
    });
    
    it('should activate and deactivate', () => {
      expect(persona.getState().active).toBe(false);
      
      persona.activate();
      expect(persona.getState().active).toBe(true);
      
      persona.deactivate();
      expect(persona.getState().active).toBe(false);
    });
    
    it('should track activation count', () => {
      expect(persona.getState().stats.activationCount).toBe(0);
      
      persona.activate();
      expect(persona.getState().stats.activationCount).toBe(1);
      
      persona.deactivate();
      persona.activate();
      expect(persona.getState().stats.activationCount).toBe(2);
    });
  });
  
  describe('configuration', () => {
    it('should update configuration', () => {
      persona.configure({ tone: 'professional' });
      expect(persona.getState().config.tone).toBe('professional');
    });
    
    it('should preserve existing config when updating', () => {
      persona.configure({ verbosity: 'verbose' });
      
      expect(persona.getState().config.intent).toBe('Test persona for unit testing');
      expect(persona.getState().config.verbosity).toBe('verbose');
    });
  });
  
  describe('memory', () => {
    it('should set and get context', () => {
      persona.setContext('key1', 'value1');
      persona.setContext('key2', { nested: true });
      
      expect(persona.getContext('key1')).toBe('value1');
      expect(persona.getContext('key2')).toEqual({ nested: true });
    });
    
    it('should remember and recall facts', () => {
      persona.remember('fact1', 'The sky is blue');
      persona.remember('fact2', 42);
      
      expect(persona.recall('fact1')).toBe('The sky is blue');
      expect(persona.recall('fact2')).toBe(42);
    });
  });
  
  describe('message processing', () => {
    it('should process messages when active', async () => {
      persona.activate();
      
      const response = await persona.process({
        id: 'msg-1',
        from: null,
        to: 'test-persona',
        content: 'Hello, persona!',
        metadata: {},
        timestamp: new Date(),
      });
      
      expect(response).toBeDefined();
      expect(response.personaId).toBe('test-persona');
      expect(response.content).toBeDefined();
    });
    
    it('should track message stats', async () => {
      persona.activate();
      
      await persona.process({
        id: 'msg-1',
        from: null,
        to: 'test-persona',
        content: 'Message 1',
        metadata: {},
        timestamp: new Date(),
      });
      
      await persona.process({
        id: 'msg-2',
        from: null,
        to: 'test-persona',
        content: 'Message 2',
        metadata: {},
        timestamp: new Date(),
      });
      
      expect(persona.getState().stats.messagesProcessed).toBe(2);
    });
  });
  
  describe('event handling', () => {
    it('should emit events on activation', () => {
      const handler = vi.fn();
      persona.on(handler);
      
      persona.activate();
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'persona:activated' })
      );
    });
    
    it('should emit events on deactivation', () => {
      const handler = vi.fn();
      persona.activate();
      persona.on(handler);
      
      persona.deactivate();
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'persona:deactivated' })
      );
    });
    
    it('should allow unsubscribing from events', () => {
      const handler = vi.fn();
      const unsubscribe = persona.on(handler);
      
      persona.activate();
      expect(handler).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      persona.deactivate();
      persona.activate();
      
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
//                              TEAM INSTANCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('TeamInstance', () => {
  let personaA: PersonaInstance;
  let personaB: PersonaInstance;
  let team: TeamInstance;
  
  beforeEach(() => {
    personaA = createPersona('persona-a', 'PersonaA', { intent: 'First persona' });
    personaB = createPersona('persona-b', 'PersonaB', { intent: 'Second persona' });
    team = createTeam('test-team', 'TestTeam', [personaA, personaB], {
      mergeMode: 'primary',
    });
  });
  
  describe('state management', () => {
    it('should initialize with correct state', () => {
      const state = team.getState();
      
      expect(state.id).toBe('test-team');
      expect(state.name).toBe('TestTeam');
      expect(state.members.length).toBe(2);
      expect(state.config.mergeMode).toBe('primary');
    });
    
    it('should have primary member when configured', () => {
      const state = team.getState();
      expect(state.primary).toBeDefined();
    });
  });
  
  describe('configuration', () => {
    it('should update team configuration', () => {
      team.configure({ mergeMode: 'consensus' });
      expect(team.getState().config.mergeMode).toBe('consensus');
    });
    
    it('should configure weights', () => {
      const weights = new Map([
        ['persona-a', 0.7],
        ['persona-b', 0.3],
      ]);
      
      team.configure({ weights });
      expect(team.getState().config.weights.get('persona-a')).toBe(0.7);
    });
  });
  
  describe('message processing', () => {
    it('should process messages through team', async () => {
      personaA.activate();
      personaB.activate();
      
      const response = await team.process(
        {
          id: 'msg-1',
          from: null,
          to: 'test-team',
          content: 'Hello, team!',
          metadata: {},
          timestamp: new Date(),
        },
        [personaA, personaB]
      );
      
      expect(response).toBeDefined();
      expect(response.personaId).toContain('team');
    });
    
    it('should track team stats', async () => {
      personaA.activate();
      personaB.activate();
      
      await team.process(
        {
          id: 'msg-1',
          from: null,
          to: 'test-team',
          content: 'Test message',
          metadata: {},
          timestamp: new Date(),
        },
        [personaA, personaB]
      );
      
      expect(team.getState().stats.requestsProcessed).toBe(1);
    });
  });
  
  describe('merge modes', () => {
    it('should use primary merge mode', async () => {
      personaA.activate();
      personaB.activate();
      team.configure({ mergeMode: 'primary' });
      
      const response = await team.process(
        {
          id: 'msg-1',
          from: null,
          to: 'test-team',
          content: 'Test',
          metadata: {},
          timestamp: new Date(),
        },
        [personaA, personaB]
      );
      
      expect(response).toBeDefined();
    });
    
    it('should use append merge mode', async () => {
      personaA.activate();
      personaB.activate();
      team.configure({ mergeMode: 'append' });
      
      const response = await team.process(
        {
          id: 'msg-1',
          from: null,
          to: 'test-team',
          content: 'Test',
          metadata: {},
          timestamp: new Date(),
        },
        [personaA, personaB]
      );
      
      expect(response.content).toContain('---'); // Separator in append mode
    });
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
//                              RUNTIME TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Runtime', () => {
  let runtime: Runtime;
  
  beforeEach(() => {
    runtime = createRuntime();
  });
  
  describe('program loading', () => {
    it('should load personas from PCL source', () => {
      const source = `
        persona SEC {
          intent: "Security expert"
        }
        
        persona DEV {
          intent: "Developer"
        }
      `;
      
      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;
      
      runtime.load(parseResult.value.program);
      
      expect(runtime.getAllPersonas().length).toBe(2);
      expect(runtime.getPersona('SEC')).toBeDefined();
      expect(runtime.getPersona('DEV')).toBeDefined();
    });
    
    it('should load teams from PCL source', () => {
      const source = `
        persona A { intent: "A" }
        persona B { intent: "B" }
        
        team AB {
          members { A, B }
        }
      `;
      
      const parseResult = parse(source);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;
      
      runtime.load(parseResult.value.program);
      
      expect(runtime.getAllTeams().length).toBe(1);
      expect(runtime.getTeam('AB')).toBeDefined();
    });
  });
  
  describe('persona activation', () => {
    beforeEach(() => {
      const source = `
        persona TEST {
          intent: "Test persona"
        }
      `;
      const parseResult = parse(source);
      if (parseResult.ok) {
        runtime.load(parseResult.value.program);
      }
    });
    
    it('should activate persona by name', () => {
      const result = runtime.activate('TEST');
      expect(result.ok).toBe(true);
      
      if (result.ok) {
        expect(result.value.getState().active).toBe(true);
      }
    });
    
    it('should fail to activate unknown persona', () => {
      const result = runtime.activate('UNKNOWN');
      expect(result.ok).toBe(false);
    });
    
    it('should deactivate persona', () => {
      runtime.activate('TEST');
      const result = runtime.deactivate('TEST');
      expect(result.ok).toBe(true);
      
      const persona = runtime.getPersona('TEST');
      expect(persona?.getState().active).toBe(false);
    });
  });
  
  describe('messaging', () => {
    beforeEach(() => {
      const source = `
        persona CHAT {
          intent: "Chat persona"
        }
      `;
      const parseResult = parse(source);
      if (parseResult.ok) {
        runtime.load(parseResult.value.program);
        runtime.activate('CHAT');
      }
    });
    
    it('should send message to persona', async () => {
      const result = await runtime.send('CHAT', 'Hello!');
      expect(result.ok).toBe(true);
      
      if (result.ok) {
        expect(result.value.content).toBeDefined();
      }
    });
    
    it('should fail to send to unknown persona', async () => {
      const result = await runtime.send('UNKNOWN', 'Hello!');
      expect(result.ok).toBe(false);
    });
    
    it('should fail to send to inactive persona', async () => {
      runtime.deactivate('CHAT');
      const result = await runtime.send('CHAT', 'Hello!');
      expect(result.ok).toBe(false);
    });
  });
  
  describe('team messaging', () => {
    beforeEach(() => {
      const source = `
        persona A { intent: "A" }
        persona B { intent: "B" }
        
        team AB {
          members { A, B }
          merge: append
        }
      `;
      const parseResult = parse(source);
      if (parseResult.ok) {
        runtime.load(parseResult.value.program);
        runtime.activate('A');
        runtime.activate('B');
      }
    });
    
    it('should send message to team', async () => {
      const result = await runtime.sendToTeam('AB', 'Hello team!');
      expect(result.ok).toBe(true);
    });
    
    it('should fail with no active members', async () => {
      runtime.deactivate('A');
      runtime.deactivate('B');
      
      const result = await runtime.sendToTeam('AB', 'Hello!');
      expect(result.ok).toBe(false);
    });
  });
  
  describe('runtime management', () => {
    it('should get active personas', () => {
      const source = `
        persona A { intent: "A" }
        persona B { intent: "B" }
        persona C { intent: "C" }
      `;
      const parseResult = parse(source);
      if (parseResult.ok) {
        runtime.load(parseResult.value.program);
      }
      
      runtime.activate('A');
      runtime.activate('C');
      
      const active = runtime.getActivePersonas();
      expect(active.length).toBe(2);
    });
    
    it('should reset runtime state', () => {
      const source = `
        persona TEST { intent: "Test" }
      `;
      const parseResult = parse(source);
      if (parseResult.ok) {
        runtime.load(parseResult.value.program);
      }
      
      runtime.activate('TEST');
      expect(runtime.getAllPersonas().length).toBe(1);
      
      runtime.reset();
      expect(runtime.getAllPersonas().length).toBe(0);
    });
    
    it('should emit events', () => {
      const handler = vi.fn();
      runtime.on(handler);
      
      const source = `
        persona TEST { intent: "Test" }
      `;
      const parseResult = parse(source);
      if (parseResult.ok) {
        runtime.load(parseResult.value.program);
      }
      
      runtime.activate('TEST');
      
      expect(handler).toHaveBeenCalled();
    });
  });
});
