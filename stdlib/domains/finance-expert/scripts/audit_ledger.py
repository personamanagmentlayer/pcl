#!/usr/bin/env python3
"""audit_ledger.py -- mechanical audit of a journal export (finance-expert, PCL stdlib).

Takes a general-ledger / journal export (CSV or JSON) and checks the properties a
machine can actually verify against the invariants in `SKILL.md` Section 4. It is a
floor, not a ceiling: a clean run means the export is not *obviously* wrong.

WHAT IT CHECKS
  M2  double entry ......... per-entry balance per currency, counter-accounts,
                             book-level trial balance, the accounting equation,
                             zero-amount lines
  M3  immutability ......... duplicate line ids, sequence gaps, mutation-shaped
                             status values and `deleted_at`/`updated_at` columns,
                             reversals that do not mirror their original
  M4  amount is a pair ..... missing / implausible ISO 4217 currency, amounts with
                             more decimals than the currency's minor unit
  M5  rounding policy ...... scale defects, float round-trip artifacts, unbooked
                             rounding residue (with M16)
  M6  no implicit FX ....... entries mixing currencies with no rate recorded
  M7  idempotency .......... one idempotency key reused across two entries
  M8  external events ...... one provider event id reused across two entries
  M9  reconciliation ....... suspense / clearing accounts aging with a live balance
  M10 threefold time ....... booking before the event, missing timestamps, period
                             disagreeing with the event month, closed periods
  M14 auditability ......... lines with neither a description nor an external ref
  M16 fees are postings .... rounding residue reported as its own defect

WHAT IT DOES NOT JUDGE
  This harness reads a file. It has no view on the business behind it and will not
  tell you any of the following -- these stay human review, and the reference files
  named in `SKILL.md` Section 7 are where that review is written down:

  * whether the posting rules model the business correctly. A book can be perfectly
    balanced and post every transaction to the wrong pair of accounts.
  * whether the chart of accounts is the right chart, or the statutory one.
  * whether revenue recognition, capitalisation, impairment or the FX translation
    policy are defensible. Those are the finance owner's and the auditor's.
  * whether an amount is the *right* amount. Nothing here recomputes a fee, a tax,
    an interest accrual or an FX rate against its source.
  * whether the reversal window, settlement finality or materiality threshold used
    by the business is appropriate.
  * whether the export is complete, or reconciles to the external record (M9). A
    file that is missing half the postings can still balance.
  * anything about authorization, separation of duties or approvals (M11), limits
    (M12), holds (M13), or secrets hygiene (M15) -- none of which is visible in a
    journal export.
  * whether a stored balance elsewhere agrees with these postings (M1, M17).

  It also never modifies the input and never reaches the network.

INPUT SCHEMA
  See `--list-checks`, which prints the accepted columns, their aliases and the
  three amount encodings alongside the check table.

EXIT CODES
  0  no finding at or above the --fail-on threshold
  1  at least one finding at or above the threshold
  2  the input could not be parsed, or the invocation was invalid
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Callable, Iterable, Sequence

# --------------------------------------------------------------------------------------
# Money constants
# --------------------------------------------------------------------------------------

DEFAULT_EXPONENT = 2

# ISO 4217 minor-unit exponents that are not 2. Deliberately small: this harness
# ships the exceptions it is confident about rather than a stale full table.
CURRENCY_EXPONENT: dict[str, int] = {
    "JPY": 0, "KRW": 0, "VND": 0, "CLP": 0, "ISK": 0, "PYG": 0, "RWF": 0, "UGX": 0,
    "XAF": 0, "XOF": 0, "XPF": 0,
    "KWD": 3, "BHD": 3, "JOD": 3, "OMR": 3, "TND": 3, "LYD": 3, "IQD": 3,
}

# The ~40 most common trading currencies. Anything outside this set is not rejected
# outright -- it is reported as "unrecognised, verify against ISO 4217", because the
# set is deliberately partial and says so.
COMMON_CURRENCIES: frozenset[str] = frozenset(
    """USD EUR GBP JPY CHF CAD AUD NZD CNY HKD SGD SEK NOK DKK PLN CZK HUF RON
       TRY INR IDR KRW THB MYR PHP VND ILS AED SAR ZAR NGN KES BRL MXN ARS CLP
       COP PEN TWD ISK UAH QAR KWD BHD JOD OMR TND MAD EGP""".split()
)

ACCOUNT_TYPES = {"ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"}
NORMAL_DEBIT = {"ASSET", "EXPENSE"}
NORMAL_CREDIT = {"LIABILITY", "EQUITY", "INCOME"}

DEBIT_TOKENS = {"debit", "dr", "d", "db"}
CREDIT_TOKENS = {"credit", "cr", "c", "ck"}

MUTATION_STATUSES = {"void", "voided", "deleted", "cancelled", "canceled", "amended", "modified"}
MUTATION_COLUMNS = {"deleted_at", "updated_at", "modified_at", "is_deleted", "deleted", "edited_at"}

DEFAULT_SUSPENSE_PATTERN = r"suspense|clearing|unmatched|in.?transit|unapplied"

# An account that legitimately holds opposite-side balances in different currencies is
# a currency position, not a posting bug -- see L19.
FX_POSITION_PATTERN = re.compile(
    r"fx.?position|fx.?clearing|currency.?exchange|conversion.?clearing|fx.?revaluation",
    re.IGNORECASE,
)

SCIENTIFIC_RE = re.compile(r"^[+-]?\d*\.?\d+[eE][+-]?\d+$")
FLOAT_ARTIFACT_RE = re.compile(r"(0{6,}[1-9]\d*|9{6,}\d*)$")
PERIOD_RE = re.compile(r"^\d{4}-\d{2}$")
ALPHA3_RE = re.compile(r"^[A-Za-z]{3}$")

SEVERITY_RANK = {"info": 1, "warn": 2, "error": 3}
SEVERITY_ORDER = ("error", "warn", "info")

# --------------------------------------------------------------------------------------
# Input schema
# --------------------------------------------------------------------------------------

# canonical field -> accepted column / key names (matched case-insensitively, exact)
FIELD_ALIASES: dict[str, tuple[str, ...]] = {
    "entry_id": ("entry_id", "entry", "journal_entry_id"),
    "line_id": ("line_id", "id", "line"),
    "sequence": ("sequence", "seq"),
    "account": ("account", "account_id", "account_code"),
    "account_type": ("account_type",),
    "direction": ("direction", "side"),
    "amount": ("amount",),
    "debit": ("debit",),
    "credit": ("credit",),
    "amount_minor": ("amount_minor",),
    "exponent": ("exponent",),
    "currency": ("currency", "ccy", "currency_code"),
    "event_time": ("event_time", "occurred_at", "transaction_date"),
    "booking_time": ("booking_time", "posted_at", "booked_at"),
    "period": ("period", "accounting_period"),
    "idempotency_key": ("idempotency_key", "idem_key"),
    "external_event_id": ("external_event_id", "provider_event_id", "external_id"),
    "reverses_entry_id": ("reverses_entry_id", "reversal_of"),
    "status": ("status",),
    "fx_rate": ("fx_rate", "rate"),
    "description": ("description", "memo", "narrative"),
}

ALIAS_TO_FIELD: dict[str, str] = {
    alias: canonical for canonical, aliases in FIELD_ALIASES.items() for alias in aliases
}

SCHEMA_DOC = """\
INPUT SCHEMA

  CSV with a header row, or JSON: a list of line objects, {"lines": [...]}, or
  {"entries": [{..., "lines": [...]}, ...]} (entry-level keys are inherited by the
  lines beneath them). Column and field names are matched case-insensitively.

  field                aliases                                    notes
  -------------------- ------------------------------------------ --------------------------
  entry_id             entry, journal_entry_id                    groups lines into an entry
  line_id              id, line                                   unique per line
  sequence             seq                                        global, or restart per entry
  account              account_id, account_code                   permanent identifier
  account_type         --                                         asset|liability|equity|
                                                                  income|expense
  direction            side                                       debit|credit|dr|cr
  amount               --                                         major units, e.g. 12.34
  debit / credit       --                                         pair, major units
  amount_minor         --                                         integer minor units
  exponent             --                                         minor-unit scale for the above
  currency             ccy, currency_code                         ISO 4217 alpha-3
  event_time           occurred_at, transaction_date              when it happened      (M10)
  booking_time         posted_at, booked_at                       when it was recorded  (M10)
  period               accounting_period                          YYYY-MM               (M10)
  idempotency_key      idem_key                                   one per entry         (M7)
  external_event_id    provider_event_id, external_id             one per entry         (M8)
  reverses_entry_id    reversal_of                                cites the original    (M3)
  status               --                                         posted, pending, ...
  fx_rate              rate                                       recorded on conversions (M6)
  description          memo, narrative                            what it was for       (M14)

  AMOUNT ENCODINGS -- all three are accepted and normalised internally to a signed
  Decimal in minor units plus the currency, debit positive:

    1. amount + direction        30.00 with direction=credit  ->  -3000 minor
    2. debit / credit pair       debit=30.00, credit=(empty)  ->  +3000 minor
    3. amount_minor + exponent   amount_minor=-3000           ->  -3000 minor

  A bare signed `amount` with no direction is read as debit-positive. When `exponent`
  is absent the currency's minor unit is used (default 2; see the embedded table).

  Fields are optional. A check family whose field is absent from the file entirely is
  reported as skipped (severity `info`) rather than crashing or guessing.
