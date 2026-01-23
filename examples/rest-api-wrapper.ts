/**
 * REST API Wrapper for PCL (for ChatGPT Actions, DeepSeek, etc.)
 *
 * This creates an HTTP API that non-MCP clients can use
 */

import express from 'express';
import { createRuntime, compile } from '@pcl/sdk';
import { readFileSync } from 'fs';

const app = express();
app.use(express.json());

// Load PCL program
const source = readFileSync('./personas.pcl', 'utf-8');
const compiled = compile(source);

if (!compiled.ok) {
  console.error('PCL compilation failed:', compiled.error);
  process.exit(1);
}

const runtime = createRuntime();
runtime.load(compiled.value.program);

// Set AI provider
import { AnthropicProvider } from '@pcl/sdk';
const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});
runtime.setDefaultProvider(provider);

/**
 * OpenAPI/ChatGPT Actions Compatible Endpoints
 */

// List available personas
app.get('/api/personas', (req, res) => {
  const personas = runtime.getAllPersonas();
  res.json({
    personas: personas.map(p => ({
      id: p.getState().id,
      name: p.getState().name,
      active: p.getState().active,
      skills: p.getState().config.skills,
      tags: p.getState().config.tags,
    })),
  });
});

// Execute a persona
app.post('/api/personas/:id/execute', async (req, res) => {
  const { id } = req.params;
  const { input, context } = req.body;

  if (!input) {
    return res.status(400).json({ error: 'Input is required' });
  }

  // Activate persona
  const activateResult = runtime.activate(id);
  if (!activateResult.ok) {
    return res.status(404).json({ error: `Persona not found: ${id}` });
  }

  // Send message
  const result = await runtime.send(id, input, context || {});

  if (!result.ok) {
    return res.status(500).json({ error: result.error.message });
  }

  res.json({
    persona: id,
    response: result.value.content,
    confidence: result.value.confidence,
    metadata: result.value.metadata,
  });
});

// List teams
app.get('/api/teams', (req, res) => {
  const teams = runtime.getAllTeams();
  res.json({
    teams: teams.map(t => ({
      id: t.getState().id,
      name: t.getState().name,
      members: t.getState().members.map(m => m.name),
      mergeMode: t.getState().config.mergeMode,
    })),
  });
});

// Execute a team
app.post('/api/teams/:id/execute', async (req, res) => {
  const { id } = req.params;
  const { input, context } = req.body;

  if (!input) {
    return res.status(400).json({ error: 'Input is required' });
  }

  // Activate team
  const activateResult = runtime.activateTeam(id);
  if (!activateResult.ok) {
    return res.status(404).json({ error: `Team not found: ${id}` });
  }

  // Send message
  const result = await runtime.sendToTeam(id, input, context || {});

  if (!result.ok) {
    return res.status(500).json({ error: result.error.message });
  }

  res.json({
    team: id,
    response: result.value.content,
    metadata: result.value.metadata,
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', personas: runtime.getAllPersonas().length });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PCL REST API running on http://localhost:${PORT}`);
  console.log(`Personas: ${runtime.getAllPersonas().length}`);
  console.log(`Teams: ${runtime.getAllTeams().length}`);
  console.log('\nEndpoints:');
  console.log(`  GET  /api/personas`);
  console.log(`  POST /api/personas/:id/execute`);
  console.log(`  GET  /api/teams`);
  console.log(`  POST /api/teams/:id/execute`);
});
