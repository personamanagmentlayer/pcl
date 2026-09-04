# Zero Trust Expert — Code Examples

Reference material for the `zero-trust-expert` skill. See [SKILL.md](../SKILL.md).

## Code Examples

### Identity Verification with OAuth2/OIDC

```python
# oauth2_identity_verification.py - OAuth2 with MFA and risk assessment
import os
from flask import Flask, request, jsonify, redirect
from functools import wraps
import jwt
import datetime
import hashlib
import secrets

app = Flask(__name__)
# Never a literal: a shared signing key defeats the identity guarantees
# this whole architecture rests on.
SECRET_KEY = os.environ["JWT_SECRET_KEY"]

class IdentityVerification:
    def __init__(self):
        self.sessions = {}
        self.risk_scores = {}
        self.mfa_challenges = {}

    def calculate_risk_score(self, user_id, context):
        """Calculate risk score based on multiple factors."""
        score = 0

        # Location risk
        if context.get('location') != self.get_user_location(user_id):
            score += 30

        # Device risk
        if context.get('device_id') not in self.get_user_devices(user_id):
            score += 40

        # Time-based risk
        hour = datetime.datetime.now().hour
        if hour < 6 or hour > 22:  # Unusual hours
            score += 20

        # Velocity check
        if self.check_velocity_anomaly(user_id):
            score += 30

        return min(score, 100)

    def require_mfa(self, risk_score):
        """Determine if MFA is required based on risk."""
        return risk_score >= 50

    def verify_session(self, session_token):
        """Continuously verify session validity."""
        session = self.sessions.get(session_token)

        if not session:
            return False

        # Check expiration
        if datetime.datetime.now() > session['expires_at']:
            return False

        # Re-evaluate risk
        risk_score = self.calculate_risk_score(
            session['user_id'],
            session['context']
        )

        # Require re-authentication if risk elevated
        if risk_score > session['initial_risk'] + 30:
            return False

        return True

    def get_user_location(self, user_id):
        """Get user's typical location."""
        return "US"  # Mock implementation

    def get_user_devices(self, user_id):
        """Get user's registered devices."""
        return ["device_123", "device_456"]  # Mock

    def check_velocity_anomaly(self, user_id):
        """Check for unusual access patterns."""
        return False  # Mock

def require_auth(f):
    """Decorator for zero-trust authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')

        if not token:
            return jsonify({'error': 'No token provided'}), 401

        try:
            # Verify JWT token
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])

            # Continuous session verification
            verifier = IdentityVerification()
            if not verifier.verify_session(token):
                return jsonify({'error': 'Session invalid'}), 401

            # Check resource-specific permissions
            if not check_permissions(payload['user_id'], request.path):
                return jsonify({'error': 'Insufficient permissions'}), 403

            request.user_id = payload['user_id']
            return f(*args, **kwargs)

        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401

    return decorated_function

def check_permissions(user_id, resource_path):
    """Check least-privilege access to resource."""
    # Implement fine-grained permission checking
    user_permissions = get_user_permissions(user_id)
    required_permission = map_resource_to_permission(resource_path)

    return required_permission in user_permissions

def get_user_permissions(user_id):
    """Get user's current permissions."""
    return ['read:users', 'write:documents']  # Mock

def map_resource_to_permission(path):
    """Map resource path to required permission."""
    return 'read:users'  # Mock

@app.route('/api/login', methods=['POST'])
def login():
    """Zero-trust login with risk assessment."""
    data = request.json
    username = data.get('username')
    password = data.get('password')

    # Verify credentials
    user_id = verify_credentials(username, password)
    if not user_id:
        return jsonify({'error': 'Invalid credentials'}), 401

    # Gather context
    context = {
        'ip_address': request.remote_addr,
        'user_agent': request.headers.get('User-Agent'),
        'location': get_location_from_ip(request.remote_addr),
        'device_id': request.headers.get('X-Device-ID')
    }

    # Calculate risk score
    verifier = IdentityVerification()
    risk_score = verifier.calculate_risk_score(user_id, context)

    # Require MFA for high-risk scenarios
    if verifier.require_mfa(risk_score):
        challenge_id = secrets.token_urlsafe(32)
        verifier.mfa_challenges[challenge_id] = {
            'user_id': user_id,
            'expires_at': datetime.datetime.now() + datetime.timedelta(minutes=5)
        }
        return jsonify({
            'mfa_required': True,
            'challenge_id': challenge_id
        }), 200

    # Issue token
    token = create_jwt_token(user_id, risk_score, context)
    return jsonify({'token': token, 'risk_score': risk_score})

@app.route('/api/protected', methods=['GET'])
@require_auth
def protected_resource():
    """Protected endpoint with zero-trust verification."""
    return jsonify({'message': 'Access granted', 'user_id': request.user_id})

def verify_credentials(username, password):
    """Verify user credentials."""
    return "user_123"  # Mock

def get_location_from_ip(ip_address):
    """Get geographic location from IP."""
    return "US"  # Mock

def create_jwt_token(user_id, risk_score, context):
    """Create JWT with embedded risk and context."""
    payload = {
        'user_id': user_id,
        'risk_score': risk_score,
        'context': context,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1),
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')
```

