/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL — Team Edge Case Handlers
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Handles edge cases in team processing:
 * - Empty teams
 * - Timeout handling
 * - Quorum failures
 * - Member failures
 * - Partial responses
 * - Retry logic
 *
 * @packageDocumentation
 * @module @pcl/runtime/team-edge-cases
 */

import { Err, Ok, type Result } from '../types';
import type { Message, PersonaInstance, Response } from './index';

// ═══════════════════════════════════════════════════════════════════════════════
//                              TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Team processing options with edge case handling
 */
export interface TeamProcessingOptions {
  /**
   * Timeout for collecting responses (ms)
   * @default 30000
   */
  readonly timeout?: number;

  /**
   * Required number of responses (quorum)
   * @default members.length (all required)
   */
  readonly quorum?: number;

  /**
   * Whether to allow partial responses
   * @default false
   */
  readonly allowPartial?: boolean;

  /**
   * Maximum retries per member on failure
   * @default 0
   */
  readonly maxRetries?: number;

  /**
   * Delay between retries (ms)
   * @default 1000
   */
  readonly retryDelay?: number;

  /**
   * Fallback response if quorum not met
   */
  readonly fallbackResponse?: Response;

  /**
   * Whether to fail fast on first error
   * @default false
   */
  readonly failFast?: boolean;
}

/**
 * Result of team processing
 */
export interface TeamProcessingResult {
  readonly responses: readonly Response[];
  readonly failures: readonly MemberFailure[];
  readonly timedOut: readonly string[];
  readonly quorumMet: boolean;
  readonly totalTime: number;
}

/**
 * Member failure information
 */
export interface MemberFailure {
  readonly personaId: string;
  readonly error: Error;
  readonly attempts: number;
  readonly timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              TEAM PROCESSOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Processes messages through a team with robust edge case handling
 */
export class TeamProcessor {
  /**
   * Process a message through team members with comprehensive error handling
   */
  async processWithRetry(
    message: Message,
    members: readonly PersonaInstance[],
    options: TeamProcessingOptions = {}
  ): Promise<Result<TeamProcessingResult, Error>> {
    const startTime = Date.now();

    // Edge case: Empty team
    if (members.length === 0) {
      return Err(new Error('Cannot process message: team has no members'));
    }

    // Set defaults
    const timeout = options.timeout ?? 30000;
    const quorum = options.quorum ?? members.length;
    const maxRetries = options.maxRetries ?? 0;
    const retryDelay = options.retryDelay ?? 1000;
    const allowPartial = options.allowPartial ?? false;
    const failFast = options.failFast ?? false;

    // Validate quorum
    if (quorum > members.length) {
      return Err(
        new Error(
          `Invalid quorum: required ${quorum} but only ${members.length} members available`
        )
      );
    }

    if (quorum < 1) {
      return Err(new Error('Quorum must be at least 1'));
    }

    // Process members
    const responses: Response[] = [];
    const failures: MemberFailure[] = [];
    const timedOut: string[] = [];

    // Create promises for each member with retry logic
    const memberPromises = members.map((member) =>
      this.processMemberWithRetry(
        member,
        message,
        maxRetries,
        retryDelay,
        timeout
      )
    );

    // Wait for all promises with timeout
    const results = await Promise.allSettled(memberPromises);

    // Process results
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const member = members[i];

      if (result.status === 'fulfilled') {
        const memberResult = result.value;

        if (memberResult.success) {
          responses.push(memberResult.response!);
        } else if (memberResult.timedOut) {
          timedOut.push(member.getState().id);
        } else if (memberResult.error) {
          failures.push({
            personaId: member.getState().id,
            error: memberResult.error,
            attempts: memberResult.attempts,
            timestamp: new Date(),
          });
        }
      } else {
        // Promise rejected (shouldn't happen with allSettled, but handle it)
        failures.push({
          personaId: member.getState().id,
          error: new Error(String(result.reason)),
          attempts: maxRetries + 1,
          timestamp: new Date(),
        });
      }

      // Fail fast if enabled
      if (failFast && (failures.length > 0 || timedOut.length > 0)) {
        break;
      }
    }

    const quorumMet = responses.length >= quorum;
    const totalTime = Date.now() - startTime;