"""

# --------------------------------------------------------------------------------------
# Data model
# --------------------------------------------------------------------------------------


@dataclass
class Line:
    """One journal line, normalised. `signed_minor` is debit-positive minor units."""

    row_no: int
    entry_id: str = ""
    line_id: str = ""
    sequence: int | None = None
    account: str = ""
    account_type: str = ""
    direction: str = ""
    currency: str = ""
    signed_minor: Decimal | None = None
    exponent: int | None = None
    declared_exponent: int | None = None
    raw_amounts: list[tuple[str, str]] = field(default_factory=list)
    amount_error: str = ""
    event_time: datetime | None = None
    booking_time: datetime | None = None
    raw_event_time: str = ""
    raw_booking_time: str = ""
    period: str = ""
    idempotency_key: str = ""
    external_event_id: str = ""
    reverses_entry_id: str = ""
    status: str = ""
    fx_rate: str = ""
    description: str = ""

    @property
    def ref(self) -> str:
        parts = []
        if self.entry_id:
            parts.append(f"entry={self.entry_id}")
        if self.line_id:
            parts.append(f"line={self.line_id}")
        parts.append(f"row={self.row_no}")
        return " ".join(parts)


@dataclass
class Obs:
    """One observation from a check. The runner groups these into Findings."""

    example: str
    title: str | None = None
    fix: str | None = None
    severity: str | None = None


@dataclass
class Finding:
    check: str
    invariant: str
    severity: str
    title: str
    count: int
    examples: list[str]
    fix: str

    def to_json(self) -> dict[str, Any]:
        return {
            "check": self.check,
            "invariant": self.invariant,
            "severity": self.severity,
            "title": self.title,
            "count": self.count,
            "examples": list(self.examples),
            "fix": self.fix,
        }


@dataclass
class Check:
    id: str
    invariant: str
    severity: str
    title: str
    fix: str
    description: str
    fn: Callable[["Ledger"], list[Obs]]
    requires: tuple[str, ...] = ()


@dataclass
class Report:
    file: str
    entries: int
    lines: int
    currencies: list[str]
    date_range: tuple[str, str] | None
    checks_run: list[str]
    checks_total: int
    fail_on: str
    findings: list[Finding] = field(default_factory=list)

    def counts(self) -> dict[str, int]:
        c = {s: 0 for s in SEVERITY_ORDER}
        for f in self.findings:
            c[f.severity] = c.get(f.severity, 0) + 1
        return c

    def observations(self) -> int:
        return sum(f.count for f in self.findings)

    def exit_code(self) -> int:
        threshold = SEVERITY_RANK[self.fail_on]
        return 1 if any(SEVERITY_RANK[f.severity] >= threshold for f in self.findings) else 0

    def to_json(self) -> dict[str, Any]:
        counts = self.counts()
        return {
            "file": self.file,
            "summary": {
                "entries": self.entries,
                "lines": self.lines,
                "currencies": self.currencies,
                "date_range": list(self.date_range) if self.date_range else None,
                "checks_run": self.checks_run,
                "checks_total": self.checks_total,
                "fail_on": self.fail_on,
                "findings": len(self.findings),
                "observations": self.observations(),
                "error": counts.get("error", 0),
                "warn": counts.get("warn", 0),
                "info": counts.get("info", 0),
                "exit_code": self.exit_code(),
            },
            "findings": [f.to_json() for f in self.findings],
        }


class InputError(Exception):
    """The input cannot be parsed or the invocation is invalid -> exit 2."""


# --------------------------------------------------------------------------------------
# Parsing helpers
# --------------------------------------------------------------------------------------


def exponent_for(currency: str) -> int:
    return CURRENCY_EXPONENT.get(currency.upper(), DEFAULT_EXPONENT)


def fmt_money(minor: Decimal | None, currency: str, signed: bool = False) -> str:
    """Render minor units as major units at the currency's scale."""
    if minor is None:
        return "n/a"
    exp = exponent_for(currency)
    major = Decimal(0)
    try:
        major = Decimal(minor) / (Decimal(10) ** exp)
        if major == 0:
            major = abs(major)  # never render a negative zero
        quantum = Decimal(1).scaleb(-exp)
        text = str(major.quantize(quantum)) if major == major.quantize(quantum) else str(major)
    except (InvalidOperation, ValueError):
        return f"{minor} {currency}".strip()
    if signed and major != 0 and not text.startswith("-"):
        text = "+" + text
    return f"{text} {currency}" if currency else text


def to_decimal(raw: str) -> Decimal | None:
    text = str(raw).strip().replace(" ", "").replace("_", "")
    if not text:
        return None
    negative = False
    if text.startswith("(") and text.endswith(")"):  # accounting parentheses
        negative, text = True, text[1:-1]
    text = re.sub(r"[^0-9eE+\-.,]", "", text)
    if "," in text and "." in text:
        text = text.replace(",", "")  # 1,234.56
    elif text.count(",") == 1 and re.match(r"^[+-]?\d+,\d{1,3}$", text):
        text = text.replace(",", ".")  # 1234,56
    else:
        text = text.replace(",", "")
    if not text or text in {"+", "-", "."}:
        return None
    try:
        value = Decimal(text)
    except InvalidOperation:
        return None
    if not value.is_finite():
        return None
    return -value if negative else value


def parse_time(raw: str) -> datetime | None:
    """Parse a timestamp liberally; normalise to naive UTC so comparisons are total."""
    text = str(raw).strip()
    if not text:
        return None
    candidate = text.replace("Z", "+00:00").replace("z", "+00:00")
    if " " in candidate and "T" not in candidate:
        candidate = candidate.replace(" ", "T", 1)
    parsed: datetime | None = None
    try:
        parsed = datetime.fromisoformat(candidate)
    except ValueError:
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d", "%Y%m%d"):
            try:
                parsed = datetime.strptime(text, fmt)
                break
            except ValueError:
                continue
    if parsed is None:
        return None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def month_of(dt: datetime | None) -> str:
    return f"{dt.year:04d}-{dt.month:02d}" if dt else ""


def _duration(seconds: int) -> str:
    """Render a whole-second duration in plain ASCII, largest unit first."""
    if seconds < 60:
        return f"{seconds}s"
    parts = []
    for unit, size in (("d", 86400), ("h", 3600), ("m", 60)):
        if seconds >= size:
            parts.append(f"{seconds // size}{unit}")
            seconds %= size
    return " ".join(parts) if parts else "0m"


def canonicalise_keys(row: dict[str, Any]) -> dict[str, Any]:
    """Map a raw row's keys onto canonical field names; unknown keys are dropped."""
    out: dict[str, Any] = {}
    for key, value in row.items():
        if key is None:
            continue
        canonical = ALIAS_TO_FIELD.get(str(key).strip().lower())
        if canonical is not None and canonical not in out:
            out[canonical] = value
    return out


def present_canonical_fields(raw_keys: Iterable[str]) -> set[str]:
    return {
        ALIAS_TO_FIELD[k]
        for k in (str(k).strip().lower() for k in raw_keys if k is not None)
        if k in ALIAS_TO_FIELD
    }


def cell(row: dict[str, Any], key: str) -> str:
    value = row.get(key)
    if value is None:
        return ""
    if isinstance(value, bool):
        return str(value)
    if isinstance(value, float):
        return repr(value)
    return str(value).strip()


