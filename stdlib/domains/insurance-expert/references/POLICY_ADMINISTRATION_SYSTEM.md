# Insurance Expert — Policy Administration System

Reference material for the `insurance-expert` skill. See [SKILL.md](../SKILL.md).

## Policy Administration System

```python
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from enum import Enum

class PolicyStatus(Enum):
    QUOTED = "quoted"
    BOUND = "bound"
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    LAPSED = "lapsed"

class CoverageType(Enum):
    LIABILITY = "liability"
    COLLISION = "collision"
    COMPREHENSIVE = "comprehensive"
    MEDICAL = "medical"
    UNINSURED_MOTORIST = "uninsured_motorist"

@dataclass
class Insured:
    """Insured party information"""
    insured_id: str
    first_name: str
    last_name: str
    date_of_birth: datetime
    address: dict
    phone: str
    email: str
    drivers_license: str
    credit_score: int

@dataclass
class Coverage:
    """Insurance coverage details"""
    coverage_type: CoverageType
    limit: Decimal
    deductible: Decimal
    premium: Decimal

@dataclass
class Policy:
    """Insurance policy"""
    policy_number: str
    insured: Insured
    policy_type: str  # 'auto', 'home', 'life', etc.
    effective_date: datetime
    expiration_date: datetime
    status: PolicyStatus
    coverages: List[Coverage]
    total_premium: Decimal
    payment_plan: str  # 'annual', 'semi-annual', 'quarterly', 'monthly'
    underwriter_id: str
    risk_score: float

class PolicyAdministrationSystem:
    """Policy administration and management"""

    def __init__(self):
        self.policies = {}
        self.quotes = {}

    def generate_quote(self, application: dict) -> dict:
        """Generate insurance quote"""
        # Extract applicant information
        insured = Insured(
            insured_id=self._generate_id(),
            first_name=application['first_name'],
            last_name=application['last_name'],
            date_of_birth=application['date_of_birth'],
            address=application['address'],
            phone=application['phone'],
            email=application['email'],
            drivers_license=application.get('drivers_license', ''),
            credit_score=application.get('credit_score', 700)
        )

        # Calculate risk score
        risk_score = self._calculate_risk_score(insured, application)

        # Determine coverages and premiums
        coverages = self._determine_coverages(application, risk_score)

        # Calculate total premium
        total_premium = sum(c.premium for c in coverages)

        # Apply discounts
        discounts = self._calculate_discounts(application)
        discount_amount = total_premium * (sum(discounts.values()) / 100)
        total_premium = total_premium - discount_amount

        quote = {
            'quote_id': self._generate_id(),
            'insured': insured,
            'policy_type': application['policy_type'],
            'coverages': coverages,
            'total_premium': total_premium,
            'risk_score': risk_score,
            'discounts': discounts,
            'valid_until': datetime.now() + timedelta(days=30)
        }

        self.quotes[quote['quote_id']] = quote

        return quote

    def _calculate_risk_score(self, insured: Insured, application: dict) -> float:
        """Calculate risk score for underwriting"""
        score = 50.0  # Base score

        # Age factor (auto insurance)
        age = (datetime.now() - insured.date_of_birth).days / 365.25
        if age < 25:
            score += 20
        elif age < 65:
            score -= 10
        else:
            score += 5

        # Credit score factor
        if insured.credit_score < 600:
            score += 15
        elif insured.credit_score > 750:
            score -= 10

        # Driving history (auto insurance)
        if application.get('accidents_3yr', 0) > 0:
            score += application['accidents_3yr'] * 10

        if application.get('violations_3yr', 0) > 0:
            score += application['violations_3yr'] * 5

        # Claims history
        if application.get('claims_5yr', 0) > 0:
            score += application['claims_5yr'] * 8

        return max(0, min(100, score))  # Normalize to 0-100

    def _determine_coverages(self, application: dict, risk_score: float) -> List[Coverage]:
        """Determine coverages and calculate premiums"""
        coverages = []
        base_rate = Decimal('500')

        # Risk multiplier
        risk_multiplier = Decimal(str(1 + (risk_score / 100)))

        if application['policy_type'] == 'auto':
            # Liability coverage (required)
            coverages.append(Coverage(
                coverage_type=CoverageType.LIABILITY,
                limit=Decimal('100000'),
                deductible=Decimal('0'),
                premium=base_rate * risk_multiplier
            ))

            # Collision coverage
            if application.get('include_collision', True):
                deductible = Decimal(str(application.get('collision_deductible', 500)))
                premium = base_rate * Decimal('0.6') * risk_multiplier
                # Adjust premium based on deductible
                premium = premium * (Decimal('1000') / deductible) * Decimal('0.5')

                coverages.append(Coverage(
                    coverage_type=CoverageType.COLLISION,
                    limit=Decimal(str(application.get('vehicle_value', 25000))),
                    deductible=deductible,
                    premium=premium
                ))

            # Comprehensive coverage
            if application.get('include_comprehensive', True):
                deductible = Decimal(str(application.get('comprehensive_deductible', 500)))
                premium = base_rate * Decimal('0.3') * risk_multiplier

                coverages.append(Coverage(
                    coverage_type=CoverageType.COMPREHENSIVE,
                    limit=Decimal(str(application.get('vehicle_value', 25000))),
                    deductible=deductible,
                    premium=premium
                ))

        return coverages

    def _calculate_discounts(self, application: dict) -> dict:
        """Calculate applicable discounts"""
        discounts = {}

        # Multi-policy discount
        if application.get('has_other_policies', False):
            discounts['multi_policy'] = 15  # 15%

        # Good driver discount
        if application.get('accidents_3yr', 0) == 0 and application.get('violations_3yr', 0) == 0:
            discounts['good_driver'] = 10  # 10%

        # Safety features discount
        if application.get('has_airbags', False):
            discounts['safety_features'] = 5  # 5%

        # Anti-theft discount
        if application.get('has_alarm', False):
            discounts['anti_theft'] = 5  # 5%

        return discounts

    def bind_policy(self, quote_id: str) -> Policy:
        """Bind quote to create active policy"""
        quote = self.quotes.get(quote_id)
        if not quote:
            raise ValueError("Quote not found")

        # Check if quote is still valid
        if datetime.now() > quote['valid_until']:
            raise ValueError("Quote has expired")

        policy_number = self._generate_policy_number()

        policy = Policy(
            policy_number=policy_number,
            insured=quote['insured'],
            policy_type=quote['policy_type'],
            effective_date=datetime.now(),
            expiration_date=datetime.now() + timedelta(days=365),
            status=PolicyStatus.ACTIVE,
            coverages=quote['coverages'],
            total_premium=quote['total_premium'],
            payment_plan='annual',
            underwriter_id='UW001',
            risk_score=quote['risk_score']
        )

        self.policies[policy_number] = policy

        return policy

    def renew_policy(self, policy_number: str) -> dict:
        """Renew existing policy"""
        policy = self.policies.get(policy_number)
        if not policy:
            return {'error': 'Policy not found'}

        # Re-evaluate risk and premium
        # In production, would pull updated data
        new_risk_score = policy.risk_score * 0.95  # Loyalty discount factor

        # Calculate new premium (with inflation adjustment)
        inflation_factor = Decimal('1.03')  # 3% increase
        new_premium = policy.total_premium * inflation_factor * Decimal(str(0.95))  # Renewal discount

        return {
            'policy_number': policy_number,
            'current_premium': float(policy.total_premium),
            'renewal_premium': float(new_premium),
            'effective_date': policy.expiration_date,
            'expiration_date': policy.expiration_date + timedelta(days=365)
        }

    def cancel_policy(self, policy_number: str, reason: str, effective_date: datetime = None) -> dict:
        """Cancel policy"""
        policy = self.policies.get(policy_number)
        if not policy:
            return {'error': 'Policy not found'}

        if effective_date is None:
            effective_date = datetime.now()

        # Calculate earned premium
        days_active = (effective_date - policy.effective_date).days
        total_days = (policy.expiration_date - policy.effective_date).days
        earned_premium = policy.total_premium * (Decimal(days_active) / Decimal(total_days))

        # Calculate refund
        refund_amount = policy.total_premium - earned_premium

        policy.status = PolicyStatus.CANCELLED

        return {
            'policy_number': policy_number,
            'cancellation_date': effective_date.isoformat(),
            'reason': reason,
            'earned_premium': float(earned_premium),
            'refund_amount': float(refund_amount)
        }

    def _generate_policy_number(self) -> str:
        """Generate unique policy number"""
        import uuid
        return f"POL-{uuid.uuid4().hex[:10].upper()}"

    def _generate_id(self) -> str:
        import uuid
        return uuid.uuid4().hex[:12].upper()
```