    // Check if we met quorum
    if (!quorumMet) {
      if (allowPartial && responses.length > 0) {
        // Return partial results
        return Ok({
          responses,
          failures,
          timedOut,
          quorumMet: false,
          totalTime,
        });
      }

      // Use fallback if available
      if (options.fallbackResponse) {
        return Ok({
          responses: [options.fallbackResponse],
          failures,
          timedOut,
          quorumMet: false,
          totalTime,
        });
      }

      // Quorum not met and no fallback
      return Err(
        new Error(
          `Quorum not met: ${responses.length}/${quorum} responses received. ` +
            `Failures: ${failures.length}, Timeouts: ${timedOut.length}`
        )
      );
    }

    return Ok({
      responses,
      failures,
      timedOut,
      quorumMet: true,
      totalTime,
    });
  }

  /**
   * Process a single member with retry logic
   */
  private async processMemberWithRetry(
    member: PersonaInstance,
    message: Message,
    maxRetries: number,
    retryDelay: number,
    timeout: number
  ): Promise<MemberProcessResult> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts <= maxRetries) {
      attempts++;

      try {
        // Process with timeout
        const response = await this.processWithTimeout(
          member,
          message,
          timeout
        );

        return {
          success: true,
          response,
          attempts,
          timedOut: false,
          error: null,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if it's a timeout error
        if (
          lastError.message.includes('timeout') ||
          lastError.message.includes('Timeout')
        ) {
          return {
            success: false,
            response: null,
            attempts,
            timedOut: true,
            error: lastError,
          };
        }

        // If not last attempt, wait before retry
        if (attempts <= maxRetries) {
          await this.sleep(retryDelay);
        }
      }
    }

    return {
      success: false,
      response: null,
      attempts,
      timedOut: false,
      error: lastError,
    };
  }

  /**
   * Process member with timeout
   */
  private async processWithTimeout(
    member: PersonaInstance,
    message: Message,
    timeout: number
  ): Promise<Response> {
    return Promise.race([
      member.process(message),
      new Promise<Response>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Timeout after ${timeout}ms for persona ${member.getState().id}`
              )
            ),
          timeout
        )
      ),
    ]);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Internal result type for member processing
 */
interface MemberProcessResult {
  readonly success: boolean;
  readonly response: Response | null;
  readonly attempts: number;
  readonly timedOut: boolean;
  readonly error: Error | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates team configuration and members
 */
export class TeamValidator {
  /**
   * Validate team members before processing
   */
  validateMembers(members: readonly PersonaInstance[]): Result<void, Error> {
    if (members.length === 0) {
      return Err(new Error('Team must have at least one member'));
    }

    // Check for duplicate member IDs
    const ids = new Set<string>();
    for (const member of members) {
      const id = member.getState().id;
      if (ids.has(id)) {
        return Err(new Error(`Duplicate member ID: ${id}`));
      }
      ids.add(id);
    }

    return Ok(undefined);
  }

  /**
   * Validate team processing options
   */
  validateOptions(
    options: TeamProcessingOptions,
    memberCount: number
  ): Result<void, Error> {
    if (options.timeout !== undefined && options.timeout <= 0) {
      return Err(new Error('Timeout must be positive'));
    }

    if (options.quorum !== undefined) {
      if (options.quorum < 1) {
        return Err(new Error('Quorum must be at least 1'));
      }
      if (options.quorum > memberCount) {
        return Err(
          new Error(
            `Quorum (${options.quorum}) cannot exceed member count (${memberCount})`
          )
        );
      }
    }

    if (options.maxRetries !== undefined && options.maxRetries < 0) {
      return Err(new Error('Max retries cannot be negative'));
    }

    if (options.retryDelay !== undefined && options.retryDelay < 0) {
      return Err(new Error('Retry delay cannot be negative'));
    }

    return Ok(undefined);
  }

  /**
   * Validate message before processing
   */
  validateMessage(message: Message): Result<void, Error> {
    if (!message.content || message.content.trim().length === 0) {
      return Err(new Error('Message content cannot be empty'));
    }

    if (!message.id) {
      return Err(new Error('Message must have an ID'));
    }

    return Ok(undefined);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a team processor with edge case handling
 */
export function createTeamProcessor(): TeamProcessor {
  return new TeamProcessor();
}

/**
 * Create a team validator
 */
export function createTeamValidator(): TeamValidator {
  return new TeamValidator();
}
