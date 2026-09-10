#!/usr/bin/env python3
"""
money_lint.py -- static analysis for the money defects that survive code review.

Part of the `finance-expert` skill of the PCL standard library. Standard library
only: no third-party imports, no network, no configuration file.

    python3 money_lint.py src/
    python3 money_lint.py src/ --json --fail-on error
    python3 money_lint.py --list-checks

Every finding cites the money invariant it breaks (M1..M20 in SKILL.md) and
carries a one-line fix. False positives are the failure mode that kills a
linter, so every heuristic here is deliberately biased toward precision: a
check fires only when a money-ish identifier is involved, non-money contexts
(a rate, a ratio, a percentage, a score, a count, an id) are excluded by
construction, and anything can be silenced with an end-of-line comment:

    total = round(amount, 2)          # money-lint: ignore[C03]
    const t = amount.toFixed(2);      // money-lint: ignore[C03]
    UPDATE ledger SET x = 1;          -- money-lint: ignore[C12]

A whole file is silenced with `money-lint: ignore-file` in any comment near
the top of the file.

Exit codes: 0 = nothing at or above the fail threshold, 1 = findings at or
above it, 2 = a path that could not be read.
"""

from __future__ import annotations

import argparse
import ast
import fnmatch
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path

VERSION = "1.0.0"

# ---------------------------------------------------------------------------
# check registry
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Check:
    id: str
    invariant: str
    severity: str
    title: str
    fix: str


def _c(cid: str, inv: str, sev: str, title: str, fix: str) -> Check:
    return Check(cid, inv, sev, title, fix)


CHECKS: dict[str, Check] = {
    c.id: c
    for c in (
        _c("C01", "M4", "error",
           "money-ish value declared as a binary float",
           "hold money as Decimal with a declared scale, or as integer minor units, paired with an ISO 4217 currency."),
        _c("C02", "M4", "error",
           "Decimal built from a float, or money cast to float",
           "build Decimal from a string or from integer minor units; never round-trip money through a binary float."),
        _c("C03", "M5", "warn",
           "money rounded implicitly instead of at a declared point",
           "quantize once, at a declared rounding point, with an explicit rounding mode (e.g. ROUND_HALF_EVEN)."),
        _c("C04", "M5", "warn",
           "money split across a count of parts without an allocation that preserves the total",
           "allocate with a largest-remainder split so the parts sum exactly to the whole, and book the residual."),
        _c("C05", "M4", "warn",
           "money field declared with no currency field beside it",
           "add an ISO 4217 currency column/field next to the amount, or use a Money type that carries both."),
        _c("C06", "M6", "warn",
           "SUM over money with no currency in the GROUP BY",
           "GROUP BY currency (or pin a single currency in WHERE); a sum across currencies is not a number."),
        _c("C07", "M7", "error",
           "mutating payment call with no idempotency key",
           "pass a caller-derived idempotency key so a retry replays the outcome instead of moving money twice."),
        _c("C08", "M8", "warn",
           "webhook handler with no signature verification",
           "verify the provider signature and fail closed before reading the payload; then dedupe on the event id."),
        _c("C09", "M15", "error",
           "regulated data or a credential in a log or print call",
           "log an opaque token or the last four digits only; PAN, CVV, keys and passwords never enter a log."),
        _c("C10", "M15", "error",
           "hardcoded credential or card number in source",
           "move it to a secret manager and rotate it; use an obviously-fake, non-Luhn value in fixtures."),
        _c("C11", "M1", "warn",
           "stored balance mutated in place",
           "append a posting and derive the balance; a stored balance is a labelled, rebuildable cache, not the truth."),
        _c("C12", "M3", "error",
           "ledger rows updated or deleted",
           "postings are immutable: correct with a reversing entry that cites the original."),
        _c("C13", "M10", "warn",
           "naive timestamp on a cutoff-sensitive money field",
           "use a timezone-aware UTC timestamp and record the accounting period explicitly."),
        _c("C14", "M6", "warn",
           "hardcoded FX rate",
           "fetch the rate from the declared source and record rate, source and timestamp with the conversion."),
        _c("C15", "M4", "warn",
           "money compared for equality against a float literal",
           "compare Decimal to Decimal, or minor units to minor units; float equality on money is a coin flip."),
        _c("C16", "M13", "warn",
           "balance read then written instead of reserved atomically",
           "reserve funds in one operation: a conditional UPDATE or a hold posting, never check-then-debit."),
    )
}

SEV_RANK = {"info": 0, "warn": 1, "error": 2}

# ---------------------------------------------------------------------------
# the money-ish identifier heuristic -- defined once, used everywhere
# ---------------------------------------------------------------------------

MONEY_WORDS = (
    "amount|amt|price|total|subtotal|balance|fee|charge|cost|payment|refund|"
    "payout|revenue|salary|wage|tax|vat|discount|credit|debit|cash|money|fund|"
    "deposit|withdrawal|invoice|premium|interest|principal|notional"
)
NON_MONEY_WORDS = "rate|ratio|percent|pct|score|count|qty|quantity|index"

# Some of those words mean money almost everywhere (`amount`, `price`, `vat`);
# others are ordinary English that happens to overlap (`total` in a mean, a
# `cost` function, an electric `charge`, `interest` in prose, a `principal`
# component). Splitting them is what keeps this linter quiet on real code: a
# STRONG word is money on sight, a WEAK word only counts in a file that is
# visibly about money.
STRONG_MONEY_WORDS = (
    "amount|amt|price|subtotal|balance|fee|payment|refund|payout|revenue|"
    "salary|wage|tax|vat|discount|cash|money|deposit|withdrawal|invoice|notional"
)
WEAK_MONEY_WORDS = "total|charge|cost|credit|debit|fund|premium|interest|principal"

_STRONG_TOKEN = re.compile(rf"^(?:{STRONG_MONEY_WORDS})(?:s|es)?$")
_WEAK_TOKEN = re.compile(rf"^(?:{WEAK_MONEY_WORDS})(?:s|es)?$")
_NON_MONEY_TOKEN = re.compile(rf"^(?:{NON_MONEY_WORDS})(?:s|es|d|ed)?$")

# `balance` is the most over-loaded word in the list: real code is full of
# brace balance, white balance, load balance, balance factors. A `balance`
# counts as money only when it stands alone (`balance`, `account.balance`) or
# when something beside it says whose account it is.
TOTAL_QUALIFIERS = {
    "order", "orders", "invoice", "cart", "basket", "line", "lines", "item",
    "items", "grand", "sub", "running", "gross", "net", "batch", "day", "daily",
    "week", "weekly", "month", "monthly", "year", "yearly", "ytd", "period",
    "settlement", "group", "customer", "merchant", "account", "purchase",
    "sale", "sales", "shipping", "checkout", "due", "paid", "outstanding",
    "opening", "closing", "basket", "booking", "contract",
}

BALANCE_QUALIFIERS = {
    "account", "accounts", "wallet", "wallets", "ledger", "customer", "client",
    "merchant", "user", "member", "holder", "payer", "payee", "available",
    "opening", "closing", "current", "running", "start", "starting", "end",
    "ending", "final", "initial", "book", "gl", "escrow", "settlement", "trial",
    "minor", "eur", "usd", "gbp", "jpy", "chf", "cad", "aud",
}

# `balance` and `total` are the two words in the list that ordinary code uses
# constantly for something else. Both are admitted only when they stand alone
# or when a neighbouring token says what kind of balance/total it is.
OVERLOADED_WORDS = {
    "balance": BALANCE_QUALIFIERS,
    "balances": BALANCE_QUALIFIERS,
    "total": TOTAL_QUALIFIERS,
    "totals": TOTAL_QUALIFIERS,
}

# Unambiguous finance vocabulary. Deliberately excludes ordinary English and
# excludes `Decimal` -- `statistics.py` mentions Decimal constantly and is not
# about money.
MONEY_CONTEXT = re.compile(
    r"currenc|\bccy\b|iso.?4217|\bmoney\b|payment|\bpayee\b|\bpayer\b|\bpayout\b|"
    r"invoice|refund|chargeback|billing|checkout|ledger|journal|posting|"
    r"\bpsp\b|stripe|adyen|braintree|paypal|acquirer|cardholder|\bpan\b|\biban\b|"
    r"\bvat\b|minor.?unit|\bwallet\b|payroll|\bsalary\b|subtotal|remittance|"
    r"settlement|disbursement|merchant|\b(?:USD|EUR|GBP|JPY|CHF|CAD|AUD)\b",
    re.I,
)

