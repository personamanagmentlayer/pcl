"""Checkout, capture and settlement helpers for the storefront service.

The same program as `lint_bad.py`, written the way the money model requires.
money_lint.py must report zero findings here.

Money model (M4): an amount is a pair -- an exact integer count of minor units
and an ISO 4217 code -- carried together by `Money`. Rounding happens once, at
a declared point, with a declared mode (M5). Splitting uses largest remainder
so the parts sum exactly to the whole (M5). Every mutating call to the payment
provider carries a caller-derived idempotency key (M7). The webhook verifies a
signature and fails closed (M8). Timestamps are timezone-aware UTC and the
accounting period is explicit (M10). Funds are held in one conditional
statement, never read-then-write (M13). Nothing regulated reaches a log (M15).
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import ROUND_HALF_EVEN, Decimal
from typing import Sequence

logger = logging.getLogger(__name__)

# ISO 4217 minor-unit exponents for the currencies this service accepts.
_EXPONENT = {"EUR": 2, "GBP": 2, "USD": 2, "JPY": 0}


@dataclass(frozen=True)
class Money:
    """An exact quantity of minor units, inseparable from its currency."""

    minor: int
    currency: str

    def __post_init__(self) -> None:
        if self.currency not in _EXPONENT:
            raise ValueError(f"unsupported currency {self.currency!r}")
        if not isinstance(self.minor, int):
            raise TypeError("minor units must be an int")

    @property
    def amount(self) -> Decimal:
        """The exact decimal value; never used for arithmetic that posts."""
        return Decimal(self.minor).scaleb(-_EXPONENT[self.currency])

    def plus(self, other: "Money") -> "Money":
        self._same_currency(other)
        return Money(self.minor + other.minor, self.currency)

    def minus(self, other: "Money") -> "Money":
        self._same_currency(other)
        return Money(self.minor - other.minor, self.currency)

    def times(self, factor: int) -> "Money":
        return Money(self.minor * factor, self.currency)

    def _same_currency(self, other: "Money") -> None:
        # M6: cross-currency arithmetic is refused by construction.
        if self.currency != other.currency:
            raise ValueError(f"{self.currency} and {other.currency} do not add")


@dataclass(frozen=True)
class LineItem:
    """A basket line. The amounts are Money, so a currency always travels."""

    sku: str
    unit_price: Money
    quantity: int

    def extended(self) -> Money:
        return self.unit_price.times(self.quantity)


def _unit(currency: str) -> Decimal:
    """The smallest representable step in `currency`, as a Decimal."""
    return Decimal(1).scaleb(-_EXPONENT[currency])


def quantize_once(value: Decimal, currency: str) -> Money:
    """M5: the single declared rounding point, with a declared mode."""
    rounded = value.quantize(_unit(currency), rounding=ROUND_HALF_EVEN)
    return Money(int(rounded.scaleb(_EXPONENT[currency])), currency)


def tax_for(net: Money, vat: Decimal) -> Money:
    """VAT on a net figure. Exact until the one declared rounding point."""
    return quantize_once(net.amount * vat, net.currency)


def order_total(items: Sequence[LineItem], vat: Decimal, shipping: Money) -> Money:
    """Gross, tax and shipping for a basket, all in one currency."""
    if not items:
        raise ValueError("an order needs at least one line")
    gross = items[0].extended()
    for item in items[1:]:
        gross = gross.plus(item.extended())
    gross = gross.plus(shipping)
    return gross.plus(tax_for(gross, vat))


def allocate(total: Money, weights: Sequence[int]) -> list[Money]:
    """M5: largest remainder. The parts sum exactly to the whole, always."""
    if not weights or any(w < 0 for w in weights):
        raise ValueError("weights must be non-empty and non-negative")
    denominator = sum(weights)
    if denominator == 0:
        raise ValueError("weights must not all be zero")
    shares = [total.minor * w // denominator for w in weights]
    leftover = total.minor - sum(shares)
    ranked = sorted(
        range(len(weights)),
        key=lambda i: (-((total.minor * weights[i]) % denominator), i),
    )
    for position in range(leftover):
        shares[ranked[position % len(ranked)]] += 1
    parts = [Money(s, total.currency) for s in shares]
    assert sum(p.minor for p in parts) == total.minor
    return parts


def idempotency_key(action: str, order_id: str, attempt_of: str) -> str:
    """M7: derived from the business action, so a retry replays the outcome."""
    return hashlib.sha256(f"{action}:{order_id}:{attempt_of}".encode()).hexdigest()


def charge_customer(gateway, customer_id: str, price: Money, order_id: str) -> dict:
    """Authorise and capture, once, whatever the network does to the request."""
    return gateway.PaymentIntent.create(
        amount=price.minor,
        currency=price.currency,
        customer=customer_id,
        confirm=True,
        idempotency_key=idempotency_key("charge", order_id, customer_id),
    )


def refund_charge(gateway, charge_id: str, price: Money, order_id: str) -> dict:
    """Return money to the cardholder, once."""
    return gateway.charge.refund(
        charge_id,
        amount=price.minor,
        currency=price.currency,
        idempotency_key=idempotency_key("refund", order_id, charge_id),
    )


def _signing_secret() -> bytes:
    return os.environ["PSP_WEBHOOK_SIGNING_SECRET"].encode()


def psp_webhook(raw_body: bytes, headers: dict) -> tuple[str, int]:
    """M8: verify first and fail closed, then dedupe on the provider event id."""
    presented = headers.get("PSP-Signature", "")
    expected = hmac.new(_signing_secret(), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(presented, expected):
        logger.warning("rejected a webhook whose signature did not match")
        return ("invalid", 400)
    event = json.loads(raw_body)
    if _already_applied(event["id"]):
        return ("duplicate", 200)
    _apply_event(event)
    return ("ok", 200)


_RESERVE_SQL = """
UPDATE account_balances
   SET available_minor = available_minor - :amount_minor,
       updated_at      = :now
 WHERE account_id      = :account_id
   AND currency        = :currency
   AND available_minor >= :amount_minor