def normalise_line(row: dict[str, Any], row_no: int) -> Line:
    """Turn one raw row into a Line with a signed Decimal amount in minor units."""
    line = Line(row_no=row_no)
    line.entry_id = cell(row, "entry_id")
    line.line_id = cell(row, "line_id")
    line.account = cell(row, "account")
    line.account_type = cell(row, "account_type").strip().upper()
    line.direction = cell(row, "direction").strip().lower()
    line.currency = cell(row, "currency").strip()
    line.period = cell(row, "period")
    line.idempotency_key = cell(row, "idempotency_key")
    line.external_event_id = cell(row, "external_event_id")
    line.reverses_entry_id = cell(row, "reverses_entry_id")
    line.status = cell(row, "status").strip().lower()
    line.fx_rate = cell(row, "fx_rate")
    line.description = cell(row, "description")
    line.raw_event_time = cell(row, "event_time")
    line.raw_booking_time = cell(row, "booking_time")
    line.event_time = parse_time(line.raw_event_time)
    line.booking_time = parse_time(line.raw_booking_time)

    seq_raw = cell(row, "sequence")
    if seq_raw:
        seq_value = to_decimal(seq_raw)
        if seq_value is not None and seq_value == seq_value.to_integral_value():
            line.sequence = int(seq_value)

    exp_raw = cell(row, "exponent")
    if exp_raw:
        exp_value = to_decimal(exp_raw)
        if exp_value is not None and exp_value == exp_value.to_integral_value():
            line.declared_exponent = int(exp_value)

    exponent = line.declared_exponent
    if exponent is None:
        exponent = exponent_for(line.currency) if line.currency else DEFAULT_EXPONENT
    line.exponent = exponent

    amount_minor_raw = cell(row, "amount_minor")
    amount_raw = cell(row, "amount")
    debit_raw = cell(row, "debit")
    credit_raw = cell(row, "credit")

    sign = 0
    if line.direction in DEBIT_TOKENS:
        sign = 1
    elif line.direction in CREDIT_TOKENS:
        sign = -1

    if amount_minor_raw:
        line.raw_amounts.append(("amount_minor", amount_minor_raw))
        value = to_decimal(amount_minor_raw)
        if value is None:
            line.amount_error = f"amount_minor={amount_minor_raw!r} is not a number"
        else:
            line.signed_minor = value * sign if sign else value
    elif debit_raw or credit_raw:
        debit_value = credit_value = Decimal(0)
        if debit_raw:
            line.raw_amounts.append(("debit", debit_raw))
            parsed = to_decimal(debit_raw)
            if parsed is None:
                line.amount_error = f"debit={debit_raw!r} is not a number"
            else:
                debit_value = parsed
        if credit_raw:
            line.raw_amounts.append(("credit", credit_raw))
            parsed = to_decimal(credit_raw)
            if parsed is None:
                line.amount_error = f"credit={credit_raw!r} is not a number"
            else:
                credit_value = parsed
        if not line.amount_error:
            line.signed_minor = (debit_value - credit_value) * (Decimal(10) ** exponent)
    elif amount_raw:
        line.raw_amounts.append(("amount", amount_raw))
        value = to_decimal(amount_raw)
        if value is None:
            line.amount_error = f"amount={amount_raw!r} is not a number"
        else:
            minor = value * (Decimal(10) ** exponent)
            line.signed_minor = minor * sign if sign else minor
    else:
        line.amount_error = "no amount, debit/credit pair or amount_minor on this line"

    return line


def read_rows(path: Path) -> tuple[list[dict[str, Any]], set[str], set[str]]:
    """Return (canonical rows, canonical fields present, raw column names present)."""
    try:
        text = path.read_text(encoding="utf-8-sig")
    except FileNotFoundError as exc:
        raise InputError(f"no such file: {path}") from exc
    except OSError as exc:
        raise InputError(f"cannot read {path}: {exc}") from exc
    except UnicodeDecodeError as exc:
        raise InputError(f"{path} is not UTF-8 text: {exc}") from exc

    if not text.strip():
        raise InputError(f"{path} is empty")

    suffix = path.suffix.lower()
    looks_json = suffix == ".json" or text.lstrip()[:1] in "[{"
    if looks_json:
        return _read_json(text, path)
    return _read_csv(text, path)


def _read_json(text: str, path: Path) -> tuple[list[dict[str, Any]], set[str], set[str]]:
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise InputError(f"{path} is not valid JSON: {exc}") from exc

    if isinstance(payload, dict):
        for key in ("lines", "entries", "journal", "rows", "data"):
            if isinstance(payload.get(key), list):
                payload = payload[key]
                break
        else:
            raise InputError(
                f"{path}: expected a list of lines, or an object with a 'lines' "
                f"(or 'entries') list; got object keys {sorted(payload)[:8]}"
            )
    if not isinstance(payload, list):
        raise InputError(f"{path}: expected a JSON list of line objects")

    raw_rows: list[dict[str, Any]] = []
    raw_keys: set[str] = set()
    for item in payload:
        if not isinstance(item, dict):
            raise InputError(f"{path}: every element must be an object, got {type(item).__name__}")
        nested = item.get("lines")
        if isinstance(nested, list):  # entry object carrying its own lines
            parent = {k: v for k, v in item.items() if k != "lines"}
            raw_keys.update(parent)
            for child in nested:
                if not isinstance(child, dict):
                    raise InputError(f"{path}: entry '{item.get('entry_id')}' has a non-object line")
                merged = {**parent, **child}
                raw_keys.update(child)
                raw_rows.append(merged)
        else:
            raw_keys.update(item)
            raw_rows.append(item)

    if not raw_rows:
        raise InputError(f"{path}: no lines found")
    return [canonicalise_keys(r) for r in raw_rows], present_canonical_fields(raw_keys), {
        str(k).strip().lower() for k in raw_keys
    }


def _read_csv(text: str, path: Path) -> tuple[list[dict[str, Any]], set[str], set[str]]:
    sample = text[:8192]
    delimiter = ","
    try:
        delimiter = csv.Sniffer().sniff(sample, delimiters=",;\t|").delimiter
    except csv.Error:
        pass
    reader = csv.DictReader(text.splitlines(), delimiter=delimiter)
    if not reader.fieldnames:
        raise InputError(f"{path}: no header row found")
    raw_keys = {str(k).strip().lower() for k in reader.fieldnames if k is not None}
    if not (raw_keys & set(ALIAS_TO_FIELD)):
        raise InputError(
            f"{path}: header row has no recognised column "
            f"({', '.join(sorted(raw_keys)[:8])}). Run --list-checks for the schema."
        )
    rows = [canonicalise_keys(r) for r in reader]
    if not rows:
        raise InputError(f"{path}: header row but no data rows")
    return rows, present_canonical_fields(raw_keys), raw_keys


# --------------------------------------------------------------------------------------
# Ledger context
# --------------------------------------------------------------------------------------