# Default True so `moneyish()` behaves sanely if called outside a file scan.
_FILE_MONEY_CONTEXT = True


def set_file_money_context(text: str) -> None:
    """Called once per file, before any check runs, to arm the weak words."""
    global _FILE_MONEY_CONTEXT
    _FILE_MONEY_CONTEXT = bool(MONEY_CONTEXT.search(text))

_CAMEL_1 = re.compile(r"(?<=[a-z0-9])(?=[A-Z])")
_CAMEL_2 = re.compile(r"(?<=[A-Z])(?=[A-Z][a-z])")


def normalize(name: str) -> str:
    """`totalAmount` / `TotalAmount` / `total_amount` -> `total_amount`."""
    s = _CAMEL_2.sub("_", _CAMEL_1.sub("_", name.strip()))
    return re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_").lower()


def moneyish(name: str | None) -> bool:
    """True when `name` denotes an amount of money and not a rate/count/id."""
    if not name:
        return False
    norm = normalize(name)
    if not norm:
        return False
    tokens = [t for t in norm.split("_") if t]
    if not tokens:
        return False
    # `payment_id`, `invoiceId`, plain `id` -- an identifier, not an amount.
    if tokens[-1] in ("id", "ids", "uuid", "key", "ref"):
        return False
    if any(_NON_MONEY_TOKEN.match(t) for t in tokens):
        return False
    # qualifier gate: `brace_balance`, `white_balance`, `checks_total`,
    # `total_tt` are not money whatever else the file contains.
    overloaded = [t for t in tokens if t in OVERLOADED_WORDS]
    if overloaded:
        allowed: set[str] = set()
        for t in overloaded:
            allowed |= OVERLOADED_WORDS[t]
        others = [t for t in tokens if t not in OVERLOADED_WORDS]
        if others and not any(
            _STRONG_TOKEN.match(t) or _WEAK_TOKEN.match(t) or t in allowed for t in others
        ):
            return False
    if any(_STRONG_TOKEN.match(t) for t in tokens):
        return True
    if any(_WEAK_TOKEN.match(t) for t in tokens):
        return _FILE_MONEY_CONTEXT
    return False


def is_balance_name(name: str | None) -> bool:
    """A stored balance: `balance`, `wallet_balance`, `account.balance`.

    Deliberately NOT `available` or `funds`: those are ordinary English that
    collide constantly (`available = [a.lower() for a in available]` in Babel),
    and the cost of that false positive is higher than the defect it catches.
    """
    if not name:
        return False
    return normalize(name).split("_")[-1] in ("balance", "balances") and moneyish(name)


CURRENCY_FIELD = re.compile(
    r"^(?:[a-z0-9_]*_)?(?:currenc(?:y|ies)|ccys?|iso_currenc(?:y|ies)|cur)(?:_code)?s?$"
)


def is_currency_field(name: str) -> bool:
    return bool(CURRENCY_FIELD.match(normalize(name)))


# A field annotated with a value type that already carries a currency.
MONEY_TYPE = re.compile(r"\b(?:Money|MonetaryAmount|CurrencyAmount|Cash|Amount)\b")

TIMEISH = re.compile(
    r"(?:^|_)(?:at|on|date|time|timestamp|ts|period|cutoff|booked|posted|"
    r"effective|created|updated|occurred|settled|captured|charged)(?:$|_)"
)


def timeish(name: str | None) -> bool:
    if not name:
        return False
    norm = normalize(name)
    return bool(TIMEISH.search(norm))


def clip(text: str, width: int = 46) -> str:
    """One-line, ellipsised source excerpt for a finding message."""
    flat = " ".join(text.split())
    return flat if len(flat) <= width else flat[: width - 3] + "..."


def luhn_ok(digits: str) -> bool:
    """Standard Luhn (mod 10) check used by card PANs."""
    if not digits.isdigit() or not 13 <= len(digits) <= 19:
        return False
    if len(set(digits)) == 1:  # 0000000000000000 -- padding, not a PAN
        return False
    total = 0
    for i, ch in enumerate(reversed(digits)):
        d = ord(ch) - 48
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


# ---------------------------------------------------------------------------
# shared patterns
# ---------------------------------------------------------------------------

FLOAT_TYPES_SQL = {"FLOAT", "REAL", "DOUBLE", "MONEY", "SMALLMONEY", "NUMBER", "FLOAT4", "FLOAT8", "BINARY_FLOAT", "BINARY_DOUBLE"}
FLOAT_TYPES_JVM = {"float", "double", "Float", "Double", "float32", "float64", "Number"}

SENSITIVE = re.compile(
    r"\b(?:pan|card_number|cardnumber|cardNumber|cvv|cvc|cvv2|track|track2|"
    r"secret|password|passwd|api_key|apiKey|access_token|accessToken|"
    r"private_key|privateKey|iban)\b"
)

SECRET_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("live secret key", re.compile(r"\bsk_live_[A-Za-z0-9]{6,}")),          # money-lint: ignore[C10]
    ("test secret key", re.compile(r"\bsk_test_[A-Za-z0-9]{6,}")),          # money-lint: ignore[C10]
    ("restricted key", re.compile(r"\brk_live_[A-Za-z0-9]{6,}")),           # money-lint: ignore[C10]
    ("webhook signing secret", re.compile(r"\bwhsec_[A-Za-z0-9]{6,}")),     # money-lint: ignore[C10]
    ("AWS access key id", re.compile(r"\bAKIA[0-9A-Z]{12,}")),              # money-lint: ignore[C10]
    ("private key block", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
]

BARE_DIGITS = re.compile(r"(?<![\w.\-])(\d{13,19})(?![\w.\-])")

LOG_CALL_PY = re.compile(r"^(?:print|log|logging|logger|LOG|LOGGER|_log|self\.log(?:ger)?)$")
LEDGER_TABLE = re.compile(
    r"^(?:[a-z0-9_]*_)?(?:ledger|ledgers|ledger_entries|journal|journals|"
    r"journal_lines|journal_entries|entries|postings|transactions)$"
)

PAYMENT_TAIL = {
    "paymentintent.create",
    "charge.create",
    "refund.create",
    "transfer.create",
    "payout.create",
    "payments.authorise",
    "payments.authorize",
}
PAYMENT_FUNC = {"createpayment", "initiatepayment", "create_payment", "initiate_payment"}
# `.capture(` and `.refund(` are far too generic on their own; require a
# payment-ish receiver so `buffer.capture()` and `cache.refund()` stay quiet.
PAYMENT_RECEIVER = re.compile(
    r"(?:payment|paymentintent|charge|intent|txn|transaction|psp|gateway|"
    r"stripe|adyen|braintree|checkout|acquirer|order|authorisation|authorization|auth)",
    re.I,
)
IDEMPOTENT = re.compile(r"idempotenc|\breference\b|\brequest_id\b|\brequestId\b", re.I)
VERIFY_CALL = re.compile(r"construct_event|constructEvent|verify|hmac|compare_digest|signature", re.I)
ALLOCATION_HINT = re.compile(r"allocate|allocation|split|apportion|prorate|pro_rata|distribute|remainder|residual")

# C04 is about *splitting* money into parts, so it fires only when the divisor
# is plausibly a count of those parts. Dividing money by something that is not
# a count is ordinary arithmetic and no allocation rule applies to it: a daily
# interest accrual is `balance * rate / terms.denominator` where the
# denominator is a day-count basis (365 or 360), an FX conversion divides by a
# rate, a unit price divides by a weight. None of those have a remainder to
# hand back. `len`/`length`/`size` are in the vocabulary because they are how
# each language spells "how many": `len(sellers)`, `sellers.length`.
COUNT_NAME = re.compile(
    r"^(?:n|count|num|parts|shares|recipients|installments|periods|splits|members"
    r"|len|length|size"
    r"|n_\w+|\w+_count|\w+s)$"
)


def count_like(name: str | None) -> bool:
    """True when `name` denotes a number of parts -- the divisor of a split."""
    if not name:
        return False
    return bool(COUNT_NAME.match(normalize(name)))


def tail_ident(expr: str) -> str:
    """The last identifier of a dotted/subscripted expression: `a.b[0].c` -> `c`."""
    parts = [p for p in re.split(r"[.\[\]()]+", expr) if p]
    return parts[-1] if parts else ""

RATE_NAME = re.compile(r"^(?:fx_rate|exchange_rate|conversion_rate|rate)$")
RATE_NAME_EXCLUDE = re.compile(r"limit|source|provider|card|error|per|window")

