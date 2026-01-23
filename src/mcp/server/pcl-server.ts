/**
 * PCL MCP Server
 *
 * Exposes PCL personas, teams, and workflows as MCP tools and resources
 */

import { PclMcpServer, type McpServerConfig } from './server.js';
import type {
  McpToolCallParams,
  McpToolCallResult,
  McpResource,
  McpResourceContent,
} from '../types/mcp.js';
import type { Runtime, PersonaInstance, TeamInstance } from '../../runtime/index.js';

/**
 * PCL MCP Server Configuration
 */
export interface PclServerConfig extends McpServerConfig {
  /**
   * PCL Runtime instance
   */
  readonly runtime: Runtime;
}

/**
 * Arguments for persona/execute tool
 */
interface PersonaExecuteArgs {
  persona: string;
  input: string;
  context?: Record<string, unknown>;
}

/**
 * Arguments for team/execute tool
 */
interface TeamExecuteArgs {
  team: string;
  input: string;
  context?: Record<string, unknown>;
}

/**
 * PCL-specific MCP Server
 *
 * Registers PCL personas, teams, and workflows as MCP tools
 */
export class PclServer extends PclMcpServer {
  private runtime: Runtime;

  constructor(config: PclServerConfig) {
    super({
      name: config.name,
      version: config.version,
      description: config.description,
    });

    this.runtime = config.runtime;

    // Register PCL-specific tools
    this.registerPclTools();

    // Register PCL-specific resources
    this.registerPclResources();
  }