class Ledger:
    """The normalised export plus the indexes the checks share."""

    def __init__(
        self,
        lines: list[Line],
        present: set[str],
        raw_columns: set[str],
        *,
        closed_periods: Sequence[str] = (),
        suspense_pattern: str = DEFAULT_SUSPENSE_PATTERN,
        suspense_max_age_days: int = 30,
        now: datetime | None = None,
    ) -> None:
        self.lines = lines
        self.present = present
        self.raw_columns = raw_columns
        self.closed_periods = {p.strip() for p in closed_periods if p.strip()}
        self.suspense_max_age_days = suspense_max_age_days
        # Naive UTC, to match how parse_time normalises every timestamp it reads.
        self.now = now or datetime.now(timezone.utc).replace(tzinfo=None)
        try:
            self.suspense_re = re.compile(suspense_pattern, re.IGNORECASE)
        except re.error as exc:
            raise InputError(f"--suspense-pattern is not a valid regex: {exc}") from exc

        self.entries: dict[str, list[Line]] = defaultdict(list)
        for line in lines:
            self.entries[line.entry_id or f"(row {line.row_no})"].append(line)

        # entry -> currency -> signed minor total
        self.entry_totals: dict[str, dict[str, Decimal]] = {}
        for entry_id, entry_lines in self.entries.items():
            totals: dict[str, Decimal] = defaultdict(Decimal)
            for line in entry_lines:
                if line.signed_minor is not None:
                    totals[line.currency] += line.signed_minor
            self.entry_totals[entry_id] = dict(totals)

        # (account, currency) -> signed minor balance
        self.account_balances: dict[tuple[str, str], Decimal] = defaultdict(Decimal)
        for line in lines:
            if line.signed_minor is not None:
                self.account_balances[(line.account, line.currency)] += line.signed_minor

        self.currencies = sorted({line.currency for line in lines if line.currency})

    # -- shared derivations ------------------------------------------------------------

    def entry_imbalances(self) -> list[tuple[str, str, Decimal]]:
        """(entry_id, currency, imbalance) for every non-zero per-currency entry total."""
        out = []
        for entry_id, totals in self.entry_totals.items():
            for currency, total in totals.items():
                if total != 0:
                    out.append((entry_id, currency, total))
        return sorted(out, key=lambda t: (t[0], t[1]))

    def trial_balance(self) -> dict[str, Decimal]:
        totals: dict[str, Decimal] = defaultdict(Decimal)
        for line in self.lines:
            if line.signed_minor is not None:
                totals[line.currency] += line.signed_minor
        return dict(totals)

    def is_rounding_residue(self, currency: str, imbalance: Decimal) -> bool:
        return imbalance != 0 and abs(imbalance) <= 1

    def entry_signature(self, entry_id: str) -> Counter:
        return Counter(
            (line.account, line.currency, line.signed_minor)
            for line in self.entries.get(entry_id, [])
            if line.signed_minor is not None
        )

    def date_range(self) -> tuple[str, str] | None:
        stamps = [line.event_time or line.booking_time for line in self.lines]
        stamps = [s for s in stamps if s is not None]
        if not stamps:
            return None
        return (min(stamps).date().isoformat(), max(stamps).date().isoformat())


# --------------------------------------------------------------------------------------
# Check registry
# --------------------------------------------------------------------------------------

CHECKS: list[Check] = []


def check(
    cid: str,
    invariant: str,
    severity: str,
    title: str,
    fix: str,
    description: str,
    requires: tuple[str, ...] = (),
) -> Callable[[Callable[[Ledger], list[Obs]]], Callable[[Ledger], list[Obs]]]:
    def decorate(fn: Callable[[Ledger], list[Obs]]) -> Callable[[Ledger], list[Obs]]:
        CHECKS.append(Check(cid, invariant, severity, title, fix, description, fn, requires))
        return fn

    return decorate


# -- M2: double entry ------------------------------------------------------------------


@check(
    "L01", "M2", "error",
    "Entry does not balance per currency",
    "Post the missing counter-line; debits must equal credits within each entry and each currency.",
    "Sums each entry's lines per currency. A non-zero total larger than one minor unit is "
    "reported here; a residue of one minor unit or less is reported by L11 instead, and an "
    "entry with fewer than two lines by L04.",
)
def check_entry_balance(led: Ledger) -> list[Obs]:
    obs = []
    for entry_id, currency, imbalance in led.entry_imbalances():
        if len(led.entries.get(entry_id, [])) < 2:
            continue  # L04 owns this one
        if led.is_rounding_residue(currency, imbalance):
            continue  # L11 owns this one
        totals = led.entries[entry_id]
        debits = sum(
            (ln.signed_minor for ln in totals if ln.currency == currency and (ln.signed_minor or 0) > 0),
            Decimal(0),
        )
        credits = sum(
            (-ln.signed_minor for ln in totals if ln.currency == currency and (ln.signed_minor or 0) < 0),
            Decimal(0),
        )
        obs.append(
            Obs(
                f"entry={entry_id} {currency} imbalance={fmt_money(imbalance, currency, signed=True)} "
                f"(debits {fmt_money(debits, currency)}, credits {fmt_money(credits, currency)})"
            )
        )
    return obs


@check(
    "L04", "M2", "error",
    "Entry has no counter-account",
    "Every economic event is at least two lines; add the counter-account or delete the stub entry.",
    "Flags entries with a single line or none. A single-line entry is an unexplained gain or "
    "loss however well the rest of the book balances.",
)
def check_counter_account(led: Ledger) -> list[Obs]:
    obs = []
    for entry_id, lines in sorted(led.entries.items()):
        if len(lines) == 1:
            line = lines[0]
            obs.append(
                Obs(
                    f"entry={entry_id} has 1 line ({line.account} "
                    f"{fmt_money(line.signed_minor, line.currency, signed=True)}) and no counter-account"
                )
            )
        elif not lines:
            obs.append(Obs(f"entry={entry_id} has 0 lines"))
    return obs


@check(
    "L11", "M5/M16", "error",
    "Unbooked rounding residue",
    "Post the residue to a named rounding-difference account; never let it sit as an imbalance.",
    "An entry whose per-currency imbalance is non-zero but at most one minor unit. This is "
    "almost always an allocation that was divided rather than remainder-preserved (M5); the "
    "residual is real money and belongs on its own posting (M16).",
)
def check_rounding_residue(led: Ledger) -> list[Obs]:
    obs = []
    for entry_id, currency, imbalance in led.entry_imbalances():
        if len(led.entries.get(entry_id, [])) < 2:
            continue
        if not led.is_rounding_residue(currency, imbalance):
            continue
        obs.append(
            Obs(
                f"entry={entry_id} {currency} residue={fmt_money(imbalance, currency, signed=True)} "
                f"({imbalance} minor unit(s) unbooked)"
            )
        )
    return obs


@check(
    "L12", "M2", "error",
    "Trial balance does not net to zero",
    "Find the unbalanced entries (L01/L11) and correct them by reversal; the book total per "
    "currency must be exactly zero.",
    "The book-level trial balance: total debits against total credits, per currency, across "
    "every line in the file.",
)
def check_trial_balance(led: Ledger) -> list[Obs]:
    obs = []
    for currency, total in sorted(led.trial_balance().items()):
        if total == 0:
            continue
        debits = sum(
            (ln.signed_minor for ln in led.lines if ln.currency == currency and (ln.signed_minor or 0) > 0),
            Decimal(0),
        )
        credits = sum(
            (-ln.signed_minor for ln in led.lines if ln.currency == currency and (ln.signed_minor or 0) < 0),
            Decimal(0),
        )
        label = currency or "(no currency)"
        obs.append(
            Obs(
                f"{label} debits {fmt_money(debits, currency)} vs credits {fmt_money(credits, currency)} "
                f"-> difference {fmt_money(total, currency, signed=True)}"
            )
        )
    return obs


@check(
    "L13", "M2", "warn",
    "Accounting equation does not hold",
    "Classify every account; (assets + expenses) must equal (liabilities + equity + income) "
    "per currency.",
    "Compares (assets + expenses) with (liabilities + equity + income) per currency, over the "
    "lines that carry an account_type. Currencies whose trial balance already failed (L12) are "
    "skipped, because the residual there is the same number reported twice -- so what this "
    "check actually surfaces is a book that balances while some lines are unclassified or "
    "mistyped, which no trial balance will catch.",
    requires=("account_type",),
)
def check_accounting_equation(led: Ledger) -> list[Obs]:
    trial = led.trial_balance()
    per_currency: dict[str, dict[str, Decimal]] = defaultdict(lambda: defaultdict(Decimal))
    untyped: dict[str, Decimal] = defaultdict(Decimal)
    for line in led.lines:
        if line.signed_minor is None:
            continue
        if line.account_type in ACCOUNT_TYPES:
            per_currency[line.currency][line.account_type] += line.signed_minor
        else:
            untyped[line.currency] += line.signed_minor

    obs = []
    for currency in sorted(per_currency):
        if trial.get(currency, Decimal(0)) != 0:
            continue  # L12 owns this currency
        buckets = per_currency[currency]
        debit_side = sum((buckets.get(t, Decimal(0)) for t in NORMAL_DEBIT), Decimal(0))
        credit_side = -sum((buckets.get(t, Decimal(0)) for t in NORMAL_CREDIT), Decimal(0))
        if debit_side == credit_side:
            continue
        note = ""
        if untyped.get(currency):
            note = (
                f"; {fmt_money(untyped[currency], currency, signed=True)} sits on lines with no "
                f"account_type"
            )
        obs.append(
            Obs(
                f"{currency} assets+expenses {fmt_money(debit_side, currency)} vs "
                f"liabilities+equity+income {fmt_money(credit_side, currency)} -> difference "
                f"{fmt_money(debit_side - credit_side, currency, signed=True)}{note}"
            )
        )
    return obs