# ---------------------------------------------------------------------------
# suppression
# ---------------------------------------------------------------------------

IGNORE_LINE = re.compile(
    r"(?:#|//|--|/\*)\s*money-lint:\s*ignore(?!-file)\s*(?:\[([A-Za-z0-9,\s]*)\])?"
)
IGNORE_FILE = re.compile(r"money-lint:\s*ignore-file")


def file_suppressed(text: str) -> bool:
    head = text.split("\n", 40)[:40]
    return any(IGNORE_FILE.search(line) for line in head)


def line_suppresses(line: str, check_id: str) -> bool:
    m = IGNORE_LINE.search(line)
    if not m:
        return False
    ids = m.group(1)
    if not ids or not ids.strip():
        return True  # bare `ignore` silences the whole line
    return check_id.upper() in {i.strip().upper() for i in ids.split(",") if i.strip()}


# ---------------------------------------------------------------------------
# findings
# ---------------------------------------------------------------------------


@dataclass
class Finding:
    check: str
    invariant: str
    severity: str
    file: str
    line: int
    column: int
    message: str
    snippet: str
    fix: str

    def as_dict(self) -> dict:
        return {
            "check": self.check,
            "invariant": self.invariant,
            "severity": self.severity,
            "file": self.file,
            "line": self.line,
            "column": self.column,
            "message": self.message,
            "snippet": self.snippet,
            "fix": self.fix,
        }


@dataclass
class Config:
    only: set[str]
    skip: set[str]
    include_tests: bool
    exclude: list[str]


class Collector:
    """Applies --only/--skip and suppression comments; owns the finding list."""

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.findings: list[Finding] = []
        self.suppressed = 0

    def enabled(self, check_id: str) -> bool:
        if self.cfg.only and check_id not in self.cfg.only:
            return False
        if check_id in self.cfg.skip:
            return False
        return True

    def add(
        self,
        check_id: str,
        path: Path,
        lines: list[str],
        line: int,
        col: int,
        message: str,
        fix: str | None = None,
        display_root: Path | None = None,
    ) -> None:
        if not self.enabled(check_id):
            return
        chk = CHECKS[check_id]
        line = max(1, min(line, len(lines) or 1))
        raw = lines[line - 1] if lines else ""
        if line_suppresses(raw, check_id):
            self.suppressed += 1
            return
        shown = str(path)
        if display_root is not None:
            try:
                shown = str(path.relative_to(display_root))
            except ValueError:
                shown = str(path)
        self.findings.append(
            Finding(
                check=check_id,
                invariant=chk.invariant,
                severity=chk.severity,
                file=shown,
                line=line,
                column=max(1, col),
                message=message,
                snippet=raw.strip()[:200],
                fix=fix or chk.fix,
            )
        )


# ---------------------------------------------------------------------------
# python analysis (ast + regex)
# ---------------------------------------------------------------------------


def _byte_slice(line: str, start: int, end: int | None) -> str:
    """Slice `line` by UTF-8 byte offsets, the way the ast module reports them."""
    if line.isascii():
        return line[start:end]
    raw = line.encode("utf-8")
    return raw[start:end].decode("utf-8", errors="replace")


def dotted_name(node: ast.AST) -> str:
    parts: list[str] = []
    cur = node
    while isinstance(cur, ast.Attribute):
        parts.append(cur.attr)
        cur = cur.value
    if isinstance(cur, ast.Name):
        parts.append(cur.id)
    elif isinstance(cur, ast.Call):
        parts.append(dotted_name(cur.func))
    elif isinstance(cur, ast.Subscript):
        parts.append(dotted_name(cur.value))
    else:
        parts.append("")
    return ".".join(p for p in reversed(parts) if p)


GENERIC_ATTRS = {"value", "val", "raw", "units", "minor", "minor_units", "cents", "gross", "net"}


def expr_moneyish(node: ast.AST | None, depth: int = 0) -> bool:
    if node is None or depth > 6:
        return False
    if isinstance(node, ast.Name):
        return moneyish(node.id)
    if isinstance(node, ast.Attribute):
        if moneyish(node.attr):
            return True
        if normalize(node.attr) in GENERIC_ATTRS:
            return expr_moneyish(node.value, depth + 1)
        return False
    if isinstance(node, ast.Subscript):
        if isinstance(node.slice, ast.Constant) and isinstance(node.slice.value, str):
            if moneyish(node.slice.value):
                return True
        return expr_moneyish(node.value, depth + 1)
    if isinstance(node, ast.BinOp):
        return expr_moneyish(node.left, depth + 1) or expr_moneyish(node.right, depth + 1)
    if isinstance(node, ast.Call):
        tail = dotted_name(node.func).split(".")[-1]
        return moneyish(tail)
    return False


def expr_name(node: ast.AST | None) -> str:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    return dotted_name(node) if node is not None else ""


