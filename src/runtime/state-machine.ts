/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — State Machine Implementation
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Provides state machine functionality for workflows:
 * - Finite state machines with typed states
 * - State transition validation
 * - Guarded transitions with conditions
 * - Side effects on transitions
 * - History tracking
 *
 * @packageDocumentation
 * @module @pcl/runtime/state-machine
 */

import { Err, Ok, type Result } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * State machine state with context data
 */
export interface State<TContext = unknown> {
  readonly name: string;
  readonly context: TContext;
  readonly timestamp: Date;
}

/**
 * State transition definition
 */
export interface Transition<TContext = unknown, TEvent = string> {
  readonly from: string;
  readonly to: string;
  readonly event: TEvent;
  readonly guard?: (context: TContext, event: TEvent) => boolean;
  readonly action?: (
    context: TContext,
    event: TEvent
  ) => TContext | Promise<TContext>;
}

/**
 * State machine configuration
 */
export interface StateMachineConfig<TContext = unknown, TEvent = string> {
  readonly initial: string;
  readonly states: readonly string[];
  readonly transitions: readonly Transition<TContext, TEvent>[];
  readonly context?: TContext;
  readonly onTransition?: (from: State<TContext>, to: State<TContext>) => void;
  readonly onError?: (error: Error) => void;
}

/**
 * State machine snapshot for persistence
 */
export interface StateMachineSnapshot<TContext = unknown> {
  readonly currentState: string;
  readonly context: TContext;
  readonly history: readonly StateHistoryEntry[];
  readonly timestamp: Date;
}

/**
 * History entry for state transitions
 */
export interface StateHistoryEntry {
  readonly from: string;
  readonly to: string;
  readonly event: unknown;
  readonly timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              STATE MACHINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Finite State Machine implementation
 */
export class StateMachine<TContext = unknown, TEvent = string> {
  private currentState: State<TContext>;
  private readonly config: StateMachineConfig<TContext, TEvent>;
  private readonly history: StateHistoryEntry[] = [];
  private readonly maxHistorySize = 100;

  constructor(config: StateMachineConfig<TContext, TEvent>) {
    this.config = config;

    // Validate initial state exists
    if (!config.states.includes(config.initial)) {
      throw new Error(`Initial state "${config.initial}" not in states list`);
    }

    // Validate all transition states exist
    for (const transition of config.transitions) {
      if (!config.states.includes(transition.from)) {
        throw new Error(
          `Transition from state "${transition.from}" not in states list`
        );
      }
      if (!config.states.includes(transition.to)) {
        throw new Error(
          `Transition to state "${transition.to}" not in states list`
        );
      }
    }

    // Initialize current state
    this.currentState = {
      name: config.initial,
      context: (config.context ?? {}) as TContext,
      timestamp: new Date(),
    };
  }

  /**
   * Get the current state
   */
  getState(): State<TContext> {
    return this.currentState;
  }

  /**
   * Get the current state name
   */
  getCurrentStateName(): string {
    return this.currentState.name;
  }

  /**
   * Get the current context
   */
  getContext(): TContext {
    return this.currentState.context;
  }

  /**
   * Check if machine is in a specific state
   */
  isInState(stateName: string): boolean {
    return this.currentState.name === stateName;
  }

  /**
   * Check if a transition is possible
   */
  canTransition(event: TEvent): boolean {
    const transition = this.findTransition(
      this.currentState.name,
      event as TEvent
    );
    if (!transition) return false;

    // Check guard if present
    if (transition.guard) {
      return transition.guard(this.currentState.context, event);
    }

    return true;
  }

  /**
   * Transition to a new state
   */
  async transition(event: TEvent): Promise<Result<State<TContext>, Error>> {
    const fromState = this.currentState;
    const transition = this.findTransition(fromState.name, event);

    if (!transition) {
      const error = new Error(
        `No transition from state "${fromState.name}" for event "${String(event)}"`
      );
      this.config.onError?.(error);
      return Err(error);
    }

    // Check guard
    if (transition.guard && !transition.guard(fromState.context, event)) {
      const error = new Error(
        `Transition guard failed from "${fromState.name}" to "${transition.to}"`
      );
      this.config.onError?.(error);
      return Err(error);
    }

    try {
      // Execute action if present
      let newContext = fromState.context;
      if (transition.action) {
        newContext = await transition.action(fromState.context, event);
      }

      // Create new state
      const toState: State<TContext> = {
        name: transition.to,
        context: newContext,
        timestamp: new Date(),
      };

      // Update current state
      this.currentState = toState;

      // Record history
      this.addToHistory({
        from: fromState.name,
        to: toState.name,
        event,
        timestamp: toState.timestamp,
      });

      // Notify listeners
      this.config.onTransition?.(fromState, toState);

      return Ok(toState);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.config.onError?.(err);
      return Err(err);
    }
  }

