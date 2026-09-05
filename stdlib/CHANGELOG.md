# PCL Standard Library — Changelog

Versions follow [semantic versioning](https://semver.org/) per skill. A skill's
version is declared in the `version:` field of its `SKILL.md`.

- **MAJOR** — a consumer that worked before can break: a capability removed from
  `allowed-tools`, a change of resolvable name, or a change of path.
- **MINOR** — content or metadata added or corrected, compatible either way.
- **PATCH** — typo or formatting only.

---

## Library 3.1.0 — 2026-09-05

Seventeen new skills, 174 → 191, and a fifteenth category. No breaking changes:
everything here is additive.

Selection was driven by cross-referencing the library's coverage against
observed usage — Stack Overflow and GitHub Octoverse survey data for
technologies, and install rankings on public agent-skill registries for the
_shape_ of skills people actually use.

### Added — `workflows/` (new category)

The registries' most-installed skills are procedures, not domain knowledge. The
library had 174 skills of the form `<domain>-expert` and none of the form
"what do I do, in what order". These four close that gap and introduce the
`<activity>-workflow` naming convention:

| Skill                  | Covers                                                      |
| ---------------------- | ----------------------------------------------------------- |
| `tdd-workflow`         | Red-green-refactor, characterisation tests, legacy seams    |
| `refactoring-workflow` | Transformation catalogue, parallel change, strangler fig    |
| `debugging-workflow`   | Hypothesis and bisection, flaky tests, production debugging |
| `code-review-workflow` | Review order, severity, per-change-type checklists          |

`code-review-workflow` complements the existing `code-review-expert` rather than
replacing it: the workflow is the procedure, the expert is the judgement inside
it. Consider merging them if the split proves confusing in use.

### Added — applied AI

The library referenced LLMs in tags but had no skill covering them. `pgvector`
appeared zero times across 174 skills; `LangChain` once; `MCP` twice, despite
the repository shipping an MCP integration guide.

- `llm-engineering-expert` — prompt design, structured output, evaluation
  harnesses, guardrails, cost and latency
- `rag-expert` — chunking, hybrid retrieval, reranking, grounding, with five
  vector stores as references rather than as five skills
- `agent-engineering-expert` — tool design, the bounded loop, memory, MCP,
  multi-agent orchestration, and prompt-injection defence by capability
  separation

### Added — capabilities, data, security, interface, meta

- `document-processing-expert` — PDF, DOCX, XLSX and PPTX in one skill with four
  references; the most standardised skill category in the ecosystem and entirely
  absent here
- `browser-automation-expert` — driving a browser as a client against third-party
  sites, including the legal and ethical checks. Distinct from `playwright-expert`,
  which covers browsers as a testing tool against your own application
- `mysql-expert` — the second most widely used database, previously absent while
  several far rarer stores had skills
- `analytical-databases-expert` — DuckDB, ClickHouse, Parquet, warehouse cost control
- `stream-processing-expert` — Flink, Spark Structured Streaming, CDC, watermarks
- `secrets-management-expert` — vaults, KMS envelope encryption, rotation,
  leak response, post-quantum migration planning
- `supply-chain-security-expert` — SBOM, SCA, SLSA provenance, signing (OWASP A03)
- `identity-access-expert` — OAuth 2.1/OIDC, sessions, RBAC/ABAC, multi-tenancy
  (OWASP A01)
- `accessibility-expert` — WCAG 2.2, ARIA, keyboard, screen readers. The
  `design/` category previously held only `design-expert`, which despite its name
  covers software architecture, leaving accessibility with no home
- `skill-router` — finding and composing skills across 191, and the disambiguation
  table for overlapping pairs

### Grouping

Skills were grouped by _decision context_ rather than by technology, so the
library grows by 17 rather than by roughly 50. Five vector stores share one
mental model and live inside `rag-expert`; four document formats live inside
`document-processing-expert`. Per-tool detail sits in `references/`, read on
demand, which the progressive-disclosure work in 3.0.0 made cheap.

Four gaps were addressed by extending existing skills instead of adding new
ones: PyTorch and TensorFlow belong in `ml-expert`, OpenTelemetry in
`monitoring-expert`, Pulumi and Crossplane in `terraform-expert`. Those
extensions are not in this release.

### Known limitation

Unchanged from 3.0.0: skill versions are still not read at runtime.

---

## Library 3.0.0 — 2026-09-04

Agent Skills v1.0 conformance pass across all 174 skills. **This release
contains breaking changes**: one skill was removed, five moved, and seven had
capabilities withdrawn.

### Breaking

**One skill removed**

`domains/legal-tech-expert` covered the same ground as `domains/legaltech-expert`
with different content. The two were merged into `legaltech-expert` (which keeps
the naming of the `agtech` / `biotech` / `fintech` / `healthtech` / `proptech` /
`regtech` family), and `legal-tech-expert` was deleted. Everything the removed
skill covered that the survivor lacked — learning objectives, prerequisites,
case-management and compliance practices, practical anti-patterns, platform and
framework resources — was carried over.

_Migration:_ replace references to `legal-tech-expert` with `legaltech-expert`.

**Five skills moved** — the directory did not match the declared `name:`, so
resolution by path and resolution by name disagreed. The directory was corrected
(`2.0.0`):

| Skill                 | Old path                | New path                       |
| --------------------- | ----------------------- | ------------------------------ |
| `education-expert`    | `domains/education/`    | `domains/education-expert/`    |
| `farming-expert`      | `domains/farming/`      | `domains/farming-expert/`      |
| `healthcare-expert`   | `domains/healthcare/`   | `domains/healthcare-expert/`   |
| `logistics-expert`    | `domains/logistics/`    | `domains/logistics-expert/`    |
| `stockbreeder-expert` | `domains/stockbreeder/` | `domains/stockbreeder-expert/` |

_Migration:_ references by skill name are unaffected — they already used the
`-expert` form. References by path must be updated.

**Seven skills lost the unrestricted shell** — `allowed-tools` declared
`Bash(*)`, granting an unbounded shell. None of the six non-financial skills
contained a single shell command; all their examples are Python or YAML. The
grant was narrowed to the commands actually used (`2.0.0`):

| Skill                  | Before    | After                                        |
| ---------------------- | --------- | -------------------------------------------- |
| `devops-expert`        | `Bash(*)` | `Bash(python:*, python3:*, pip:*, pytest:*)` |
| `elasticsearch-expert` | `Bash(*)` | `Bash(python:*, python3:*, pip:*, pytest:*)` |
| `finops-expert`        | `Bash(*)` | `Bash(python:*, python3:*, pip:*, pytest:*)` |
| `performance-expert`   | `Bash(*)` | `Bash(python:*, python3:*, pip:*, pytest:*)` |
| `qa-expert`            | `Bash(*)` | `Bash(python:*, python3:*, pip:*, pytest:*)` |
| `sre-expert`           | `Bash(*)` | `Bash(python:*, python3:*, pip:*, pytest:*)` |
| `finance-expert`       | `Bash(*)` | _(no shell)_                                 |

`finance-expert` documents code that charges cards and reads bank accounts. It
is an advisory skill, so it now grants no shell at all: running payment code
should be a separate, deliberately authorised act.

_Migration:_ a workflow that relied on one of these skills to run arbitrary
commands must declare that capability itself, or use a skill scoped to it.

### Added

- **Activation triggers.** Every description now states an explicit
  `Use when ...` clause naming the keywords and tasks that should select the
  skill. Previously 152 of 174 descriptions said only what the skill was about,
  giving an agent nothing to match on.
- **Progressive disclosure.** 127 oversized skills were split: bulk material
  moved into `references/`, read on demand, leaving an index in `SKILL.md`. A
  `SKILL.md` now averages 277 lines instead of 644, and none exceeds 500.
- **Money-movement and execution guardrails** in `finance-expert` and
  `trading-expert`: test mode by default, human approval before money moves,
  amount and position limits, idempotency, kill switch, audit trail, and the
  regulatory perimeter.

### Fixed

- **Unparseable metadata in 20 skills.** An H1 preceded the `---` block and the
  key was `skill_id:` instead of `name:`, so any parser reading frontmatter at
  offset 0 saw no metadata at all. Rebuilt; the objectives, prerequisites and
  outcome they carried are now real body sections.
- **Missing `version:` in 21 skills**; `keywords` folded into `tags`,
  `expertise_level` moved under `metadata`.
- **Ten skills declared `category: industry-specializations`** while living
  under `domains/`. Aligned, with the original kept as
  `metadata.legacy-category`.
- **Seventy-one skills stored as flat files** rather than their own directory,
  which prevented them from carrying companion resources. Converted.
- **Credential literals.** Stripe keys, JWT signing keys, an Express session
  secret, a Redis password and WiFi credentials were inlined in examples, in
  `api-design-expert`, `finance-expert`, `fintech-expert`, `iot-expert`,
  `redis-expert` and `zero-trust-expert`. All load from the environment now. An
  Ansible Vault example that showed plaintext under an "encrypted" label was
  corrected.
- **Payment correctness in `finance-expert`:** idempotency keys were documented
  but absent (double-charge on retry); webhook signature failures were not
  caught, so a forged event raised uncaught instead of being rejected;
  `int(amount * 100)` truncated fractions of a cent.
- **Order safety in `trading-expert`:** `place_order` routed without any
  pre-trade risk check although a `RiskManager` sat unused in the next section.
  Risk validation now runs before routing and raises rather than returning a
  boolean a caller can ignore; live routing is opt-in.
- **Eight broken documentation links** pointing at `docs/reference/*` files that
  do not exist, or written at the wrong directory depth.
- **A prematurely closed code fence** in `skill-creator-expert` that leaked
  template content into prose.

### Known limitation

A skill's `version` is **not read at runtime**. `parseSkillMd` ignores both
`version` and `category`, and `toSkillMd` writes the version into an HTML
comment rather than the frontmatter, so a load/save round trip loses it.
Version constraints are not resolvable either: `python-expert@1.0.0` is treated
as a literal skill name, and the registry passes the version into a free-text
search then takes the first result. The versions recorded here are therefore
accurate documentation, but nothing enforces them yet.

---

## Library 2.0.0 — 2026-01-19

Expansion from 100 to 173 skills. All skills at `1.0.0`.