class PythonAnalyzer:
    def __init__(self, path: Path, text: str, cfg: Config, col: Collector, root: Path):
        self.path = path
        self.text = text
        self.lines = text.splitlines()
        self.cfg = cfg
        self.col = col
        self.root = root
        self.float_names: dict[str, int] = {}
        self.func_stack: list[ast.AST] = []
        self.func_of_line: dict[int, ast.AST] = {}

    # -- helpers ---------------------------------------------------------
    def add(self, cid: str, node: ast.AST, msg: str, fix: str | None = None) -> None:
        self.col.add(
            cid,
            self.path,
            self.lines,
            getattr(node, "lineno", 1),
            getattr(node, "col_offset", 0) + 1,
            msg,
            fix,
            self.root,
        )

    def seg(self, node: ast.AST) -> str:
        """Source text for `node`.

        `ast.get_source_segment` re-splits the whole file on every call, which
        is quadratic over a big module (53s of a 58s stdlib scan). This slices
        the lines we already hold. Offsets from the parser are UTF-8 byte
        offsets, so non-ASCII lines take the encode path.
        """
        ln = getattr(node, "lineno", None)
        if not ln or not self.lines:
            return ""
        end = getattr(node, "end_lineno", None) or ln
        c0 = getattr(node, "col_offset", 0) or 0
        c1 = getattr(node, "end_col_offset", None)
        ln = max(1, min(ln, len(self.lines)))
        end = max(ln, min(end, len(self.lines)))
        if ln == end:
            return _byte_slice(self.lines[ln - 1], c0, c1)
        first = _byte_slice(self.lines[ln - 1], c0, None)
        last = _byte_slice(self.lines[end - 1], 0, c1)
        return "\n".join([first, *self.lines[ln : end - 1], last])

    def enclosing_func(self, lineno: int) -> ast.AST | None:
        return self.func_of_line.get(lineno)

    def func_source(self, fn: ast.AST | None) -> str:
        if fn is None:
            return ""
        return self.seg(fn)

    # -- entry point -----------------------------------------------------
    def run(self) -> bool:
        try:
            tree = ast.parse(self.text, filename=str(self.path))
        except SyntaxError:
            return False

        # map every line to its innermost enclosing function
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                end = getattr(node, "end_lineno", node.lineno) or node.lineno
                for ln in range(node.lineno, end + 1):
                    self.func_of_line[ln] = node

        skip_names = not self.cfg.include_tests
        for node in ast.walk(tree):
            if skip_names and isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if node.name.startswith("test_"):
                    continue
            if skip_names and isinstance(node, ast.ClassDef) and node.name.startswith("Test"):
                continue
            if self._in_test_scope(node) and skip_names:
                continue
            self.visit(node)

        self._c16(tree)
        return True

    def _in_test_scope(self, node: ast.AST) -> bool:
        fn = self.func_of_line.get(getattr(node, "lineno", -1))
        return bool(fn is not None and getattr(fn, "name", "").startswith("test_"))

    def visit(self, node: ast.AST) -> None:
        if isinstance(node, ast.AnnAssign):
            self._c01_annassign(node)
        elif isinstance(node, ast.arg):
            self._c01_arg(node)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            self._c01_returns(node)
            self._c08(node)
        elif isinstance(node, ast.ClassDef):
            self._c05(node)
        elif isinstance(node, ast.Assign):
            self._bind_floats(node)
            self._c11_assign(node)
            self._c13_assign(node)
            self._c14(node)
        elif isinstance(node, ast.AugAssign):
            self._c11_aug(node)
        elif isinstance(node, ast.Call):
            self._c02_call(node)
            self._c03_call(node)
            self._c07(node)
            self._c09(node)
        elif isinstance(node, ast.BinOp):
            self._c04(node)
        elif isinstance(node, ast.Compare):
            self._c15(node)

    # -- C01 -------------------------------------------------------------
    def _ann_is_float(self, ann: ast.AST | None) -> bool:
        if ann is None:
            return False
        try:
            txt = ast.unparse(ann)
        except Exception:
            return False
        return bool(re.search(r"\bfloat\b", txt))

    def _c01_annassign(self, node: ast.AnnAssign) -> None:
        name = expr_name(node.target)
        if moneyish(name) and self._ann_is_float(node.annotation):
            self.add("C01", node, f"'{name}' is annotated 'float'; a binary float cannot hold an exact amount")

    def _c01_arg(self, node: ast.arg) -> None:
        if moneyish(node.arg) and self._ann_is_float(node.annotation):
            self.add("C01", node, f"parameter '{node.arg}' is annotated 'float'")

    def _c01_returns(self, node) -> None:
        if moneyish(node.name) and self._ann_is_float(node.returns):
            self.add("C01", node, f"'{node.name}()' returns 'float'; it returns an amount of money")

    # -- C02 -------------------------------------------------------------
    def _bind_floats(self, node: ast.Assign) -> None:
        if isinstance(node.value, ast.Constant) and isinstance(node.value.value, float):
            for t in node.targets:
                if isinstance(t, ast.Name):
                    self.float_names[t.id] = node.lineno

    def _c02_call(self, node: ast.Call) -> None:
        tail = dotted_name(node.func).split(".")[-1]
        if tail == "Decimal" and node.args:
            a = node.args[0]
            if isinstance(a, ast.Constant) and isinstance(a.value, float):
                self.add("C02", node, f"Decimal({a.value!r}) inherits the float's error before it is ever exact")
            elif isinstance(a, ast.Name) and a.id in self.float_names:
                self.add(
                    "C02",
                    node,
                    f"Decimal({a.id}) is built from a float bound at line {self.float_names[a.id]}",
                )
        elif tail == "float" and node.args and expr_moneyish(node.args[0]):
            self.add("C02", node, f"float({clip(self.seg(node.args[0]), 60)}) casts money into a binary float")

    # -- C03 -------------------------------------------------------------
    def _c03_call(self, node: ast.Call) -> None:
        if not isinstance(node.func, ast.Name) or node.func.id != "round":
            return
        if not node.args or not expr_moneyish(node.args[0]):
            return
        fn = self.enclosing_func(node.lineno)
        if "quantize" in self.func_source(fn):
            return
        self.add("C03", node, f"round({clip(self.seg(node.args[0]), 40)}, ...) rounds with no declared mode (banker's by default)")

    # -- C04 -------------------------------------------------------------
    _POW10 = {10, 100, 1000, 10000, 100000, 1000000}

    def _c04(self, node: ast.BinOp) -> None:
        if not isinstance(node.op, (ast.Div, ast.FloorDiv)):
            return
        if not expr_moneyish(node.left):
            return
        right = node.right
        if isinstance(right, ast.Constant):
            # A literal small integer is a count of parts on sight: `total / 3`.
            if not isinstance(right.value, int) or right.value in self._POW10 or right.value <= 1:
                return
            divisor = str(right.value)
        elif isinstance(right, (ast.Name, ast.Attribute, ast.Call)):
            divisor = clip(self.seg(right), 40)
            if re.search(r"\b(?:100|1000|minor|scale|factor)\b", divisor):
                return
            # Only a divisor that names a *count* is a split. `terms.denominator`
            # in a daily accrual, a rate, a basis or a weight is not, and there
            # is no remainder for an allocation to hand back.
            if isinstance(right, ast.Call):
                name = dotted_name(right.func).split(".")[-1]
            else:
                name = expr_name(right)
            if not count_like(name):
                return
        else:
            return
        fn = self.enclosing_func(node.lineno)
        src = self.func_source(fn)
        if ALLOCATION_HINT.search(src) or ALLOCATION_HINT.search(normalize(getattr(fn, "name", "") or "")):
            return
        self.add(
            "C04",
            node,
            f"'{clip(self.seg(node.left), 40)} / {divisor}' splits money without a remainder rule; the parts will not sum to the whole",
        )

    # -- C05 -------------------------------------------------------------
    def _c05(self, node: ast.ClassDef) -> None:
        if MONEY_TYPE.search(node.name):
            return
        decorators = " ".join(self.seg(d) for d in node.decorator_list)
        bases = " ".join(self.seg(b) for b in node.bases)
        schema_like = bool(
            re.search(r"dataclass|attrs|attr\.s|define|pydantic", decorators, re.I)
            or re.search(r"BaseModel|NamedTuple|TypedDict|Model|Schema|Struct", bases)
        )
        fields = [n for n in node.body if isinstance(n, ast.AnnAssign)]
        if not schema_like:
            has_methods = any(isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) for n in node.body)
            if has_methods or len(fields) < 2:
                return
        if not fields:
            return
        money_fields, has_currency, has_money_type = [], False, False
        for f in fields:
            name = expr_name(f.target)
            try:
                ann = ast.unparse(f.annotation) if f.annotation else ""
            except Exception:
                ann = ""
            if is_currency_field(name):
                has_currency = True
            if MONEY_TYPE.search(ann):
                has_money_type = True
            if moneyish(name):
                money_fields.append((name, f))
        if not money_fields or has_currency or has_money_type:
            return
        names = ", ".join(n for n, _ in money_fields[:3])
        self.add("C05", node, f"class '{node.name}' declares {names} with no currency field")

    # -- C07 -------------------------------------------------------------
    def _c07(self, node: ast.Call) -> None:
        dotted = dotted_name(node.func)
        if not dotted:
            return
        parts = dotted.split(".")
        tail1 = parts[-1].lower()
        tail2 = ".".join(parts[-2:]).lower()
        hit = None
        if tail2 in PAYMENT_TAIL:
            hit = ".".join(parts[-2:])      # report the source's own casing
        elif tail1 in PAYMENT_FUNC:
            hit = parts[-1]
        elif tail1 in ("capture", "refund", "authorise", "authorize"):
            receiver = ".".join(parts[:-1])
            if receiver and PAYMENT_RECEIVER.search(receiver):
                hit = dotted
        if hit is None:
            return
        if IDEMPOTENT.search(self.seg(node)):
            return
        self.add("C07", node, f"'{hit}' moves money with no idempotency key; a retry charges twice")

    # -- C08 -------------------------------------------------------------
    @staticmethod
    def _decorator_identity(dec: ast.AST) -> str:
        """The decorator's callable path plus any route-like string argument.

        Deliberately excludes prose arguments: `audit_ledger.py` decorates a
        check with a paragraph that happens to mention webhooks, and that is
        not a webhook handler.
        """
        call = dec.func if isinstance(dec, ast.Call) else dec
        parts = [dotted_name(call)]
        if isinstance(dec, ast.Call):
            for a in dec.args:
                if isinstance(a, ast.Constant) and isinstance(a.value, str):
                    if a.value.startswith("/"):
                        parts.append(a.value)
        return " ".join(parts)

    def _c08(self, node) -> None:
        decorators = " ".join(self._decorator_identity(d) for d in node.decorator_list)
        haystack = f"{node.name} {decorators}"
        if "webhook" not in haystack.lower():
            return
        body = " ".join(self.seg(st) for st in node.body)
        if VERIFY_CALL.search(body):
            return
        self.add("C08", node, f"webhook handler '{node.name}' never verifies a signature; the payload is forgeable")

    # -- C09 -------------------------------------------------------------
    def _c09(self, node: ast.Call) -> None:
        dotted = dotted_name(node.func)
        if not dotted:
            return
        parts = dotted.split(".")
        root = parts[0]
        tail = parts[-1]
        is_log = (
            dotted == "print"
            or LOG_CALL_PY.match(root) is not None
            or root.lower().endswith("logger")
            or tail in ("debug", "info", "warning", "warn", "error", "exception", "critical", "log")
            and len(parts) > 1
            and re.search(r"log", root, re.I) is not None
        )
        if not is_log:
            return
        args_src = " ".join(self.seg(a) for a in node.args)
        args_src += " " + " ".join(f"{k.arg} {self.seg(k.value)}" for k in node.keywords if k.arg)
        m = SENSITIVE.search(args_src)
        if not m:
            return
        self.add("C09", node, f"'{dotted}(...)' writes '{m.group(0)}' to a log")

    # -- C11 -------------------------------------------------------------
    def _is_balance_target(self, t: ast.AST) -> str | None:
        """The name of a *stored* balance being written, or None.

        Only an attribute -- `account.balance = ...`, `wallet.balance += ...`.
        Two deliberate exclusions:

        * A bare local name. `balance = balance - princ` inside an amortisation
          schedule is a running total in a pure function, not a record anyone
          reconciles to; M1 has nothing to say about it. C11 is about a balance
          that is *stored* where a posting should be.
        * A subscript. `self.account_balances[k] += line.signed_minor` in
          `audit_ledger.py` is a balance being *derived* from postings, which
          is exactly what M1 asks for.

        The stored-balance case that matters most -- a balance column rewritten
        by an UPDATE -- is caught in `analyze_sql`, where it is unambiguous.
        """
        if not isinstance(t, ast.Attribute):
            return None
        name = expr_name(t)
        return name if is_balance_name(name) else None

    def _c11_assign(self, node: ast.Assign) -> None:
        for t in node.targets:
            name = self._is_balance_target(t)
            if name:
                self.add("C11", node, f"'{clip(self.seg(t), 50)}' is overwritten in place; the balance is the derived value, not the record")

    def _c11_aug(self, node: ast.AugAssign) -> None:
        name = self._is_balance_target(node.target)
        if name:
            self.add("C11", node, f"'{clip(self.seg(node.target), 50)}' is mutated in place; two concurrent writers lose an update")

    # -- C13 -------------------------------------------------------------
    def _naive_now(self, call: ast.Call) -> str | None:
        dotted = dotted_name(call.func)
        tail = dotted.split(".")[-1]
        if tail == "utcnow":
            return "datetime.utcnow()"
        if tail == "now":
            if call.args:
                return None
            if any(k.arg in ("tz", "tzinfo") for k in call.keywords):
                return None
            return "datetime.now()"
        return None

    def _c13_assign(self, node: ast.Assign) -> None:
        names = [expr_name(t) for t in node.targets]
        if not any(timeish(n) or moneyish(n) for n in names if n):
            return
        for sub in ast.walk(node.value):
            if isinstance(sub, ast.Call):
                what = self._naive_now(sub)
                if what:
                    self.add("C13", sub, f"'{what}' gives a naive local timestamp on '{names[0]}'; the period it lands in depends on the host")
                    return

    # -- C14 -------------------------------------------------------------
    def _c14(self, node: ast.Assign) -> None:
        if not isinstance(node.value, ast.Constant) or not isinstance(node.value.value, (int, float)):
            return
        if isinstance(node.value.value, bool):
            return
        for t in node.targets:
            name = normalize(expr_name(t))
            if RATE_NAME.match(name) and not RATE_NAME_EXCLUDE.search(name):
                if isinstance(node.value.value, int) and node.value.value in (0, 1):
                    continue
                self.add("C14", node, f"'{expr_name(t)} = {node.value.value}' hardcodes an FX rate with no source or timestamp")

    # -- C15 -------------------------------------------------------------
    def _c15(self, node: ast.Compare) -> None:
        if not node.ops or not isinstance(node.ops[0], (ast.Eq, ast.NotEq)):
            return
        sides = [node.left] + list(node.comparators)
        has_money = any(expr_moneyish(s) for s in sides)
        floats = [
            s for s in sides
            if isinstance(s, ast.Constant) and isinstance(s.value, float) and not isinstance(s.value, bool)
        ]
        if has_money and floats:
            self.add("C15", node, f"money compared with '== {floats[0].value!r}'; binary floats do not compare exactly")

    # -- C16 -------------------------------------------------------------
    _DEBIT_CALL = re.compile(r"^(?:debit|withdraw|charge|deduct|take|spend)(?:_\w+)?$")
    _ATOMIC_HINT = re.compile(
        r"select_for_update|for update|with_for_update|\block\b|Lock\(|atomic|"
        r"transaction\.|serializable|compare_and_set|reserve|hold",
        re.I,
    )

    def _c16(self, tree: ast.AST) -> None:
        for fn in ast.walk(tree):
            if not isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            if fn.name.startswith("test_") and not self.cfg.include_tests:
                continue
            reads: list[tuple[str, ast.Compare]] = []
            for node in ast.walk(fn):
                if isinstance(node, ast.Compare) and node.ops and isinstance(
                    node.ops[0], (ast.GtE, ast.Gt, ast.LtE, ast.Lt)
                ):
                    for side in [node.left] + list(node.comparators):
                        name = expr_name(side)
                        if is_balance_name(name):
                            reads.append((name, node))
                            break
            if not reads:
                continue
            if self._ATOMIC_HINT.search(self.seg(fn)):
                continue
            writes: list[tuple[int, str]] = []
            for node in ast.walk(fn):
                if isinstance(node, (ast.Assign, ast.AugAssign)):
                    targets = node.targets if isinstance(node, ast.Assign) else [node.target]
                    for t in targets:
                        if not isinstance(t, (ast.Name, ast.Attribute)):
                            continue
                        nm = expr_name(t)
                        if is_balance_name(nm):
                            writes.append((node.lineno, f"write to '{clip(self.seg(t), 40)}'"))
                elif isinstance(node, ast.Call):
                    tail = dotted_name(node.func).split(".")[-1]
                    if self._DEBIT_CALL.match(normalize(tail)):
                        writes.append((node.lineno, f"call to '{tail}()'"))
            for name, cmp_node in reads:
                later = [w for w in writes if w[0] > cmp_node.lineno]
                if later:
                    line, what = sorted(later)[0]
                    self.add(
                        "C16",
                        cmp_node,
                        f"'{name}' is checked here and the {what} happens at line {line}; two callers both pass the check",
                    )
                    break


