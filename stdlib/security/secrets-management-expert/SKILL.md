---
name: secrets-management-expert
version: 1.0.0
description: >-
  Store, distribute, rotate and revoke credentials without ever placing them in source:
  vaults, cloud secret managers, KMS envelope encryption and dynamic credentials. Use when
  the user mentions secrets, API keys, credentials, HashiCorp Vault, KMS, key rotation,
  a leaked or committed secret, .env files, sealed secrets, or when the task involves
  getting a password out of code, encrypting data at rest, or responding to an exposure.
category: security
tags:
  [
    secrets,
    vault,
    kms,
    credentials,
    rotation,
    encryption,
    least-privilege,
    key-management,
  ]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(vault:*, aws:*, az:*, gcloud:*, kubectl:*, sops:*, gitleaks:*, git:*, openssl:*)
  - Grep
  - Glob
metadata:
  author: PCL Standard Library
  complexity: advanced
---

# Secrets Management Expert

A secret in source control is compromised the moment it is pushed, and it stays
compromised after deletion because history is forever. Everything below follows
from that.

## Core Concepts

### The Hierarchy

Ranked by how much damage a compromise causes:

1. **No secret at all** — workload identity. The platform proves who the workload
   is; no credential exists to steal. The target state wherever it is available.
2. **Dynamic, short-lived credentials** — minted per session, expiring in
   minutes. Theft has a short window.
3. **Static secret in a manager**, rotated on a schedule, accessed by
   authenticated identity, audited.
4. **Static secret in an environment variable**, injected at deploy.
5. **Secret in a config file** on disk.
6. **Secret in source control.** Compromised.

Move each secret up this list rather than aiming for perfection everywhere.

### Envelope Encryption

Encrypt data with a data key; encrypt the data key with a key that never leaves
the KMS. Store the wrapped data key beside the ciphertext.

```
plaintext --[AES-256-GCM, data key]--> ciphertext
data key  --[KMS master key]---------> wrapped data key   (stored together)
```

This is what lets you rotate the master key without re-encrypting terabytes, and
what keeps the master key material inside a boundary you can audit.

### Rotation Only Works If It Is Routine

A rotation procedure exercised once a year fails when you need it during an
incident. Rotate on a schedule so the mechanism is known to work — that, not the
interval, is the point.

## Getting Secrets Out of Code

```python
import os

# Wrong: a default makes a misconfiguration silently insecure
API_KEY = os.environ.get("API_KEY", "dev-key-123")

# Right: fail closed, at startup, with a clear message
def required(name: str) -> str:
    try:
        return os.environ[name]
    except KeyError:
        raise RuntimeError(f"{name} is required and not set") from None

API_KEY = required("API_KEY")
```

Validate every required secret at startup, not at first use. A service that boots
successfully and fails at 3 a.m. on the first payment is worse than one that
refuses to start.

Never log them, never put them in error messages, and never pass them as command
line arguments — the process table is world-readable.

```python
class Secret:
    """Wrapper that resists accidental disclosure."""
    __slots__ = ("_value",)

    def __init__(self, value: str) -> None:
        self._value = value

    def reveal(self) -> str:
        return self._value

    def __repr__(self) -> str:
        return "Secret(***)"

    __str__ = __repr__
```

This stops the common leak: an exception rendering a config object, or a
structured logger serialising a settings dataclass.

## Secret Managers

### HashiCorp Vault

```bash
# Authenticate as a workload identity, not with a static token
vault write auth/kubernetes/login role=payments jwt="$(cat /var/run/secrets/.../token)"

# Dynamic database credentials: created on request, expire automatically
vault read database/creds/payments-readonly
# username: v-kubernet-payments-x7Kq  password: A1a-...  lease_duration: 1h
```

Dynamic secrets are the reason to run Vault. The application receives a database
user that did not exist a second earlier and will not exist in an hour. A leaked
credential expires on its own, and every issuance is attributable.

```hcl
path "database/creds/payments-readonly" {
  capabilities = ["read"]
}
# No wildcards. A policy granting "secret/*" is not a policy.
```

### Cloud managers

```bash
aws secretsmanager get-secret-value --secret-id prod/payments/stripe --query SecretString
az keyvault secret show --vault-name prod-kv --name stripe-api-key --query value
gcloud secrets versions access latest --secret=stripe-api-key
```

Cheaper to operate than Vault and well integrated with the platform's identity
system. Use rotation Lambdas or the managed rotation feature; a secret manager
holding a five-year-old static key provides storage, not management.

Cache retrieved secrets in memory with a short TTL. Calling the manager on every
request adds latency and cost, and makes the manager a hard dependency of every
transaction.

## Workload Identity

The best secret is the one that does not exist.

