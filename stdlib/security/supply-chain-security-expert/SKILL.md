---
name: supply-chain-security-expert
version: 1.0.0
description: >-
  Secure the path from dependency to deployed artefact: SBOMs, dependency scanning, build
  provenance, artefact signing and CI/CD integrity. Use when the user mentions supply chain
  security, SBOM, CycloneDX or SPDX, SCA or dependency scanning, Sigstore or cosign, SLSA,
  provenance and attestation, a compromised or typosquatted package, or when the task
  involves hardening a build pipeline or answering a vendor security questionnaire about
  dependencies.
category: security
tags:
  [
    supply-chain,
    sbom,
    sca,
    slsa,
    sigstore,
    provenance,
    dependencies,
    ci-cd-security,
    vulnerability-management,
  ]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(npm:*, pip:*, syft:*, grype:*, cosign:*, docker:*, git:*, osv-scanner:*, trivy:*)
  - Grep
  - Glob
metadata:
  author: PCL Standard Library
  complexity: advanced
---

# Supply Chain Security Expert

Most of what ships is code nobody on the team wrote. OWASP ranks software supply
chain failures among the highest-impact categories in the 2025 Top 10, and EU
regulation (NIS2, and the Cyber Resilience Act) now makes dependency management a
compliance obligation rather than an engineering preference.

## Core Concepts

### The Attack Surface

| Vector                  | Example                                               | Primary control                            |
| ----------------------- | ----------------------------------------------------- | ------------------------------------------ |
| Malicious package       | Typosquat, or a maintainer account takeover           | Pinning, provenance, install-script review |
| Compromised dependency  | Legitimate package backdoored in a release            | SBOM plus continuous scanning              |
| Dependency confusion    | Internal package name resolved from a public registry | Scoped registries, explicit source pinning |
| Build system compromise | CI injects code into the artefact                     | Hermetic builds, provenance attestation    |
| Artefact tampering      | Registry image replaced after publication             | Signing, digest pinning, admission policy  |
| Credential theft in CI  | A leaked token publishes a malicious release          | OIDC federation, least-privilege tokens    |

### Know What You Ship

You cannot patch what you cannot enumerate. An SBOM is the inventory — generated
at build time from what actually went in, not written by hand.

### Provenance Is Stronger Than Scanning

Scanning tells you about known vulnerabilities. Provenance tells you that this
artefact was built from this commit by that pipeline. When a new advisory lands,
scanning finds it; when a build system is compromised, only provenance does.

## SBOM

Generate at build time, store as a build artefact, attach to the release.

```bash
# From a container image, a filesystem, or a lockfile
syft packages ghcr.io/acme/api:1.4.2 -o cyclonedx-json > sbom.cdx.json
syft packages dir:. -o spdx-json > sbom.spdx.json

# Scan the SBOM rather than re-resolving dependencies
grype sbom:sbom.cdx.json --fail-on high
osv-scanner --sbom sbom.cdx.json
```

CycloneDX suits security use; SPDX suits licence compliance. Producing both costs
one extra command.

An SBOM is only useful if it is queryable when an advisory lands:

```bash
# "Are we affected by the log4j-style advisory in package X?"
jq -r '.components[] | select(.name == "log4j-core") | "\(.name)@\(.version)"' sbom.cdx.json
```

Store SBOMs per release, indexed by artefact digest, retained as long as the
artefact runs anywhere. The question always arrives after the release.

## Dependency Hygiene

### Pin, and pin transitively

```bash
npm ci                              # lockfile only; fails if package.json disagrees
pip install --require-hashes -r requirements.txt
cargo build --locked
go mod verify
```

`npm install` in CI can resolve differently from local. `npm ci` cannot — it is
the difference between a reproducible build and a hope.

```
# requirements.txt with hashes: the registry cannot substitute content
cryptography==43.0.1 \
    --hash=sha256:8d09d05439ce7baa8e9e95b07ec5b6c886f548deb7e0f69ef25f64b3bce842f2
```

### Review what you add

Before a new direct dependency: is it maintained, does it have more than one
maintainer, what does it pull in transitively, what licence, and does it run
install scripts?

```bash
npm view <pkg> maintainers time.modified
npm ls <pkg> --all                          # who actually depends on it
npx license-checker --summary
docker run --rm -v "$PWD:/src" aquasec/trivy fs --scanners vuln,license /src
```

Disable install scripts by default and allow them explicitly:

```
# .npmrc
ignore-scripts=true
```

Most package-manager compromises execute at install time. This one line removes
that class.

### Prevent dependency confusion

```
# .npmrc — internal scope resolves only from the internal registry
@acme:registry=https://npm.internal.acme.com/
//npm.internal.acme.com/:_authToken=${NPM_TOKEN}
```

```ini
# pip.conf — never mix; --extra-index-url silently prefers the highest version
[global]
index-url = https://pypi.internal.acme.com/simple
```

`--extra-index-url` pointing at both an internal and the public index is the
dependency confusion vulnerability, not a mitigation: pip picks the highest
version wherever it lives.

## Vulnerability Management

Scanning produces more findings than anyone can fix. Triage by exploitability,
not by CVSS alone.

```bash
osv-scanner --lockfile package-lock.json --lockfile requirements.txt
grype ghcr.io/acme/api:1.4.2 --fail-on critical --only-fixed
trivy image --severity HIGH,CRITICAL --ignore-unfixed ghcr.io/acme/api:1.4.2
```

Triage questions, in order:

1. **Is the vulnerable code path reachable** from our application? Reachability
   analysis eliminates the majority of findings.