# ---------------------------------------------------------------------------
# regex helpers shared by the non-python analysers
# ---------------------------------------------------------------------------


def balanced_args(text: str, open_idx: int) -> str:
    """Return the text between the paren at `open_idx` and its match."""
    depth, i, n = 0, open_idx, len(text)
    while i < n:
        ch = text[i]
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth == 0:
                return text[open_idx : i + 1]
        i += 1
    return text[open_idx : open_idx + 400]


def line_of(text: str, idx: int) -> int:
    return text.count("\n", 0, idx) + 1


# ---------------------------------------------------------------------------
# typescript / javascript analysis
# ---------------------------------------------------------------------------

TS_TYPE_DECL = re.compile(r"\b(?:let|const|var|readonly|public|private|protected)?\s*([A-Za-z_$][\w$]*)\s*\??\s*:\s*(number|Number)\b")
TS_FIELD = re.compile(r"^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*\??\s*:\s*([A-Za-z_$][\w$<>\[\]|. ]*)\s*[;,]?\s*$")
TS_INTERFACE = re.compile(r"\b(?:interface|type)\s+([A-Za-z_$][\w$]*)\s*(?:=\s*)?\{")
TS_TOFIXED = re.compile(r"([A-Za-z_$][\w$.\[\]]*)\s*\.\s*toFixed\s*\(")
TS_MATHROUND = re.compile(r"Math\s*\.\s*(?:round|floor|ceil)\s*\(\s*([A-Za-z_$][\w$.\[\]]*)")
TS_LOG = re.compile(r"\b(?:console\s*\.\s*(?:log|info|warn|error|debug|trace)|logger\s*\.\s*\w+|log\s*\.\s*\w+|log)\s*\(")
TS_PAYMENT = re.compile(
    r"\b((?:[\w$.]+\.)?(?:PaymentIntent|Charge|Refund|Transfer|Payout)\s*\.\s*create"
    r"|(?:[\w$.]+\.)?payments\s*\.\s*authoris[ez]e?"
    r"|createPayment|initiatePayment"
    r"|[\w$.]*(?:payment|charge|intent|txn|transaction|psp|gateway|stripe|adyen|order)[\w$.]*\s*\.\s*(?:capture|refund))\s*\("
    , re.I,
)
TS_NEWDATE = re.compile(r"\b(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*new\s+Date\s*\(\s*\)")
TS_FUNC = re.compile(r"(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\()")
TS_DIV = re.compile(r"\b([A-Za-z_$][\w$.]*)\s*/\s*([A-Za-z_$][\w$.]*|\d+)\b")
TS_EQ = re.compile(r"\b([A-Za-z_$][\w$.]*)\s*===?\s*(\d+\.\d+)\b|\b(\d+\.\d+)\s*===?\s*([A-Za-z_$][\w$.]*)")