@check(
    "L18", "M2", "warn",
    "Line with a zero amount",
    "Drop the line, or record why a zero-value posting exists; a zero line moves nothing and "
    "hides the event it claims to represent.",
    "Lines whose normalised amount is exactly zero.",
)
def check_zero_amount(led: Ledger) -> list[Obs]:
    return [
        Obs(f"{line.ref} account={line.account} amount=0 {line.currency}".rstrip())
        for line in led.lines
        if line.signed_minor is not None and line.signed_minor == 0
    ]


@check(
    "L19", "M2", "warn",
    "Account balance on the wrong side of its normal balance",
    "Check the posting rules for this account; an asset with a credit balance or a liability "
    "with a debit balance is usually a debit/credit inversion.",
    "Compares each (account, currency) closing balance with the normal balance of its type. "
    "Accounts whose identifier looks like an FX position are skipped: such an account holds a "
    "debit balance in one currency and a credit balance in the other by construction -- that "
    "shape is what makes an FX conversion balance per currency, and flagging it is noise. "
    "Nothing else is exempt, so an overdrawn cash account still reports even when the same "
    "account is healthy in another currency.",
    requires=("account_type",),
)
def check_normal_balance(led: Ledger) -> list[Obs]:
    types: dict[str, str] = {}
    for line in led.lines:
        if line.account_type in ACCOUNT_TYPES:
            types.setdefault(line.account, line.account_type)

    obs = []
    for (account, currency), balance in sorted(led.account_balances.items()):
        if balance == 0:
            continue
        acct_type = types.get(account)
        if acct_type is None:
            continue
        if FX_POSITION_PATTERN.search(account):
            continue
        wrong = (acct_type in NORMAL_DEBIT and balance < 0) or (
            acct_type in NORMAL_CREDIT and balance > 0
        )
        if not wrong:
            continue
        side = "credit" if balance < 0 else "debit"
        normal = "debit" if acct_type in NORMAL_DEBIT else "credit"
        obs.append(
            Obs(
                f"account={account} ({acct_type.lower()}, normal {normal}) {currency} balance "
                f"{fmt_money(balance, currency, signed=True)} is a {side} balance"
            )
        )
    return obs


# -- M4 / M5: the amount is a pair, rounding is a policy --------------------------------


@check(
    "L02", "M4", "error",
    "Missing or implausible currency",
    "Store an ISO 4217 alpha-3 code on every line; an amount without a currency is not a "
    "monetary amount.",
    "Every line must carry a currency. Codes are validated against an embedded set of the ~40 "
    "most common ISO 4217 codes; anything outside it that is still a plausible alpha-3 is "
    "reported as unrecognised rather than invalid, because that embedded set is deliberately "
    "partial and is not the register.",
    requires=("currency",),
)
def check_currency(led: Ledger) -> list[Obs]:
    obs = []
    for line in led.lines:
        code = line.currency
        if not code:
            obs.append(
                Obs(
                    f"{line.ref} account={line.account} has no currency",
                    title="Line has no currency",
                )
            )
        elif not ALPHA3_RE.match(code):
            obs.append(
                Obs(
                    f"{line.ref} currency={code!r} is not a three-letter code",
                    title="Currency is not a valid ISO 4217 alpha-3 code",
                )
            )
        elif code.upper() not in COMMON_CURRENCIES:
            obs.append(
                Obs(
                    f"{line.ref} currency={code!r} is alpha-3 but not in the embedded set",
                    title="Currency not recognised (verify against ISO 4217)",
                    fix="Confirm the code against the ISO 4217 register; this harness ships only "
                    "the ~40 most common codes, so an unrecognised code is a prompt, not a verdict.",
                    severity="warn",
                )
            )
        elif code != code.upper():
            obs.append(
                Obs(
                    f"{line.ref} currency={code!r} is not upper-case",
                    title="Currency code is not upper-case",
                    fix="Normalise currency codes to upper case at the boundary; 'eur' and 'EUR' "
                    "must not become two buckets in a group-by.",
                    severity="warn",
                )
            )
    return obs


@check(
    "L03", "M4/M5", "error",
    "Amount has an impossible scale or a float artifact",
    "Store amounts as integer minor units or Decimal with a declared scale, and round once at "
    "a declared point.",
    "Three defects in the amount as written: more decimal places than the currency's minor "
    "unit allows, scientific notation (which means the value passed through a float), and "
    "values that only round-trip through binary floating point -- the 0.1+0.2 = "
    "0.30000000000000004 family. Minor-unit exponents: JPY/KRW/VND/CLP/ISK and the CFA francs "
    "= 0, KWD/BHD/JOD/OMR/TND/LYD/IQD = 3, everything else 2.",
)
def check_amount_scale(led: Ledger) -> list[Obs]:
    obs = []
    for line in led.lines:
        if line.amount_error:
            obs.append(
                Obs(
                    f"{line.ref} {line.amount_error}",
                    title="Amount is missing or not a number",
                    fix="Every line needs exactly one readable amount encoding: amount+direction, "
                    "a debit/credit pair, or amount_minor.",
                )
            )
            continue

        exp = exponent_for(line.currency) if line.currency else DEFAULT_EXPONENT
        if (
            line.declared_exponent is not None
            and line.currency
            and line.declared_exponent != exp
        ):
            obs.append(
                Obs(
                    f"{line.ref} exponent={line.declared_exponent} but {line.currency} has "
                    f"{exp} minor digits",
                    title="Declared exponent disagrees with the currency's minor unit",
                    fix="Take the minor-unit exponent from the currency table, not from the payload.",
                )
            )

        for field_name, raw in line.raw_amounts:
            text = str(raw).strip()
            if not text:
                continue
            if SCIENTIFIC_RE.match(text):
                obs.append(
                    Obs(
                        f"{line.ref} {field_name}={text!r} is in scientific notation",
                        title="Amount written in scientific notation",
                        fix="A monetary amount never needs an exponent notation; it arrived here "
                        "through a float. Serialise as a decimal string.",
                    )
                )
                continue

            fraction = text.split(".", 1)[1] if "." in text else ""
            if field_name == "amount_minor":
                if fraction.rstrip("0"):
                    obs.append(
                        Obs(
                            f"{line.ref} amount_minor={text!r} is not an integer",
                            title="amount_minor is not an integer",
                            fix="Minor units are integers by definition; a fractional minor unit "
                            "means the value was scaled by a float.",
                        )
                    )
                continue

            digits = len(fraction.rstrip("0")) if fraction else 0
            if digits > exp:
                if len(fraction) >= 12 and FLOAT_ARTIFACT_RE.search(fraction):
                    obs.append(
                        Obs(
                            f"{line.ref} {field_name}={text!r} ({line.currency}, {exp} minor digits)",
                            title="Amount only round-trips through a float",
                            fix="This is binary floating-point residue (the 0.1+0.2 family). "
                            "Recompute from integer minor units or Decimal; the stored value is "
                            "already wrong.",
                        )
                    )
                else:
                    obs.append(
                        Obs(
                            f"{line.ref} {field_name}={text!r} has {digits} decimal place(s), "
                            f"{line.currency or 'the currency'} allows {exp}",
                            title="Amount has more decimals than the currency allows",
                        )
                    )
    return obs


# -- M3: postings are immutable ---------------------------------------------------------


@check(
    "L05", "M3", "error",
    "Duplicate line id",
    "Line ids are the primary key of the journal; make them unique and reload the export.",
    "Two or more lines sharing a line_id. Either the export is duplicated or the ledger has no "
    "usable identity for a posting -- and without identity there is nothing to reconcile to.",
    requires=("line_id",),
)
def check_duplicate_line_id(led: Ledger) -> list[Obs]:
    seen: dict[str, list[Line]] = defaultdict(list)
    for line in led.lines:
        if line.line_id:
            seen[line.line_id].append(line)
    obs = []
    for line_id, group in sorted(seen.items()):
        if len(group) > 1:
            rows = ", ".join(f"row {ln.row_no}" for ln in group[:4])
            entries = ", ".join(sorted({ln.entry_id for ln in group}))
            obs.append(
                Obs(
                    f"line_id={line_id} appears {len(group)} times ({rows}) "
                    f"on entry/entries {entries}"
                )
            )
    return obs


