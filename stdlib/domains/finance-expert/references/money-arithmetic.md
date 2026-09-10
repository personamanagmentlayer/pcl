# Money arithmetic

Arithmetic is where money systems fail first and most cheaply to prevent. Everything here is
mechanical: a type, a scale, a rounding mode, an allocation rule, a rate with a timestamp. Get these
wrong and every downstream property — trial balance, reconciliation, tax return, investor number —
inherits the error, and the error is _small_, which is what makes it expensive: it survives review,
it survives QA, and it surfaces at month-end as a break nobody can explain. The rule that organises
the file: **an amount is a value object with an exact quantity and a currency, and every
transformation of it is a declared, reproducible operation** (M4, M5, M6).

## 1. Representation

### 1.1 The two legitimate representations

| Representation                  | Definition                                                                             | Use when                                                                                                   | Cost                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Integer minor units**         | `int` count of the currency's smallest unit + currency code + exponent from a registry | Ledger postings, balances, anything summed at scale, anything crossing a wire in bulk                      | Every consumer must know the exponent; the exponent is data, not a constant              |
| **Decimal with declared scale** | `Decimal`/`BigDecimal`/`NUMERIC(p,s)` with the scale written down and enforced         | Prices, rates, per-unit metered charges, tax rates, anything whose precision exceeds the currency exponent | Scale drifts silently unless quantized and constrained; equality traps (`2.0` vs `2.00`) |

Both are exact. `float`/`double`/`REAL`/`NUMBER` (JS) are not, and no care makes them so:
`0.1 + 0.2 != 0.3` in binary64, and the drift is not a bounded rounding artifact — it accumulates
with the number of operations and the magnitude of the operands (M4). Use **integer minor units for
amounts** and **Decimal with declared scale for prices and rates**. These are different types, and
conflating them is the most common representation bug: a unit price of `0.0005 EUR` per API call is a
legitimate price and an impossible amount (§4.2).

### 1.2 The ISO 4217 exponent — "cents" is not universal

ISO 4217 assigns each currency a **minor unit exponent** _e_: the amount in minor units is the amount
in major units × 10^_e_.

| _e_ | Currencies (examples)                                             | 1.00 major = |
| --- | ----------------------------------------------------------------- | ------------ |
| 0   | JPY, KRW, CLP, ISK, VND, PYG, RWF, UGX, XOF, XAF                  | 1 minor unit |
| 2   | USD, EUR, GBP, CHF, CAD, AUD, BRL, INR, ZAR, and most of the list | 100          |
| 3   | KWD, BHD, OMR, JOD, TND, LYD, IQD                                 | 1 000        |
| 4   | CLF (Chilean unidad de fomento), UYW                              | 10 000       |

What a hard-coded `× 100` breaks: `Money(1234, "JPY")` is ¥1 234, not ¥12.34 — a factor-of-100 error,
not a rounding error; a `DECIMAL(19,2)` column silently truncates 0.001 KWD on every row; and the
exponent is not permanent (redenominations happen, ISO amendments follow), so it belongs in a
currency table **with an effective date**, derived, never inlined.

Two distinctions the exponent does not cover. **Cash rounding** is a settlement rule, not a ledger
rule: where the small coins were withdrawn, a _cash_ tender rounds to an increment coarser than the
minor unit while the invoice stays exact to the currency exponent, and the tender difference is a
posting to a cash-rounding account (M16). State that increment in **minor units, per jurisdiction** —
CHF 5, CAD 5, AUD 5, NZD **10** (the 5-cent coin ceased to be legal tender in 2006), SEK **100**, a
whole krona (the 50-öre coin was withdrawn in 2010). It is not one 5-cent rule with a list of
countries attached, and it is not permanent: the increment is effective-dated data belonging in the
same currency table as the exponent, beside `effective_from` (§3.3), never a constant in code.
**X-series codes** are ISO 4217 but not currencies:
XAU/XAG/XPT/XPD (metals, per troy ounce), XDR, XTS (test), XXX (no currency). Never let XTS reach
production; never treat XAU as an _e_=2 currency.

### 1.3 Non-ISO assets

Crypto, tokens, loyalty points and fractional shares are quantities with units and belong in the same
value type — with a registry explicitly larger than ISO 4217.

| Asset class              | Typical scale                                  | Code strategy                                                                                     | Watch for                                                                                                    |
| ------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| BTC                      | 8 dp (satoshi)                                 | Namespaced, e.g. `XBT` internally, never a bare `BTC` colliding with ISO                          | 8-dp exponent breaks `BIGINT` assumptions less than ETH does                                                 |
| ETH, ERC-20, stablecoins | 18 dp (wei) or token-declared (USDC 6, DAI 18) | Store the on-chain `decimals()` per contract per chain; issuer and chain are part of the identity | 1 ETH = 10^18 wei overflows `BIGINT` at ~9.22 ETH (§3.4); USDC on two chains is two assets to reconcile (M9) |
| Loyalty points           | 0 dp typically                                 | Own unit; **never** a currency code                                                               | Points carry a redemption liability and a breakage estimate — `ledger.md`, `corporate-finance.md`            |
| Fractional shares        | 6–8 dp quantity, 4–6 dp price                  | Quantity is not money; notional is                                                                | Notional rounds to the currency exponent; quantity does not — `markets-trading.md`                           |

Extend by making the registry the only source of scale, with each unit carrying
`(code, exponent, kind, iso4217, dti)` — `kind` in `iso4217 | crypto | metal | points | index`, `dti`
the ISO 24165 digital token identifier where one exists — not by adding an `is_crypto` boolean. Only
`iso4217` units may appear in a statutory report without a conversion (M19, M20); points are never
summed with currency, under any mode (M6).

## 2. A `Money` value type

Below is a complete, correct implementation. Its design goals, in order: **no float can enter**,
**cross-currency arithmetic is a type error**, **multiplication by a rate cannot silently round**.

