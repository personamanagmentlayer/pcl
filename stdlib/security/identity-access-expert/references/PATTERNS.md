# Identity and Access — Implementation Patterns

Reference material for the `identity-access-expert` skill. See [SKILL.md](../SKILL.md).

## Complete OIDC Integration

```python
import hashlib, base64, secrets
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse

router = APIRouter()


@router.get("/login")
async def login(request: Request):
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()

    state, nonce = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    # Server-side, tied to the browser session - never in a readable cookie
    await sessions.put(request.session["sid"],
                       {"pkce_verifier": verifier, "state": state, "nonce": nonce},
                       ttl=600)

    return RedirectResponse(f"{AUTH_ENDPOINT}?" + urlencode({
        "response_type": "code",
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "scope": "openid profile email",
        "state": state,
        "nonce": nonce,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }))


@router.get("/callback")
async def callback(request: Request, code: str | None = None,
                   state: str | None = None, error: str | None = None):
    if error:
        raise HTTPException(400, "authentication failed")

    stored = await sessions.pop(request.session["sid"])
    if not stored or not secrets.compare_digest(state or "", stored["state"]):
        raise HTTPException(400, "invalid state")        # CSRF on the login endpoint

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(TOKEN_ENDPOINT, data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,               # confidential clients only
            "code_verifier": stored["pkce_verifier"],
        })
    response.raise_for_status()
    tokens = response.json()

    claims = verify_id_token(tokens["id_token"], expected_nonce=stored["nonce"])

    # New session id after authentication: prevents session fixation
    request.session.clear()
    request.session["sid"] = await sessions.create(user_id=claims["sub"])
    return RedirectResponse("/")
```

Three details that are load-bearing: `state` compared with `compare_digest`, the
`nonce` checked inside the id token rather than only sent, and the session
identifier regenerated after login.

## API Gateway Authorisation

Authenticate once at the edge, authorise in the service. The gateway cannot know
whether _this_ user owns _that_ invoice.

```python
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

bearer = HTTPBearer(auto_error=False)


async def current_principal(
    credentials: HTTPAuthorizationCredentials | None = Security(bearer),
) -> Principal:
    if credentials is None:
        raise HTTPException(401, "authentication required")
    try:
        claims = verify(credentials.credentials)
    except jwt.PyJWTError:
        raise HTTPException(401, "invalid token") from None

    return Principal(
        subject=claims["sub"],
        tenant_id=claims["tenant_id"],
        scopes=set(claims.get("scope", "").split()),
    )


def requires(*scopes: str):
    """Coarse capability check. Object-level checks still happen in the handler."""
    async def dependency(principal: Principal = Depends(current_principal)) -> Principal:
        missing = set(scopes) - principal.scopes
        if missing:
            raise HTTPException(403, f"missing scope: {', '.join(sorted(missing))}")
        return principal
    return dependency


@router.post("/invoices/{invoice_id}/approve")
async def approve(invoice_id: str, principal: Principal = Depends(requires("invoices:approve"))):
    invoice = await repo.get_for_tenant(invoice_id, principal.tenant_id)
    if invoice is None:
        raise HTTPException(404)
    if invoice.amount_minor > await approval_limit(principal):
        raise HTTPException(403, "above approval limit")
    return await service.approve(invoice, actor=principal.subject)
```

Enforce deny-by-default globally so a new endpoint without a dependency is not
silently public:

```python
app = FastAPI(dependencies=[Depends(current_principal)])   # then opt out explicitly
```

## Service-to-Service

Never share a static API key between services. Two workable patterns:

**mTLS**, where the certificate is the identity:

```python
context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH, cafile="ca.pem")
context.load_cert_chain("client.pem", "client-key.pem")
context.verify_mode = ssl.CERT_REQUIRED
context.check_hostname = True
```

**Client credentials with a short-lived token**, cached and refreshed early:

```python
class ServiceTokenCache:
    def __init__(self) -> None:
        self._token: str | None = None
        self._expires_at: float = 0.0
        self._lock = asyncio.Lock()

    async def get(self) -> str:
        if self._token and time.monotonic() < self._expires_at - 60:
            return self._token
        async with self._lock:
            if self._token and time.monotonic() < self._expires_at - 60:
                return self._token          # another coroutine refreshed it
            data = await fetch_client_credentials_token()
            self._token = data["access_token"]
            self._expires_at = time.monotonic() + data["expires_in"]
            return self._token
```

