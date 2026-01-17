# 🔬 PCL Reference Implementations

**Example implementations, code samples, and integration patterns.**

---

## What This Folder Contains

This folder contains **reference implementations** demonstrating:

1. **Complete Examples** - Full PCL programs showcasing features
2. **Integration Patterns** - How to integrate PCL with existing systems
3. **Provider Examples** - AI provider-specific implementations
4. **Best Practices** - Recommended patterns and anti-patterns

---

## Example Categories

### 1. Basic Examples

Simple, self-contained PCL programs for learning:

- `01-hello-persona.pcl` - Your first persona
- `02-persona-with-skills.pcl` - Adding skills
- `03-team-collaboration.pcl` - Multiple personas working together
- `04-workflow-basics.pcl` - Simple workflows

### 2. Security Examples

Security-focused implementations:

- `security-review-workflow.pcl` - OWASP LLM-aligned security review
- `threat-modeling-team.pcl` - Threat modeling with SEC persona
- `audit-logging-example.pcl` - ISO 27001-compliant audit logs
- `zero-trust-policy.pcl` - Zero Trust security policies

### 3. Compliance Examples

Standards-aligned implementations:

- `iso42001-aims-example.pcl` - ISO 42001 AI Management System
- `eu-ai-act-compliance.pcl` - EU AI Act risk classification
- `gdpr-data-protection.pcl` - GDPR-compliant data handling
- `soc2-controls.pcl` - SOC 2 Type II controls

### 4. Provider Integrations

AI provider-specific examples:

- `openai-integration.mjs` - OpenAI GPT-4/GPT-4o
- `anthropic-integration.mjs` - Claude Sonnet/Opus
- `azure-openai-integration.mjs` - Azure OpenAI Service
- `ollama-local-integration.mjs` - Local models via Ollama

### 5. Advanced Patterns

Complex, production-ready examples:

- `multi-agent-orchestration.pcl` - Complex multi-persona workflows
- `human-in-the-loop-approval.pcl` - Approval workflows
- `policy-enforcement-engine.pcl` - Runtime policy engine
- `siem-integration.mjs` - Splunk/ELK/Sentinel integration

---

## Integration Examples

### OpenAI Integration

```javascript
import { PCLRuntime } from '@pcl-lang/runtime';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const runtime = new PCLRuntime({ provider: openai });

const persona = await runtime.loadPersona('ARCHITECT');
const response = await persona.execute({
  task: 'Design a microservices architecture',
});

console.log(response.output);
```

### Anthropic Integration

```javascript
import { PCLRuntime } from '@pcl-lang/runtime';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const runtime = new PCLRuntime({ provider: anthropic });

const persona = await runtime.loadPersona('SEC');
const response = await persona.execute({
  task: 'Perform security threat modeling',
});

console.log(response.output);
```

---

## Testing Reference Implementations

All examples include **test coverage** and **compliance validation**:

```bash
# Run all reference implementation tests
npm run test:ref

# Run specific example
npm run test:ref -- openai-integration

# Validate compliance
npm run validate:compliance
```

---

## Contributing Examples

See [GOVERNANCE/CONTRIBUTING_COMPLIANCE.md](../GOVERNANCE/CONTRIBUTING_COMPLIANCE.md) for guidelines on contributing reference implementations.

**Requirements:**

- ✅ Follow PCL best practices
- ✅ Include compliance annotations
- ✅ Add test coverage (≥80%)
- ✅ Document security considerations

---

## Example Structure

Each reference implementation should include:

```
example-name/
├── README.md              # Description and usage
├── example.pcl            # PCL source code
├── example.mjs            # JavaScript integration
├── example.test.ts        # Unit tests
├── compliance.md          # Compliance notes
└── security-review.md     # Security considerations
```

---

## Related Documentation

- **Specifications**: [/SPEC](../SPEC/) - Language specs
- **Core Concepts**: [/CORE](../CORE/) - PCL fundamentals
- **Governance**: [/GOVERNANCE](../GOVERNANCE/) - Contribution guidelines

---

**Maintained by**: PCL Community
**Last Updated**: January 17, 2026