"""


def reserve_funds(conn, account_id: str, price: Money, now: datetime) -> bool:
    """M13: check and hold in one statement. Never read-then-write."""
    cursor = conn.execute(
        _RESERVE_SQL,
        {
            "amount_minor": price.minor,
            "currency": price.currency,
            "account_id": account_id,
            "now": now,
        },
    )
    return cursor.rowcount == 1


def record_capture(order_id: str, price: Money) -> dict:
    """M10: when it happened, when it was booked, which period it belongs to."""
    booked_at = datetime.now(timezone.utc)
    return {
        "order_id": order_id,
        "amount_minor": price.minor,
        "currency": price.currency,
        "booked_at": booked_at.isoformat(),
        "period": booked_at.strftime("%Y-%m"),
    }


def convert(price: Money, target: str, quote) -> tuple[Money, dict]:
    """M6: an explicit event that records rate, source and timestamp."""
    if price.currency == target:
        return price, {}
    observed = quote(price.currency, target)
    converted = quantize_once(price.amount * observed.value, target)
    provenance = {
        "from": price.currency,
        "to": target,
        "rate": str(observed.value),
        "source": observed.source,
        "observed_at": observed.observed_at.isoformat(),
    }
    return converted, provenance


def is_settled(outstanding: Money) -> bool:
    """Exact comparison, because minor units are integers."""
    return outstanding.minor == 0


def log_attempt(card, order_id: str, price: Money) -> None:
    """M15: a token and the last four digits. Nothing else leaves the vault."""
    logger.info(
        "authorisation for order=%s token=%s last4=%s %s %s",
        order_id,
        card.network_token,
        card.last4,
        price.minor,
        price.currency,
    )


def chart_series(subtotal: Money) -> float:
    """Analytics only. This number never reaches a posting or a customer."""
    return float(subtotal.amount)  # money-lint: ignore[C02]


def _already_applied(event_id: str) -> bool:
    raise NotImplementedError


def _apply_event(event: dict) -> None:
    raise NotImplementedError