```python
from __future__ import annotations
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP, localcontext
from typing import Sequence

EXPONENT = {"USD": 2, "EUR": 2, "GBP": 2, "JPY": 0, "KRW": 0, "CLP": 0,
            "KWD": 3, "BHD": 3, "TND": 3, "CLF": 4, "XBT": 8, "XETH": 18}
PREC = 60   # decimal's default context is 28 significant digits: not enough for 18-dp assets

class CurrencyMismatch(TypeError): pass

@dataclass(frozen=True, slots=True)
class Money:
    minor: int
    currency: str

    def __post_init__(self) -> None:
        if type(self.minor) is not int:            # bool is an int subclass; `type is` refuses it
            raise TypeError(f"minor units must be int, got {type(self.minor).__name__} (M4)")
        if self.currency not in EXPONENT:
            raise ValueError(f"unknown currency {self.currency!r}")

    @property
    def exponent(self) -> int: return EXPONENT[self.currency]

    @classmethod
    def zero(cls, currency: str) -> "Money": return cls(0, currency)

    @classmethod
    def parse(cls, amount: str | int | Decimal, currency: str) -> "Money":
        if isinstance(amount, float):
            raise TypeError("float is not an exact amount (M4)")
        if currency not in EXPONENT:
            raise ValueError(f"unknown currency {currency!r}")
        with localcontext() as ctx:                # default prec (28) is too small for 18-dp assets
            ctx.prec = PREC
            d = Decimal(amount)
            scaled = d.scaleb(EXPONENT[currency])
            if scaled != scaled.to_integral_value():
                raise ValueError(f"{d} exceeds the scale of {currency} (M4)")
            return cls(int(scaled), currency)

    @property
    def decimal(self) -> Decimal:                   # exact, context-free: built from digits, not by /
        digits = tuple(int(c) for c in str(abs(self.minor)))
        return Decimal((0 if self.minor >= 0 else 1, digits, -self.exponent))

    def __str__(self) -> str:                       # wire/log form, never the display form (§11)
        return f"{self.decimal:f} {self.currency}"

    def _same(self, other: object) -> None:
        if not isinstance(other, Money) or other.currency != self.currency:
            raise CurrencyMismatch(f"{self.currency} vs {getattr(other, 'currency', other)!r} (M6)")

    def __add__(self, o): self._same(o); return Money(self.minor + o.minor, self.currency)
    def __sub__(self, o): self._same(o); return Money(self.minor - o.minor, self.currency)
    def __neg__(self):    return Money(-self.minor, self.currency)
    def __abs__(self):    return Money(abs(self.minor), self.currency)
    def __lt__(self, o):  self._same(o); return self.minor < o.minor
    def __le__(self, o):  self._same(o); return self.minor <= o.minor

    def __mul__(self, k: int) -> "Money":           # exact scaling only (quantity × unit amount)
        if type(k) is not int: raise TypeError("scale by int only; use .times() for a rate")
        return Money(self.minor * k, self.currency)

    def times(self, rate: Decimal | int | str) -> "Unrounded":
        """Rate multiplication NEVER returns Money: the caller must round explicitly (M5)."""
        if isinstance(rate, float): raise TypeError("float rate (M4)")
        with localcontext() as ctx:
            ctx.prec = PREC
            return Unrounded(self.decimal * Decimal(rate), self.currency)

@dataclass(frozen=True, slots=True)
class Unrounded:
    """An exact intermediate: cannot be posted, stored or compared to Money until rounded."""
    value: Decimal
    currency: str

    def to(self, currency: str) -> "Unrounded":     # FX: re-denominate the intermediate (§8)
        return Unrounded(self.value, currency)

    def round(self, mode: str = ROUND_HALF_UP) -> Money:
        with localcontext() as ctx:
            ctx.prec = PREC
            q = self.value.quantize(Decimal(1).scaleb(-EXPONENT[self.currency]), rounding=mode)
        return Money.parse(q, self.currency)
```

Behaviour worth stating explicitly, because reviewers ask:

| Operation                              | Result                     | Why                                                                                                  |
| -------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| `Money.parse(12.34, "EUR")`            | `TypeError`                | Float ingress is the defect; reject it at the door, not in a linter (M4)                             |
| `Money.parse("1.234", "EUR")`          | `ValueError`               | Sub-cent EUR is a price, not an amount (§1.1)                                                        |
| `Money(100,"EUR") + Money(100,"USD")`  | `CurrencyMismatch`         | M6, by construction rather than by convention                                                        |
| `Money(100,"EUR") == Money(100,"USD")` | `False`                    | Equality across currencies is _false_, not an error — `in`, `set`, dict keys must keep working       |
| `Money(100,"EUR") < Money(100,"USD")`  | `CurrencyMismatch`         | Ordering across currencies is meaningless, so it raises                                              |
| `m.times("0.19")`                      | `Unrounded`                | You cannot accidentally round mid-chain; the type forces §4.2                                        |
| `sum([...])`                           | `TypeError` on `0 + Money` | Provide `total(items, currency)` that takes the currency explicitly, so an empty list has a currency |

Python traps this defuses: `decimal`'s default rounding is **ROUND_HALF_EVEN**, so an unspecified
`quantize` silently rounds banker's — a policy you never declared (M5); its default precision is 28
significant digits, wrong for 18-dp assets; and `bool` subclasses `int`, so `isinstance(True, int)`
is `True` and `Money(True, "EUR")` would be one cent.

### 2.1 The JSON wire contract

Two candidates — `{"amount": "12.34", "currency": "EUR"}` and
`{"minor": 1234, "currency": "EUR", "exponent": 2}`. Pick one and enforce it in the schema.

| Criterion                           | Decimal string                                        | Minor + exponent                                      |
| ----------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| Exactness                           | Exact if parsed as Decimal; never a JSON number       | Exact always                                          |
| Client can't misinterpret scale     | Scale is visible in the payload                       | Requires reading `exponent`; clients hard-code `/100` |
| Sub-minor precision (prices, rates) | Same encoding works at any scale                      | Breaks: needs a second, different encoding            |
| Human/log/audit legibility          | `"12.34 EUR"` reads correctly in an incident at 03:00 | `1234` reads as twelve hundred                        |
| Overflow safety                     | Unbounded                                             | Safe in JSON, unsafe in a JS `number` above 2^53      |
| Ecosystem                           | ISO 20022, most bank APIs                             | Stripe and card-scheme lineage                        |

**Take the decimal string at the boundary; keep integer minor units in storage and in memory.** The
string is self-describing at any scale, which the minor-unit form is not, and a careless client fails
with a visible parse error rather than a silent factor of 100 or 1000. Two rules hold either way:

1. **Never a JSON number for an amount.** `JSON.parse('{"amount":0.1}')` yields a binary64 float in
   every mainstream client — the damage is done before your code runs. Schema it as
   `{"type":"string","pattern":"^-?(0|[1-9][0-9]*)(\\.[0-9]+)?$"}`, and in Python read the body with
   `json.loads(body, parse_float=Decimal)` so a partner's spec-violating literal still arrives exact.
2. **Currency is required on every amount**, never inherited from the enclosing object or from the
   account (M4). An inherited currency is how a JPY amount becomes a EUR amount during a refactor.

## 3. Storage

### 3.1 Column choice

