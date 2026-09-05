---
name: skill-router
version: 1.0.0
description: >-
  Find the right skill in the PCL standard library and compose several when a task spans
  domains. Use when the user asks which skill applies, cannot find a capability, wants to
  know what the library covers, is starting a task that spans several domains, or when the
  task involves choosing between overlapping skills, discovering skills by keyword, or
  deciding whether a new skill is needed.
category: tools
tags: [discovery, routing, skill-selection, composition, catalog, meta]
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(python:*, jq:*)
metadata:
  author: PCL Standard Library
  complexity: beginner
---

# Skill Router

The library holds 191 skills across 15 categories. This skill answers which ones
apply to a task, and how to combine them.

## Core Concepts

### Route on the Task, Not the Technology

"Fix this slow query" is not a PostgreSQL question until you know the query is
in PostgreSQL. Start from what the user is trying to do, then narrow by the
technology actually in the repository.

### Two Shapes of Skill

| Shape                | Naming                | Answers                                       | Examples                             |
| -------------------- | --------------------- | --------------------------------------------- | ------------------------------------ |
| **Domain expertise** | `<domain>-expert`     | "How does X work, and what is good practice?" | `postgresql-expert`, `react-expert`  |
| **Procedure**        | `<activity>-workflow` | "What do I do, in what order?"                | `tdd-workflow`, `debugging-workflow` |

A task usually needs one of each: the workflow drives the sequence, the expert
supplies the judgement inside it.

### Compose, Don't Concatenate

Loading five skills fills the context and dilutes attention. Load the workflow
plus the one or two experts whose material the task actually touches, and consult
a third only if the work reaches it.

## Finding a Skill

The catalogue is machine-readable and is the fastest route:

```bash
# By keyword across names, descriptions and tags
jq -r '.skills[] | select(
         (.name + " " + .description + " " + (.tags | join(" ")))
         | ascii_downcase | contains("kafka")
       ) | "\(.category)/\(.name)"' stdlib/catalog/skill-catalog.json

# Everything in a category
jq -r '.skills[] | select(.category == "security") | .name' stdlib/catalog/skill-index.json

# What a skill covers, before loading it
jq -r '.skills[] | select(.name == "rag-expert") | .description' stdlib/catalog/skill-catalog.json
```

Or by filesystem, which is often quicker for a name you half-remember:

```bash
find stdlib -maxdepth 2 -type d -name '*postgres*'
grep -rl "watermark" stdlib --include=SKILL.md
```

Every description contains an explicit `Use when …` clause naming the keywords
and tasks that should select it. Read that clause rather than guessing from the
name.

## The Category Map

| Category        | Holds                                                | Reach for it when                              |
| --------------- | ---------------------------------------------------- | ---------------------------------------------- |
| `workflows/`    | Procedures: TDD, refactoring, debugging, code review | The question is "how do I proceed?"            |
| `languages/`    | 23 programming languages                             | Idiom, tooling, or language-specific behaviour |
| `frameworks/`   | 15 web, mobile and desktop frameworks                | Framework conventions and lifecycle            |
| `api/`          | REST, GraphQL, gRPC, OpenAPI, microservices          | Designing or consuming an interface            |
| `data/`         | Databases, warehouses, pipelines, BI                 | Storage, queries, analytics, streaming         |
| `devops/`       | Containers, orchestration, IaC, CI/CD, observability | Build, deploy, run                             |
| `cloud/`        | AWS, Azure, GCP, Cloudflare                          | Provider-specific services                     |
| `ai/`           | ML, LLM engineering, RAG, agents                     | Anything model-based                           |
| `security/`     | AppSec, identity, secrets, supply chain, compliance  | A security question, at any stage              |
| `qa/`           | Test frameworks, load, chaos                         | Writing or running tests                       |
| `tools/`        | Git, documents, browsers, chat platforms, this skill | Working with a tool rather than a domain       |
| `domains/`      | Industry verticals and enterprise platforms          | Domain rules: healthcare, finance, SAP         |
| `professional/` | Accounting, legal, banking, FinOps, standards        | Non-engineering expertise                      |
| `scientific/`   | Research, quantum, biology                           | Scientific computing                           |
| `design/`       | Architecture patterns, accessibility                 | Structure or interface quality                 |

Note that `design/design-expert` covers **software architecture**, not visual
design — a legacy naming artefact. `accessibility-expert` is the interface skill.

## Choosing Between Overlapping Skills

Several pairs look similar. The distinctions that matter:

