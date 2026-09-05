---
name: identity-access-expert
version: 1.0.0
description: >-
  Design authentication and authorisation: OAuth 2.1 and OpenID Connect, session and token
  handling, RBAC and ABAC, and multi-tenant access control. Use when the user mentions
  OAuth, OIDC, SAML, SSO, JWT, refresh tokens, PKCE, login flows, sessions, roles and
  permissions, RBAC or ABAC, or when the task involves securing an API, implementing
  sign-in, or fixing a broken access control finding.
category: security
tags:
  [
    oauth,
    oidc,
    saml,
    jwt,
    sso,
    rbac,
    abac,
    authorisation,
    sessions,
    multi-tenancy,
  ]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(python:*, python3:*, pip:*, npm:*, npx:*, openssl:*, curl:*)
  - Grep
  - Glob
metadata:
  author: PCL Standard Library
  complexity: advanced
---

# Identity and Access Expert

Broken access control has been the top category in the OWASP Top 10 since 2021
and remains so in 2025. Most of it is not exotic: it is a check that exists at
the route and not at the object.

## Core Concepts

### Authentication Is Not Authorisation

Authentication answers _who is this_. Authorisation answers _may they do this to
that_. Conflating them produces the most common vulnerability in web
applications: a logged-in user reading another user's records.

### Check at the Object, Not Only the Route

```python
# Vulnerable: authenticated, but any user can read any invoice (BOLA)
@router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user: User = Depends(current_user)):
    return await repo.get(invoice_id)

# Correct: the query itself is scoped to what the caller may see
@router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user: User = Depends(current_user)):
    invoice = await repo.get_for_tenant(invoice_id, tenant_id=user.tenant_id)
    if invoice is None:
        raise HTTPException(404)          # not 403: do not confirm existence
    return invoice
```

Scoping the **query** rather than fetching and then comparing is what makes this
robust: there is no path where a developer forgets the comparison.

### Tokens Are Bearer Credentials

Whoever holds the token is the user. Design accordingly: short lifetimes,
transport only over TLS, never in a URL, never in `localStorage` for
session-bearing tokens, and revocable.

## OAuth 2.1 and OIDC

OAuth 2.1 consolidates current practice: PKCE is mandatory for all clients, the
implicit and password grants are removed, and redirect URIs must match exactly.

| Flow                      | Use                                                 |
| ------------------------- | --------------------------------------------------- |
| Authorisation code + PKCE | All interactive clients — web, SPA, mobile, desktop |
| Client credentials        | Service to service, no user                         |
| Device code               | Input-constrained devices                           |
| Refresh token (rotating)  | Extending a session without re-authentication       |

OIDC adds identity on top: an `id_token` describing _who_ authenticated. The
access token is for calling APIs; the id token is for your application to learn
the user's identity. Never send an id token as an API credential.

```python
# Authorisation request with PKCE
verifier  = secrets.token_urlsafe(64)
challenge = base64.urlsafe_b64encode(
    hashlib.sha256(verifier.encode()).digest()
).rstrip(b"=").decode()

params = {
    "response_type": "code",
    "client_id": CLIENT_ID,
    "redirect_uri": REDIRECT_URI,          # must match the registered value exactly
    "scope": "openid profile invoices:read",
    "state": state,                        # CSRF protection, bound to the session
    "nonce": nonce,                        # replay protection, checked in the id_token
    "code_challenge": challenge,
    "code_challenge_method": "S256",
}
```

On callback, verify `state` against the session before anything else, then
exchange the code with the verifier. A missing `state` check is an account
takeover via CSRF on the login endpoint.

## Validating a JWT

Most JWT vulnerabilities come from validating too little.

```python
import jwt
from jwt import PyJWKClient

jwks = PyJWKClient(f"{ISSUER}/.well-known/jwks.json", cache_keys=True)

def verify(token: str) -> dict:
    key = jwks.get_signing_key_from_jwt(token).key
    return jwt.decode(
        token,
        key,
        algorithms=["RS256"],            # allowlist; never read alg from the header
        issuer=ISSUER,                   # must match
        audience=AUDIENCE,               # must match: a token for another API is invalid
        options={
            "require": ["exp", "iat", "iss", "aud", "sub"],
            "verify_exp": True,
            "verify_signature": True,
        },
        leeway=30,                       # clock skew, not a grace period
    )
```

The failures this prevents, all seen in the wild:

- **`alg: none`** — accepting an unsigned token. Fixed by the algorithm allowlist.
- **Algorithm confusion** — an RS256 public key used as an HS256 shared secret.
  Same fix.
- **Missing audience check** — a valid token issued for a different service is
  accepted.
- **Missing issuer check** — a token from any issuer with a valid signature.
- **Decoding without verifying** — `jwt.decode(..., options={"verify_signature": False})`
  in production code.

Fetch JWKS over TLS, cache with a TTL, and handle key rotation by refreshing on
an unknown `kid` rather than pinning a key.

## Sessions Versus Tokens