### Micro-Segmentation with Network Policies

```yaml
# kubernetes_network_policies.yaml - Zero-trust micro-segmentation
---
# Deny all traffic by default (zero-trust baseline)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress

---
# Allow specific frontend to backend communication
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080

---
# Allow backend to database with TLS only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-to-database
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: database
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: backend
      ports:
        - protocol: TCP
          port: 5432

---
# Allow egress to external APIs with explicit destinations
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-egress-apis
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: external-apis
      ports:
        - protocol: TCP
          port: 443
    - to: # Allow DNS
        - namespaceSelector:
            matchLabels:
              name: kube-system
      ports:
        - protocol: UDP
          port: 53
```

### Zero Trust Network Access (ZTNA)

```python
# ztna_policy_engine.py - Zero Trust Network Access policy engine
from dataclasses import dataclass
from typing import List, Dict
from enum import Enum
import datetime

class AccessDecision(Enum):
    ALLOW = "allow"
    DENY = "deny"
    CHALLENGE = "challenge"

@dataclass
class AccessRequest:
    user_id: str
    device_id: str
    resource: str
    action: str
    context: Dict

@dataclass
class Policy:
    name: str
    resource_pattern: str
    required_role: str
    min_device_trust_score: int
    allowed_locations: List[str]
    time_restrictions: Dict

class ZTNAPolicyEngine:
    def __init__(self):
        self.policies = []
        self.user_roles = {}
        self.device_trust_scores = {}

    def add_policy(self, policy: Policy):
        """Add a zero-trust policy."""
        self.policies.append(policy)

    def evaluate_access(self, request: AccessRequest) -> AccessDecision:
        """Evaluate access request against all policies."""
        # Find applicable policies
        applicable_policies = [
            p for p in self.policies
            if self._matches_resource(p.resource_pattern, request.resource)
        ]

        if not applicable_policies:
            return AccessDecision.DENY

        # Evaluate each policy
        for policy in applicable_policies:
            decision = self._evaluate_policy(policy, request)
            if decision == AccessDecision.DENY:
                return AccessDecision.DENY

        return AccessDecision.ALLOW

    def _evaluate_policy(self, policy: Policy, request: AccessRequest) -> AccessDecision:
        """Evaluate a single policy."""
        # Check role
        user_role = self.user_roles.get(request.user_id)
        if user_role != policy.required_role:
            return AccessDecision.DENY

        # Check device trust
        device_score = self.device_trust_scores.get(request.device_id, 0)
        if device_score < policy.min_device_trust_score:
            return AccessDecision.CHALLENGE

        # Check location
        user_location = request.context.get('location')
        if user_location not in policy.allowed_locations:
            return AccessDecision.DENY

        # Check time restrictions
        if not self._check_time_restrictions(policy.time_restrictions):
            return AccessDecision.DENY

        return AccessDecision.ALLOW

    def _matches_resource(self, pattern: str, resource: str) -> bool:
        """Check if resource matches pattern."""
        import re
        regex = pattern.replace('*', '.*')
        return re.match(regex, resource) is not None

    def _check_time_restrictions(self, restrictions: Dict) -> bool:
        """Check if current time is within allowed window."""
        if not restrictions:
            return True

        now = datetime.datetime.now()
        current_hour = now.hour

        start_hour = restrictions.get('start_hour', 0)
        end_hour = restrictions.get('end_hour', 24)

        return start_hour <= current_hour <= end_hour

# Usage
engine = ZTNAPolicyEngine()

# Define zero-trust policy
policy = Policy(
    name="Sensitive Data Access",
    resource_pattern="/api/sensitive/*",
    required_role="data_analyst",
    min_device_trust_score=80,
    allowed_locations=["US", "EU"],
    time_restrictions={"start_hour": 8, "end_hour": 18}
)

engine.add_policy(policy)
engine.user_roles["user_123"] = "data_analyst"
engine.device_trust_scores["device_456"] = 85

# Evaluate access
request = AccessRequest(
    user_id="user_123",
    device_id="device_456",
    resource="/api/sensitive/records",
    action="read",
    context={"location": "US", "ip": "192.168.1.1"}
)

decision = engine.evaluate_access(request)
print(f"Access decision: {decision.value}")
```

