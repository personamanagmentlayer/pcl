# Secrets Management — Encryption and Key Management

Reference material for the `secrets-management-expert` skill. See [SKILL.md](../SKILL.md).

## Choosing Primitives

Use a vetted library. Do not compose primitives yourself.

| Need                   | Use                                             | Never                                                       |
| ---------------------- | ----------------------------------------------- | ----------------------------------------------------------- |
| Encrypt data           | AES-256-GCM or XChaCha20-Poly1305               | AES-CBC without a MAC, ECB, any mode without authentication |
| Hash a password        | Argon2id, then scrypt or bcrypt                 | MD5, SHA-family, unsalted anything                          |
| Hash data              | SHA-256, BLAKE3                                 | MD5, SHA-1                                                  |
| Message authentication | HMAC-SHA256                                     | Home-made "hash the secret with the message"                |
| Sign                   | Ed25519, ECDSA P-256                            | RSA with PKCS#1 v1.5 for new work                           |
| Key exchange           | X25519, ECDH P-256                              | Static keys with no forward secrecy                         |
| Randomness             | `secrets`, `crypto.randomBytes`, `/dev/urandom` | `random`, `Math.random`, timestamps                         |

Authenticated encryption (AEAD) is not optional. Encryption without integrity
lets an attacker modify ciphertext undetected, and padding-oracle attacks against
unauthenticated CBC are practical.

## Envelope Encryption

```python
import os
import boto3
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

kms = boto3.client("kms")
KEY_ID = "arn:aws:kms:eu-west-1:123456789012:key/abcd-1234"


def encrypt(plaintext: bytes, context: dict[str, str]) -> dict:
    """Encrypt with a fresh data key; store the wrapped key alongside."""
    response = kms.generate_data_key(
        KeyId=KEY_ID, KeySpec="AES_256", EncryptionContext=context
    )
    nonce = os.urandom(12)                       # 96 bits, never reused with a key
    ciphertext = AESGCM(response["Plaintext"]).encrypt(nonce, plaintext, None)
    del response["Plaintext"]                    # drop the key material promptly

    return {
        "v": 1,                                  # version your envelope format
        "wrapped_key": response["CiphertextBlob"],
        "nonce": nonce,
        "ciphertext": ciphertext,
        "context": context,
    }


def decrypt(envelope: dict) -> bytes:
    if envelope["v"] != 1:
        raise ValueError(f"unsupported envelope version {envelope['v']}")
    data_key = kms.decrypt(
        CiphertextBlob=envelope["wrapped_key"],
        EncryptionContext=envelope["context"],   # must match, or decryption fails
    )["Plaintext"]
    return AESGCM(data_key).decrypt(envelope["nonce"], envelope["ciphertext"], None)
```

Three details carry the security:

- **A fresh data key per object**, or at least per batch. Reusing one data key
  across everything makes it a single point of compromise.
- **A unique nonce per encryption.** GCM nonce reuse with the same key is
  catastrophic — it leaks the authentication key, not just the plaintext.
- **Encryption context.** KMS binds it to the ciphertext, so a record encrypted
  for tenant A cannot be decrypted while claiming tenant B. Use it to encode the
  tenant, the table and the purpose.

Version the envelope from day one. Changing algorithms later without a version
field means you cannot tell which scheme produced a given record.

## Key Rotation

Rotation means new material is used for new operations, while old material stays
available for decryption until re-encryption completes.

```python
KEYS = {
    2: current_key,        # used for all new encryption
    1: previous_key,       # decrypt only
}
CURRENT = 2

def encrypt_v(plaintext: bytes) -> dict:
    nonce = os.urandom(12)
    return {"k": CURRENT, "n": nonce,
            "c": AESGCM(KEYS[CURRENT]).encrypt(nonce, plaintext, None)}

def decrypt_v(blob: dict) -> bytes:
    key = KEYS.get(blob["k"])
    if key is None:
        raise KeyError(f"key version {blob['k']} is retired; data unrecoverable")
    return AESGCM(key).decrypt(blob["n"], blob["c"], None)
```

Retiring a key version before every record is re-encrypted destroys that data.
Track the count of records at each version, and only retire when it reaches zero.

```sql
SELECT key_version, count(*) FROM encrypted_records GROUP BY 1 ORDER BY 1;
```