def analyze_ts(path: Path, text: str, cfg: Config, col: Collector, root: Path) -> None:
    lines = text.splitlines()

    def add(cid: str, line: int, colno: int, msg: str, fix: str | None = None) -> None:
        col.add(cid, path, lines, line, colno, msg, fix, root)

    # C01 -- money-ish name typed `number`
    for i, raw in enumerate(lines, 1):
        if raw.lstrip().startswith("//") or raw.lstrip().startswith("*"):
            continue
        for m in TS_TYPE_DECL.finditer(raw):
            name = m.group(1)
            if moneyish(name):
                add("C01", i, m.start(1) + 1, f"'{name}' is typed '{m.group(2)}'; JS numbers are IEEE-754 doubles")

    # C03 -- toFixed / Math.round on money
    for i, raw in enumerate(lines, 1):
        for m in TS_TOFIXED.finditer(raw):
            if expr_moneyish_str(m.group(1)):
                add("C03", i, m.start(1) + 1, f"'{m.group(1)}.toFixed(...)' rounds a double and returns a string")
        for m in TS_MATHROUND.finditer(raw):
            if expr_moneyish_str(m.group(1)):
                add("C03", i, m.start(1) + 1, f"'Math.round({m.group(1)})' rounds with no declared mode")

    # C04 -- money divided with no allocation nearby
    func_ranges = ts_function_ranges(text)
    for i, raw in enumerate(lines, 1):
        stripped = raw.strip()
        if stripped.startswith("//") or stripped.startswith("*") or "/*" in stripped:
            continue
        for m in TS_DIV.finditer(raw):
            left, right = m.group(1), m.group(2)
            if not expr_moneyish_str(left):
                continue
            if right.isdigit() and (int(right) in (10, 100, 1000, 10000, 100000) or int(right) <= 1):
                continue
            if re.search(r"\b(?:100|1000|minor|scale|factor)\b", right):
                continue
            # Same gate as the python path: the divisor has to name a count of
            # parts. `sellers.length` does; `terms.denominator` does not.
            if not right.isdigit() and not count_like(tail_ident(right)):
                continue
            scope = ts_scope_text(text, func_ranges, i)
            if ALLOCATION_HINT.search(scope):
                continue
            add("C04", i, m.start(1) + 1, f"'{left} / {right}' splits money with no remainder rule")

    # C05 -- interface/type with money field and no currency
    for m in TS_INTERFACE.finditer(text):
        name = m.group(1)
        if MONEY_TYPE.search(name):
            continue
        body = balanced_braces(text, text.index("{", m.end() - 1))
        money_fields, has_currency, has_money_type = [], False, False
        for fline in body.splitlines():
            fm = TS_FIELD.match(fline)
            if not fm:
                continue
            fname, ftype = fm.group(1), fm.group(2).strip()
            if is_currency_field(fname):
                has_currency = True
            if MONEY_TYPE.search(ftype):
                has_money_type = True
            if moneyish(fname):
                money_fields.append(fname)
        if money_fields and not has_currency and not has_money_type:
            add(
                "C05",
                line_of(text, m.start()),
                m.start(1) - text.rfind("\n", 0, m.start(1)),
                f"'{name}' declares {', '.join(money_fields[:3])} with no currency field",
            )

    # C07 -- mutating payment call with no idempotency key
    for m in TS_PAYMENT.finditer(text):
        open_idx = text.index("(", m.end() - 1)
        args = balanced_args(text, open_idx)
        if IDEMPOTENT.search(args) or re.search(r"Idempotency-Key", args, re.I):
            continue
        add("C07", line_of(text, m.start()), 1, f"'{m.group(1).strip()}' moves money with no idempotency key")

    # C08 -- webhook handler with no verification
    for name, start, end in func_ranges:
        header_line = line_of(text, start)
        prev = lines[max(0, header_line - 3) : header_line]
        blob = (name or "") + " " + " ".join(prev)
        if "webhook" not in blob.lower():
            continue
        body = text[start:end]
        if VERIFY_CALL.search(body):
            continue
        add("C08", header_line, 1, f"webhook handler '{name or '(anonymous)'}' never verifies a signature")

    # C09 -- sensitive data in a log call
    for m in TS_LOG.finditer(text):
        open_idx = text.index("(", m.end() - 1)
        args = balanced_args(text, open_idx)
        sm = SENSITIVE.search(args)
        if sm:
            add("C09", line_of(text, m.start()), 1, f"log call writes '{sm.group(0)}' to a log")

    # C13 -- `new Date()` on a cutoff-sensitive money field
    for i, raw in enumerate(lines, 1):
        for m in TS_NEWDATE.finditer(raw):
            name = m.group(1)
            if timeish(name) or moneyish(name):
                add("C13", i, m.start(1) + 1, f"'new Date()' on '{name}' is host-local; the accounting period depends on the server")

    # C15 -- money === float literal
    for i, raw in enumerate(lines, 1):
        for m in TS_EQ.finditer(raw):
            name = m.group(1) or m.group(4)
            lit = m.group(2) or m.group(3)
            if name and expr_moneyish_str(name):
                add("C15", i, m.start() + 1, f"money compared with '=== {lit}'")


def expr_moneyish_str(expr: str) -> bool:
    parts = [p for p in re.split(r"[.\[\]]+", expr) if p]
    if not parts:
        return False
    if moneyish(parts[-1]):
        return True
    if normalize(parts[-1]) in GENERIC_ATTRS and len(parts) > 1:
        return moneyish(parts[-2])
    return False


def balanced_braces(text: str, open_idx: int) -> str:
    depth, i, n = 0, open_idx, len(text)
    while i < n:
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return text[open_idx : i + 1]
        i += 1
    return text[open_idx:]


def ts_function_ranges(text: str) -> list[tuple[str, int, int]]:
    out = []
    for m in TS_FUNC.finditer(text):
        name = m.group(1) or m.group(2) or ""
        brace = text.find("{", m.end())
        if brace == -1:
            continue
        body = balanced_braces(text, brace)
        out.append((name, m.start(), brace + len(body)))
    return out


def ts_scope_text(text: str, ranges: list[tuple[str, int, int]], lineno: int) -> str:
    idx = sum(len(l) + 1 for l in text.splitlines()[: lineno - 1])
    best = ""
    for name, start, end in ranges:
        if start <= idx <= end:
            if not best or (end - start) < len(best):
                best = name + " " + text[start:end]
    return best or text


# ---------------------------------------------------------------------------
# java / kotlin / c# / go analysis (regex, deliberately shallow)
# ---------------------------------------------------------------------------

JVM_DECL = re.compile(
    r"\b(?:private|public|protected|internal|val|var|static|final|readonly)?\s*"
    r"(?:(float|double|Float|Double|Number)\s+([A-Za-z_][\w]*)"           # java/c#: `double total`
    r"|([A-Za-z_][\w]*)\s+(float32|float64)\b"                             # go: `total float64`
    r"|([A-Za-z_][\w]*)\s*:\s*(Float|Double)\b)"                           # kotlin: `total: Double`
)
JVM_LOG = re.compile(r"\b(?:System\.out\.print(?:ln)?|log(?:ger)?\s*\.\s*\w+|Console\.Write(?:Line)?|fmt\.Print\w*)\s*\(", re.I)
JVM_ROUND = re.compile(r"Math\s*\.\s*(?:round|floor|ceil)\s*\(\s*([A-Za-z_][\w.]*)")


def analyze_jvm(path: Path, text: str, cfg: Config, col: Collector, root: Path) -> None:
    lines = text.splitlines()
    for i, raw in enumerate(lines, 1):
        s = raw.strip()
        if s.startswith("//") or s.startswith("*") or s.startswith("#"):
            continue
        for m in JVM_DECL.finditer(raw):
            ty = m.group(1) or m.group(4) or m.group(6)
            name = m.group(2) or m.group(3) or m.group(5)
            if name and ty and moneyish(name) and ty in FLOAT_TYPES_JVM:
                col.add("C01", path, lines, i, m.start() + 1,
                        f"'{name}' is declared '{ty}'; a binary float cannot hold an exact amount", None, root)
        for m in JVM_ROUND.finditer(raw):
            if expr_moneyish_str(m.group(1)):
                col.add("C03", path, lines, i, m.start() + 1,
                        f"'Math.round({m.group(1)})' rounds with no declared mode", None, root)
    for m in JVM_LOG.finditer(text):
        open_idx = text.index("(", m.end() - 1)
        args = balanced_args(text, open_idx)
        sm = SENSITIVE.search(args)
        if sm:
            col.add("C09", path, lines, line_of(text, m.start()), 1,
                    f"log call writes '{sm.group(0)}' to a log", None, root)