@check(
    "L08", "M3", "warn",
    "Gap or duplicate in the line sequence",
    "A sequence with holes means postings are missing from the export or were never written; "
    "establish which before trusting any total.",
    "Checks the sequence for contiguity. If every entry's sequence restarts at 1 the numbering "
    "is treated as per-entry and validated within each entry; otherwise it is validated "
    "globally across the file.",
    requires=("sequence",),
)
def check_sequence(led: Ledger) -> list[Obs]:
    with_seq = [ln for ln in led.lines if ln.sequence is not None]
    if not with_seq:
        return []

    per_entry: dict[str, list[int]] = defaultdict(list)
    for line in with_seq:
        per_entry[line.entry_id].append(line.sequence)

    per_entry_mode = len(per_entry) > 1 and all(min(v) == 1 for v in per_entry.values())
    groups = per_entry if per_entry_mode else {"": [ln.sequence for ln in with_seq]}

    obs = []
    for name, values in sorted(groups.items()):
        scope = f"entry={name} " if per_entry_mode else "across the file "
        counts = Counter(values)
        duplicates = sorted(v for v, n in counts.items() if n > 1)
        if duplicates:
            shown = ", ".join(str(v) for v in duplicates[:6])
            more = f" (+{len(duplicates) - 6} more)" if len(duplicates) > 6 else ""
            obs.append(
                Obs(
                    f"{scope}sequence value(s) {shown}{more} used more than once",
                    title="Duplicate sequence value",
                )
            )
        ordered = sorted(counts)
        missing = [v for v in range(ordered[0], ordered[-1] + 1) if v not in counts]
        if missing:
            shown = ", ".join(str(v) for v in missing[:6])
            more = f" (+{len(missing) - 6} more)" if len(missing) > 6 else ""
            obs.append(
                Obs(
                    f"{scope}sequence runs {ordered[0]}..{ordered[-1]} but "
                    f"{len(missing)} value(s) are missing: {shown}{more}",
                    title="Gap in the sequence",
                )
            )
    return obs


@check(
    "L14", "M3", "warn",
    "Evidence of mutation rather than reversal",
    "Correct a posting with a reversing entry that cites the original; never update, void or "
    "delete one.",
    "Two signals that history is being rewritten: status values in the void/delete/amend family, "
    "and the mere presence of a `deleted_at` or `updated_at` column on a journal export -- a "
    "table that can be updated is a table whose history is not evidence.",
)
def check_mutation(led: Ledger) -> list[Obs]:
    obs = []
    for column in sorted(led.raw_columns & MUTATION_COLUMNS):
        obs.append(
            Obs(
                f"column {column!r} exists on the journal export",
                title="Journal export carries a mutation column",
                fix="Drop the column from the journal. Postings are append-only; a mutable "
                "timestamp on one is a control failure whether or not it is populated.",
            )
        )
    for line in led.lines:
        if line.status and line.status in MUTATION_STATUSES:
            obs.append(
                Obs(
                    f"{line.ref} status={line.status!r}",
                    title="Status value implies the posting was mutated",
                )
            )
    return obs


@check(
    "L15", "M3", "error",
    "Reversal does not mirror its original",
    "A reversal reposts the original's lines with the sides flipped -- same accounts, same "
    "amounts, opposite signs -- and cites the original entry id.",
    "Follows `reverses_entry_id`: the target must exist in the file, and the reversing entry's "
    "lines must be the exact mirror of the original's (same accounts and currencies, amounts "
    "negated). A partial or re-priced 'reversal' is a new economic event and must be booked "
    "as one.",
    requires=("reverses_entry_id",),
)
def check_reversals(led: Ledger) -> list[Obs]:
    obs = []
    seen: set[tuple[str, str]] = set()
    for line in led.lines:
        target = line.reverses_entry_id
        if not target:
            continue
        key = (line.entry_id, target)
        if key in seen:
            continue
        seen.add(key)

        if target not in led.entries:
            obs.append(
                Obs(
                    f"entry={line.entry_id} reverses {target!r}, which is not in this file",
                    title="Reversal cites an entry that is not present",
                    fix="Either the export is incomplete or the reversal cites a bad id; a "
                    "reversal whose original cannot be produced is not evidence of anything.",
                )
            )
            continue

        original = led.entry_signature(target)
        reversal = led.entry_signature(line.entry_id)
        mirrored = Counter(
            (account, currency, -amount) for (account, currency, amount) in reversal.elements()
        )
        if mirrored == original:
            continue
        missing = original - mirrored
        extra = mirrored - original
        detail = []
        for account, currency, amount in list(missing)[:2]:
            detail.append(f"original has {account} {fmt_money(amount, currency, signed=True)} unmatched")
        for account, currency, amount in list(extra)[:2]:
            detail.append(f"reversal adds {account} {fmt_money(-amount, currency, signed=True)}")
        obs.append(
            Obs(
                f"entry={line.entry_id} reverses {target} but does not mirror it"
                + (f" -- {'; '.join(detail)}" if detail else "")
            )
        )
    return obs


# -- M7 / M8: idempotency and external events -------------------------------------------


@check(
    "L06", "M7", "error",
    "Idempotency key reused across entries",
    "Derive the key from the business action and enforce it as a unique constraint; a replayed "
    "key must return the original entry, never post a second one.",
    "The same idempotency_key appearing on two different entry ids. Sharing a key across the "
    "lines of one entry is normal and is not reported.",
    requires=("idempotency_key",),
)
def check_idempotency(led: Ledger) -> list[Obs]:
    return _duplicate_key_across_entries(
        led, "idempotency_key", lambda ln: ln.idempotency_key, "idempotency key"
    )


@check(
    "L07", "M8", "error",
    "External event id reused across entries",
    "Deduplicate on the provider's event id before posting; webhooks are at-least-once and will "
    "be redelivered.",
    "The same external_event_id appearing on two different entry ids -- one external event "
    "booked twice, which is the classic at-least-once webhook defect.",
    requires=("external_event_id",),
)
def check_external_event(led: Ledger) -> list[Obs]:
    return _duplicate_key_across_entries(
        led, "external_event_id", lambda ln: ln.external_event_id, "external event id"
    )


def _duplicate_key_across_entries(
    led: Ledger, field_name: str, getter: Callable[[Line], str], label: str
) -> list[Obs]:
    index: dict[str, set[str]] = defaultdict(set)
    for line in led.lines:
        value = getter(line)
        if value:
            index[value].add(line.entry_id)
    obs = []
    for value, entry_ids in sorted(index.items()):
        if len(entry_ids) > 1:
            listed = sorted(entry_ids)
            obs.append(
                Obs(
                    f"{label} {value!r} is on {len(listed)} entries: "
                    f"{', '.join(listed[:4])}{' ...' if len(listed) > 4 else ''}"
                )
            )
    return obs


# -- M9: reconciliation ------------------------------------------------------------------


@check(
    "L16", "M9", "warn",
    "Suspense or clearing account aging with a live balance",
    "Work the balance down to zero: identify the items, post them to their real accounts, and "
    "give the account a named owner and an age SLA.",
    "Accounts whose identifier matches the suspense pattern (default "
    "'suspense|clearing|unmatched|in.?transit|unapplied', override with --suspense-pattern) "
    "that carry a non-zero balance whose oldest line is older than --suspense-max-age-days "
    "(default 30). A clearing account that does not return to zero every cycle is an incident, "
    "not a backlog.",
)
def check_suspense_aging(led: Ledger) -> list[Obs]:
    oldest: dict[tuple[str, str], datetime] = {}
    for line in led.lines:
        if not led.suspense_re.search(line.account or ""):
            continue
        stamp = line.event_time or line.booking_time
        if stamp is None:
            continue
        key = (line.account, line.currency)
        if key not in oldest or stamp < oldest[key]:
            oldest[key] = stamp

    obs = []
    for (account, currency), balance in sorted(led.account_balances.items()):
        if balance == 0 or not led.suspense_re.search(account or ""):
            continue
        stamp = oldest.get((account, currency))
        if stamp is None:
            obs.append(
                Obs(
                    f"account={account} {currency} balance "
                    f"{fmt_money(balance, currency, signed=True)}, no timestamp to age it against",
                    title="Suspense account with a balance and no ageable timestamp",
                )
            )
            continue
        age_days = (led.now - stamp).days
        if age_days <= led.suspense_max_age_days:
            continue
        obs.append(
            Obs(
                f"account={account} {currency} balance "
                f"{fmt_money(balance, currency, signed=True)}, oldest open line "
                f"{stamp.date().isoformat()} ({age_days} days, threshold "
                f"{led.suspense_max_age_days})"
            )
        )
    return obs


