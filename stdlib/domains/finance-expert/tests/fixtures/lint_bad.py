"""Checkout, capture and settlement helpers for the storefront service.

Fixture for money_lint.py. Every defect below is deliberate, and the comment
directly above it names the check it is meant to trip, so a maintainer can
verify coverage by reading the file top to bottom.

Expected: C01 C02 C03 C04 C05 C07 C08 C09 C10 C11 C13 C14 C15 C16
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

import stripe
from flask import Flask, request

app = Flask(__name__)
logger = logging.getLogger(__name__)

# C10 -- a live secret key committed straight into the repository.
STRIPE_API_KEY = "sk_live_NOTAREALKEY000000"

# C10 -- a Luhn-valid PAN parked in source as a "default" value.
FALLBACK_CARD = "4242424242424242"

# C14 -- a pinned FX rate: no source, no timestamp, wrong by tomorrow.
fx_rate = 1.0873

# Bound to a binary float here, handed to Decimal further down (C02).
shipping_flat = 4.99


# C05 -- the model carries three amounts and never a currency.
@dataclass
class LineItem:
    sku: str
    # C01 -- an amount held as a binary float.
    unit_price: float
    quantity: int
    # C01 -- and the extended amount too.
    line_total: float


# C01 -- money-ish function name returning a binary float.
def order_total(items: list[LineItem]) -> float:
    """Gross, tax and shipping for a basket."""
    gross_amount = 0.0
    for item in items:
        gross_amount += item.unit_price * item.quantity
    # C02 -- Decimal built from a float literal, and from a float-bound name.
    tax_amount = Decimal(0.2) * Decimal(gross_amount)
    shipping_cost = Decimal(shipping_flat)
    # C03 -- rounded mid-chain with no declared rounding mode. C02 on the cast.
    return round(gross_amount + float(tax_amount + shipping_cost), 2)


# C01 -- an amount parameter typed float.
def apply_discount(total: float, percent_off: int) -> float:
    """Take a whole-percent discount off a basket."""
    return total * (100 - percent_off) / 100


# C04 -- an even division across sellers; the odd cents simply evaporate.
def payout_each_seller(payout_total_minor: int, sellers: list[str]) -> int:
    """What each seller receives from a marketplace order."""
    return payout_total_minor // len(sellers)


# C07 -- a charge with no idempotency key: the retry takes the money twice.
def charge_customer(customer_id: str, amount_minor: int, currency: str) -> dict:
    """Authorise and capture in one step."""
    return stripe.PaymentIntent.create(
        amount=amount_minor,
        currency=currency,
        customer=customer_id,
        confirm=True,
    )


# C07 -- the refund path retries on timeout, also with no key.
def refund_charge(gateway, charge_id: str, amount_minor: int) -> dict:
    """Return money to the cardholder."""
    return gateway.charge.refund(charge_id, amount=amount_minor)


# C08 -- the handler trusts whatever POSTs to it.
@app.post("/webhooks/psp")
def psp_webhook():
    """Accept provider callbacks."""
    event = json.loads(request.data)
    if event["type"] == "payment_intent.succeeded":
        _mark_paid(event["data"]["object"]["id"])
    return "", 200


# C09 -- the full PAN and the CVV go straight into the application log.
def log_attempt(card_number: str, cvv: str, amount_minor: int) -> None:
    """Trace a declined authorisation."""
    logger.info(
        "charging card_number=%s cvv=%s for %s minor units",
        card_number,
        cvv,
        amount_minor,
    )


# C09 -- and the API key gets printed on startup.
def banner() -> None:
    """Startup banner."""
    print("storefront billing up, api_key=" + STRIPE_API_KEY)


# C16 -- the wallet is read, checked, then written back. C11 -- and rewritten
# in place, so two callers that both pass the check both spend the same money.
def debit_wallet(account, amount_minor: int) -> bool:
    """Spend from a stored-value wallet."""
    if account.balance >= amount_minor:
        account.balance = account.balance - amount_minor
        _persist(account)
        return True
    return False


# C13 -- a naive local timestamp decides which period the capture lands in.
def record_capture(order_id: str, amount_minor: int) -> dict:
    """Write the capture to the operational table."""
    captured_at = datetime.utcnow()
    return {
        "order_id": order_id,
        "amount_minor": amount_minor,
        "captured_at": captured_at,
    }


# C15 -- an amount compared to a float literal. C01 -- and typed float.
def is_free(order_amount: float) -> bool:
    """True when nothing is owed."""
    return order_amount == 0.0


def _mark_paid(intent_id: str) -> None:
    """Flip the order to paid."""
    logger.info("order for %s marked paid", intent_id)


def _persist(account) -> None:
    """Write the account row back."""
    account.save()
