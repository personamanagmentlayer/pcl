/**
 * PCL MCP Server
 *
 * Exposes PCL personas, teams, and workflows as MCP tools and resources
 */

import { PclMcpServer, type McpServerConfig } from './server.js';
import type {
  McpTool,
  McpToolCallParams,
  McpToolCallResult,
  McpResource,
  McpResourceContent,
} from '../types/mcp.js';
import type { Runtime } from '../../runtime/runtime.js';
import type { Persona } from '../../ast/persona.js';
import type { Team } from '../../ast/team.js';
import type { Workflow } from '../../ast/workflow.js';

/**
 * PCL MCP Server Configuration
 */
export interface PclMcpServerConfig extends McpServerConfig {
  /**
   * PCL Runtime instance
   */
  readonly runtime: Runtime;
}

/**
 * PCL-specific MCP Server
 *
 * Registers PCL personas, teams, and workflows as MCP tools
 */
export class PclServer extends PclMcpServer {
  private runtime: Runtime;

  constructor(config: PclMcpServerConfig) {
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
        return this.executePersona(params.arguments as PersonaExecuteArgs);
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
        name: 'persona/info',
        description: 'Get detailed information about a specific persona',
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
        return this.getPersonaInfo(params.arguments as { persona: string });
      }
    );

    // Tool: Execute a team
    this.registerTool(
      {
        name: 'team/execute',
        description: 'Execute a PCL team (multiple personas working together)',
        inputSchema: {
          type: 'object',
          properties: {
            team: {
              type: 'string',
              description: 'Name or ID of the team',
            },
            input: {
              type: 'string',
              description: 'Input for the team',
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
        return this.executeTeam(params.arguments as TeamExecuteArgs);
      }
    );

    // Tool: Execute a workflow
    this.registerTool(
      {
        name: 'workflow/execute',
        description: 'Execute a PCL workflow',
        inputSchema: {
          type: 'object',
          properties: {
            workflow: {
              type: 'string',
              description: 'Name or ID of the workflow',
            },
            input: {
              type: 'object',
              description: 'Input data for the workflow',
            },
          },
          required: ['workflow', 'input'],
        },
      },
      async (params: McpToolCallParams) => {
        return this.executeWorkflow(params.arguments as WorkflowExecuteArgs);
      }
    );
  }

  /**
   * Register PCL resources (persona definitions, outputs, etc.)
   */
  private registerPclResources(): void {
    // Resource: Get persona definition
    this.registerResource(
      {
        uri: 'persona://definition/{name}',
        name: 'Persona Definition',
        description: 'PCL persona definition (source code)',
        mimeType: 'text/x-pcl',
      },
      async (uri: string) => {
        const name = uri.replace('persona://definition/', '');
        return this.getPersonaDefinition(name);
      }
    );

    // Resource: Get team definition
    this.registerResource(
      {
        uri: 'team://definition/{name}',
        name: 'Team Definition',
        description: 'PCL team definition (source code)',
        mimeType: 'text/x-pcl',
      },
      async (uri: string) => {
        const name = uri.replace('team://definition/', '');
        return this.getTeamDefinition(name);
      }
    );

    // Resource: Get workflow definition
    this.registerResource(
      {
        uri: 'workflow://definition/{name}',
        name: 'Workflow Definition',
        description: 'PCL workflow definition (source code)',
        mimeType: 'text/x-pcl',
      },
      async (uri: string) => {
        const name = uri.replace('workflow://definition/', '');
        return this.getWorkflowDefinition(name);
      }
    );
  }

  /**
   * Execute a persona
   */
  private async executePersona(args: PersonaExecuteArgs): Promise<McpToolCallResult> {
    try {
      // Find persona in runtime
      const persona = this.findPersona(args.persona);

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

      // Execute persona
      const result = await this.runtime.executePersona(persona, {
        input: args.input,
        context: args.context || {},
      });

      return {
        content: [
          {
            type: 'text',
            text: result.output || 'No output',
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
      const personas = this.runtime.getPersonas();
      const personaList = personas
        .map((p) => `- ${p.name}: ${p.roleDefinition || 'No description'}`)
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
  private async getPersonaInfo(args: { persona: string }): Promise<McpToolCallResult> {
    try {
      const persona = this.findPersona(args.persona);

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

      const info = [
        `**Persona**: ${persona.name}`,
        `**Role**: ${persona.roleDefinition || 'N/A'}`,
        `**Instructions**: ${persona.instructions || 'N/A'}`,
        `**Skills**: ${persona.skills?.length || 0}`,
        `**Capabilities**: ${persona.capabilities?.join(', ') || 'N/A'}`,
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
      const team = this.findTeam(args.team);

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

      const result = await this.runtime.executeTeam(team, {
        input: args.input,
        context: args.context || {},
      });

      return {
        content: [
          {
            type: 'text',
            text: result.output || 'No output',
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
   * Execute a workflow
   */
  private async executeWorkflow(args: WorkflowExecuteArgs): Promise<McpToolCallResult> {
    try {
      const workflow = this.findWorkflow(args.workflow);

      if (!workflow) {
        return {
          content: [
            {
              type: 'text',
              text: `Workflow not found: ${args.workflow}`,
            },
          ],
          isError: true,
        };
      }

      const result = await this.runtime.executeWorkflow(workflow, args.input);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing workflow: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Get persona definition (source code)
   */
  private async getPersonaDefinition(name: string): Promise<McpResourceContent> {
    const persona = this.findPersona(name);

    if (!persona) {
      throw new Error(`Persona not found: ${name}`);
    }

    // Generate PCL source code for the persona
    const source = this.generatePersonaSource(persona);

    return {
      uri: `persona://definition/${name}`,
      mimeType: 'text/x-pcl',
      text: source,
    };
  }

  /**
   * Get team definition (source code)
   */
  private async getTeamDefinition(name: string): Promise<McpResourceContent> {
    const team = this.findTeam(name);

    if (!team) {
      throw new Error(`Team not found: ${name}`);
    }

    const source = this.generateTeamSource(team);

    return {
      uri: `team://definition/${name}`,
      mimeType: 'text/x-pcl',
      text: source,
    };
  }

  /**
   * Get workflow definition (source code)
   */
  private async getWorkflowDefinition(name: string): Promise<McpResourceContent> {
    const workflow = this.findWorkflow(name);

    if (!workflow) {
      throw new Error(`Workflow not found: ${name}`);
    }

    const source = this.generateWorkflowSource(workflow);

    return {
      uri: `workflow://definition/${name}`,
      mimeType: 'text/x-pcl',
      text: source,
    };
  }

  // Helper methods

  private findPersona(nameOrId: string): Persona | null {
    const personas = this.runtime.getPersonas();
    return personas.find((p) => p.name === nameOrId || p.id === nameOrId) || null;
  }

  private findTeam(nameOrId: string): Team | null {
    const teams = this.runtime.getTeams();
    return teams.find((t) => t.name === nameOrId) || null;
  }

  private findWorkflow(nameOrId: string): Workflow | null {
    const workflows = this.runtime.getWorkflows();
    return workflows.find((w) => w.name === nameOrId) || null;
  }

  private generatePersonaSource(persona: Persona): string {
    return `persona ${persona.name} {\n  role: "${persona.roleDefinition || ''}"\n  instructions: "${persona.instructions || ''}"\n}`;
  }

  private generateTeamSource(team: Team): string {
    return `team ${team.name} {\n  members: [${team.members?.join(', ') || ''}]\n}`;
  }

  private generateWorkflowSource(workflow: Workflow): string {
    return `workflow ${workflow.name} {\n  // Workflow definition\n}`;
  }
}

// Types for tool arguments

interface PersonaExecuteArgs {
  persona: string;
  input: string;
  context?: Record<string, unknown>;
}

interface TeamExecuteArgs {
  team: string;
  input: string;
  context?: Record<string, unknown>;
}

interface WorkflowExecuteArgs {
  workflow: string;
  input: Record<string, unknown>;
}