# -- M6: no implicit cross-currency arithmetic -------------------------------------------


@check(
    "L17", "M6", "warn",
    "Entry mixes currencies with no rate recorded",
    "Record the rate, its source and its timestamp on the conversion, and book the spread to "
    "its own account.",
    "An entry touching more than one currency where no line carries an fx_rate. 'We used the "
    "ECB rate' is not evidence; the rate value and its timestamp are.",
)
def check_mixed_currency(led: Ledger) -> list[Obs]:
    obs = []
    for entry_id, lines in sorted(led.entries.items()):
        currencies = sorted({ln.currency for ln in lines if ln.currency})
        if len(currencies) < 2:
            continue
        if any(ln.fx_rate for ln in lines):
            continue
        obs.append(Obs(f"entry={entry_id} spans {', '.join(currencies)} with no fx_rate on any line"))
    return obs


# -- M10: time is explicit and threefold ---------------------------------------------------


@check(
    "L09", "M10", "warn",
    "Event and booking time are not both present and ordered",
    "Record both timestamps explicitly; booking time is when you learned of the event and can "
    "never precede it.",
    "Requires event_time and booking_time on every line, with booking_time not earlier than "
    "event_time. Collapsing the two loses the ability to explain a late posting, and a booking "
    "before the event means one of the two is wrong.",
    requires=("event_time", "booking_time"),
)
def check_time_order(led: Ledger) -> list[Obs]:
    obs = []
    for line in led.lines:
        if not line.raw_event_time:
            obs.append(Obs(f"{line.ref} has no event_time", title="Line has no event time"))
        elif line.event_time is None:
            obs.append(
                Obs(
                    f"{line.ref} event_time={line.raw_event_time!r} is not a readable timestamp",
                    title="Timestamp is not readable",
                )
            )
        if not line.raw_booking_time:
            obs.append(Obs(f"{line.ref} has no booking_time", title="Line has no booking time"))
        elif line.booking_time is None:
            obs.append(
                Obs(
                    f"{line.ref} booking_time={line.raw_booking_time!r} is not a readable timestamp",
                    title="Timestamp is not readable",
                )
            )
        if line.event_time and line.booking_time and line.booking_time < line.event_time:
            seconds = int((line.event_time - line.booking_time).total_seconds())
            obs.append(
                Obs(
                    f"{line.ref} booked {line.booking_time.isoformat()} before the event at "
                    f"{line.event_time.isoformat()} ({_duration(seconds)} earlier)",
                    title="Booking time precedes event time",
                )
            )
    return obs


@check(
    "L10", "M10", "error",
    "Period disagrees with the event time, or is closed",
    "A closed period never changes: post the late item to the open period with a reference to "
    "the original date.",
    "Two independent period defects. The period a posting belongs to is derived from its "
    "**event time** -- when the money moved -- never from when it was booked, so a line whose "
    "`period` is not the month of its event_time is reported as a warning: legitimate only "
    "under an explicit cutoff rule that is written down. Booking late into an open period is "
    "normal and is not reported: an event on 31 August booked on 2 September still belongs to "
    "2026-08. A line posting into a period named by --closed-period is an error whatever its "
    "timestamps say -- rewriting a closed period is a restatement, with its own process. Lines "
    "with no readable event_time are reported as skipped (info): booking time is not a "
    "substitute for the event time, so this harness declines to guess.",
    requires=("period",),
)
def check_period(led: Ledger) -> list[Obs]:
    obs = []
    for line in led.lines:
        period = line.period.strip()
        if not period:
            obs.append(
                Obs(
                    f"{line.ref} has no accounting period",
                    title="Line has no accounting period",
                    severity="warn",
                    fix="Stamp every posting with the period it belongs to; the period is not "
                    "derivable after a cutoff rule changes.",
                )
            )
            continue
        # The closed-period gate is independent of the event-time comparison: a
        # posting into a closed period is an error even when its period agrees
        # with its event month -- which, for a correctly stamped line, it will.
        if period in led.closed_periods:
            obs.append(
                Obs(
                    f"{line.ref} posts into closed period {period}",
                    title="Posting into a closed period",
                )
            )
        if not PERIOD_RE.match(period):
            obs.append(
                Obs(
                    f"{line.ref} period={period!r} is not YYYY-MM",
                    title="Period is not in YYYY-MM form",
                    severity="warn",
                    fix="Use a canonical YYYY-MM period label so periods sort and group.",
                )
            )
            continue
        if line.event_time is None:
            obs.append(
                Obs(
                    f"{line.ref} period={period} cannot be checked: no readable event_time"
                    + (f" ({line.raw_event_time!r})" if line.raw_event_time else ""),
                    title="L10 skipped on this line: no event time to derive the period from",
                    severity="info",
                    fix="Record event_time on every posting. Booking time cannot stand in for "
                    "it: the period follows when the money moved, so without an event time "
                    "the period is unverified, not correct.",
                )
            )
            continue
        event_month = month_of(line.event_time)
        if event_month != period:
            obs.append(
                Obs(
                    f"{line.ref} period={period} but the event is in {event_month} "
                    f"(event_time={line.event_time.isoformat()})",
                    title="Period disagrees with the event month",
                    severity="warn",
                    fix="The period follows the event time, not the booking time. Either the "
                    "cutoff rule that put this line in another period is undocumented, or the "
                    "period is wrong. Both need a written answer.",
                )
            )
    return obs


# -- M14: auditability --------------------------------------------------------------------


@check(
    "L20", "M14", "warn",
    "Line is unexplainable",
    "Give every posting a description or an external reference; a line nobody can explain is a "
    "line nobody can defend to an auditor.",
    "Lines carrying neither a description/memo nor an external event id. Under time pressure, "
    "an unexplained posting costs more than the amount on it.",
)
def check_described(led: Ledger) -> list[Obs]:
    return [
        Obs(
            f"{line.ref} account={line.account} "
            f"{fmt_money(line.signed_minor, line.currency, signed=True)} has no description and "
            f"no external reference"
        )
        for line in led.lines
        if not line.description.strip() and not line.external_event_id.strip()
    ]


# --------------------------------------------------------------------------------------
# Runner
# --------------------------------------------------------------------------------------


def run_checks(led: Ledger, selected: list[Check]) -> list[Finding]:
    findings: list[Finding] = []
    for chk in selected:
        missing = [f for f in chk.requires if f not in led.present]
        if missing:
            findings.append(
                Finding(
                    check=chk.id,
                    invariant=chk.invariant,
                    severity="info",
                    title=f"{chk.id} skipped: the export has no {', '.join(missing)} column",
                    count=1,
                    examples=[
                        f"add {'/'.join(missing)} to the export to enable this check "
                        f"({chk.title.lower()})"
                    ],
                    fix=f"Include {', '.join(missing)} in the journal export; until then this "
                    f"check family is unverified, not passing.",
                )
            )
            continue

        grouped: dict[tuple[str, str, str], list[str]] = {}
        for obs in chk.fn(led):
            key = (obs.title or chk.title, obs.severity or chk.severity, obs.fix or chk.fix)
            grouped.setdefault(key, []).append(obs.example)
        for (title, severity, fix), examples in grouped.items():
            findings.append(
                Finding(
                    check=chk.id,
                    invariant=chk.invariant,
                    severity=severity,
                    title=title,
                    count=len(examples),
                    examples=examples,
                    fix=fix,
                )
            )

    findings.sort(key=lambda f: (-SEVERITY_RANK[f.severity], f.check, f.title))
    return findings


def select_checks(only: str | None, skip: str | None) -> list[Check]:
    known = {c.id: c for c in CHECKS}

    def parse(spec: str | None, flag: str) -> set[str]:
        if not spec:
            return set()
        ids = {token.strip().upper() for token in spec.split(",") if token.strip()}
        unknown = sorted(ids - set(known))
        if unknown:
            raise InputError(
                f"{flag}: unknown check id(s) {', '.join(unknown)}. "
                f"Known ids: {', '.join(sorted(known))}"
            )
        return ids

    only_ids = parse(only, "--only")
    skip_ids = parse(skip, "--skip")
    selected = [c for c in CHECKS if (not only_ids or c.id in only_ids) and c.id not in skip_ids]
    if not selected:
        raise InputError("--only/--skip left no checks to run")
    return selected