| Column                  | Range / scale               | Use for                                           | Notes                                                                                                                                                                        |
| ----------------------- | --------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BIGINT` minor units    | ±9.22×10^18 minor units     | Ledger postings, balances, all *e*≤6 amounts      | Fastest to sum, exact by construction, needs the exponent from the currency table                                                                                            |
| `NUMERIC(38, 9)`        | 38 significant digits, 9 dp | Prices, rates, high-scale assets, warehouse marts | Native in Snowflake/BigQuery; wide enough for 8-dp crypto. At 18 dp (`NUMERIC(38,18)`/`BIGNUMERIC`, for wei-scale tokens) only 20 integer digits remain — check the headroom |
| `DECIMAL(19, 4)`        | ±10^15 with 4 dp            | ERP-compatible unit prices, legacy interop        | 4 dp is the classic "money" scale; too coarse for metered pricing                                                                                                            |
| `FLOAT`/`DOUBLE`/`REAL` | —                           | **never**                                         | Not exact, not summable, not comparable (M4)                                                                                                                                 |

### 3.2 Engine specifics

| Engine          | What to use                                             | What bites                                                                                                                                                                                                                                                                              |
| --------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL      | `bigint` for minor units, `numeric(p,s)` for prices     | The `money` type is locale-dependent (`lc_monetary`), carries no currency, and has a single fixed fractional precision — never use it. `numeric` is exact but slower than `bigint`; `sum(numeric)` is fine, `avg` introduces scale you must re-quantize                                 |
| MySQL / MariaDB | `BIGINT`, `DECIMAL(p,s)` (max 65 digits)                | Some functions and mixed expressions promote `DECIMAL` to `DOUBLE`; check with `SELECT ... ` and the resulting type. `DECIMAL` division yields scale + `div_precision_increment`                                                                                                        |
| SQLite          | `INTEGER` minor units, or `TEXT`                        | **No decimal type.** A column declared `DECIMAL(19,4)` gets NUMERIC _affinity_ and is stored as `REAL` when it cannot be an integer — a silent float. This is the single most common precision loss in small services and in test suites that use SQLite while production uses Postgres |
| BigQuery        | `NUMERIC` (38, 9) or `BIGNUMERIC` (76.76 digits, 38 dp) | `/` on `INT64` returns `FLOAT64`; cast before dividing. Ingest amounts as `STRING` then cast, never via JSON numbers                                                                                                                                                                    |
| Snowflake       | `NUMBER(38, s)`                                         | Max precision is 38 total; division changes the result scale — quantize explicitly before comparing                                                                                                                                                                                     |
| SQL Server      | `DECIMAL(19,4)`, `BIGINT`                               | The `MONEY` type is fixed at 4 dp and truncates intermediate division results — use `DECIMAL`                                                                                                                                                                                           |

### 3.3 Currency column and constraints

```sql
CREATE TABLE currency (
  code        char(3) PRIMARY KEY CHECK (code ~ '^[A-Z]{3}$'),
  exponent    smallint NOT NULL CHECK (exponent BETWEEN 0 AND 18),
  iso4217     boolean  NOT NULL,
  effective_from date  NOT NULL
);