```yaml
# Kubernetes service account bound to a cloud role - no key material anywhere
apiVersion: v1
kind: ServiceAccount
metadata:
  name: payments
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/payments-service
```

```yaml
# GitHub Actions to AWS via OIDC - no long-lived access keys in CI
permissions:
  id-token: write
steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/github-deploy
      aws-region: eu-west-1
```

Long-lived cloud access keys in CI are among the most frequently leaked
credentials in existence. OIDC federation removes them entirely.

## Kubernetes

A Kubernetes `Secret` is base64-encoded, not encrypted. Anyone with read access
to the namespace, and anyone with etcd access, has the plaintext.

Options, in increasing strength:

- **Enable encryption at rest** for etcd — the minimum.
- **External Secrets Operator** — syncs from a real manager into the cluster.
- **Sealed Secrets** — encrypted manifests safe to commit; only the controller
  can decrypt.
- **CSI Secrets Store** — mounts secrets from the manager directly, never
  creating a Kubernetes `Secret` object.

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: stripe
spec:
  refreshInterval: 1h
  secretStoreRef: { name: aws-secrets-manager, kind: SecretStore }
  target: { name: stripe-credentials }
  data:
    - secretKey: api_key
      remoteRef: { key: prod/payments/stripe, property: api_key }
```

## Secrets in Git

`sops` encrypts values while leaving keys and structure readable, so a diff is
meaningful and a merge is possible.

```yaml
# .sops.yaml
creation_rules:
  - path_regex: secrets/prod/.*\.yaml$
    kms: arn:aws:kms:eu-west-1:123456789012:key/abcd-1234
  - path_regex: secrets/dev/.*\.yaml$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

```bash
sops --encrypt --in-place secrets/prod/payments.yaml
sops --decrypt secrets/prod/payments.yaml | kubectl apply -f -
```

Access control becomes KMS policy: revoking someone's key access revokes their
ability to decrypt every past commit — which plain file encryption cannot do.

## Detection

Scan before the commit, and scan history.

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.21.2
    hooks: [{ id: gitleaks }]
```

```bash
gitleaks detect --source . --redact --log-opts="--all"   # full history
trufflehog git file://. --only-verified                  # verifies liveness
```

Enable the platform's push protection (GitHub secret scanning, GitLab secret
detection) so a secret is blocked at push rather than found afterwards.

## When a Secret Leaks

Order matters. Rotation first; cleaning history is cosmetic by comparison.

1. **Rotate immediately.** Assume compromise from the moment of exposure. This is
   the only step that actually removes risk.
2. **Revoke the old credential** — do not merely replace it. An unrevoked old key
   still works.
3. **Audit for use.** Search provider logs for use of that credential from
   unexpected addresses or at unexpected times, over the whole exposure window.
4. **Assess the blast radius.** What could that credential reach? Was there data
   access? Notification obligations may follow.
5. **Then** purge history if required (`git filter-repo`), knowing that forks,
   clones, caches and CI logs may retain it.
6. **Fix the cause.** Add the scanner, the pre-commit hook, the review step.

Deleting the file and force-pushing without rotating is the most common wrong
response, and it leaves the secret fully valid.

## Best Practices

- **One secret, one purpose, one environment.** Never share a credential between
  production and staging.
- **Least privilege on the secret itself** — a read-only key where reads suffice.
- **Short TTLs**, dynamic where possible.
- **Audit every access.** Who read which secret, when, from where.
- **Alert on anomalies**: a secret read from a new workload, out of hours, or at
  an unusual rate.
- **Automate rotation** and verify it works by watching it happen.
- **Keep a break-glass credential** offline, heavily audited, alerting on use.
- **Never let a secret transit a CI log.** Mask it, and check the masking works.

## Anti-Patterns

- **Committed `.env` files** — add to `.gitignore` before the first commit, and
  commit a `.env.example` with empty values.
- **Default values for secrets** in code — turns a misconfiguration into a silent
  vulnerability.
- **Base64 mistaken for encryption.**
- **One shared credential for all services** — no least privilege, and rotation
  becomes an outage.
- **Secrets in container images** — they persist in layers and in every registry.
- **Secrets as command-line arguments** — visible in the process table.
- **Rotation without revocation.**
- **Long-lived cloud keys in CI** when OIDC federation is available.

## Reference Documentation

- [Encryption and Key Management](references/ENCRYPTION.md) — envelope
  encryption, KMS patterns, key rotation, field-level encryption, and
  post-quantum migration planning

## Resources

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [HashiCorp Vault documentation](https://developer.hashicorp.com/vault/docs)
- [NIST SP 800-57: Key Management](https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final)
- [External Secrets Operator](https://external-secrets.io/)
- [SOPS](https://github.com/getsops/sops)