# --------------------------------------------------------------------------------------
# Output
# --------------------------------------------------------------------------------------


def render_human(report: Report, max_examples: int) -> str:
    out: list[str] = []
    add = out.append

    add("LEDGER AUDIT")
    add(f"  file          {report.file}")
    add(f"  entries       {report.entries}")
    add(f"  lines         {report.lines}")
    add(f"  currencies    {', '.join(report.currencies) if report.currencies else '(none)'}")
    if report.date_range:
        add(f"  date range    {report.date_range[0]} .. {report.date_range[1]}")
    else:
        add("  date range    (no readable timestamps)")
    add(f"  checks run    {len(report.checks_run)} of {report.checks_total}")
    add(f"  threshold     fail on {report.fail_on}")
    add("")

    if not report.findings:
        add("No findings. The export is internally consistent on every check that ran.")
        add("")
        add("This is a floor, not a verdict: nothing here judges whether the posting rules")
        add("model the business, whether the amounts are the right amounts, or whether the")
        add("book reconciles to the external record. See the docstring for the full list.")
        return "\n".join(out)

    headers = {"error": "ERRORS", "warn": "WARNINGS", "info": "NOTES"}
    for severity in SEVERITY_ORDER:
        group = [f for f in report.findings if f.severity == severity]
        if not group:
            continue
        add(f"{headers[severity]}  ({len(group)})")
        add("-" * 78)
        for finding in group:
            add(f"  [{finding.check}] {finding.invariant:<6} {finding.title}  x{finding.count}")
            for example in finding.examples[:max_examples]:
                add(f"      - {example}")
            hidden = finding.count - min(finding.count, max_examples)
            if hidden > 0:
                add(f"      - ... and {hidden} more (raise --max-examples to see them)")
            add(f"      fix: {finding.fix}")
            add("")
        add("")

    counts = report.counts()
    verdict = "FAIL" if report.exit_code() else "PASS"
    total = report.observations()
    add(
        f"SUMMARY  {counts['error']} error, {counts['warn']} warn, {counts['info']} info "
        f"findings across {total} observation{'' if total == 1 else 's'} -- {verdict} "
        f"(threshold: {report.fail_on})"
    )
    return "\n".join(out)


def render_list_checks() -> str:
    out: list[str] = []
    add = out.append
    ordered = sorted(CHECKS, key=lambda c: c.id)
    add("audit_ledger.py -- what it checks, and against which invariant")
    add("=" * 78)
    add("")
    add(SCHEMA_DOC)
    add("CHECKS")
    add("")
    add(f"  {'id':<5} {'inv':<7} {'severity':<9} title")
    add(f"  {'-' * 5} {'-' * 7} {'-' * 9} {'-' * 46}")
    for chk in ordered:
        add(f"  {chk.id:<5} {chk.invariant:<7} {chk.severity:<9} {chk.title}")
    add("")
    add("DETAIL")
    add("")
    for chk in ordered:
        add(f"  [{chk.id}] {chk.invariant} -- {chk.title} ({chk.severity})")
        for chunk in _wrap(chk.description, 74):
            add(f"      {chunk}")
        if chk.requires:
            add(f"      requires: {', '.join(chk.requires)}")
        add(f"      fix: {_wrap(chk.fix, 68)[0]}")
        for chunk in _wrap(chk.fix, 68)[1:]:
            add(f"           {chunk}")
        add("")
    add("SEVERITIES")
    add("  error  a defect in the book: money is missing, doubled, or unexplainable.")
    add("  warn   a defect in the record: legitimate under a written policy, suspect without one.")
    add("  info   a check that could not run because the export lacks its field. Never fails a")
    add("         run -- but an unverified check is not a passing check.")
    add("")
    add("WHAT THIS HARNESS DOES NOT JUDGE")
    add("  Posting rules, chart of accounts, revenue recognition, whether an amount is the right")
    add("  amount, reversal windows, completeness of the export, reconciliation to the external")
    add("  record, authorization and separation of duties, limits, holds, secrets hygiene, and")
    add("  agreement with any balance stored elsewhere. Those stay human review.")
    return "\n".join(out)


def _wrap(text: str, width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        if current and len(current) + 1 + len(word) > width:
            lines.append(current)
            current = word
        else:
            current = f"{current} {word}".strip()
    if current:
        lines.append(current)
    return lines or [""]


# --------------------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="audit_ledger.py",
        description=(
            "Audit a journal export (CSV or JSON) against the mechanically checkable "
            "invariants of a double-entry ledger. Run --list-checks for the input schema."
        ),
        epilog="exit 0 = clean at the threshold, 1 = findings, 2 = unreadable input.",
    )
    parser.add_argument("file", nargs="?", help="journal export: CSV with a header row, or JSON")
    parser.add_argument("--json", action="store_true", dest="as_json", help="machine-readable output")
    parser.add_argument(
        "--fail-on", choices=("error", "warn"), default="error",
        help="lowest severity that makes the run fail (default: error)",
    )
    parser.add_argument(
        "--list-checks", action="store_true",
        help="print the input schema and every check, then exit (no file needed)",
    )
    parser.add_argument("--period", metavar="YYYY-MM", help="audit only this accounting period")
    parser.add_argument(
        "--closed-period", metavar="YYYY-MM", action="append", default=[],
        help="a period that is closed; postings into it are errors (repeatable)",
    )
    parser.add_argument(
        "--suspense-pattern", metavar="REGEX", default=DEFAULT_SUSPENSE_PATTERN,
        help=f"account pattern treated as suspense/clearing (default: {DEFAULT_SUSPENSE_PATTERN!r})",
    )
    parser.add_argument(
        "--suspense-max-age-days", metavar="N", type=int, default=30,
        help="age at which an open suspense balance becomes a finding (default: 30)",
    )
    parser.add_argument(
        "--max-examples", metavar="N", type=int, default=3,
        help="examples shown per finding in human output (default: 3)",
    )
    parser.add_argument("--only", metavar="IDS", help="run only these check ids, comma-separated")
    parser.add_argument("--skip", metavar="IDS", help="skip these check ids, comma-separated")
    return parser


def build_report(args: argparse.Namespace) -> Report:
    path = Path(args.file)
    rows, present, raw_columns = read_rows(path)
    lines = [normalise_line(row, i) for i, row in enumerate(rows, start=2)]

    if args.period:
        wanted = args.period.strip()
        if "period" in present:
            lines = [ln for ln in lines if ln.period.strip() == wanted]
        else:
            lines = [ln for ln in lines if month_of(ln.booking_time or ln.event_time) == wanted]

    selected = select_checks(args.only, args.skip)
    led = Ledger(
        lines,
        present,
        raw_columns,
        closed_periods=args.closed_period,
        suspense_pattern=args.suspense_pattern,
        suspense_max_age_days=args.suspense_max_age_days,
    )
    findings = run_checks(led, selected)

    return Report(
        file=str(path),
        entries=len(led.entries),
        lines=len(lines),
        currencies=led.currencies,
        date_range=led.date_range(),
        checks_run=[c.id for c in selected],
        checks_total=len(CHECKS),
        fail_on=args.fail_on,
        findings=findings,
    )


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.list_checks:
        print(render_list_checks())
        return 0

    if not args.file:
        parser.print_usage(sys.stderr)
        print("audit_ledger.py: a file is required (or use --list-checks)", file=sys.stderr)
        return 2

    if args.max_examples < 0:
        print("audit_ledger.py: --max-examples must not be negative", file=sys.stderr)
        return 2

    try:
        report = build_report(args)
    except InputError as exc:
        if args.as_json:
            print(json.dumps({"file": args.file, "error": str(exc)}, indent=2))
        else:
            print(f"audit_ledger.py: {exc}", file=sys.stderr)
        return 2

    if args.as_json:
        print(json.dumps(report.to_json(), indent=2, sort_keys=False))
    else:
        print(render_human(report, args.max_examples))
    return report.exit_code()


if __name__ == "__main__":
    sys.exit(main())