KMS automatic rotation rotates the _master_ key transparently — old versions
remain available, so nothing breaks. That is different from rotating a
credential, which requires the coordinated dance above.

### Rotating a database credential without downtime

1. Create the new credential alongside the old; both work.
2. Deploy the configuration referencing the new one.
3. Verify no connections authenticate with the old one — check the server's
   authentication log, not your assumptions.
4. Revoke the old credential.
5. Confirm the service is still healthy.

Steps 3 and 4 are where teams shortcut and cause an outage. A background worker
or a cron job holding the old credential is invisible until it runs.

## Field-Level Encryption

Encrypt sensitive columns individually so a database dump is not a breach.

```python
class EncryptedField:
    """Transparent encryption for a model attribute."""

    def __init__(self, context_key: str) -> None:
        self.context_key = context_key

    def __set_name__(self, owner, name):
        self.private = f"_{name}_encrypted"

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        blob = getattr(obj, self.private, None)
        return decrypt(blob).decode() if blob else None

    def __set__(self, obj, value: str | None):
        context = {"tenant": str(getattr(obj, self.context_key)), "field": self.private}
        setattr(obj, self.private,
                encrypt(value.encode(), context) if value is not None else None)


class Customer:
    tenant_id: int
    tax_id = EncryptedField(context_key="tenant_id")
```

The trade-off you accept: an encrypted column cannot be indexed, searched with
`LIKE`, or sorted. For equality lookup, store a **blind index** — an HMAC of the
normalised value with a separate key:

```python
def blind_index(value: str) -> bytes:
    return hmac.new(INDEX_KEY, value.strip().lower().encode(), "sha256").digest()[:16]
```

Truncating the HMAC deliberately creates collisions, which limits how much a
compromised index reveals about the underlying distribution. Filter on the index,
then decrypt the small candidate set and compare exactly.

## Post-Quantum Migration

A "harvest now, decrypt later" adversary is recording encrypted traffic today to
decrypt once cryptographically relevant quantum computers exist. Long-lived
confidentiality is the concern; ephemeral session data much less so.

Standards to plan against:

| Standard           | Purpose               | Replaces                        |
| ------------------ | --------------------- | ------------------------------- |
| FIPS 203 (ML-KEM)  | Key encapsulation     | ECDH, RSA key transport         |
| FIPS 204 (ML-DSA)  | Digital signatures    | ECDSA, RSA signatures           |
| FIPS 205 (SLH-DSA) | Hash-based signatures | Conservative signature fallback |

Practical sequence:

1. **Inventory.** Which systems protect data whose confidentiality must outlast
   a decade? Those are the priority; a session token expiring in an hour is not.
2. **Enable hybrid key exchange** where the platform offers it (X25519 +
   ML-KEM-768 in TLS). Hybrid means a break in either component alone is not
   enough, so there is no downside to enabling it early.
3. **Increase symmetric strength.** AES-256 and SHA-384 are considered adequate
   against known quantum attacks; AES-128 is weakened but not broken. Prefer 256.
4. **Build crypto-agility now.** Version every ciphertext, abstract the
   algorithm behind an interface, and be able to re-encrypt at scale. That
   capability is the real deliverable — it is what makes any future migration
   tractable.
5. **Plan signatures later.** Signature migration is harder because verifiers are
   distributed and long-lived, but the threat is less acute: a signature forged
   in 2035 does not retroactively compromise a 2026 transaction the way decrypted
   traffic does.

Do not deploy experimental post-quantum algorithms alone in production. Hybrid
modes from your TLS library and platform are the supported path.

## Common Mistakes

- **Nonce reuse in GCM.** Generate randomly per encryption, or use a strict
  counter; never a fixed value, never a hash of the plaintext.
- **Encrypting without authenticating.** Always AEAD.
- **Comparing secrets with `==`.** Use `hmac.compare_digest` — timing attacks on
  token comparison are practical.
- **Hardcoded IVs or salts.** Random per operation, stored alongside.
- **Reversible encryption for passwords.** Passwords are hashed, never encrypted.
- **Home-made key derivation.** Use HKDF, or Argon2id when deriving from a
  password.
- **No key versioning**, which makes rotation impossible without downtime.
- **Retiring a key before re-encryption completes** — permanent data loss.