# ---------------------------------------------------------------------------
# sql analysis
# ---------------------------------------------------------------------------

SQL_CREATE = re.compile(r"\bCREATE\s+(?:OR\s+REPLACE\s+)?(?:GLOBAL\s+|LOCAL\s+|TEMP(?:ORARY)?\s+|UNLOGGED\s+)*TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w.\"`\[\]]+)", re.I)
SQL_COLUMN = re.compile(r"^\s*[\"`\[]?([A-Za-z_][\w]*)[\"`\]]?\s+([A-Za-z_][\w]*)(?:\s*\(|\s|,|$)")
SQL_SUM = re.compile(r"\bSUM\s*\(\s*(?:DISTINCT\s+)?([\w.\"`]+)\s*\)", re.I)
SQL_GROUPBY = re.compile(r"\bGROUP\s+BY\b(.*?)(?:\bHAVING\b|\bORDER\s+BY\b|\bLIMIT\b|\bWINDOW\b|$)", re.I | re.S)
SQL_UPDATE = re.compile(r"\bUPDATE\s+(?:ONLY\s+)?([\w.\"`\[\]]+)", re.I)
SQL_DELETE = re.compile(r"\bDELETE\s+FROM\s+([\w.\"`\[\]]+)", re.I)
SQL_SET = re.compile(r"\bSET\b(.*?)(?:\bWHERE\b|\bRETURNING\b|\bFROM\b|$)", re.I | re.S)

SQL_CONSTRAINT_WORDS = {
    "primary", "foreign", "unique", "check", "constraint", "key", "index",
    "exclude", "like", "partition", "using", "with",
}


def clean_ident(raw: str) -> str:
    return raw.strip().strip('"`[]').split(".")[-1]


def split_sql(text: str) -> list[tuple[str, int]]:
    """Split into statements, returning (text, 1-based start line)."""
    stmts, buf, start = [], [], 1
    in_str = False
    lineno = 1
    for line in text.splitlines(keepends=True):
        code = line
        if not buf:
            start = lineno
        buf.append(line)
        # crude string tracking so a `;` inside a literal does not split
        for ch in re.sub(r"--.*", "", code):
            if ch == "'":
                in_str = not in_str
        if not in_str and ";" in re.sub(r"--.*", "", code):
            stmts.append(("".join(buf), start))
            buf = []
        lineno += 1
    if buf and "".join(buf).strip():
        stmts.append(("".join(buf), start))
    return stmts


def analyze_sql(path: Path, text: str, cfg: Config, col: Collector, root: Path) -> None:
    lines = text.splitlines()

    def add(cid: str, line: int, colno: int, msg: str, fix: str | None = None) -> None:
        col.add(cid, path, lines, line, colno, msg, fix, root)

    for stmt, start in split_sql(text):
        bare = re.sub(r"--.*", "", stmt)
        upper = bare.upper()
        head = bare.lstrip()[:20].upper()

        # ---- CREATE TABLE: C01 + C05 ----------------------------------
        cm = SQL_CREATE.search(bare)
        if cm:
            table = clean_ident(cm.group(1))
            money_cols, has_currency = [], False
            for offset, raw in enumerate(stmt.splitlines()):
                ln = start + offset
                if re.sub(r"--.*", "", raw).strip().upper().startswith(("CREATE", ")", "(")):
                    continue
                colm = SQL_COLUMN.match(re.sub(r"--.*", "", raw))
                if not colm:
                    continue
                cname, ctype = colm.group(1), colm.group(2).upper()
                if cname.lower() in SQL_CONSTRAINT_WORDS:
                    continue
                if is_currency_field(cname):
                    has_currency = True
                if moneyish(cname):
                    money_cols.append(cname)
                    if ctype in FLOAT_TYPES_SQL:
                        add("C01", ln, colm.start(1) + 1,
                            f"column '{table}.{cname}' is '{ctype}'; a binary float cannot hold an exact amount")
            if money_cols and not has_currency:
                add("C05", start + bare[: cm.start()].count("\n"), 1,
                    f"table '{table}' declares {', '.join(money_cols[:3])} with no currency column")

        # ---- SUM without a currency grouping: C06 ---------------------
        if "SUM" in upper and head.startswith(("SELECT", "WITH", "INSERT", "CREATE VIEW", "CREATE MATERIALIZED")):
            gb = SQL_GROUPBY.search(bare)
            gb_text = gb.group(1) if gb else ""
            pinned = re.search(r"\b(?:currency|ccy|currency_code)\b\s*(?:=|IN)\s*", bare, re.I)
            if not re.search(r"\b(?:currency|ccy|currency_code)\b", gb_text, re.I) and not pinned:
                for sm in SQL_SUM.finditer(bare):
                    if moneyish(clean_ident(sm.group(1))):
                        ln = start + bare[: sm.start()].count("\n")
                        add("C06", ln, 1,
                            f"SUM({sm.group(1)}) with no currency in GROUP BY adds different currencies together")
                        break

        # ---- UPDATE / DELETE: C11 + C12 -------------------------------
        um = SQL_UPDATE.search(bare) if head.startswith("UPDATE") else None
        dm = SQL_DELETE.search(bare) if head.startswith("DELETE") else None
        if um:
            table = clean_ident(um.group(1))
            ln = start + bare[: um.start()].count("\n")
            setm = SQL_SET.search(bare)
            set_text = setm.group(1) if setm else ""
            if re.search(r"\bbalance\w*\b", set_text, re.I):
                add("C11", ln, 1, f"UPDATE {table} SET ... balance rewrites a derived value in place")
            if LEDGER_TABLE.match(normalize(table)):
                add("C12", ln, 1, f"UPDATE on ledger table '{table}' rewrites history")
        if dm:
            table = clean_ident(dm.group(1))
            ln = start + bare[: dm.start()].count("\n")
            if LEDGER_TABLE.match(normalize(table)):
                add("C12", ln, 1, f"DELETE FROM ledger table '{table}' destroys the audit trail")


# ---------------------------------------------------------------------------
# checks that run on every language
# ---------------------------------------------------------------------------


def analyze_common(path: Path, text: str, cfg: Config, col: Collector, root: Path, testish: bool) -> None:
    lines = text.splitlines()
    for i, raw in enumerate(lines, 1):
        for label, pat in SECRET_PATTERNS:
            m = pat.search(raw)
            if m:
                col.add("C10", path, lines, i, m.start() + 1,
                        f"hardcoded {label} in source", None, root)
        if testish:
            continue
        for m in BARE_DIGITS.finditer(raw):
            if luhn_ok(m.group(1)):
                col.add("C10", path, lines, i, m.start(1) + 1,
                        f"{len(m.group(1))}-digit literal passes the Luhn check; this looks like a card number",
                        None, root)


# ---------------------------------------------------------------------------
# file walking
# ---------------------------------------------------------------------------

PY_EXT = {".py", ".pyi"}
TS_EXT = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"}
JVM_EXT = {".java", ".kt", ".kts", ".cs", ".go", ".scala"}
SQL_EXT = {".sql", ".ddl", ".psql"}
ALL_EXT = PY_EXT | TS_EXT | JVM_EXT | SQL_EXT

DEFAULT_EXCLUDES = [
    "*/.git/*", "*/node_modules/*", "*/__pycache__/*", "*/.venv/*", "*/venv/*",
    "*/dist/*", "*/build/*", "*/.mypy_cache/*", "*/.tox/*", "*/vendor/*",
    "*/site-packages/*", "*.min.js",
]

TEST_BASENAME = re.compile(
    r"^(?:test_.*|.*_test|conftest|.*\.test|.*\.spec|.*Test|.*Tests|.*Spec)$"
)


def is_test_file(path: Path) -> bool:
    stem = path.stem
    if TEST_BASENAME.match(stem):
        return True
    return False


def excluded(path: Path, patterns: list[str]) -> bool:
    s = str(path)
    posix = path.as_posix()
    for pat in patterns:
        if fnmatch.fnmatch(s, pat) or fnmatch.fnmatch(posix, pat) or fnmatch.fnmatch(path.name, pat):
            return True
    return False


def iter_files(root: Path, cfg: Config) -> list[Path]:
    patterns = DEFAULT_EXCLUDES + cfg.exclude
    if root.is_file():
        return [] if excluded(root, cfg.exclude) else [root]
    out = []
    for p in sorted(root.rglob("*")):
        if not p.is_file() or p.suffix.lower() not in ALL_EXT:
            continue
        if excluded(p, patterns):
            continue
        out.append(p)
    return out