2. **Is it exploitable in our deployment** — is that parser fed untrusted input?
3. **Is a fix available?** `--only-fixed` separates actionable from noise.
4. **What is the exposure** — internet-facing, or an internal batch job?

Record the decision. A VEX document states, machine-readably, that a component is
present but not affected:

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.6",
  "vulnerabilities": [
    {
      "id": "CVE-2026-12345",
      "analysis": {
        "state": "not_affected",
        "justification": "vulnerable_code_not_in_execute_path",
        "detail": "XML parsing is not reached; we use the JSON codec exclusively."
      }
    }
  ]
}
```

Without VEX, the same finding is re-triaged by every scanner run and every
customer questionnaire.

## Build Integrity

SLSA describes build integrity in levels. The useful progression:

| Level | Requirement                             | Practical step                                         |
| ----- | --------------------------------------- | ------------------------------------------------------ |
| 1     | Provenance exists                       | Emit build metadata                                    |
| 2     | Signed provenance from a hosted builder | GitHub Actions attestations                            |
| 3     | Hardened, isolated builds               | Reusable trusted workflow, no self-hosted runner reuse |

```yaml
name: release
on:
  push:
    tags: ['v*']

permissions:
  contents: read
  id-token: write # OIDC: no long-lived registry credentials
  attestations: write
  packages: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - name: Build and push
        id: push
        run: |
          docker build -t "$IMAGE:$GITHUB_REF_NAME" .
          docker push "$IMAGE:$GITHUB_REF_NAME"
          echo "digest=$(docker inspect --format='{{index .RepoDigests 0}}' "$IMAGE:$GITHUB_REF_NAME")" >> "$GITHUB_OUTPUT"

      - uses: actions/attest-build-provenance@v2
        with:
          subject-name: ${{ env.IMAGE }}
          subject-digest: ${{ steps.push.outputs.digest }}
          push-to-registry: true

      - name: Generate and attach SBOM
        run: |
          syft "$IMAGE@${{ steps.push.outputs.digest }}" -o cyclonedx-json > sbom.cdx.json
          cosign attest --predicate sbom.cdx.json --type cyclonedx \
                        "$IMAGE@${{ steps.push.outputs.digest }}"
```

Pin actions to a **commit SHA**, not a tag. A tag is mutable: `@v4` can be moved
to point at anything, and that has been used in real attacks.

## Signing and Verification

Signing that is never verified provides nothing. The verification step is the
control.

```bash
# Keyless signing: identity from the OIDC token, recorded in a public transparency log
cosign sign --yes ghcr.io/acme/api@sha256:abc123...

# Verification, bound to the workflow that is allowed to build this
cosign verify ghcr.io/acme/api@sha256:abc123... \
  --certificate-identity-regexp="^https://github.com/acme/api/.github/workflows/release.yml@refs/tags/v" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com
```

The identity constraints are the security. `cosign verify` without them confirms
only that _somebody_ signed it.

Enforce at admission, so an unsigned image cannot run:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-signed-images
spec:
  validationFailureAction: Enforce
  rules:
    - name: verify-signature
      match:
        any: [{ resources: { kinds: [Pod] } }]
      verifyImages:
        - imageReferences: ['ghcr.io/acme/*']
          attestors:
            - entries:
                - keyless:
                    subject: 'https://github.com/acme/*/.github/workflows/release.yml@refs/tags/*'
                    issuer: 'https://token.actions.githubusercontent.com'
```

## CI/CD Hardening

- **Least-privilege tokens.** Default `permissions: {}` at the workflow level and
  grant per job.
- **No long-lived cloud keys.** OIDC federation instead.
- **Never run untrusted code with secrets in scope.** `pull_request_target` with
  a checkout of the fork's head is a well-known privilege escalation.
- **Pin actions and base images by digest.**
- **Separate build from deploy credentials.** A compromised build job should not
  be able to deploy.
- **Protect the release branch**: required reviews, no force push, signed commits.
- **Log and retain build metadata** — who triggered it, from which commit.

## Best Practices

- **Generate an SBOM for every build**, retained with the artefact.
- **Scan continuously, not only at build.** New advisories apply to artefacts
  already released.
- **Fail the build on new critical findings**, and allow documented exceptions
  with an expiry date.
- **Automate dependency updates** (Renovate, Dependabot) with grouped PRs and a
  cooldown before adopting a brand-new release.
- **Keep an inventory of what runs where**, so an advisory maps to deployments in
  minutes rather than days.
- **Prefer fewer dependencies.** Every one is a trust decision and a maintenance
  obligation.

## Anti-Patterns

- **Floating versions** (`^1.2.3`, `latest`) in production builds.
- **`npm install` in CI** instead of `npm ci`.
- **Tag-pinned actions and base images** — mutable references.
- **Signing without verifying.**
- **Scanning only at build time.**
- **Ignoring transitive dependencies** — most vulnerable code is transitive.
- **`--extra-index-url` mixing internal and public registries.**
- **An SBOM generated once for an audit** and never again.
- **Blanket suppression** of findings with no justification or expiry.

## Reference Documentation

- [Response Playbook](references/RESPONSE.md) — responding to a compromised
  dependency, incident triage, VEX authoring, and regulatory obligations

## Resources

- [SLSA framework](https://slsa.dev/)
- [Sigstore and cosign](https://docs.sigstore.dev/)
- [CycloneDX](https://cyclonedx.org/) and [SPDX](https://spdx.dev/)
- [OSV database and scanner](https://osv.dev/)
- [OpenSSF Scorecard](https://securityscorecards.dev/)
- [CISA SBOM guidance](https://www.cisa.gov/sbom)