  /**
   * Get state transition history
   */
  getHistory(): readonly StateHistoryEntry[] {
    return this.history;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history.length = 0;
  }

  /**
   * Create a snapshot of current state
   */
  snapshot(): StateMachineSnapshot<TContext> {
    return {
      currentState: this.currentState.name,
      context: this.currentState.context,
      history: [...this.history],
      timestamp: new Date(),
    };
  }

  /**
   * Restore from a snapshot
   */
  restore(snapshot: StateMachineSnapshot<TContext>): Result<void, Error> {
    // Validate state exists
    if (!this.config.states.includes(snapshot.currentState)) {
      return Err(
        new Error(
          `Cannot restore: state "${snapshot.currentState}" not in states list`
        )
      );
    }

    // Restore state
    this.currentState = {
      name: snapshot.currentState,
      context: snapshot.context,
      timestamp: new Date(),
    };

    // Restore history
    this.history.length = 0;
    this.history.push(...snapshot.history);

    return Ok(undefined);
  }

  /**
   * Get all possible transitions from current state
   */
  getPossibleTransitions(): readonly Transition<TContext, TEvent>[] {
    return this.config.transitions.filter(
      (t) => t.from === this.currentState.name
    );
  }

  /**
   * Find a transition for current state and event
   */
  private findTransition(
    from: string,
    event: TEvent
  ): Transition<TContext, TEvent> | undefined {
    return this.config.transitions.find(
      (t) => t.from === from && t.event === event
    );
  }

  /**
   * Add entry to history with size limit
   */
  private addToHistory(entry: StateHistoryEntry): void {
    this.history.push(entry);

    // Trim history if too large
    if (this.history.length > this.maxHistorySize) {
      this.history.splice(0, this.history.length - this.maxHistorySize);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              BUILDER PATTERN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builder for creating state machines fluently
 */
export class StateMachineBuilder<TContext = unknown, TEvent = string> {
  private initial?: string;
  private readonly states: Set<string> = new Set();
  private readonly transitions: Transition<TContext, TEvent>[] = [];
  private context?: TContext;
  private onTransition?: (from: State<TContext>, to: State<TContext>) => void;
  private onError?: (error: Error) => void;

  /**
   * Set initial state
   */
  withInitialState(state: string): this {
    this.initial = state;
    this.states.add(state);
    return this;
  }

  /**
   * Add a state
   */
  addState(state: string): this {
    this.states.add(state);
    return this;
  }

  /**
   * Add multiple states
   */
  addStates(...states: string[]): this {
    for (const state of states) {
      this.states.add(state);
    }
    return this;
  }

  /**
   * Add a transition
   */
  addTransition(transition: Transition<TContext, TEvent>): this {
    this.states.add(transition.from);
    this.states.add(transition.to);
    this.transitions.push(transition);
    return this;
  }

  /**
   * Add a simple transition
   */
  on(event: TEvent, from: string, to: string): this {
    return this.addTransition({ from, to, event });
  }

  /**
   * Add a guarded transition
   */
  onWhen(
    event: TEvent,
    from: string,
    to: string,
    guard: (context: TContext, event: TEvent) => boolean
  ): this {
    return this.addTransition({ from, to, event, guard });
  }

  /**
   * Add a transition with action
   */
  onDo(
    event: TEvent,
    from: string,
    to: string,
    action: (context: TContext, event: TEvent) => TContext | Promise<TContext>
  ): this {
    return this.addTransition({ from, to, event, action });
  }

  /**
   * Set initial context
   */
  withContext(context: TContext): this {
    this.context = context;
    return this;
  }

  /**
   * Set transition callback
   */
  withTransitionCallback(
    callback: (from: State<TContext>, to: State<TContext>) => void
  ): this {
    this.onTransition = callback;
    return this;
  }

  /**
   * Set error callback
   */
  withErrorCallback(callback: (error: Error) => void): this {
    this.onError = callback;
    return this;
  }

  /**
   * Build the state machine
   */
  build(): StateMachine<TContext, TEvent> {
    if (!this.initial) {
      throw new Error('Initial state is required');
    }

    if (this.states.size === 0) {
      throw new Error('At least one state is required');
    }

    const config: StateMachineConfig<TContext, TEvent> = {
      initial: this.initial,
      states: Array.from(this.states),
      transitions: this.transitions,
      context: this.context,
      onTransition: this.onTransition,
      onError: this.onError,
    };

    return new StateMachine(config);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new state machine builder
 */
export function createStateMachine<
  TContext = unknown,
  TEvent = string,
>(): StateMachineBuilder<TContext, TEvent> {
  return new StateMachineBuilder<TContext, TEvent>();
}
