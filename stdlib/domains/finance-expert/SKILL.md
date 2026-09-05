---
name: finance-expert
version: 2.0.0
description: >-
  Expert-level financial systems, FinTech, banking, payments, and financial technology. Use
  when the user mentions fintech, banking, payments, trading, or accounting, or when the
  task involves Financial Systems, FinTech Stack, Key Challenges, or Data Handling.
category: domains
tags: [finance, fintech, banking, payments, trading, accounting]
allowed-tools:
  - Read
  - Write
  - Edit
---

# Finance Expert

Expert guidance for financial systems, FinTech applications, banking platforms, payment processing, and financial technology development.

## Core Concepts

### Financial Systems

- Core banking systems
- Payment processing
- Trading platforms
- Risk management
- Regulatory compliance (PCI-DSS, SOX, Basel III)
- Financial reporting

### FinTech Stack

- Payment gateways (Stripe, PayPal, Square)
- Banking APIs (Plaid, Yodlee)
- Blockchain/crypto
- Open Banking APIs
- Mobile banking
- Digital wallets

### Key Challenges

- Security and fraud prevention
- Real-time processing
- High availability (99.999%)
- Regulatory compliance
- Data privacy
- Transaction accuracy

## Payment Processing

> **These examples move real money.** Read
> [Money movement guardrails](#money-movement-guardrails) before running any of
> them. Credentials come from the environment or a secrets manager, never from
> source.

```python
# Payment gateway integration (Stripe)
import os
from decimal import Decimal, ROUND_HALF_UP

import stripe

# Never hardcode a key. Load it from the environment or a secrets manager, and
# fail closed if it is absent rather than falling back to a default.
stripe.api_key = os.environ["STRIPE_API_KEY"]
WEBHOOK_SECRET = os.environ["STRIPE_WEBHOOK_SECRET"]


def to_minor_units(amount: Decimal) -> int:
    """Convert a decimal amount to integer minor units (cents).

    int(amount * 100) truncates: Decimal("0.615") would silently become 61
    instead of 62. Money must round explicitly, half-up, and only from Decimal
    - never from float.
    """
    if not isinstance(amount, Decimal):
        raise TypeError("monetary amounts must be Decimal, not %s" % type(amount).__name__)
    if amount < 0:
        raise ValueError("amount must not be negative")
    return int((amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


class PaymentService:
    def create_payment_intent(
        self, amount: Decimal, order_id: str, idempotency_key: str, currency: str = "usd"
    ):
        """Create a payment intent.

        The idempotency key is supplied by the caller and derived from the
        order, so a retried request cannot charge the customer twice. Stripe
        replays the original response instead of creating a second intent.
        """
        return stripe.PaymentIntent.create(
            amount=to_minor_units(amount),
            currency=currency,
            payment_method_types=["card"],
            metadata={"order_id": order_id},
            idempotency_key=idempotency_key,
        )

    def process_refund(
        self, payment_intent_id: str, idempotency_key: str, amount: Decimal | None = None
    ):
        """Process a full or partial refund (idempotent, like the charge)."""
        return stripe.Refund.create(
            payment_intent=payment_intent_id,
            amount=to_minor_units(amount) if amount is not None else None,
            idempotency_key=idempotency_key,
        )

    def handle_webhook(self, payload: bytes, signature: str):
        """Handle a Stripe webhook event.

        Signature verification is authentication: a failure must be rejected,
        never treated as a malformed payload. Returning 2xx on an unverified
        event tells Stripe the forged event was accepted.
        """
        try:
            event = stripe.Webhook.construct_event(payload, signature, WEBHOOK_SECRET)
        except stripe.error.SignatureVerificationError:
            # Forged or replayed event - fail closed, log, do not process.
            return {"status": "rejected"}, 400
        except ValueError:
            return {"status": "invalid_payload"}, 400

        # Webhooks are delivered at least once: deduplicate on event.id before
        # acting, or the same payment is booked twice.
        if self.already_processed(event.id):
            return {"status": "duplicate"}, 200

        if event.type == "payment_intent.succeeded":
            self.handle_successful_payment(event.data.object)
        elif event.type == "payment_intent.payment_failed":
            self.handle_failed_payment(event.data.object)

        self.mark_processed(event.id)
        return {"status": "success"}, 200
```

## Banking Integration

```python
# Open Banking API integration (Plaid)
import os

from plaid import Client
from plaid.errors import PlaidError

class BankingService:
    def __init__(self):
        # Credentials from the environment; sandbox unless the deployment
        # explicitly opts into production.
        self.client = Client(
            client_id=os.environ["PLAID_CLIENT_ID"],
            secret=os.environ["PLAID_SECRET"],
            environment=os.environ.get("PLAID_ENV", "sandbox"),
        )

    def create_link_token(self, user_id: str):
        """Create link token for Plaid Link"""
        response = self.client.LinkToken.create({
            "user": {"client_user_id": user_id},
            "client_name": "My App",
            "products": ["auth", "transactions"],
            "country_codes": ["US"],
            "language": "en"
        })
        return response["link_token"]

    def exchange_public_token(self, public_token: str):
        """Exchange a public token for an access token.

        The returned access token is a long-lived credential granting read
        access to the user's bank accounts. Store it encrypted, scoped to the
        user, never in logs, and revoke it when the user disconnects.
        """
        response = self.client.Item.public_token.exchange(public_token)
        return {
            "access_token": response["access_token"],
            "item_id": response["item_id"]
        }

    def get_accounts(self, access_token: str):
        """Get user's bank accounts"""
        response = self.client.Accounts.get(access_token)
        return response["accounts"]

    def get_transactions(self, access_token: str, start_date: str, end_date: str):
        """Get transactions for date range"""
        response = self.client.Transactions.get(
            access_token,
            start_date,
            end_date
        )
        return response["transactions"]
```

## Financial Calculations

```python
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta

class FinancialCalculator:
    @staticmethod
    def calculate_interest(principal: Decimal, rate: Decimal, periods: int) -> Decimal:
        """Calculate compound interest"""
        return principal * ((1 + rate) ** periods - 1)

    @staticmethod
    def calculate_loan_payment(principal: Decimal, annual_rate: Decimal, months: int) -> Decimal:
        """Calculate monthly loan payment (amortization)"""
        monthly_rate = annual_rate / 12
        payment = principal * (monthly_rate * (1 + monthly_rate) ** months) / \
                  ((1 + monthly_rate) ** months - 1)
        return payment.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    @staticmethod
    def calculate_npv(cash_flows: list[Decimal], discount_rate: Decimal) -> Decimal:
        """Calculate Net Present Value"""
        npv = Decimal('0')
        for i, cf in enumerate(cash_flows):
            npv += cf / ((1 + discount_rate) ** i)
        return npv.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    @staticmethod
    def calculate_roi(gain: Decimal, cost: Decimal) -> Decimal:
        """Calculate Return on Investment"""
        return ((gain - cost) / cost * 100).quantize(Decimal('0.01'))
```

## Fraud Detection

```python
from sklearn.ensemble import RandomForestClassifier
import pandas as pd

class FraudDetectionService:
    def __init__(self):
        self.model = RandomForestClassifier()

    def extract_features(self, transaction: dict) -> dict:
        """Extract features for fraud detection"""
        return {
            "amount": transaction["amount"],
            "hour_of_day": transaction["timestamp"].hour,
            "day_of_week": transaction["timestamp"].weekday(),
            "merchant_category": transaction["merchant_category"],
            "is_international": transaction["is_international"],
            "card_present": transaction["card_present"],
            "transaction_velocity_1h": self.get_velocity(transaction, hours=1),
            "transaction_velocity_24h": self.get_velocity(transaction, hours=24)
        }

    def predict_fraud(self, transaction: dict) -> dict:
        """Predict if transaction is fraudulent"""
        features = self.extract_features(transaction)
        fraud_probability = self.model.predict_proba([features])[0][1]

        return {
            "is_fraud": fraud_probability > 0.8,
            "fraud_score": fraud_probability,
            "risk_level": self.get_risk_level(fraud_probability)
        }

    def get_risk_level(self, score: float) -> str:
        if score > 0.9:
            return "CRITICAL"
        elif score > 0.7:
            return "HIGH"
        elif score > 0.5:
            return "MEDIUM"
        else:
            return "LOW"
```

## Regulatory Compliance

```python
# PCI-DSS Compliance
class PCICompliantPaymentHandler:
    def process_payment(self, card_data: dict):
        # Never store full card number, CVV, or PIN
        # Tokenize card data immediately
        token = self.tokenize_card(card_data)

        # Store only last 4 digits and token
        payment_record = {
            "token": token,
            "last_4": card_data["number"][-4:],
            "exp_month": card_data["exp_month"],
            "exp_year": card_data["exp_year"]
        }

        return self.process_with_token(token)

    def tokenize_card(self, card_data: dict) -> str:
        # Use payment gateway tokenization
        return stripe.Token.create(card=card_data)["id"]

# KYC/AML Compliance
class ComplianceService:
    def verify_customer(self, customer_data: dict) -> dict:
        """Perform KYC verification"""
        # Identity verification
        identity_verified = self.verify_identity(customer_data)

        # Sanctions screening
        sanctions_clear = self.screen_sanctions(customer_data)

        # Risk assessment
        risk_level = self.assess_risk(customer_data)

        return {
            "verified": identity_verified and sanctions_clear,
            "risk_level": risk_level,
            "requires_manual_review": risk_level == "HIGH"
        }
```

## Money movement guardrails

This skill documents code that charges cards, issues refunds, and reads bank
accounts. Treat every such call as an irreversible side effect and gate it
accordingly. A Snyk audit classifies this capability as W009 (direct money
access); these are the controls that make it acceptable.

**Credentials**

- Load keys from a secrets manager or the environment; never inline, never in
  version control, never in logs or error messages.
- Use restricted keys with the narrowest scope the operation needs. A service
  that only creates charges must not hold a key that can issue payouts.
- Rotate on a schedule and on any suspected exposure; keep test and live keys
  in separate accounts so a misconfiguration cannot reach production funds.

**Default to test mode**

- Point at Stripe test keys and the Plaid sandbox unless the deployment has
  explicitly opted into production. Make the production switch a deliberate,
  reviewed configuration change, not a default.
- Fail closed when the environment is ambiguous rather than guessing.

**Authorisation before execution**

- Require an explicit human approval step for any operation that moves money,
  including refunds. An agent must not be able to complete a charge on its own
  initiative.
- Enforce per-transaction and per-window amount limits, and reject anything
  above them rather than clamping silently.
- Check authorisation per object, not per route: verify the caller owns the
  order, the payment intent, and the bank item being acted on.

**Correctness under retry**

- Every mutating call carries a caller-supplied idempotency key derived from
  the business action, so a retry cannot double-charge.
- Webhooks are delivered at least once: deduplicate on event id before acting.
- Verify webhook signatures and reject failures with 4xx. An unverified event
  must never reach business logic.

**Money arithmetic**

- Represent amounts as `Decimal` or integer minor units, never `float`.
- Round explicitly (`ROUND_HALF_UP`) when converting to minor units;
  truncation loses fractions of a cent and the loss compounds.
- Store the currency alongside every amount and refuse cross-currency
  arithmetic.

**Audit and detection**

- Log every financial operation with actor, amount, currency, idempotency key,
  and outcome, to append-only storage. Never log card data, access tokens, or
  full account numbers.
- Alert on refund spikes, repeated failures, and limit rejections; a log that
  triggers nothing protects nothing.
- Reconcile against the provider's records on a schedule; do not treat your own
  database as the source of truth for money that moved.

## Best Practices

### Security

- Never log sensitive financial data (PAN, CVV)
- Use tokenization for card storage
- Implement strong encryption (AES-256)
- Use TLS 1.2+ for all communications
- Implement rate limiting and fraud detection
- Regular security audits

### Data Handling

- Use Decimal type for money (never float)
- Store amounts in smallest currency unit (cents)
- Implement idempotency for all transactions
- Maintain complete audit trails
- Handle timezone conversions properly

### Transaction Processing

- Implement two-phase commits
- Use database transactions (ACID)
- Handle network failures gracefully
- Implement retry logic with exponential backoff
- Support transaction reversals and refunds

## Anti-Patterns

❌ Using float for money calculations
❌ Storing credit card data unencrypted
❌ No transaction logging/audit trail
❌ Synchronous payment processing
❌ No idempotency in payment APIs
❌ Ignoring PCI-DSS compliance
❌ No fraud detection

## Resources

- PCI-DSS: https://www.pcisecuritystandards.org/
- Stripe API: https://stripe.com/docs/api
- Plaid: https://plaid.com/docs/
- Open Banking: https://www.openbanking.org.uk/