CREATE TABLE posting (
  id            bigserial PRIMARY KEY,
  entry_id      bigint  NOT NULL REFERENCES journal_entry(id),
  account_id    bigint  NOT NULL REFERENCES account(id),
  amount_minor  bigint  NOT NULL CHECK (amount_minor <> 0),  -- signed: debit +, credit -
  currency      char(3) NOT NULL REFERENCES currency(code)
);
```

The currency **FK enforces M4 at the storage layer**: an amount cannot exist in a currency whose
exponent the system does not know. Note that you _cannot_ express "this `numeric` has exactly the
currency's scale" in a `CHECK` (no subqueries) — a decisive argument for minor units, where the
constraint is free because an integer has no scale to drift. Never a nullable currency and never a
default currency (a default currency is §2.1's inherited currency with a longer fuse). Balance
columns, where they exist, are caches: labelled and rebuildable — `ledger.md` (M1, M17).

### 3.4 Overflow

`BIGINT` holds ±9 223 372 036 854 775 807 minor units: ~9.2×10^16 EUR (_e_=2) and ~9.2×10^10 BTC
(_e_=8) — ample — but **~9.22 ETH** at _e_=18, which overflows on the first real transfer; wei-scale
assets need `NUMERIC(78,0)` or a decimal string. Check headroom against _aggregates_, not
per-transaction values: `SUM(bigint)` in Postgres returns `numeric` (safe), while the same sum in an
application `int64` silently wraps.

### 3.5 ORM and client pitfalls

| Stack                   | Pitfall                                                                                                              | Fix                                                                                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Django                  | `FloatField` for amounts; `DecimalField` on SQLite (no native decimal); aggregate `output_field` defaulting to float | `DecimalField(max_digits, decimal_places)` or `BigIntegerField` minor units; set `output_field=DecimalField()` on every `Sum`/`Avg`; never test money on SQLite if prod is Postgres |
| SQLAlchemy              | `Numeric(asdecimal=False)`; SQLite dialect warns it stores `Decimal` as float                                        | `Numeric(precision, scale, asdecimal=True)` (the default) or `BigInteger`; add a `TypeDecorator` that returns your `Money` and refuses floats                                       |
| JavaScript / TypeScript | `number` is binary64: exact integers only to 2^53−1 = 9 007 199 254 740 991, and `0.1+0.2 !== 0.3`                   | The API sends **strings**; the client uses `decimal.js`/`big.js` or `BigInt` on minor units; never `parseFloat` an amount                                                           |
| Java / Kotlin           | `BigDecimal.equals` compares scale (`2.0 != 2.00`)                                                                   | Compare with `compareTo`, or normalise scale on construction. (psycopg/asyncpg are fine: `numeric` → `Decimal`; do not register a float adapter)                                    |
| Excel / CSV export      | Reopens as float, strips leading zeros, localises the decimal separator                                              | Export minor units or a quoted string, and state the format in the file header — `reconciliation-close.md`                                                                          |

## 4. Rounding

### 4.1 Modes

| Mode                         | Behaviour at the midpoint     | Use when                                                                                                                                                                                  |
| ---------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ROUND_HALF_UP`              | 0.5 away from zero            | The common commercial and tax default; many tax authorities specify it explicitly. Safe default for customer-facing amounts                                                               |
| `ROUND_HALF_EVEN` (banker's) | 0.5 to the nearest even digit | Large populations of independent amounts where cumulative bias matters: statistical aggregation, some interest and valuation conventions. IEEE-754 default and Python's `decimal` default |
| `ROUND_HALF_DOWN`            | 0.5 toward zero               | Rare; only when a counterparty's spec says so (some scheme and settlement file formats)                                                                                                   |
| `ROUND_CEILING`              | Toward +∞                     | Never for a customer charge unless contractually stated; used for limits and buffers                                                                                                      |
| `ROUND_FLOOR`                | Toward −∞                     | Payout caps, "we never pay more than earned" rules                                                                                                                                        |
| `ROUND_DOWN` (truncate)      | Toward zero                   | Interest _accrual_ conventions that truncate; VAT regimes that permit rounding down in the customer's favour; never for a charge you sum many times                                       |

Who mandates which, in practice — and note that none of it is a language default:

| Domain          | Typical requirement                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VAT / GST       | Set by the member state or authority, not by the directive. India rounds the invoice total to the nearest rupee (CGST Act s.170). UK HMRC permits rounding the total VAT down to the whole penny on invoices to registered businesses, and per-line calculation with consistent treatment. The CJEU (C-484/06 _Ahold_, C-302/07 _Wetherspoon_) confirmed member states set the rule subject to neutrality and proportionality |
| US sales tax    | Per-transaction or per-item depending on the state and on Streamlined Sales Tax election; the choice must be applied consistently                                                                                                                                                                                                                                                                                             |
| IFRS / US GAAP  | No rounding mode is mandated; presentation rounding (thousands, millions) is disclosed and must not change the underlying records (M19)                                                                                                                                                                                                                                                                                       |
| Interest        | The convention comes from the instrument's terms and the day-count basis (§9), not from a house default                                                                                                                                                                                                                                                                                                                       |
| Cash settlement | The jurisdiction's cash-tender increment, in minor units: CHF 5, CAD 5, AUD 5, NZD 10, SEK 100. Read it from the currency table, not from a constant — settlement-level only (§1.2)                                                                                                                                                                                                                                           |

**Do not choose a mode; record one, per context, in the money model, with the authority that requires
it** (M5).

### 4.2 Round late, round once

Every rounding transfers up to half a minor unit. Rounding once at the end of a chain bounds the
error at half a unit; rounding at each step multiplies it by the number of steps, and — worse — by
the _quantity_ when the rounded thing is a unit price.

**Failing case — metered billing.** Price 0.0005 EUR per API call, 1 234 567 calls in the period.

```python
per_call = Money.parse("0.0005", "EUR")        # ValueError: exceeds the scale of EUR  ← correct
                                               # the naive version rounds to 0.00 and bills nothing
price, usage = Decimal("0.0005"), 1_234_567    # a price at scale 4, not a Money
charge = Unrounded(price * usage, "EUR").round(ROUND_HALF_UP)   # 617.28 EUR — one rounding
```

**Failing case — per-unit rounding at volume.** Unit price 1.045 EUR, 1 000 units.

| Chain                                           | Result                         |
| ----------------------------------------------- | ------------------------------ |
| Round the unit price to the cent, then multiply | 1.05 × 1000 = **1 050.00 EUR** |
| Multiply, then round once                       | 1 045.00 EUR                   |

A 0.48% overcharge, invisible in a unit test with quantity 1, and a refund programme when a customer
notices.

**Rounding is allowed at exactly three points** — declare them in the money model: where an amount
becomes a **posting** (it must be at currency scale to be posted); where it becomes a
**customer-facing figure** (invoice line, statement, quote); and where it crosses a **counterparty
boundary** with a fixed format scale (settlement file, scheme message, tax filing). Everywhere else,
carry the exact intermediate. The `Unrounded` type in §2 makes this checkable by a reader and by a
linter: `Unrounded` must never reach persistence.

### 4.3 The residue is carried, then posted

The difference between the exact and the recorded amount does not vanish; it lands somewhere, and the
only question is where and when. It belongs in a **rounding difference** account rather than
distorting revenue or a counterparty balance (M16) — but a _single_ conversion's residue cannot be
posted. By construction it is strictly less than half a minor unit, so it has no representation as an
amount: `Money.parse(Decimal("-0.0024"), "USD")` raises
`ValueError: -0.0024 exceeds the scale of USD (M4)`, which is the type doing its job, not an obstacle
to route around.

So **carry it and post the accumulation.** Keep an exact `Decimal` accumulator per currency pair per
accounting period; post only when it crosses a whole minor unit, and leave the sub-unit remainder in
the accumulator for the next conversion:

```python
acc[pair, period] += conv.residue                     # exact Decimal; never rounded away
whole, carry = divmod(acc[pair, period], Decimal(1))  # truncates toward zero, remainder keeps the sign
if whole:                                             # Decimal('-0') is falsy: nothing to post yet
    post(ROUNDING_DIFFERENCE, Money(int(whole), pair.quote)); acc[pair, period] = carry
```

`posted + carried` equals the exact total residue at every step, which is the property to test (M5,
M18). The accumulator is per period because it must close with the period: at close, an accumulator
holding a sub-minor remainder is disclosed and carried forward, never silently zeroed.

The alternative is to **absorb** the residue: leave it in the FX position account under a tolerance
declared by finance, and post nothing. That is defensible and cheaper, and it has one consequence to
write down rather than discover — `ledger.md` §9.2 says a position account translated at mid should be
flat, and under absorption it is flat only to within the accumulated residue, so the monitor there
needs the same bound. Pick one of the two in the money model and name it (§10); `ledger.md` covers the
rounding-difference account and its normal balance.

## 5. Allocation and splitting

### 5.1 The naive bug, and the fix

```python
total = Money.parse("100.00", "EUR")
share = Money(total.minor // 3, "EUR")          # 33.33 EUR
parts = [share, share, share]                    # sums to 99.99 EUR — one cent has been destroyed
```

One cent, three times a day, across a marketplace, is a break that ages and cannot be explained,
because nothing recorded the loss (M5, M9). `Decimal("100")/3` rounded to 2 dp is the same bug. The
fix is largest-remainder allocation:

```python
def allocate(amount: Money, ratios: Sequence[int]) -> list[Money]:
    """Split `amount` in the given integer ratios. sum(result) == amount, exactly, always."""
    if not ratios or any(r < 0 for r in ratios):
        raise ValueError("ratios must be non-negative and non-empty")
    denom = sum(ratios)
    if denom == 0:
        raise ValueError("ratios sum to zero")
    sign, n = (-1, -amount.minor) if amount.minor < 0 else (1, amount.minor)
    parts = [n * r // denom for r in ratios]                 # floor share, in minor units
    rest = n - sum(parts)                                    # 0 <= rest < len(ratios)
    order = sorted(range(len(ratios)),
                   key=lambda i: (-((n * ratios[i]) % denom), i))   # largest remainder, then index
    for i in order[:rest]:
        parts[i] += 1
    return [Money(sign * p, amount.currency) for p in parts]
```

| Call                              | Result                     | Point                                                                                                    |
| --------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `allocate(0.05 EUR, [3, 7])`      | `[0.02, 0.03]`             | Sums to 0.05; proportional to within one minor unit                                                      |
| `allocate(100.00 EUR, [1, 1, 1])` | `[33.34, 33.33, 33.33]`    | The extra cent is _assigned_, not lost                                                                   |
| `allocate(-100.00 EUR, [1,1,1])`  | `[-33.34, -33.33, -33.33]` | Sign-symmetric: a refund allocates like the charge it reverses                                           |
| `allocate(1 JPY, [1, 1, 1])`      | `[1, 0, 0]`                | Zero-exponent currencies allocate in whole units; parts of zero are legal and must be handled downstream |

Percentages and weights reduce to this: scale them to integers first
(`allocate(total, [int(w * 10**k) for w in weights])`) so the ratio arithmetic stays exact; splitting
by line amounts is `allocate(total, [line.minor for line in lines])`. The property it must satisfy —
the single highest-value property test in a money codebase (M18):

```python
@given(total=money(), ratios=st.lists(st.integers(0, 10_000), min_size=1, max_size=20)
                          .filter(lambda r: sum(r) > 0))
def test_allocation_preserves_total(total, ratios):
    parts = allocate(total, ratios)
    assert sum(p.minor for p in parts) == total.minor          # M5
    for part, r in zip(parts, ratios):
        exact = Decimal(total.minor) * r / sum(ratios)
        assert abs(Decimal(part.minor) - exact) < 1            # within one minor unit
```

### 5.2 The tie-break is a policy, not an implementation detail

Ties are broken by index above, so **the first party systematically receives the extra minor unit**.
If that party is your platform and the second is the seller, it is a small, real, auditable transfer
in your favour. Choose deliberately:

| Policy                                 | Behaviour                                                            | Use when                                                          |
| -------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Index order                            | Deterministic, biased toward position 0                              | Internal splits where the bias is immaterial and documented       |
| Largest party first                    | Bias goes to the largest share                                       | Common in tax allocation; the relative error is smallest          |
| Rotate by a key (`hash(order_id) % n`) | Bias averages out across orders, still reproducible from stored data | Marketplaces, revenue shares between independent parties          |
| Residue to a rounding account          | No party is favoured; the cent is booked separately                  | When any bias is unacceptable and an extra posting is cheap (M16) |

Whatever you choose must be **reproducible from stored data** — a random tie-break makes a
recomputation disagree with the ledger and breaks M17.

### 5.3 A marketplace split, end to end

Order 100.00 EUR, platform fee 12.5% + 0.30, PSP fee 1.4% + 0.25 borne by the platform, seller takes
the rest. Fees are separate postings, never netted into the principal (M16):

| Component              | Computation                       | Amount     |
| ---------------------- | --------------------------------- | ---------- |
| Gross charged to buyer | —                                 | 100.00 EUR |
| Platform fee           | `100.00 × 0.125 → 12.50` + `0.30` | 12.80 EUR  |
| Seller payable         | `100.00 − 12.80`                  | 87.20 EUR  |
| PSP fee                | `100.00 × 0.014 → 1.40` + `0.25`  | 1.65 EUR   |
| Platform net revenue   | `12.80 − 1.65`                    | 11.15 EUR  |

Four postings, four accounts, one entry (M2), with two invariants to assert in a test:
`gross == seller_payable + platform_fee` and `cash_received == gross − psp_fee`. The posting rules
belong to `ledger.md`; the fee mechanics and who is actually charged what, to `payments.md`.

## 6. Percentages and tax

### 6.1 Inclusive vs exclusive

| Model         | Stored price | Derivation                                             | Typical market                |
| ------------- | ------------ | ------------------------------------------------------ | ----------------------------- |
| Tax-exclusive | net          | `tax = round(net × rate)`, `gross = net + tax`         | US sales tax, B2B invoicing   |
| Tax-inclusive | gross        | `net = round(gross ÷ (1 + rate))`, `tax = gross − net` | EU/UK consumer retail, JP, AU |

**For inclusive pricing: derive the net by rounding, then take the tax as the residual.** Rounding
both independently breaks the identity — failing case, gross 9.99 EUR at 20%:

| Method                                                          | net  | tax  | net + tax        |
| --------------------------------------------------------------- | ---- | ---- | ---------------- |
| Round both (`net = 9.99/1.2 → 8.33`, `tax = 8.33 × 0.2 → 1.67`) | 8.33 | 1.67 | **10.00 ≠ 9.99** |
| Residual (`net = 8.33`, `tax = 9.99 − 8.33`)                    | 8.33 | 1.66 | 9.99 ✓           |

The first method changes the shelf price the customer agreed to, and in an inclusive-pricing
jurisdiction it is also a filing error.

### 6.2 Line-level vs invoice-level rounding

Three lines of 9.99 EUR net at 19%:

| Method                                                    | VAT  | Gross |
| --------------------------------------------------------- | ---- | ----- |
| Round per line: `9.99 × 0.19 = 1.8981 → 1.90`, × 3        | 5.70 | 35.67 |
| Round once on the invoice: `29.97 × 0.19 = 5.6943 → 5.69` | 5.69 | 35.66 |

Both are defensible; they are not interchangeable, and a system that computes one and reports the
other issues invoices whose lines do not sum to the total — rejected regardless of which method is
legal. Fix the level in the money model, per jurisdiction. When you round per line (most retail
systems do, because the line is the customer-visible unit), compute the invoice total by summing
rounded lines; never recompute it from the net total. Rates, place-of-supply, reverse-charge and
nexus belong to a tax engine (SKILL.md §11); what is yours is the _arithmetic contract_ with it —
which level it rounds at, what it returns per line, and what you post (M16).

### 6.3 Multi-rate invoices, discounts, compounding

- **Multi-rate.** Group lines by rate, round per group, sum the groups. Never a blended rate: it is
  not the tax you owe, and the return asks for the split.
- **Discounts.** An invoice-level discount is **allocated back to lines** by §5.1 _before_ tax,
  because lines may carry different rates; allocating after tax changes the tax owed. A discount
  agreed after the invoice is issued is a credit note, not an edit (M3).
- **Compounding taxes.** Some regimes layer a levy on an already-taxed base (Quebec QST on the
  GST-inclusive amount, historically). Model tax as an ordered list of `(rate, base_selector)`, not a
  scalar, and declare the order.
- **Withholding.** A withheld amount is a separate posting to a liability account, never a reduction
  of revenue (M16).

## 7. Proration

### 7.1 Prorate the delta, once

Failing case — plan change from 9.99 to 14.99 EUR/month, 17 of 28 days remaining:

| Method                       | Computation                                                      | Result       |
| ---------------------------- | ---------------------------------------------------------------- | ------------ |
| Credit and charge separately | `round(9.99 × 17/28) = 6.07`, `round(14.99 × 17/28) = 9.10`, net | **3.03 EUR** |
| Prorate the delta once       | `round(5.00 × 17/28)`                                            | **3.04 EUR** |

Both are one rounding from the exact 3.0357; they differ because each independent rounding carries
its own error. Customers compare invoices, and support cannot explain a cent that depends on which
code path ran — so choose once. **Prorate the delta once** for a plan swap inside a cycle (one line,
one rounding, one explanation). When the customer must see the reversal — a downgrade with a visible
credit, or a policy requiring the gross-up — issue _both_ lines but derive the second as
`net_line = delta_line − credit_line`, so the invoice still adds up.

### 7.2 Basis

| Basis                      | Fraction                                | Use when                                                                                    |
| -------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------- |
| Day-based                  | `days_remaining / days_in_period`       | Default. Human-explainable, matches the invoice a support agent reads out                   |
| Second-based               | `seconds_remaining / seconds_in_period` | Usage-metered or hourly products; also when upgrades happen many times a day                |
| Whole-period, no proration | 1 or 0                                  | Low-value subscriptions where the support cost of explaining a proration exceeds the amount |

The **denominator is the actual length of the current period**, not 30 and not 365/12: a fixed 30
makes the daily rate wrong in 7 months of 12 and produces annual totals that do not match twelve
monthly charges.

### 7.3 Calendar traps

| Trap                        | What happens                                                                                                                   | Rule                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Anniversary on the 31st     | Month + 1 from 31 January is undefined                                                                                         | Clamp to the last day of the target month, and **remember the original day** so 31 Jan → 28 Feb → 31 Mar, not → 28 Mar    |
| 29 February                 | An annual plan started 29 Feb 2024 renews when?                                                                                | Clamp to 28 Feb in non-leap years; keep the anchor at 29                                                                  |
| Timezone of the billing day | A cycle boundary at `00:00 America/Los_Angeles` is 07:00/08:00 UTC; a naive UTC date shifts the boundary by a day twice a year | Store the billing timezone with the subscription; compute boundaries in it; store the resulting instants in UTC (M10)     |
| DST transitions             | A "day" is 23 or 25 hours twice a year                                                                                         | Second-based proration must use the actual elapsed duration in the billing timezone, or use day-based                     |
| Period vs accounting period | A charge on 31 Jan 23:30 PT is 1 Feb UTC                                                                                       | The accounting period is decided by the declared cutoff rule, not by the server's clock (M10) — `reconciliation-close.md` |

**The residual cent.** Proration produces amounts that do not sum to the plan price over a cycle —
expected, and acceptable _if_ the difference is booked. Where a customer is credited and charged on
the same invoice, assert `credit + charge + net_line == 0` in the entry (M2) and send the residue to
the declared rounding account (M16), never into revenue.

## 8. FX

### 8.1 Quote conventions, sides, and who pays the spread

`EUR/USD = 1.0850` means **1 unit of the base (EUR) buys 1.0850 units of the quote (USD)**. Market
convention is not symmetric — EUR/USD and GBP/USD quote EUR and GBP as base, USD/JPY and USD/CHF
quote USD as base — which is why inverted-rate bugs are the most common FX defect. **Store rates as
a triple, never as a bare number:** `(base, quote, rate)`. A column named `usd_rate` is a defect
waiting for a second currency (M6). Refuse any conversion where `amount.currency != rate.base`, as
`convert()` in §8.4 does.

| Rate        | Meaning                                      | Who uses it                                                                |
| ----------- | -------------------------------------------- | -------------------------------------------------------------------------- |
| Bid         | The price at which the dealer buys the base  | You selling the base currency                                              |
| Ask / offer | The price at which the dealer sells the base | You buying the base currency                                               |
| Mid         | `(bid + ask) / 2`                            | Valuation, reporting, revaluation — **never** a customer-facing conversion |

Convert customers at mid and you bear the spread as a cost you never booked. Convert at a marked-up
rate and the markup is **revenue** — a separate posting, not an adjustment to the principal (M16).
The customer rate, the rate you actually dealt at and the reference rate are three different numbers,
and the differences between them are exactly your FX revenue and FX cost: a system that stores one
rate cannot produce a P&L on FX.

### 8.2 Triangulation

Cross rates through a pivot, usually USD or EUR:
`EUR/JPY = EUR/USD × USD/JPY = 1.0850 × 156.20 = 169.477`. With a two-sided market, cross the
_sides_, not the mids:

| Input                                  | Bid          | Ask          |
| -------------------------------------- | ------------ | ------------ |
| EUR/USD                                | 1.0848       | 1.0852       |
| USD/JPY                                | 156.15       | 156.25       |
| **EUR/JPY** (bid=bid×bid, ask=ask×ask) | **169.3915** | **169.5625** |

Crossing mids gives 169.477 and understates the spread by ~17 pips — a real loss on every ticket.
The euro legacy rule is the precedent to copy for any fixed-rate regime: EU Regulation 1103/97 fixed
each legacy currency to the euro with **six significant figures**, forbade using the inverse of the
fixed rate, and required legacy-to-legacy conversion to triangulate through the euro with the
intermediate not rounded below three decimals.

### 8.3 Inverse is not `1/rate`

**Market reason.** The dealer's USD/EUR bid is not `1 / EUR/USD ask` — it is a separate quote with
its own spread. Inverting your buy rate to price a sell hands the customer the spread.

**Arithmetic reason.** Round-tripping an _amount_ does not return the original, because each leg
rounds to the target currency's exponent. The damage is largest for low-exponent currencies:

| Step                              | Value     |
| --------------------------------- | --------- |
| Start                             | 1 JPY     |
| × 0.00612 EUR/JPY, round to _e_=2 | 0.01 EUR  |
| ÷ 0.00612, round to _e_=0         | **2 JPY** |

A 100% gain from two legal roundings. Therefore: **never assert that a conversion round-trips**,
never reverse a conversion by converting back (reverse the original posting instead, M3), and never
net two conversions of the same money.

### 8.4 `convert()` — the amount and the record

A conversion is an event, not an expression (M6): it produces an amount _and_ the record posted
alongside it (M16).

```python
@dataclass(frozen=True, slots=True)
class Rate:
    base: str; quote: str; rate: Decimal; source: str; as_of: datetime; max_age: timedelta

@dataclass(frozen=True, slots=True)
class Conversion:
    source_amount: Money; target_amount: Money; rate: Decimal; rate_source: str
    rate_as_of: datetime; converted_at: datetime
    residue: Decimal            # exact − recorded; sub-minor, so it is carried (§4.3) (M5, M16)

class StaleRate(RuntimeError): pass

def convert(amount: Money, rate: Rate, now: datetime,
            mode: str = ROUND_HALF_UP) -> tuple[Money, Conversion]:
    if amount.currency != rate.base:
        raise CurrencyMismatch(f"rate is {rate.base}/{rate.quote}, amount is {amount.currency} (M6)")
    if now - rate.as_of > rate.max_age:
        raise StaleRate(f"{rate.base}/{rate.quote} @ {rate.as_of.isoformat()} exceeds {rate.max_age}")
    exact = amount.times(rate.rate).to(rate.quote)
    target = exact.round(mode)
    return target, Conversion(amount, target, rate.rate, rate.source,
                              rate.as_of, now, exact.value - target.decimal)
```

`convert(1234.56 EUR, EUR/USD 1.0850)` → `1339.50 USD`, residue `−0.0024`. Three non-negotiables are
encoded above. **Staleness is checked and the failure is loud** — a max age per pair _and per
purpose_ (intraday pricing tolerates minutes; a month-end revaluation tolerates only the closing
rate), because silently falling back to yesterday's rate is how a customer gets a price nobody can
reproduce; fail closed, M8's posture applied to rates. **The rate source and timestamp are stored on
the conversion**, not looked up later: rate tables get corrected and backfilled, and a conversion
must be reproducible from what it recorded (M1, M14). **The residue is returned rather than
discarded** — `−0.0024` here is less than half a cent and cannot itself be a posting, so §4.3
accumulates it per pair per period and posts it when it reaches a whole minor unit.

### 8.5 Which rate for which purpose

| Purpose                                     | Rate                                                                            | Authority / practice                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Booking a transaction in a foreign currency | Spot rate at the transaction date                                               | IAS 21; an average for a period is permitted if rates are stable                                |
| Retranslating monetary items at period end  | Closing rate at the reporting date                                              | IAS 21; differences to P&L. Non-monetary items stay at the historical rate — do not retranslate |
| P&L line items in consolidation             | Average rate for the period                                                     | IAS 21; the balance sheet uses the closing rate — the difference is the translation reserve     |
| Customer-facing conversion                  | Your dealt rate + declared markup                                               | Consumer disclosure rules may require showing the reference rate and the markup                 |
| Tax filing                                  | The authority's prescribed rate (e.g. published period or annual average rates) | Never your internal rate — `compliance-regulatory.md`                                           |
| Card-scheme settlement                      | The scheme's rate on the settlement date                                        | Yours will differ; the difference is a break to classify — `reconciliation-close.md`            |

**Realized vs unrealized.** A difference is _realized_ when the item settles — the cash received
differs from the amount originally booked — and _unrealized_ when an open monetary item is
retranslated at the closing rate, reversing next period. Both are postings, to different accounts;
the revaluation run and the multi-currency trial balance are in `ledger.md`, the close sequencing in
`reconciliation-close.md`.

## 9. Interest and day count

### 9.1 Conventions

Interest = principal × rate × (numerator / denominator), where the fraction is the **day-count
convention** taken from the instrument's terms — never a house default.

| Convention             | Numerator                                                                                                   | Denominator                      | Where it is used                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| ACT/360                | Actual days                                                                                                 | 360                              | USD and EUR money markets, SOFR and €STR compounding, most US commercial loans |
| ACT/365F               | Actual days                                                                                                 | 365 (fixed)                      | GBP money markets, SONIA, many retail loans in the UK and Australia            |
| ACT/ACT (ISDA)         | Actual days, split at year end                                                                              | 365 or 366 per the calendar year | Interest-rate swaps                                                            |
| ACT/ACT (ICMA)         | Actual days in the coupon period                                                                            | Period length × frequency        | Government and most bonds                                                      |
| 30/360 US (bond basis) | `360(Y2−Y1) + 30(M2−M1) + (D2−D1)`, with D1=31→30, and D2=31→30 if D1 is 30 or 31                           | 360                              | US corporate, municipal and agency bonds                                       |
| 30E/360 (Eurobond)     | Same, with D1=31→30 and D2=31→30 unconditionally; the ISDA variant also maps the last day of February to 30 | 360                              | Eurobonds; swap documentation                                                  |

The same period, the same rate, three answers — 100 000.00 at 5%, 31 Jan 2026 to 31 Jul 2026:

| Convention | Day fraction | Interest     |
| ---------- | ------------ | ------------ |
| ACT/365F   | 181 / 365    | **2 479.45** |
| ACT/360    | 181 / 360    | **2 513.89** |
| 30/360 US  | 180 / 360    | **2 500.00** |

34.44 apart on a six-month, 100k position — at portfolio scale, the difference between matching the
counterparty's interest statement and opening a break every period.

### 9.2 Simple, compound, nominal, effective

| Quantity                                                               | Definition                                                                                                                     | Trap                                                                                                           |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Simple interest                                                        | `P × r × t`                                                                                                                    | Fine for short periods; wrong for anything that capitalises                                                    |
| Compound                                                               | `P × ((1 + r/m)^(m·t) − 1)`                                                                                                    | `m` is the _compounding_ frequency, which is often not the _payment_ frequency                                 |
| Nominal rate (APR-style quote)                                         | `r` quoted per annum, compounded `m` times                                                                                     | 12% nominal compounded monthly is not 12% earned                                                               |
| Effective annual rate (EAR / AER / APY)                                | `(1 + r/m)^m − 1`                                                                                                              | 12% nominal monthly → **12.6825%** effective                                                                   |
| **APR** (Reg Z in the US, Consumer Credit Directive Annex I in the EU) | A **prescribed** calculation including specified fees                                                                          | Not your formula. Implementing "APR" from first principles is a compliance defect — `compliance-regulatory.md` |
| **EIR** (IFRS 9)                                                       | The rate that discounts estimated future cash flows to the gross carrying amount, including fees, points and transaction costs | Used for amortised-cost accounting, not for customer disclosure — different number, different purpose          |

### 9.3 Amortization with a terminal adjustment

The annuity payment is a rounded number, so twelve of them do not repay the loan exactly. The **final
payment absorbs the difference**; a schedule whose closing balance is not exactly zero is a bug, not
a rounding artifact (M5).

```python
class ScheduleDoesNotClose(ValueError): pass

def amortize(principal: Money, annual_rate: Decimal, n: int,
             mode: str = ROUND_HALF_UP) -> list[tuple[int, Money, Money, Money, Money]]:
    """Level-payment schedule. Returns (period, payment, interest, principal, closing balance)."""
    i = annual_rate / 12
    with localcontext() as ctx:
        ctx.prec = 40
        pmt = principal.decimal * i / (1 - (1 + i) ** -n)
    payment = Unrounded(pmt, principal.currency).round(mode)
    balance, rows = principal, []
    for k in range(1, n + 1):
        interest = balance.times(i).round(mode)
        pay = balance + interest if k == n else payment      # terminal adjustment
        princ = pay - interest
        balance = balance - princ
        rows.append((k, pay, interest, princ, balance))
    if balance.minor != 0:                    # a control, so it raises — see below
        raise ScheduleDoesNotClose(f"closing balance {balance} after {n} periods (M5)")
    return rows
```

That check is **enforcement**, not illustration, so it is an `if`/`raise` and not an `assert`: `python -O`
and `PYTHONOPTIMIZE=1` strip every `assert` from the bytecode, and a schedule that silently fails to close
under an optimisation flag is a loan whose last payment is wrong. The `assert`s in §5.1 and §12 are the
other kind — they are inside tests, where being stripped means the test does not run rather than the
control does not fire.

10 000.00 EUR, 12 months, 6% nominal:

| Period | Payment    | Interest | Principal | Balance  |
| ------ | ---------- | -------- | --------- | -------- |
| 1      | 860.66     | 50.00    | 810.66    | 9 189.34 |
| 11     | 860.66     | 8.54     | 852.12    | 856.42   |
| 12     | **860.70** | 4.28     | 856.42    | **0.00** |

Four cents land on the last payment. Disclose that in the schedule the customer sees; never spread it
across payments, and never leave it as a residual balance a collections process will later chase.
Accrual posting (daily vs monthly), capitalisation and delinquency: `banking-open-finance.md`.

## 10. Comparison, equality and tolerance

| Comparison                          | Rule                                                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Two `Money` of the same currency    | Exact integer comparison on minor units. Nothing else                                                                             |
| Two `Money` of different currencies | `==` is `False`; `<`/`>` raise (§2). Never convert implicitly to compare (M6)                                                     |
| `Decimal` prices                    | Compare after quantizing to the declared scale, or use `compare_total` semantics deliberately; in Java, `compareTo`, not `equals` |
| Anything float                      | There is no correct comparison. The presence of `abs(a - b) < 1e-9` in money code is a finding, not a style issue                 |

A tolerance is legitimate only at the boundary between two independent records — reconciliation
matching, where the counterparty's own rounding or FX differs from yours.

| Legitimate                                                                                                                                                                                                                         | Illegitimate                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Matching a settlement line to a posting within a declared tolerance (e.g. ≤ 0.02 or ≤ 0.1% of the amount), with the difference **posted** to a rounding/FX-difference account and the match flagged as tolerance-matched (M9, M16) | A tolerance inside the money type or the arithmetic                                            |
| A materiality threshold that decides whether a break is investigated now or at close — declared by finance, not by engineering                                                                                                     | A tolerance in the assertion of a unit test, which converts a real defect into a passing build |
| An FX revaluation difference within the expected bound of two rate sources                                                                                                                                                         | A tolerance in a trial-balance check — debits equal credits **exactly** (M2), no exceptions    |

Every tolerance is a licence to be wrong and needs a numeric bound, an owner, a posting destination
for the difference, and a monitored count: a rising tolerance-match rate is the earliest signal that
something upstream changed. Break taxonomy and ageing: `reconciliation-close.md`.

## 11. Formatting and localisation

Formatting is a **display** concern at the very edge. Storage, transport, arithmetic and logs use the
machine form (`"12.34"` + `"EUR"`); only the rendered surface uses the locale form.

| Concern              | Rule                                                                                                                                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source of truth      | CLDR via ICU (`Babel`/`PyICU`, `Intl.NumberFormat`). Never hand-roll separators or grouping: `1,234.56` (en-US), `1.234,56` (de-DE), `1 234,56` (fr-FR, narrow no-break space), `12,34,567.89` (en-IN lakh grouping) |
| Symbol vs code       | `$` is ambiguous across USD, CAD, AUD, MXN, SGD and more. In any multi-currency context show the ISO code, and always in a report (M20). Symbol position and spacing are locale-determined                           |
| Negatives            | `-1,234.56`, `(1,234.56)` in accounting presentation, `1.234,56-` in some locales. Parentheses are a _presentation_ choice tied to the report and must be stated                                                     |
| Currency digits      | Format with the currency's exponent, not the locale's default: JPY renders `¥1,235`, not `¥1,234.56`                                                                                                                 |
| RTL locales          | Bidi isolation around the amount, or the minus sign lands on the wrong end                                                                                                                                           |
| Rounding for display | Presentation rounding (thousands, millions) never changes the record, and is labelled: "EUR thousands" (M19, M20)                                                                                                    |

**Never parse a formatted string back into an amount.** `"1.234,56 €"` and `"1,234.56"` are not
distinguishable without the locale, and the locale is not in the string; the amount the string was
formatted from is the authoritative one, so carry it. The boundary in code is
`format_money(m: Money, locale: str) -> str`, in the presentation layer, with no inverse. Ingesting a
human-formatted file (a bank CSV, a spreadsheet export) is a different job in a different layer: the
parser takes locale and currency **as explicit parameters**, refuses ambiguity rather than guessing,
and validates its output against a control total — `reconciliation-close.md`.

## 12. Properties to test

Property-based tests catch the defects example tests structurally cannot, because the failure lives
in the interaction of scale, sign and magnitude (M18). Sketches assume a Hypothesis `money()`
strategy generating valid `Money` across `["USD","EUR","JPY","KWD","XBT"]`.

| #   | Property                                                                | Sketch                                                                                                                                                                |
| --- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Allocation preserves the total, and is proportional within one unit** | `sum(p.minor for p in allocate(m, r)) == m.minor` for all `m` (negative and zero included) and all valid `r`; `abs(part − exact_share) < 1` minor unit for every part |
| 2   | **Rounding is idempotent**                                              | `Unrounded(x, c).round(mode).decimal == Unrounded(round(x), c).round(mode).decimal` for every mode                                                                    |
| 3   | **Serialization round-trips**                                           | `Money.parse(m.decimal, m.currency) == m`; `decode(encode(m)) == m` for the JSON contract of §2.1                                                                     |
| 4   | **No float ingress**                                                    | For all `f: float`, `Money.parse(f, c)` raises; and `m.times(f)` raises                                                                                               |
| 5   | **Cross-currency is refused**                                           | For all `a, b` with `a.currency != b.currency`: `a + b` raises, `a < b` raises, `a == b` is `False`                                                                   |
| 6   | **Same-currency addition is exact and associative**                     | `(a + b) + c == a + (b + c)`; `a + b == b + a`; `a + (-a) == zero`                                                                                                    |
| 7   | **Conversion is bounded and monotone**                                  | `abs(convert(m, r).decimal − m.decimal × r.rate) ≤ half a minor unit`; `m1 ≤ m2 ⟹ convert(m1) ≤ convert(m2)` for a positive rate                                      |
| 8   | **Inclusive tax reconstructs the gross**                                | For all gross and rate: `net + tax == gross`, exactly, with `net` derived by rounding and `tax` as the residual (§6.1)                                                |
| 9   | **Scale invariant**                                                     | Every `Money.decimal` has exactly `exponent` decimal places; `Money(m.minor, c).minor == m.minor` after any round-trip through the wire form                          |

```python
@given(a=money(), b=money())
def test_cross_currency_is_refused(a, b):          # properties 5 and 6
    if a.currency == b.currency:
        assert (a + b) - b == a
    else:
        with pytest.raises(CurrencyMismatch): a + b
        assert a != b
```

Two properties deliberately **absent**, because they are false and asserting them hides real
behaviour: FX round-trip identity (§8.3), and allocation permutation-equivariance (ties break by
index, §5.2 — only the _sum_ is permutation-invariant). Golden-ledger tests per flow and the
trial-balance assertion in CI: `architecture-ops.md`, `ledger.md`.

## Review questions

1. Show the type that represents an amount. Can a `float` reach it — from any constructor,
   deserializer or ORM column? (M4)
2. What happens at runtime when amounts in two currencies are added, compared or summed? Point at the
   exception and the test that proves it. (M6)
3. Where is the minor-unit exponent stored, and what breaks when an _e_=0 or _e_=3 currency is added
   tomorrow? (M4)
4. Name the declared rounding mode and the exact list of points where rounding is permitted. Who
   signed off on that list? (M5)
5. Show the allocation function and the property test asserting `sum(parts) == total` for negative
   totals. How is a tie broken, and who benefits? (M5, M18)
6. Is tax rounded per line or per invoice, in which jurisdiction, and do the printed lines sum to the
   printed total in every case? (M5, M16)
7. Take a conversion from last week: can you reproduce the amount from what was stored — rate,
   source, timestamp, direction, mode? Where were the spread and the residue posted? (M6, M14, M16)
8. What is the maximum age of an FX rate for a customer-facing conversion and for a period-end
   revaluation, and what does the system do when the rate is older? (M6)
9. Which day-count convention does each interest-bearing product use, and where does the schedule's
   terminal adjustment land so the balance closes at exactly zero? (M5)
10. List every tolerance in the codebase: bound, owner, the account the difference posts to, and the
    alert on its frequency. Is there one anywhere in the trial-balance check? (M2, M9, M16)