def analyze_file(path: Path, cfg: Config, col: Collector, root: Path) -> None:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return
    if file_suppressed(text):
        return
    set_file_money_context(text)
    testish = is_test_file(path)
    if testish and not cfg.include_tests:
        return
    ext = path.suffix.lower()
    # A file that is test data by name never gets the Luhn check: fake PANs are
    # exactly what belongs there.
    analyze_common(path, text, cfg, col, root, testish)
    if ext in PY_EXT:
        PythonAnalyzer(path, text, cfg, col, root).run()
    elif ext in TS_EXT:
        analyze_ts(path, text, cfg, col, root)
    elif ext in JVM_EXT:
        analyze_jvm(path, text, cfg, col, root)
    elif ext in SQL_EXT:
        analyze_sql(path, text, cfg, col, root)


# ---------------------------------------------------------------------------
# output
# ---------------------------------------------------------------------------


def sort_key(f: Finding) -> tuple:
    return (f.check, f.file, f.line, f.column)


def summarize(findings: list[Finding], scanned: int, suppressed: int) -> dict:
    by_sev: dict[str, int] = {}
    by_check: dict[str, int] = {}
    for f in findings:
        by_sev[f.severity] = by_sev.get(f.severity, 0) + 1
        by_check[f.check] = by_check.get(f.check, 0) + 1
    return {
        "files_scanned": scanned,
        "findings": len(findings),
        "suppressed": suppressed,
        "by_severity": {s: by_sev.get(s, 0) for s in ("error", "warn", "info") if by_sev.get(s)},
        "by_check": dict(sorted(by_check.items())),
    }


def render_human(root: Path, findings: list[Finding], summary: dict, fail_on: str, max_examples: int, out) -> None:
    if not findings:
        print(f"money_lint {VERSION}: {summary['files_scanned']} file(s) scanned, no findings.", file=out)
        if summary["suppressed"]:
            print(f"({summary['suppressed']} finding(s) silenced by money-lint: ignore comments)", file=out)
        return

    grouped: dict[str, list[Finding]] = {}
    for f in sorted(findings, key=sort_key):
        grouped.setdefault(f.check, []).append(f)

    for cid in sorted(grouped):
        chk = CHECKS[cid]
        items = grouped[cid]
        print(f"=== {cid}  [{chk.invariant}]  {chk.severity.upper()}  {chk.title}  ({len(items)}) ===", file=out)
        shown = items if max_examples <= 0 else items[:max_examples]
        for f in shown:
            print(f"{f.file}:{f.line}:{f.column}  {f.check}  [{f.invariant}]  {f.message}", file=out)
            if f.snippet:
                print(f"    | {f.snippet}", file=out)
            print(f"    fix: {f.fix}", file=out)
        if len(shown) < len(items):
            print(f"    ... {len(items) - len(shown)} more (raise --max-examples to see them)", file=out)
        print("", file=out)

    print("--- summary ---", file=out)
    print(f"root:            {root}", file=out)
    print(f"files scanned:   {summary['files_scanned']}", file=out)
    sev = ", ".join(f"{k} {v}" for k, v in summary["by_severity"].items()) or "none"
    print(f"findings:        {summary['findings']} ({sev})", file=out)
    if summary["suppressed"]:
        print(f"suppressed:      {summary['suppressed']} (money-lint: ignore comments)", file=out)
    checks = " ".join(f"{k}={v}" for k, v in summary["by_check"].items())
    print(f"by check:        {checks}", file=out)
    print(f"fail threshold:  {fail_on}", file=out)


def render_list_checks(out) -> None:
    print(f"money_lint {VERSION} -- {len(CHECKS)} checks", file=out)
    print("", file=out)
    print("ID    INV  SEVERITY  CHECK", file=out)
    for cid in sorted(CHECKS):
        c = CHECKS[cid]
        print(f"{c.id}   {c.invariant:<4} {c.severity:<9} {c.title}", file=out)
        print(f"                        fix: {c.fix}", file=out)
    print("", file=out)
    print("Money-ish identifiers (the gate on almost every check):", file=out)
    print(f"  always:  {STRONG_MONEY_WORDS}", file=out)
    print(f"  in a money file only: {WEAK_MONEY_WORDS}", file=out)
    print(f"  never:   {NON_MONEY_WORDS}, and any name ending in id/key/ref", file=out)
    print("  A 'money file' mentions currency, payments, invoices, a ledger or a", file=out)
    print("  PSP. That gate is what keeps `total / n` in a statistics module and", file=out)
    print("  `total_tt` in a profiler out of the report.", file=out)
    print("", file=out)
    print("Suppression: `# money-lint: ignore[C07]`, `// money-lint: ignore[C07]`,", file=out)
    print("             `-- money-lint: ignore[C07]` at end of line;", file=out)
    print("             `money-lint: ignore-file` in a comment near the top of a file.", file=out)


# ---------------------------------------------------------------------------
# cli
# ---------------------------------------------------------------------------


def parse_ids(value: str | None) -> set[str]:
    if not value:
        return set()
    ids = {v.strip().upper() for v in value.split(",") if v.strip()}
    unknown = ids - set(CHECKS)
    if unknown:
        raise SystemExit(f"money_lint: unknown check id(s): {', '.join(sorted(unknown))}")
    return ids


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="money_lint.py",
        description="Static analysis for the money defects that survive code review (finance-expert, M1-M20).",
        epilog="Exit codes: 0 clean, 1 findings at or above --fail-on, 2 unreadable path.",
    )
    p.add_argument("path", nargs="?", help="file or directory to scan")
    p.add_argument("--json", action="store_true", help="machine-readable output for CI")
    p.add_argument("--fail-on", choices=("error", "warn"), default="error",
                   help="severity at which to exit 1 (default: error)")
    p.add_argument("--list-checks", action="store_true", help="print every check and exit")
    p.add_argument("--only", metavar="C01,...", help="run only these checks")
    p.add_argument("--skip", metavar="C01,...", help="run everything except these checks")
    p.add_argument("--exclude", metavar="GLOB", nargs="+", action="extend", default=[],
                   help="glob(s) of paths to skip, repeatable")
    p.add_argument("--include-tests", action="store_true",
                   help="also scan test files and test_* functions (off by default)")
    p.add_argument("--max-examples", type=int, default=0, metavar="N",
                   help="show at most N findings per check in human output (0 = all)")
    p.add_argument("--version", action="version", version=f"money_lint {VERSION}")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    if args.list_checks:
        render_list_checks(sys.stdout)
        return 0

    if not args.path:
        build_parser().print_usage(sys.stderr)
        print("money_lint: a path is required (or use --list-checks)", file=sys.stderr)
        return 2

    root = Path(args.path)
    if not root.exists():
        print(f"money_lint: cannot read '{root}': no such file or directory", file=sys.stderr)
        return 2
    try:
        if root.is_dir():
            next(root.iterdir(), None)
        else:
            root.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        print(f"money_lint: cannot read '{root}': {exc}", file=sys.stderr)
        return 2

    try:
        cfg = Config(
            only=parse_ids(args.only),
            skip=parse_ids(args.skip),
            include_tests=args.include_tests,
            exclude=list(args.exclude or []),
        )
    except SystemExit as exc:
        print(str(exc), file=sys.stderr)
        return 2

    col = Collector(cfg)
    display_root = root if root.is_dir() else root.parent
    files = iter_files(root, cfg)
    for path in files:
        analyze_file(path, cfg, col, display_root)

    findings = sorted(col.findings, key=sort_key)
    summary = summarize(findings, len(files), col.suppressed)

    if args.json:
        payload = {
            "root": str(root),
            "summary": summary,
            "findings": [f.as_dict() for f in findings],
        }
        print(json.dumps(payload, indent=2, sort_keys=False))
    else:
        render_human(root, findings, summary, args.fail_on, args.max_examples, sys.stdout)

    threshold = SEV_RANK[args.fail_on]
    if any(SEV_RANK[f.severity] >= threshold for f in findings):
        return 1
    return 0


if __name__ == "__main__":
    try:
        _code = main()
    except BrokenPipeError:
        # `money_lint.py src/ | head` is a normal thing to do.
        os.dup2(os.open(os.devnull, os.O_WRONLY), sys.stdout.fileno())
        _code = 0
    except KeyboardInterrupt:
        _code = 130
    sys.exit(_code)