Refreshing 60 seconds early avoids a thundering herd of 401s at expiry; the lock
avoids every concurrent request fetching its own token.

### Propagating user identity

When service A calls service B on a user's behalf, B must authorise as the
**user**, not as A. Use token exchange (RFC 8693) or a signed assertion carrying
the original subject. Passing a service token and a user id header is trivially
forgeable by anything that can reach B.

## Policy Engines

Externalise policy when rules are numerous, change independently of code, or must
be auditable by non-developers.

```rego
package invoices

import rego.v1

default allow := false

allow if {
    input.action == "read"
    input.resource.tenant_id == input.subject.tenant_id
    "invoices:read" in input.subject.scopes
}

allow if {
    input.action == "approve"
    input.resource.tenant_id == input.subject.tenant_id
    "invoices:approve" in input.subject.scopes
    input.resource.amount_minor <= input.subject.approval_limit_minor
    input.subject.id != input.resource.created_by      # separation of duties
}
```

```python
async def check(subject, action, resource) -> bool:
    response = await opa.post("/v1/data/invoices/allow", json={
        "input": {"subject": subject.dict(), "action": action, "resource": resource.dict()}
    }, timeout=0.25)
    return response.json().get("result", False)         # fail closed on absence
```

Run the engine as a sidecar rather than a network hop, cache decisions briefly,
and **fail closed** on timeout. An authorisation service that fails open converts
its own outage into a security incident.

## Permission Modelling

```sql
CREATE TABLE roles (
    id         BIGSERIAL PRIMARY KEY,
    tenant_id  UUID NOT NULL,
    name       TEXT NOT NULL,
    UNIQUE (tenant_id, name)
);

CREATE TABLE role_permissions (
    role_id     BIGINT REFERENCES roles(id) ON DELETE CASCADE,
    permission  TEXT NOT NULL,          -- "invoices:approve"
    PRIMARY KEY (role_id, permission)
);

CREATE TABLE user_roles (
    user_id    UUID,
    role_id    BIGINT REFERENCES roles(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,             -- time-bounded elevation
    PRIMARY KEY (user_id, role_id)
);
```

Name permissions `resource:action`, keep them fine-grained, and compose them into
roles. Coarse permissions such as `admin` cannot be granted partially, so they
end up granted fully.

`expires_at` supports temporary elevation, which is how privileged access should
normally be granted. Expire it in a background job **and** filter on it at read
time — the job will fail one day.

## Migrating Legacy Authentication

Cut over gradually; a big-bang identity migration locks users out.

1. **Add the new provider alongside**, accepting both credentials.
2. **Migrate password hashes lazily**: on successful login against the old hash,
   re-hash with the new algorithm and store it.

```python
def verify_and_upgrade(user, password: str) -> bool:
    if user.hash_algorithm == "legacy-sha1":
        if not hmac.compare_digest(legacy_hash(password, user.salt), user.password_hash):
            return False
        user.password_hash = argon2.hash(password)      # upgrade in place
        user.hash_algorithm = "argon2id"
        user.save()
        return True
    return argon2.verify(user.password_hash, password)
```

3. **Track migration progress** and communicate a deadline for the remainder.
4. **Force re-authentication** for accounts that never log in during the window,
   rather than leaving the legacy path enabled indefinitely.
5. **Remove the legacy path** and delete the old hashes.

Never migrate by asking every user to reset their password at once — completion
rates are poor and support load is severe. Lazy upgrade converts the active
majority silently.

## Testing Access Control

```python
@pytest.mark.parametrize("actor,resource_owner,expected", [
    ("tenant-a-user", "tenant-a", 200),
    ("tenant-a-user", "tenant-b", 404),      # not 403: existence is not confirmed
    ("tenant-a-viewer", "tenant-a", 403),    # authenticated, insufficient scope
    (None, "tenant-a", 401),
])
async def test_invoice_access(client, actor, resource_owner, expected):
    invoice = await seed_invoice(tenant=resource_owner)
    response = await client.get(f"/invoices/{invoice.id}", headers=auth_header(actor))
    assert response.status_code == expected
```

Generate this table for every resource type rather than testing one endpoint. The
vulnerability is never in the endpoint someone remembered to test.
