# PCL Standard Library — Changelog

Versions follow [semantic versioning](https://semver.org/) per skill. A skill's
version is declared in the `version:` field of its `SKILL.md`.

- **MAJOR** — a consumer that worked before can break: a capability removed from
  `allowed-tools`, a change of resolvable name, or a change of path.
- **MINOR** — content or metadata added or corrected, compatible either way.
- **PATCH** — typo or formatting only.

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
