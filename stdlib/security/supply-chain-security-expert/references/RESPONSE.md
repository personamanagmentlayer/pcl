# Supply Chain Security — Response Playbook

Reference material for the `supply-chain-security-expert` skill. See [SKILL.md](../SKILL.md).

## A Dependency You Use Is Compromised

The clock starts when the advisory publishes. Speed comes from preparation — the
SBOM index and the artefact inventory — not from heroics.

### 1. Determine exposure (minutes, not hours)

```bash
# Which released artefacts contain the package?
for sbom in sboms/*.cdx.json; do
  jq -r --arg name "$PKG" \
    'select(.components[]? | select(.name == $name)) | input_filename' "$sbom"
done

# Which of those are actually deployed?
kubectl get pods -A -o jsonpath='{range .items[*]}{.spec.containers[*].image}{"\n"}{end}' \
  | sort -u | grep -F "$IMAGE"
```

If this takes longer than a few minutes, the gap is the inventory, and that is
the finding to fix afterwards.

### 2. Assess reachability

Presence is not exposure. Determine whether the malicious or vulnerable code
path can be reached:

- Is the package imported at all, or only present transitively and unused?
- Does the affected function run in your code path?
- Is it fed untrusted input?
- Does it run at build time, install time, or runtime? Each implies different
  blast radius.

```bash
grep -rn "require('vulnerable-pkg')\|from vulnerable_pkg" --include='*.ts' --include='*.py' src/
```

### 3. Contain

If the package is actively malicious rather than merely vulnerable, assume the
build and any environment that ran it are compromised:

- Rotate every credential that was reachable from the build environment or the
  running workload. This includes CI tokens, cloud roles, registry credentials
  and any application secret in scope.
- Block the version at the registry proxy so no build can pull it again.
- Preserve evidence: the lockfile, build logs, the artefact, network egress logs
  for the period.

```bash
# Check egress from the affected window - exfiltration is the usual payload
grep -E "$(date -d '7 days ago' +%Y-%m-%d)" /var/log/egress.log \
  | grep -v -F -f allowed-hosts.txt | head -50
```

### 4. Remediate

```bash
npm audit fix --package-lock-only        # then verify the diff by hand
npm install pkg@1.2.4 --save-exact
npm ci && npm test
```

If no fixed version exists, in order of preference: pin to the last known-good
version, apply an override to force a safe transitive version, vendor a patched
copy with a tracking issue, or remove the dependency.

```json
{
  "overrides": {
    "vulnerable-transitive": "1.2.4"
  }
}
```

Overrides are a temporary measure. They diverge from what the direct dependency
declares it supports, so record why and revisit.

### 5. Verify and close

- Rebuild, regenerate the SBOM, confirm the package version changed.
- Redeploy everywhere the inventory listed, and re-verify the inventory is empty.
- Write the timeline: publication, detection, exposure known, contained,
  remediated. The gap between publication and detection is the number worth
  improving.

## Triage That Scales

The finding volume from a first scan is demoralising and mostly noise. Reduce it
in this order:

1. **`--ignore-unfixed`.** A vulnerability with no available fix is a monitoring
   item, not a work item.
2. **Filter by reachability.** Tools with call-graph analysis eliminate most
   findings; where unavailable, check imports by hand for the top severities.
3. **Filter by exposure.** An internet-facing service and a nightly batch job
   with the same CVE are not the same risk.
4. **Then rank by severity.**

Set the gate to **new** findings rather than total, so the build fails on
regression rather than on the accumulated backlog:

```bash
grype sbom:sbom.cdx.json --fail-on critical --only-fixed \
  --exclude-from baseline-findings.json
```

Maintain the baseline with expiry dates so suppressions cannot become permanent:

```yaml
# .grype-baseline.yaml
ignore:
  - vulnerability: CVE-2026-12345
    reason: 'XML parser not reachable; JSON codec only. VEX published.'
    expires: 2026-12-31
    owner: platform-team
```

## Writing VEX

VEX turns a repeated manual argument into a machine-readable statement, which is
what customer questionnaires and downstream scanners consume.

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.6",
  "metadata": { "timestamp": "2026-09-05T10:00:00Z" },
  "vulnerabilities": [
    {
      "id": "CVE-2026-12345",
      "source": { "name": "NVD" },
      "affects": [{ "ref": "pkg:npm/vulnerable-pkg@1.2.3" }],
      "analysis": {
        "state": "not_affected",
        "justification": "vulnerable_code_not_in_execute_path",
        "detail": "The advisory concerns the XML entity resolver. This service configures the JSON codec exclusively; the XML path is unreachable.",
        "response": ["will_not_fix"]
      }
    }
  ]
}
```

Valid states: `not_affected`, `affected`, `fixed`, `under_investigation`.
Justifications are an enumerated set — use them rather than free text, or
downstream tooling cannot act on the statement.

Publish VEX alongside the SBOM for each release. It is the difference between
answering the same question for every customer and answering it once.

## Regulatory Context

The obligations are real and increasingly specific.

**NIS2** (applicable since 18 October 2024) requires supply chain risk
management for essential and important entities: assessing supplier security,
managing vulnerabilities, and incident reporting on a defined timeline. Management
bodies carry personal accountability.

**Cyber Resilience Act** obligations phase in for products with digital elements
sold in the EU: vulnerability handling processes, an SBOM for at least top-level
dependencies, security updates for the support period, and reporting of actively
exploited vulnerabilities.

**DORA** (financial sector, since 17 January 2025) requires ICT third-party risk
management, a register of contractual arrangements, and resilience testing.

What this means practically, whatever your sector:

- Maintain a dependency inventory you can produce on request.
- Have a documented vulnerability handling process with defined timelines.
- Keep records: what you shipped, what was in it, what you decided about each
  finding and why.
- Know your incident reporting obligations and their deadlines **before** an
  incident, not during.

Treat these as the floor. They mandate the practices in this skill; they do not
substitute for judgement about your own risk.

## Preparation Checklist

The work that makes response fast, done before it is needed:

- [ ] SBOM generated and stored for every release, indexed by artefact digest
- [ ] Inventory mapping artefact digests to running deployments
- [ ] Continuous scanning of released artefacts, not only at build
- [ ] Lockfiles committed; `npm ci` / `--require-hashes` in CI
- [ ] `ignore-scripts` enabled, exceptions explicit
- [ ] Internal scopes bound to the internal registry only
- [ ] Actions and base images pinned by digest
- [ ] Build provenance emitted and verified at admission
- [ ] Credential rotation runbook tested, not just written
- [ ] Egress logging retained long enough to investigate
- [ ] Named owner for dependency findings, with a triage cadence