  /**
   * Register PCL personas, teams, and workflows as MCP tools
   */
  private registerPclTools(): void {
    // Tool: Execute a persona
    this.registerTool(
      {
        name: 'persona/execute',
        description: 'Execute a PCL persona with a given input',
        inputSchema: {
          type: 'object',
          properties: {
            persona: {
              type: 'string',
              description: 'Name or ID of the persona to execute',
            },
            input: {
              type: 'string',
              description: 'Input message or prompt for the persona',
            },
            context: {
              type: 'object',
              description: 'Optional context variables',
            },
          },
          required: ['persona', 'input'],
        },
      },
      async (params: McpToolCallParams) => {
        return this.executePersona(
          params.arguments as unknown as PersonaExecuteArgs
        );
      }
    );

    // Tool: List all available personas
    this.registerTool(
      {
        name: 'persona/list',
        description: 'List all available PCL personas',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      async () => {
        return this.listPersonas();
      }
    );

    // Tool: Get persona information
    this.registerTool(
      {
        name: 'persona/get',
        description: 'Get detailed information about a persona',
        inputSchema: {
          type: 'object',
          properties: {
            persona: {
              type: 'string',
              description: 'Name or ID of the persona',
            },
          },
          required: ['persona'],
        },
      },
      async (params: McpToolCallParams) => {
        return this.getPersonaInfo(
          params.arguments as unknown as { persona: string }
        );
      }
    );

    // Tool: Execute a team
    this.registerTool(
      {
        name: 'team/execute',
        description: 'Execute a PCL team workflow',
        inputSchema: {
          type: 'object',
          properties: {
            team: {
              type: 'string',
              description: 'Name or ID of the team to execute',
            },
            input: {
              type: 'string',
              description: 'Input message or prompt for the team',
            },
            context: {
              type: 'object',
              description: 'Optional context variables',
            },
          },
          required: ['team', 'input'],
        },
      },
      async (params: McpToolCallParams) => {
        return this.executeTeam(
          params.arguments as unknown as TeamExecuteArgs
        );
      }
    );

    // Tool: List all available teams
    this.registerTool(
      {
        name: 'team/list',
        description: 'List all available PCL teams',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      async () => {
        return this.listTeams();
      }
    );

    // Tool: Get team information
    this.registerTool(
      {
        name: 'team/get',
        description: 'Get detailed information about a team',
        inputSchema: {
          type: 'object',
          properties: {
            team: {
              type: 'string',
              description: 'Name or ID of the team',
            },
          },
          required: ['team'],
        },
      },
      async (params: McpToolCallParams) => {
        return this.getTeamInfo(
          params.arguments as unknown as { team: string }
        );
      }
    );
  }

  /**
   * Execute a persona
   */
  private async executePersona(
    args: PersonaExecuteArgs
  ): Promise<McpToolCallResult> {
    try {
      // Activate persona if not already active
      const activateResult = this.runtime.activate(args.persona);
      if (!activateResult.ok) {
        return {
          content: [
            {
              type: 'text',
              text: `Persona not found: ${args.persona}`,
            },
          ],
          isError: true,
        };
      }

      // Send message to persona
      const result = await this.runtime.send(
        args.persona,
        args.input,
        args.context || {}
      );

      if (!result.ok) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${result.error.message}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: result.value.content,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing persona: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * List all available personas
   */
  private async listPersonas(): Promise<McpToolCallResult> {
    try {
      const personas = this.runtime.getAllPersonas();

      if (personas.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No personas available. Load a PCL program first.',
            },
          ],
        };
      }

      const personaList = personas
        .map((p) => {
          const state = p.getState();
          return `- ${state.name} (${state.active ? 'active' : 'inactive'})`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Available Personas:\n${personaList}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing personas: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Get detailed persona information
   */
  private async getPersonaInfo(args: {
    persona: string;
  }): Promise<McpToolCallResult> {
    try {
      const persona = this.runtime.getPersona(args.persona);

      if (!persona) {
        return {
          content: [
            {
              type: 'text',
              text: `Persona not found: ${args.persona}`,
            },
          ],
          isError: true,
        };
      }

      const state = persona.getState();
      const info = [
        `**Persona**: ${state.name}`,
        `**Status**: ${state.active ? 'Active' : 'Inactive'}`,
        `**Intent**: ${state.config.intent || 'N/A'}`,
        `**Tone**: ${state.config.tone}`,
        `**Depth**: ${state.config.depth}`,
        `**Verbosity**: ${state.config.verbosity}`,
        `**Skills**: ${state.config.skills.join(', ') || 'None'}`,
        `**Constraints**: ${state.config.constraints.length} constraint(s)`,
        `**Tags**: ${state.config.tags.join(', ') || 'None'}`,
        `**Messages Processed**: ${state.stats.messagesProcessed}`,
        `**Tokens Used**: ${state.stats.tokensUsed}`,
      ].join('\n');

      return {
        content: [
          {
            type: 'text',
            text: info,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting persona info: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Execute a team
   */
  private async executeTeam(args: TeamExecuteArgs): Promise<McpToolCallResult> {
    try {
      // Activate team
      const activateResult = this.runtime.activateTeam(args.team);
      if (!activateResult.ok) {
        return {
          content: [
            {
              type: 'text',
              text: `Team not found: ${args.team}`,
            },
          ],
          isError: true,
        };
      }

      // Send message to team
      const result = await this.runtime.sendToTeam(
        args.team,
        args.input,
        args.context || {}
      );

      if (!result.ok) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${result.error.message}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: result.value.content,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing team: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * List all available teams
   */
  private async listTeams(): Promise<McpToolCallResult> {
    try {
      const teams = this.runtime.getAllTeams();

      if (teams.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No teams available. Load a PCL program first.',
            },
          ],
        };
      }

      const teamList = teams
        .map((t) => {
          const state = t.getState();
          return `- ${state.name} (${state.members.length} members, merge: ${state.config.mergeMode})`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Available Teams:\n${teamList}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing teams: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Get detailed team information
   */
  private async getTeamInfo(args: { team: string }): Promise<McpToolCallResult> {
    try {
      const team = this.runtime.getTeam(args.team);

      if (!team) {
        return {
          content: [
            {
              type: 'text',
              text: `Team not found: ${args.team}`,
            },
          ],
          isError: true,
        };
      }

      const state = team.getState();
      const memberNames = state.members.map((m) => m.name).join(', ');
      const info = [
        `**Team**: ${state.name}`,
        `**Members**: ${memberNames}`,
        `**Merge Mode**: ${state.config.mergeMode}`,
        `**Primary**: ${state.primary?.name || 'None'}`,
        `**Requests Processed**: ${state.stats.requestsProcessed}`,
        `**Consensus Reached**: ${state.stats.consensusReached}`,
        `**Conflicts Resolved**: ${state.stats.conflictsResolved}`,
      ].join('\n');

      return {
        content: [
          {
            type: 'text',
            text: info,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting team info: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Register PCL resources (persona definitions, team definitions, etc.)
   */
  private registerPclResources(): void {
    // Resource: Persona definitions
    this.registerResource(
      {
        uri: 'pcl://persona/{id}',
        name: 'Persona Definition',
        description: 'PCL persona definition',
        mimeType: 'application/json',
      },
      async (uri: string) => {
        const match = uri.match(/^pcl:\/\/persona\/(.+)$/);
        if (!match) {
          throw new Error('Invalid persona URI');
        }

        const personaId = match[1];
        const persona = this.runtime.getPersona(personaId);

        if (!persona) {
          throw new Error(`Persona not found: ${personaId}`);
        }

        const state = persona.getState();

        return {
          uri,
          mimeType: 'application/json',
          json: {
            id: state.id,
            name: state.name,
            active: state.active,
            config: state.config,
            stats: state.stats,
          },
        };
      }
    );

    // Resource: Team definitions
    this.registerResource(
      {
        uri: 'pcl://team/{id}',
        name: 'Team Definition',
        description: 'PCL team definition',
        mimeType: 'application/json',
      },
      async (uri: string) => {
        const match = uri.match(/^pcl:\/\/team\/(.+)$/);
        if (!match) {
          throw new Error('Invalid team URI');
        }

        const teamId = match[1];
        const team = this.runtime.getTeam(teamId);

        if (!team) {
          throw new Error(`Team not found: ${teamId}`);
        }

        const state = team.getState();

        return {
          uri,
          mimeType: 'application/json',
          json: {
            id: state.id,
            name: state.name,
            members: state.members.map((m) => m.name),
            primary: state.primary?.name,
            config: state.config,
            stats: state.stats,
          },
        };
      }
    );
  }
}