|                  | Server session     | Stateless JWT                         |
| ---------------- | ------------------ | ------------------------------------- |
| Revocation       | Immediate          | Not until expiry, without extra state |
| Scale            | Needs shared store | No lookup                             |
| Size             | Small cookie       | Larger, sent on every request         |
| Claims freshness | Always current     | Stale until refresh                   |

For first-party web applications, **server-side sessions in a cookie** are
usually the better choice: revocation works, and the cookie flags do the heavy
lifting.

```python
response.set_cookie(
    "session",
    session_id,
    httponly=True,        # not readable by JavaScript
    secure=True,          # TLS only
    samesite="lax",       # CSRF mitigation; "strict" if no cross-site entry points
    max_age=8 * 3600,
    path="/",
    domain=None,          # host-only: do not widen to a parent domain
)
```

Use short-lived access tokens with **rotating** refresh tokens where statelessness
is required. Rotation with reuse detection turns a stolen refresh token into a
detectable event:

```python
async def refresh(presented: str) -> TokenPair:
    record = await store.get(hash_token(presented))
    if record is None:
        raise Unauthorised()
    if record.used:
        # This token was already exchanged - it was stolen and replayed.
        await store.revoke_family(record.family_id)
        alert("refresh token reuse", family=record.family_id, user=record.user_id)
        raise Unauthorised()
    await store.mark_used(record.id)
    return await issue_pair(record.user_id, family_id=record.family_id)
```

## Authorisation Models

**RBAC** — permissions attach to roles, roles to users. Simple, auditable, and
sufficient for most applications.

**ABAC** — decisions evaluate attributes of subject, resource, action and
context. Necessary when rules depend on data: ownership, department, time,
location, amount.

**ReBAC** — decisions follow relationships in a graph. Fits document sharing and
hierarchical resources where "can view because they can view the parent folder"
is the rule.

Most systems need RBAC for coarse capability plus ownership checks for the rest.
Reach for a policy engine when the rules genuinely warrant it.

```python
@dataclass(frozen=True)
class Decision:
    allowed: bool
    reason: str = ""

def authorise(user: User, action: str, resource: Resource) -> Decision:
    if action not in ROLE_PERMISSIONS.get(user.role, ()):
        return Decision(False, f"role {user.role} lacks {action}")
    if resource.tenant_id != user.tenant_id:
        return Decision(False, "cross-tenant access")
    if action.startswith("invoice:approve") and resource.amount_minor > user.approval_limit_minor:
        return Decision(False, "above approval limit")
    return Decision(True)
```

Keep the decision in one place, return a reason, and log denials. Scattering
`if user.role == "admin"` through the codebase makes the policy unknowable and
unreviewable.

## Multi-Tenancy

Tenant isolation is the highest-severity boundary in a SaaS application.

```python
# Bind the tenant at the session boundary, not per query
@contextmanager
def tenant_scope(session, tenant_id: str):
    session.execute(text("SET LOCAL app.tenant_id = :t"), {"t": tenant_id})
    yield session
```

```sql
-- The database enforces it, so a forgotten WHERE cannot leak
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invoices
    USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

Defence in depth: scope in the query, enforce at the database, and write a test
that asserts a request authenticated as tenant A returns nothing belonging to
tenant B. Test it for every resource type, not once.

## Best Practices

- **Deny by default.** An endpoint with no explicit policy must reject.
- **Authorise at every layer**, including internal service calls. A service mesh
  does not know your object model.
- **Use a vetted identity provider.** Implementing OIDC from scratch is a large,
  ongoing security liability.
- **Short access tokens** (5–15 minutes), rotating refresh tokens with reuse
  detection.
- **MFA for privileged operations**, with phishing-resistant factors (WebAuthn)
  for administrators.
- **Re-authenticate for sensitive actions** — changing an email, adding a payout
  destination.
- **Audit authorisation decisions**: actor, action, resource, outcome, reason.
- **Return 404 rather than 403** where existence itself is sensitive.
- **Rate limit and lock out** on authentication, with a delay that does not
  reveal whether the account exists.

## Anti-Patterns

- **Route-level checks only** — the BOLA pattern, and the most exploited flaw in
  APIs.
- **Trusting a client-supplied identifier** for the tenant or user.
- **`alg` read from the token header.**
- **Long-lived tokens with no revocation path.**
- **Session tokens in `localStorage`** — readable by any XSS.
- **Role checks scattered through handlers** — unauditable.
- **Hiding UI as authorisation** — the API is the boundary.
- **Rolling your own crypto or your own SSO.**
- **Different error messages** for unknown user and wrong password — user
  enumeration.

## Reference Documentation

- [Implementation Patterns](references/PATTERNS.md) — complete OIDC integration,
  API gateway authorisation, service-to-service auth, policy engines, and
  migration from legacy authentication

## Resources

- [OAuth 2.1 draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1)
- [OAuth 2.0 Security Best Current Practice (RFC 9700)](https://www.rfc-editor.org/rfc/rfc9700.html)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [NIST SP 800-63B: Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