### Device Trust Verification

```python
# device_trust.py - Device health and trust verification
import hashlib
import json
from datetime import datetime, timedelta

class DeviceTrustManager:
    def __init__(self):
        self.trusted_devices = {}
        self.device_attestations = {}

    def register_device(self, device_id, device_info):
        """Register a new device."""
        trust_score = self.calculate_initial_trust(device_info)

        self.trusted_devices[device_id] = {
            'registered_at': datetime.now(),
            'last_verified': datetime.now(),
            'trust_score': trust_score,
            'device_info': device_info,
            'compliance_status': self.check_compliance(device_info)
        }

        return trust_score

    def calculate_initial_trust(self, device_info):
        """Calculate initial device trust score."""
        score = 100

        # Check OS version
        if not device_info.get('os_updated'):
            score -= 20

        # Check encryption
        if not device_info.get('disk_encrypted'):
            score -= 30

        # Check security software
        if not device_info.get('antivirus_installed'):
            score -= 20

        # Check jailbreak/root
        if device_info.get('rooted') or device_info.get('jailbroken'):
            score -= 50

        return max(score, 0)

    def verify_device(self, device_id, current_state):
        """Continuously verify device trust."""
        if device_id not in self.trusted_devices:
            return 0

        device = self.trusted_devices[device_id]

        # Re-calculate trust score
        new_score = self.calculate_trust_score(current_state)

        # Check attestation
        if not self.verify_attestation(device_id, current_state):
            new_score = min(new_score, 30)

        # Update device record
        device['trust_score'] = new_score
        device['last_verified'] = datetime.now()
        device['compliance_status'] = self.check_compliance(current_state)

        return new_score

    def calculate_trust_score(self, state):
        """Calculate current trust score based on device state."""
        score = 100

        # OS and patches
        if not state.get('os_updated'):
            score -= 20
        if state.get('pending_security_updates', 0) > 0:
            score -= 10

        # Security posture
        if not state.get('disk_encrypted'):
            score -= 30
        if not state.get('firewall_enabled'):
            score -= 15
        if not state.get('antivirus_installed'):
            score -= 20

        # Compromise indicators
        if state.get('malware_detected'):
            score -= 50
        if state.get('rooted') or state.get('jailbroken'):
            score -= 50

        # Time since last verification
        last_check = state.get('last_security_scan')
        if last_check:
            days_ago = (datetime.now() - last_check).days
            if days_ago > 7:
                score -= 10

        return max(score, 0)

    def verify_attestation(self, device_id, state):
        """Verify device hardware attestation."""
        # Mock hardware attestation verification
        attestation_data = state.get('attestation')
        if not attestation_data:
            return False

        expected_hash = self.device_attestations.get(device_id)
        if not expected_hash:
            return False

        actual_hash = hashlib.sha256(
            json.dumps(attestation_data, sort_keys=True).encode()
        ).hexdigest()

        return actual_hash == expected_hash

    def check_compliance(self, device_info):
        """Check device compliance with security policies."""
        requirements = {
            'disk_encrypted': True,
            'os_updated': True,
            'firewall_enabled': True,
            'screen_lock_enabled': True,
            'password_complexity': True
        }

        compliance = all(
            device_info.get(req, False) == value
            for req, value in requirements.items()
        )

        return compliance

    def should_challenge_device(self, device_id):
        """Determine if device should be challenged."""
        if device_id not in self.trusted_devices:
            return True

        device = self.trusted_devices[device_id]

        # Challenge if trust score is low
        if device['trust_score'] < 60:
            return True

        # Challenge if not verified recently
        last_verified = device['last_verified']
        if datetime.now() - last_verified > timedelta(hours=24):
            return True

        # Challenge if not compliant
        if not device['compliance_status']:
            return True

        return False
```