| If the task is…                             | Use                                 | Not                           |
| ------------------------------------------- | ----------------------------------- | ----------------------------- |
| Driving a browser to _test your own app_    | `playwright-expert`                 | `browser-automation-expert`   |
| Driving a browser to _get data from a site_ | `browser-automation-expert`         | `playwright-expert`           |
| The _process_ of reviewing a change         | `code-review-workflow`              | `code-review-expert`          |
| _What good code looks like_ per dimension   | `code-review-expert`                | `code-review-workflow`        |
| A security breach investigation             | `incident-response-expert`          | `debugging-workflow`          |
| A production defect, no attacker            | `debugging-workflow`                | `incident-response-expert`    |
| Transactional workload, rows                | `postgresql-expert`, `mysql-expert` | `analytical-databases-expert` |
| Aggregates over huge tables                 | `analytical-databases-expert`       | `postgresql-expert`           |
| Moving events continuously                  | `stream-processing-expert`          | `airflow-expert`              |
| Scheduled batch orchestration               | `airflow-expert`                    | `stream-processing-expert`    |
| Prompt design and model output              | `llm-engineering-expert`            | `agent-engineering-expert`    |
| A model that _calls tools_                  | `agent-engineering-expert`          | `llm-engineering-expert`      |
| Answering over your documents               | `rag-expert`                        | `elasticsearch-expert`        |

## Composition Patterns

Common tasks and the skills that serve them:

**"Add a feature to our API, test-first"**
`tdd-workflow` (the loop) → `api-design-expert` (contract) → the language skill →
`code-review-workflow` (before merge)

**"Our checkout is slow"**
`debugging-workflow` (method) → `performance-expert` (measurement) → the database
or framework skill, once measurement says which

**"Build an assistant over our documentation"**
`rag-expert` (retrieval) → `llm-engineering-expert` (generation and evaluation) →
`agent-engineering-expert` (only if it calls tools) → `identity-access-expert`
(who may see which documents)

**"Harden our release pipeline"**
`supply-chain-security-expert` (provenance, SBOM) → `cicd-expert` (pipeline) →
`secrets-management-expert` (credentials)

**"Make the dashboard accessible"**
`accessibility-expert` (conformance) → the framework skill (implementation) →
`qa-expert` (regression coverage)

**"Migrate a large table with no downtime"**
`refactoring-workflow` (parallel change) → the database skill (mechanics) →
`sre-expert` (rollout and rollback)

## When No Skill Fits

Before concluding a skill is missing:

1. **Search the catalogue by tag**, not by the name you expected.
2. **Check `references/`** — the topic may be a section inside a broader skill.
   `rails` lives in `ruby-expert`, `spark` in `databricks-expert` and
   `analytical-databases-expert`.
3. **Check whether a broader skill covers it.** `vector-databases` is inside
   `rag-expert` by design, because the choice only matters in that context.

If it is genuinely absent, the test for adding one is whether it is a distinct
_decision context_ rather than a distinct technology. Five vector stores share
one mental model and belong in one skill with per-store references; MySQL and
PostgreSQL differ enough in design consequences to warrant separate skills.

Use `skill-creator-expert` to author it, and `scripts/validate-skills.py` to
check conformance.

## Best Practices

- **Read the `Use when` clause** before loading a skill; it is written to be the
  routing signal.
- **Start with the workflow** when the question is procedural — it will name the
  expert skills it needs.
- **Load two or three skills, not six.** Add a fourth when the work reaches it.
- **Prefer the specific skill.** `mysql-expert` over `sql-expert` when the
  database is MySQL.
- **Consult `security/` early**, not as a final review — the cheapest security
  fixes are design decisions.
- **Follow the reference links** rather than loading a second skill for a detail;
  `references/` is where the depth lives.

## Anti-Patterns

- **Routing on a keyword in isolation.** "Java" in "JavaScript" is not
  `java-expert`.
- **Loading every plausibly related skill** — dilutes attention and fills the
  context budget.
- **Picking the general skill** when a specific one exists.
- **Skipping the workflow skill** and improvising the procedure.
- **Assuming a topic is missing** because the skill is not named after it.

## Resources

- `stdlib/catalog/skill-index.json` — name, category, path, tags
- `stdlib/catalog/skill-catalog.json` — full descriptions, sizes, reference lists
- `stdlib/SKILLS_INVENTORY.md` — human-readable listing by category
- `stdlib/CHANGELOG.md` — versioning and migration notes
- `skill-creator-expert` — authoring a new skill
