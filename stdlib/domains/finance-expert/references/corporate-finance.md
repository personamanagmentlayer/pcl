# Corporate finance, FP&A and the numbers you publish

Everything here produces a number someone will act on: hire, cut, raise, price, buy, sell, sign. That
is a different failure mode from a broken payment. A wrong charge is found by the customer within a
day; a wrong ARR number is found by a diligence team eighteen months later, in a data room, while the
price is being negotiated. The defences are the ones the rest of this skill applies to money: derive
from the ledger (M19), label the basis (M20), isolate the judgements, show the sensitivity instead of
asserting the answer.

Two rules govern the file. **The books win** — a metric from the operational database that disagrees
with the general ledger is wrong until proven otherwise, not the other way round. **Judgement is
attributed** — a discount rate, a churn assumption, a terminal growth rate and a comp set are not
facts; they belong to a named person, and the honest deliverable shows how the answer moves when they
change.

## 1. The three statements and the ledger beneath them

| Statement              | Question                                    | Time shape         | Basis   |
| ---------------------- | ------------------------------------------- | ------------------ | ------- |
| Income statement (P&L) | Did we create economic value in the period? | Flow over a period | Accrual |
| Balance sheet          | What do we own and owe at an instant?       | Stock at a point   | Accrual |
| Cash flow statement    | Where did the cash actually go?             | Flow over a period | Cash    |

Only the cash flow statement is on a cash basis; it exists precisely because the other two are not. A
company can be profitable and insolvent, and the pairing is what makes that visible.

### 1.1 The links, written out

```
Net income (IS)        →  RE_t = RE_{t-1} + NetIncome_t − Dividends_t ± other equity adjustments
Net income (IS)        →  top line of the indirect cash flow statement
D&A (IS expense)       →  add-back in CFO; reduces PP&E (BS)
Stock-based comp (IS)  →  add-back in CFO; increases paid-in capital (BS)
Working-capital deltas →  CFO;   Capex → CFI, increases PP&E
Debt draws/repayments, equity issues → CFF, and the corresponding BS lines

Assets_t = Liabilities_t + Equity_t                          (balance check)
Cash_t − Cash_{t-1} = CFO_t + CFI_t + CFF_t + FX_t           (cash tie-out)
```

Both identities belong in the model as a visible checks row: a model without a live balance check is a
model whose author has not yet found the error. The **indirect method** starts from net income and
adds back non-cash items and working-capital deltas, and breaks when balance-sheet deltas mix
acquisitions, FX and reclassifications; the **direct method** classifies every actual bank movement,
and breaks when categorisation drifts period to period. Model the indirect for the statements, build
the direct for cash management (§10) — an indirect model answers "why did cash change", never "will
payroll clear".

### 1.2 Working-capital signs

`NWC = (AR + Inventory + Prepaid) − (AP + Accrued + Deferred revenue)`, so
`ΔCFO from working capital = −Δ(AR + Inv + Prepaid) + Δ(AP + Accrued + Deferred)`. An asset going up
consumes cash; a liability going up releases it. AR up is negative; deferred revenue up is positive.

### 1.3 The classic linkage errors

| Error                                               | Symptom                                          | Fix                                         |
| --------------------------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| Net income to equity but not to CFO (or vice versa) | Balance out by exactly net income                | One source, two destinations, both asserted |
| Dividends hit RE but not CFF                        | Balance out by the dividend                      | A single driver feeding both                |
| D&A added back but PP&E not reduced                 | Balance out by cumulative D&A; assets drift up   | PP&E roll-forward schedule, not a plug      |
| Working-capital sign flipped                        | Balance out by 2 × Δ                             | The sign rule above, unit-tested            |
| Capex in CFO instead of CFI                         | CFO strong, EBITDA-to-cash conversion impossible | An explicit CFI section                     |
| SBC expensed, not added back                        | Burn overstated, runway understated              | Add-back plus paid-in capital increase      |
| FX on foreign subs plugged into RE                  | Equity reconciles, CTA vanishes, auditors object | A separate translation adjustment line      |
| A hardcoded plug to force the balance               | The model is now decorative                      | Delete it and find the break                |

Debug procedure: compute the imbalance for every period, find the _first_ period it appears, then diff
each balance-sheet line's period change against its supposed driver. The imbalance almost always
equals one line item exactly, and that names the bug.

### 1.4 All of it derives from the ledger

Statements are aggregations of postings, not a parallel data model (M1, M19). Each P&L and
balance-sheet line is a **declared mapping** from account codes plus a filter on the _accounting_
period, not on `created_at` (M10); the mapping is version-controlled beside the chart of accounts
(`ledger.md`); a posting to an account that maps to no line is a close-blocking error, not a silent
omission; every metric published outside finance ties to a ledger figure with a stated bridge (§15.1);
and a cached statement or warehouse view declares its staleness bound and recomputation check (M17,
`architecture-ops.md`).

This prevents the failure every company hits at Series B: the dashboard says revenue is 4.8M, the
audited P&L says 4.3M, and nobody can produce the bridge. The gap is usually some mix of unbilled
bookings counted as revenue, gross-vs-net presentation, credits and refunds missing from the
operational table, deferred revenue timing, and internal accounts — each invisible until someone
builds the reconciliation, and each found by the buyer's accountants if you do not find it first.

## 2. Cash vs accrual, booked vs settled, gross vs net

Four axes. Two people saying "revenue" without agreeing on all four are having different conversations
that sound identical.

| Axis         | Option A                           | Option B                                       | Who prefers each                                                  |
| ------------ | ---------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| Basis        | **Cash** — when money moves        | **Accrual** — when the obligation is satisfied | Founders quote cash; auditors and IFRS 15/ASC 606 require accrual |
| Money state  | **Booked** — the entry exists      | **Settled** — funds are final and irrevocable  | Ops quotes booked; treasury needs settled                         |
| Presentation | **Gross** — full transaction value | **Net** — your share after pass-through        | Marketplaces quote gross; accounting may force net                |
| Certainty    | **Actual**                         | **Forecast / scenario**                        | Everyone quotes actual; half the time it is forecast              |

Marketplace transaction, 28 March: buyer pays 1,000.00 EUR; seller is owed 850.00; platform take
150.00; PSP fee 25.00 deducted at settlement; funds settle 2 April; the service is delivered across
April and May.

| Report                             | March                      | April                  | Why                                                   |
| ---------------------------------- | -------------------------- | ---------------------- | ----------------------------------------------------- |
| Cash, gross, settled               | 0.00                       | 975.00 in / 850.00 out | Nothing settled in March                              |
| Cash, net, settled                 | 0.00                       | 125.00                 | Take minus PSP fee, on settlement                     |
| Accrual, gross, booked (principal) | 1,000.00 rev / 850.00 cost | —                      | Only if principal, and only if delivery were in March |
| Accrual, net, booked (agent)       | 150.00 revenue             | —                      | Agent presentation; delivery timing still applies     |
| Accrual, net, delivered            | 0.00                       | 75.00 April, 75.00 May | Delivered over two months                             |

The same event legitimately produces 0.00, 125.00, 150.00 or 1,000.00 depending on the question. None
is a lie; an unlabelled "we did 1,000 in March" is.

**The labelling contract.** Every published figure carries five attributes (M20): **period**
(`2026-03`, calendar month, closed 2026-04-07), **currency** (`EUR` functional, monthly average rate,
source ECB), **basis** (accrual, net, delivered), **source** (GL `4000–4099`, trial balance
`tb_2026_03_v2`), **nature** (actual, or forecast v14 / scenario "base"). Compressed under a chart:
_"Net revenue, accrual basis, EUR, March 2026 (closed), GL 4000–4099, actual."_

| Where the axes bite   | The trap                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Annual prepay SaaS    | Cash-basis "revenue" front-loads a year; growth looks 12× real in a renewal month            |
| Card business         | Booked authorisations include those that never capture; settled excludes open disputes       |
| Marketplace           | Gross-vs-net changes revenue by an order of magnitude with no change to profit (§5)          |
| Usage billing         | Revenue accrues on usage, billing lags a month, collections lag again                        |
| Refund-heavy consumer | Gross bookings flat while net revenue falls, because the refund rate is rising               |
| FX-exposed            | The same accrual at closing vs average rate differs; state which (M6, `money-arithmetic.md`) |

## 3. Unit economics done properly

One question: **does one more unit make us better off, and after how long?** Everything else is
packaging. `Contribution per unit = price − variable cost`; `contribution ratio = that / price`.
Choose the unit deliberately — per order, per active customer-month, per seat, per API call, per GMV
euro — and state it. "Contribution margin 62%" without a unit is unusable.

### 3.1 What belongs in COGS

The COGS/opex line determines gross margin, which determines the multiple applied to you. Being
generous with yourself here is the most common cosmetic manipulation in SaaS reporting, and diligence
recomputes it.

| Cost                                | Treatment                      | Note                                                                |
| ----------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| Production hosting and bandwidth    | COGS                           | Dev and staging are R&D                                             |
| Per-transaction third-party cost    | COGS                           | Interchange, scheme fees, KYC checks, bureau pulls, model inference |
| Payment fees on your own revenue    | COGS                           | Never net into revenue (M16)                                        |
| Reactive support and onboarding     | COGS                           | Quota-carrying customer success goes to S&M                         |
| Professional services delivery      | COGS                           | With its own revenue line                                           |
| DevOps / SRE keeping production up  | COGS                           | Frequently and wrongly parked in R&D                                |
| Product engineering on new features | R&D                            | Amortisation of capitalised software is COGS, if you capitalise     |
| Fraud losses and chargebacks        | COGS for a payments business   | It is a cost of doing volume                                        |
| Expected credit losses              | COGS if lending is the product | See `risk-fraud-aml.md`                                             |
| Compliance / AML operations         | COGS if per-account, else G&A  | Judgement; declare it and keep it stable                            |

Write the rule down once, apply it every period, and if you change it, restate the comparatives
(§15.2).

### 3.2 CAC, fully loaded

```
CAC(channel c, period t) = acquisition spend attributable to c in t / new customers from c in t
Blended CAC              = total S&M expense in t / total new customers in t
```

| Decision                 | Narrow            | Fully loaded                                   | Recommendation                                                                                      |
| ------------------------ | ----------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Salaries and commissions | Media spend only  | + S&M salaries, commissions, tooling, agencies | Report **both**: fully loaded is the true one, narrow is the channel-optimisation one               |
| Attribution              | Last click        | Multi-touch / incrementality                   | Blended is the honest aggregate; channel CAC is directional                                         |
| Organic and referral     | Excluded, CAC = 0 | Allocated share of brand and content           | Never divide _all_ new customers into _paid-only_ spend — the most flattering error in the category |

If blended CAC is 3× the volume-weighted sum of channel CACs, the channel model is wrong.
`CAC payback (months) = CAC / (monthly ARPA × gross margin %)` — gross margin belongs in the
denominator, since payback on revenue rather than contribution understates the true figure by exactly
revenue/gross profit. State whether expansion is included; payback on _initial_ ARPA is the
conservative, comparable version.

### 3.3 LTV, and why `ARPU / churn` is usually wrong

The textbook `LTV = ARPU / monthly churn` assumes constant churn forever, homogeneous customers,
revenue equal to value, and a zero discount rate. All four fail.

| Assumption            | Why it fails                                   | Effect                                                                    |
| --------------------- | ---------------------------------------------- | ------------------------------------------------------------------------- |
| Constant hazard rate  | Churn falls with tenure (the weak leave first) | Always overstates when an early-tenure rate is applied to a young company |
| Homogeneous customers | Enterprise and SMB churn differ 5–10×          | A blended LTV describes no actual customer                                |
| Revenue = value       | Ignores COGS, support, payment fees            | Overstates by `1 / gross margin`, typically 25–40%                        |
| Zero discount rate    | A euro in year 6 is not a euro today           | Overstates by 15–35% for long-lived subscriptions                         |
| Infinite horizon      | Nobody has observed month 120                  | Fabricates the majority of the number                                     |

Compute instead — cohort-based, contribution-based, discounted, horizon-capped:

```
LTV(cohort k, horizon H) = Σ_{t=0..H}  S_k(t) · ARPA_k(t) · m_k(t) / (1 + r)^t
```

`S_k(t)` observed survival at age t, `ARPA_k(t)` observed revenue per surviving account, `m_k(t)`
contribution margin, `r` the monthly discount rate, `H` a horizon you have actually observed (24 or 36
months for most businesses). `LTV/CAC = 3.0 at H = 24 months, r = 1%/month, contribution basis` is a
statement; `LTV/CAC = 3` is a slogan. Extrapolation beyond the observed window is a forecast (M20):
disclose the fitted curve and show the observed-horizon answer beside it.

## 4. Recurring-revenue metrics

| Metric        | Definition                                                                | Trap                                                                   |
| ------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| MRR           | Normalised monthly recurring value of active contracts at a point in time | Not cash, not revenue; excludes one-offs, taxes, non-recurring overage |
| ARR           | MRR × 12, or ACV of annual contracts                                      | Meaningful only where the contract genuinely recurs                    |
| ACV / TCV     | Annualised / total value of one contract                                  | Differ whenever there is a ramp; TCV is the least comparable           |
| GRR           | Retained MRR from a starting cohort, excluding expansion                  | Capped at 100%; the harder number                                      |
| NRR           | Same cohort, including expansion                                          | Denominator is the _starting_ base, never the ending one               |
| Logo churn    | Customers lost / customers at start                                       | Says nothing about revenue if churn is concentrated in small accounts  |
| Revenue churn | MRR lost / MRR at start                                                   | Report gross and net separately                                        |

```
GRR_t = (Starting MRR − contraction − churn) / Starting MRR                (≤ 100%)
NRR_t = (Starting MRR − contraction − churn + expansion) / Starting MRR    (may exceed 100%)
```

Both are computed on the cohort present at the **start** of the period, tracked forward; customers
acquired during the period appear in neither numerator nor denominator. The most common inflation is
new logos in the NRR numerator; the second most common is a trailing-12-month base quoted as a monthly
rate.

### 4.1 The MRR movement bridge

```
Opening MRR + New + Expansion + Reactivation − Contraction − Churn = Closing MRR
```

Every unit of change lands in exactly one bucket and the bridge closes exactly — that assertion is the
test (M18). The classification rules, written down: never billed before → **new**; at 0 last month, >0
now, active earlier → **reactivation**; up from >0 → **expansion** (delta only); down but >0 →
**contraction** (delta only); to exactly 0 → **churn** (full prior amount); a price rise on an
existing plan → expansion; an FX movement on a foreign-currency contract → neither (hold MRR in one
currency or add an explicit FX line, M6); an account merge → neither, handled outside and disclosed.

```python
import pandas as pd

def mrr_bridge(tidy: pd.DataFrame) -> pd.DataFrame:
    """tidy: [customer_id, period (Period[M]), mrr_minor (int, ONE currency)].
    One row per customer per period; absent or 0 means inactive. Integers only (M4)."""
    w = (tidy.pivot_table(index="customer_id", columns="period", values="mrr_minor",
                          aggfunc="sum", fill_value=0).sort_index(axis=1))
    # active in any STRICTLY EARLIER period -> distinguishes new from reactivation
    seen_before = ((w > 0).astype(int).cummax(axis=1)
                   .shift(axis=1, fill_value=0).astype(bool))
    periods, rows = list(w.columns), []
    for i in range(1, len(periods)):
        p0, p1 = periods[i - 1], periods[i]
        prev, cur, seen = w[p0], w[p1], seen_before[p0]
        new,   react    = (prev == 0) & (cur > 0) & ~seen, (prev == 0) & (cur > 0) & seen
        churn, expand   = (prev > 0) & (cur == 0),         (prev > 0) & (cur > prev)
        contract        = (prev > 0) & (cur < prev) & (cur > 0)
        rows.append({"period": p1, "opening": int(prev.sum()),
                     "new": int(cur[new].sum()), "reactivation": int(cur[react].sum()),
                     "expansion": int((cur - prev)[expand].sum()),
                     "contraction": int((cur - prev)[contract].sum()),   # negative
                     "churn": int(-prev[churn].sum()),                   # negative
                     "closing": int(cur.sum())})
    b = pd.DataFrame(rows)
    b["residual"] = (b.opening + b.new + b.reactivation + b.expansion
                     + b.contraction + b.churn - b.closing)
    assert (b.residual == 0).all(), b.loc[b.residual != 0]   # M18: the bridge closes exactly
    b["grr"] = (b.opening + b.contraction + b.churn) / b.opening
    b["nrr"] = (b.opening + b.contraction + b.churn + b.expansion) / b.opening
    return b
```

The assertion is what the code buys: a mid-series definition change, a duplicated customer id or a
second currency in the frame breaks the residual immediately rather than three board meetings later.

### 4.2 Annual prepay, usage revenue, and the four columns

A 60,000 annual prepay signed in January, service from February, paid in February: MRR is 5,000 from
January; recognised revenue is 0 in January then 5,000 a month; cash is 0 then 60,000 in February;
deferred revenue runs 60,000, 55,000, 50,000. A company shifting from monthly to annual prepay
therefore shows a cash step change and no revenue change — reporting that step as "growth" is behind a
large share of failed diligence processes. Pair any collections chart with billings and deferred
revenue.

For **usage-based** revenue there is no contracted monthly amount to normalise, so "ARR" is a fiction.
In decreasing order of honesty: committed ARR (contractual minimums — a real obligation, always
legitimate); trailing run-rate (last 3 months × 4, window stated); consumption ARR (current month
annualised — only with seasonality disclosed, never in a spike month). Publish committed and
uncommitted separately and state concentration: "top 5 customers = 41% of consumption revenue" beats
any single ARR figure.

A 24-month contract, TCV 120,000, signed 15 January, annual prepay 60,000 invoiced 15 January, paid
20 February, service from 1 February:

| Concept     | Measures             | This contract            | Timing          |
| ----------- | -------------------- | ------------------------ | --------------- |
| Bookings    | Contract signed      | 120,000 TCV / 60,000 ACV | January         |
| Billings    | Invoice issued       | 60,000                   | January         |
| Revenue     | Obligation satisfied | 5,000/month              | February onward |
| Collections | Cash received        | 60,000                   | February        |

Ledger view (M2, M19): invoice → `Dr AR 60,000 / Cr Deferred revenue 60,000`; monthly → `Dr Deferred
5,000 / Cr Revenue 5,000`; payment → `Dr Cash 60,000 / Cr AR 60,000`. Bookings appear nowhere in the
ledger, which is why a bookings number alone is unauditable — publish it only beside billings and
revenue. Useful check: `Billings_t ≈ Revenue_t + Δ Deferred revenue_t`.

## 5. Marketplace and payments metrics

```
GMV / TPV    = gross value transacted            Take rate = Net revenue / GMV
Net revenue  = the platform's own revenue (take, fees, subscriptions, float, FX margin)
Contribution = Net revenue − payment costs − fraud losses − variable support
```

| Metric                | What it flatters                                        | Pair it with                                   |
| --------------------- | ------------------------------------------------------- | ---------------------------------------------- |
| GMV / TPV             | Volume growth independent of monetisation               | Net revenue and take rate, same period         |
| Take rate             | Rises mechanically when mix shifts to high-fee segments | Segment mix, so pricing and mix are separable  |
| "Revenue" gross       | Multiplies the headline 5–20×                           | The gross-to-net bridge, always                |
| Payment volume growth | Includes returns and retries                            | Net settled volume; refunds as a separate line |
| Active merchants      | Hides concentration                                     | Volume share of the top 10, plus a cohort view |

Whether you may present gross depends on whether you are **principal** or **agent** under IFRS 15 /
ASC 606 — who controls the good or service before transfer, who has pricing discretion, who bears
inventory and credit risk, who is primarily responsible for fulfilment. That is decided by the finance
owner and the auditor, not the growth team, and it is frequently decided against gross. See
`reconciliation-close.md` for the recognition mechanics and `payments.md` for settlement timing. Build
the ledger so principal and agent components post separately (M16) and presentation becomes a
reporting decision rather than a data migration.

## 6. Cohort analysis

The only view that separates "we are growing" from "we are replacing".

```python
import numpy as np, pandas as pd

def cohort_matrix(tidy: pd.DataFrame, mode: str = "revenue",
                  mask_incomplete: bool = True) -> pd.DataFrame:
    """tidy: [customer_id, period (Period[M]), mrr_minor]. Cohort = first period with MRR > 0.
    mode: "revenue" (includes expansion) or "logo" (count). Indexed to age 0 = 1.00."""
    a = tidy[tidy.mrr_minor > 0].copy()
    a = a.join(a.groupby("customer_id")["period"].min().rename("cohort"), on="customer_id")
    months = lambda p: p.dt.year * 12 + p.dt.month
    a["age"] = months(a.period) - months(a.cohort)
    value, how = ("mrr_minor", "sum") if mode == "revenue" else ("customer_id", "nunique")
    mat = a.pivot_table(index="cohort", columns="age", values=value,
                        aggfunc=how, fill_value=0).sort_index()
    if mask_incomplete:                       # the triangle: never show unobserved cells
        last = months(pd.Series(a.period.max())).iloc[0]
        for c in mat.index:
            mat.loc[c, mat.columns > last - (c.year * 12 + c.month)] = np.nan
    return mat.div(mat[0], axis=0)
```

Two matrices, not one. **Logo retention** (surviving customers) reads "do people stay?"; **revenue
retention** (surviving MRR including expansion) reads "do the ones who stay grow?". 70% logo with 115%
revenue retention is a good enterprise business; 95% logo with 85% revenue is a business being
downsold, and the logo number alone hides it.

| Rule for reading one                                                    | Why                                                                                                              |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| The right edge is one cohort deep                                       | Month-18 retention is known only for cohorts 18 months old — the smallest and oldest. Never average the diagonal |
| Never compare an incomplete cohort's cumulative value to a complete one | The recent cohort always looks worse; it has had less time                                                       |
| Split by acquisition channel                                            | Paid-social and enterprise-outbound cohorts share nothing; a blended curve describes neither                     |
| Freeze the definition                                                   | Changing "active" from logged-in to paid mid-series is invisible in the picture and fatal to the reading         |
| Watch the cohort-size column                                            | 90% retention on 11 customers is noise                                                                           |
| Add the cumulative-contribution view                                    | Retention percentages never say whether the cohort repaid its CAC (§3.3)                                         |

The honest artifact is three panels: cohort size, the retention matrix with the unobserved triangle
blank, and cumulative contribution per cohort against a CAC line.

## 7. Efficiency and health composites

| Metric        | Formula                                            | What it hides                                                                                                                   |
| ------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Rule of 40    | `YoY growth % + FCF margin %` (state which margin) | A 60/−20 and a 20/+20 are not the same company. Growth is a rate, margin a level — adding them is a convention, not mathematics |
| Burn multiple | `Net cash burn / Net new ARR`                      | A quarter with a large prepay looks efficient; one with a churn event looks fatal. Use trailing twelve months                   |
| Magic number  | `4 × (Rev_q − Rev_{q−1}) / S&M_{q−1}`              | Sales spend converts over 2–4 quarters; it also treats expansion and new the same                                               |
| CAC payback   | `CAC / (ARPA × gross margin)`                      | Whether expansion is in, and whether CAC is fully loaded (§3.2)                                                                 |
| Gross margin  | `(Revenue − COGS) / Revenue`                       | The COGS classification decision (§3.1) — the most manipulable input in the set                                                 |
| LTV / CAC     | §3.3                                               | Horizon, discount rate, cohort heterogeneity, margin vs revenue                                                                 |
| Net burn      | Operating + investing cash flow                    | One-off working-capital swings; a delayed payroll run makes a month look great                                                  |

None of these is a target. Each is a diagnostic that raises a question, and a composite that becomes a
target stops measuring anything — the classification decisions inside it start moving to meet it.

## 8. Building an FP&A model

```
Drivers  →  Volume  →  Revenue  →  Direct cost  →  Opex  →  P&L  →  Balance sheet  →  Cash
```

Every number is either an **assumption** (an input someone owns) or a **calculation** (a formula over
assumptions and other calculations). There is no third category: a number typed into a calculation
cell will not move under scenario, nobody will find it, and it will be wrong within two months.
Assumptions carry a source and a date; actuals are imported from the ledger (M19), never retyped;
outputs are read-only; checks are visible on every sheet.

| Rule                     | Detail                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| One input, one place     | An assumption appears once and is referenced everywhere. Duplicate a growth rate and you have two models |
| No hardcodes in formulas | `=B12*1.05` is a hidden assumption; put the 1.05 in the assumptions block                                |
| Colour convention        | Blue = input, black = formula, green = cross-sheet link, red = external. It is machine-checkable         |
| Consistent grid          | Every period is a column; the same column is the same period on every sheet                              |
| One formula per row      | Identical across all periods. A row with three formulas is a row with two bugs                           |
| Scenario switch          | One cell selects the scenario; assumptions read from a scenario table. Never keep three copies           |
| Checks row per sheet     | Balance, cash tie-out, sum-of-parts vs total, non-negativity — aggregated to one "model OK" cell         |
| Version and change log   | `model_v14_2026-09-03` plus a log: date, who, what changed, which output moved and by how much           |
| Units labelled per block | Thousands vs units vs minor units; one currency per block (M4, M6)                                       |

**The interest circularity.** Interest depends on average debt, average debt on the cash need, the cash
need on interest. Iterative calculation converges silently, hides divergence and breaks on copy —
avoid it. Interest on the **opening** balance slightly understates, is entirely transparent and is
acyclic: make it the default. A two-pass version (opening, then one manual re-run on the resulting
average) is accurate enough and still acyclic for financing-heavy models. State the choice on the
assumptions sheet; the opening-vs-average difference is almost never material to the decision, whereas
deterministic recalculation always is.

**Model audit.** (1) Does the balance sheet balance in every period, forecast periods included? (2)
Does balance-sheet cash equal the cash flow statement's ending cash? (3) Is every blue cell an input
and every input blue? (4) Count hardcoded numbers inside formulas — each is a finding. (5) Do historic
periods tie to the trial balance line by line (M19)? (6) Flip the scenario switch: does every output
move and every check hold? (7) Set the growth driver to zero — does revenue fall to the contractual
floor, or to zero or `#DIV/0!`? (8) Set every driver to an extreme — graceful or silent? (9) Any
formula referencing another workbook or a cell outside the model? (10) Any period column off by one,
and does headcount cost include employer taxes, benefits and ramp? (11) Is there a plug — search for
any cell whose formula subtracts two totals?

## 9. Budget vs actual and variance analysis

|           | Budget qty | Budget price | Budget rev | Actual qty | Actual price | Actual rev |
| --------- | ---------- | ------------ | ---------- | ---------- | ------------ | ---------- |
| A         | 1,000      | 10.00        | 10,000     | 1,400      | 9.50         | 13,300     |
| B         | 500        | 30.00        | 15,000     | 400        | 31.00        | 12,400     |
| **Total** | **1,500**  | 16.667 avg   | **25,000** | **1,800**  | 14.278 avg   | **25,700** |

Total variance **+700 favourable**.

```
Price  = Σ_i (P_act,i − P_bud,i) × Q_act,i
Volume = (Q_act,total − Q_bud,total) × budget average price
Mix    = Σ_i (Q_act,i − Q_act,total × BudgetMix_i) × P_bud,i
```

| Component | Working                                                              | Value                  |
| --------- | -------------------------------------------------------------------- | ---------------------- |
| Price     | A: (9.50 − 10.00) × 1,400 = −700; B: (31.00 − 30.00) × 400 = +400    | **−300**               |
| Volume    | (1,800 − 1,500) × 16.667                                             | **+5,000**             |
| Mix       | A: (1,400 − 1,200) × 10.00 = +2,000; B: (400 − 600) × 30.00 = −6,000 | **−4,000**             |
| **Total** | −300 + 5,000 − 4,000                                                 | **+700**, ties exactly |

The decomposition must sum to the total variance; that is the check (M18). The story: volume was
excellent, growth came entirely from the cheap product, and the expensive product was discounted into
a decline. "Revenue beat by 700" is true and worthless. Run the same decomposition on unit
contribution rather than price — a favourable revenue mix variance frequently turns unfavourable at
the margin line.

**Budget vs rolling forecast.** The annual budget runs to fiscal year-end, is set once, exists for
accountability and compensation, and is obsolete by month 3 and defended by month 6. The rolling
forecast keeps a constant 12–18-month horizon, is refreshed monthly, exists for decision support and
cash planning, and drifts into "whatever we now expect", removing accountability. Run both as separate
artifacts; quietly overwriting the budget with the forecast destroys the variance analysis and with it
the ability to learn.

**Forecast accuracy.** `MAPE(h) = mean |Actual − Forecast_h| / |Actual|` and
`Bias(h) = mean (Forecast_h − Actual) / Actual`. Bias matters more than error: 12% MAPE with +11% bias
is systematic optimism and can be corrected; 12% MAPE with 0% bias is good work. Publish the accuracy
of the last four forecasts alongside the new one — it is the only thing that makes a forecast
credible.

Explain each variance in one sentence with a driver, a number and a direction, never an adjective. Set
a materiality threshold once (say the greater of 50k and 5% of the line) and explain everything above
it, nothing below.

| Bad                                           | Good                                                                                                                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Revenue was softer than expected"            | "Revenue was 4% below budget: enterprise new logos were 6 vs 9 planned (−280k ACV) after pipeline conversion fell from 22% to 15% following the 1 May price change." |
| "Costs were higher due to increased activity" | "Hosting was 61k over budget: inference volume grew 38% against a 15% plan at unchanged unit cost of 0.42 per 1k requests."                                          |
| "Timing"                                      | "Timing: the 120k invoice to X was issued 2 April rather than 28 March; revenue unaffected, cash shifts one month."                                                  |

## 10. Cash and working capital

The 13-week cash flow is built bottom-up from **bank-level receipts and payments**, not accrual
revenue, because its question is "does the bank account go below zero, and when" and accrual revenue
cannot answer it.

| Row group                      | Source                                        | Note                                             |
| ------------------------------ | --------------------------------------------- | ------------------------------------------------ |
| Opening bank balance           | Bank statement, per account, per currency     | Never an unreconciled ledger balance (M9)        |
| Customer collections           | AR ageing × expected collection profile       | Large customers modelled individually            |
| PSP settlements                | Settlement calendar, net of fees and reserves | Hold and reserve mechanics in `payments.md`      |
| Financing, grants, tax refunds | Confirmed items only                          | Anything unconfirmed is a scenario line          |
| Payroll                        | Payroll calendar by date, gross of taxes      | Largest and least flexible                       |
| Suppliers                      | AP ageing × actual payment behaviour          | Model what you do, not what the terms say        |
| Tax                            | VAT/GST, payroll and corporate tax calendars  | Bunched; the classic surprise                    |
| Debt service                   | Amortisation schedule                         | Include covenant test dates                      |
| Closing balance                | Derived                                       | Against the minimum-cash line and covenant floor |

Weekly buckets by value date, not booking date; one currency per block plus an explicit FX line (M6);
every large item named and owned; reforecast weekly and record last week's error. Feed it from
reconciled bank data (`banking-open-finance.md`), and track receipts-forecast accuracy as in §9 — it
degrades fastest and matters most.

```
DSO = AR / Revenue × days     DPO = AP / COGS × days     DIO = Inventory / COGS × days
Cash conversion cycle = DSO + DIO − DPO

Net monthly burn = cash out − cash in (operating + investing, excluding financing)
Runway (months)  = cash available / net monthly burn
Zero-cash date   = the week the model crosses the minimum-cash line
```

Numerator and denominator must share a basis — use revenue including VAT if AR includes VAT, which
most published DSO figures do not. A negative cash conversion cycle is a funding source and should be
described as one: growth generates cash, and a growth stall consumes it.

Report the **zero-cash date**, not months of runway: a date is checkable, "18 months" goes stale
silently. Give two figures — gross runway on current burn, and runway to _minimum operating cash_, not
to zero, because you cannot run a company at zero.

| Assumption that moves it        | Typical sensitivity                            | Whose judgement          |
| ------------------------------- | ---------------------------------------------- | ------------------------ |
| Hiring plan timing              | 1–3 months of runway per quarter of delay      | CEO and functional leads |
| New-business assumption         | Largest single swing, often least evidenced    | Sales leadership         |
| Collection timing / DSO         | 2–6 weeks of cash                              | Finance / collections    |
| Churn assumption                | Compounds; small in month 1, large by month 12 | Customer success         |
| One-offs (tax, legal, deposits) | Lumpy; frequently omitted entirely             | Finance                  |
| FX on a foreign cost base       | Underappreciated until it isn't                | Finance                  |

Publish runway as a scenario band and name whose assumption each scenario encodes; a single runway
number implies a certainty that does not exist. Minimum cash, covenant tests (leverage, interest
cover, minimum liquidity, ARR covenants on venture debt) and any regulatory capital or safeguarding
requirement are **hard lines in the model** — model the test date, the _contractual_ tested definition
(usually not your management EBITDA), and the headroom. A breach forecast three months out is a
manageable conversation; one found in the week of the test is not.

## 11. Investment decisions

```
NPV = Σ_{t=0..n}  CF_t / (1 + r)^t
```

`CF_t` is **incremental after-tax free cash flow**: with the project minus without it. Include
opportunity costs and incremental working capital; exclude sunk costs and allocated overhead that does
not change. Accept if NPV > 0 at the appropriate rate — and since that rate is a judgement (§12.1),
present NPV across a range of it.

| IRR failure mode        | Example                                               | Consequence                                         |
| ----------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| Non-conventional signs  | `[−100, +230, −132]` has roots at **10%** and **20%** | Two valid IRRs; neither is "the" return             |
| No real root            | Flows that never cross zero                           | The solver returns garbage or diverges              |
| Reinvestment assumption | IRR assumes interim flows are reinvested at the IRR   | A 60% IRR assumes you can redeploy at 60%           |
| Scale blindness         | 80% on 100k beats 25% on 10M by IRR, and loses by NPV | Ranking mutually exclusive projects by IRR is wrong |

`MIRR = ( FV(positive flows at the reinvestment rate) / −PV(negative flows at the finance rate) )^(1/n) − 1`.
For `[−100, 60, 60, 60]` at 8% finance and 8% reinvestment: FV of positives 194.78, PV of negatives
100, MIRR = 1.9478^(1/3) − 1 = **24.9%** against an IRR of **36.3%**. The gap is entirely the
reinvestment assumption, and 24.9% is the number that survives contact with where the cash goes.
Payback (`first t where cumulative CF ≥ 0`) and discounted payback ignore everything after the payback
point; both are liquidity screens, never value measures.

```python
def npv(rate: float, cfs: list[float]) -> float:
    """cfs[0] is at t=0 and is not discounted."""
    return sum(cf / (1.0 + rate) ** t for t, cf in enumerate(cfs))

def sign_changes(cfs: list[float]) -> int:
    s = [c for c in cfs if c != 0]
    return sum(1 for a, b in zip(s, s[1:]) if (a > 0) != (b > 0))

def irr(cfs, lo=-0.9999, hi=10.0, tol=1e-10, max_iter=300) -> float:
    """Bisection, no scipy. Newton is faster and fails silently on exactly the shapes that
    matter (flat NPV curves, multiple roots). Refusing to answer is the feature."""
    if sign_changes(cfs) > 1:
        raise ValueError(f"{sign_changes(cfs)} sign changes: IRR may have multiple roots; "
                         f"use MIRR, or NPV at a stated discount rate")
    f_lo, f_hi = npv(lo, cfs), npv(hi, cfs)
    if f_lo * f_hi > 0: raise ValueError("no sign change over the bracket; no IRR here")
    for _ in range(max_iter):
        mid = (lo + hi) / 2.0
        f_mid = npv(mid, cfs)
        if abs(f_mid) < tol or (hi - lo) < tol: return mid
        if f_lo * f_mid < 0: hi, f_hi = mid, f_mid
        else:                lo, f_lo = mid, f_mid
    return (lo + hi) / 2.0

def mirr(cfs, finance_rate: float, reinvest_rate: float) -> float:
    n = len(cfs) - 1
    pv_neg = sum(cf / (1 + finance_rate) ** t for t, cf in enumerate(cfs) if cf < 0)
    fv_pos = sum(cf * (1 + reinvest_rate) ** (n - t) for t, cf in enumerate(cfs) if cf > 0)
    if pv_neg == 0: raise ValueError("no negative cash flows: MIRR undefined")
    return (fv_pos / -pv_neg) ** (1.0 / n) - 1.0

assert abs(npv(0.10, [-100, 230, -132])) < 1e-9 and abs(npv(0.20, [-100, 230, -132])) < 1e-9
```

Float is acceptable here and only here: these are estimates under a discount rate that is itself a
judgement, not recorded amounts. The moment a model output becomes a booked figure — an accrual, an
impairment, a payout — it converts to `Decimal` or minor units under the declared rounding policy (M4,
M5, `money-arithmetic.md`) and enters the books as a journal entry, never as a written balance.

For **mutually exclusive projects**, rank by NPV at the hurdle rate. Under capital rationing rank by
profitability index `PV(inflows) / initial investment` and take in PI order until capital runs out.
Never rank by IRR or payback, and never compare different-lived projects without an
equivalent-annual-annuity or an explicit replacement assumption.

## 12. Valuation

|               | FCFF (to the firm)                          | FCFE (to equity)                                  |
| ------------- | ------------------------------------------- | ------------------------------------------------- |
| Cash flow     | `EBIT × (1 − t) + D&A − Capex − ΔNWC`       | `Net income + D&A − Capex − ΔNWC + net borrowing` |
| Discount rate | WACC                                        | Cost of equity                                    |
| Produces      | Enterprise value                            | Equity value directly                             |
| Use when      | Capital structure changes over the forecast | Financials, or a stable structure                 |

Do not mix them: discounting FCFF at the cost of equity is the most common DCF error and it overstates
value systematically. Steps: forecast explicit-period FCF (typically 5 years — long enough to reach a
steady state, short enough to defend); compute the discount rate; compute terminal value; discount;
bridge enterprise value to equity value; sensitise.

### 12.1 WACC, and where each input actually comes from

```
WACC = (E/(D+E)) × Re + (D/(D+E)) × Rd × (1 − t)        Re = Rf + β × ERP (+ size, country premia)
```

| Input | Source                                                                              | Judgement content                                                         |
| ----- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `Rf`  | Government bond yield in the cash-flow currency, roughly duration-matched           | Low, but currency matching is not optional                                |
| `β`   | Regression against an index, or unlevered peer betas re-levered to target structure | High: peer set, window, frequency, re-levering formula                    |
| `ERP` | Published estimates or historical premia                                            | High: 4%–7% is all defensible, and the choice moves the answer materially |
| `Rd`  | Actual marginal borrowing cost, or a synthetic rating spread over `Rf`              | Medium: marginal, not the historical coupon                               |
| `t`   | Marginal tax rate, not effective                                                    | Low                                                                       |
| `D/E` | Target capital structure at **market** values                                       | Medium: book values are the common shortcut and the wrong input           |

Every one is someone's judgement. Name whose, then show §12.2 rather than defending a point estimate.

### 12.2 Terminal value and the sensitivity grid

```
Gordon growth: TV_n = FCF_n × (1 + g) / (WACC − g)      Exit multiple: TV_n = Metric_n × Multiple
Mid-year convention: discount factor = (1 + WACC)^-(t − 0.5)
```

`g` must not exceed long-run nominal GDP growth of the relevant economy, must match the cash flows in
currency and in nominal/real terms, and must be below WACC or the formula explodes. Cross-check the
two methods: the exit multiple implied by a Gordon TV, and the `g` implied by an exit-multiple TV —
wild disagreement means one assumption is outside its defensible range.

Explicit FCFF 60, 75, 92, 106, 120 (years 1–5). Enterprise value by WACC × terminal growth:

| EV           | g = 2.0% | g = 2.5%  | g = 3.0% |
| ------------ | -------- | --------- | -------- |
| **WACC 9%**  | 1,479    | 1,572     | 1,681    |
| **WACC 11%** | 1,130    | **1,182** | 1,240    |
| **WACC 13%** | 910      | 942       | 977      |

At the base case (11%, 2.5%) the explicit period contributes 323 and terminal value 859 — **73% of the
value is terminal**. Across a defensible input range the answer spans 910 to 1,681, an 85% spread from
two numbers nobody can observe. Above roughly 80%, the DCF is a terminal-value calculation with a
five-year decoration attached; say so. That grid, with the terminal share stated beneath it, is the
honest deliverable — a single-point valuation here is not more precise, only less informative.

```python
def dcf_grid(fcf, waccs, growths, mid_year=False):
    out, n = {}, len(fcf)
    for w in waccs:
        for g in growths:
            if w <= g: out[(w, g)] = float("nan"); continue
            df = [(1 + w) ** -(t + (0.5 if mid_year else 1.0)) for t in range(n)]
            out[(w, g)] = (sum(c * d for c, d in zip(fcf, df))
                           + fcf[-1] * (1 + g) / (w - g) * df[-1])
    return out
```

### 12.3 When a DCF is theatre, and what people use instead

| Situation                  | Why it fails                                         | Used instead                                                                      |
| -------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| Pre-revenue / early stage  | Every input is invented; TV is ~100% of value        | Comparable transactions, stage norms, the round's own negotiated terms            |
| Hyper-growth, negative FCF | The answer lives entirely in the terminal assumption | Forward revenue multiples, growth-adjusted multiples, value of the installed base |
| Structurally negative FCF  | Gordon growth undefined or absurd                    | An explicit path to a steady-state margin, then value that state                  |
| Cyclical at peak or trough | The explicit period anchors on an abnormal year      | Mid-cycle normalised earnings × a through-cycle multiple                          |
| Financial institutions     | FCFF is not meaningful; capital is the constraint    | FCFE, dividend discount, or P/TBV against ROTE                                    |

Build it anyway, because it forces you to state what must be true — year-5 revenue, steady-state
margin, capital intensity — and those statements are debatable in a way a multiple is not.

### 12.4 Multiples

```
Enterprise value = Equity value + Debt + Preferred + Minority interests − Cash & equivalents
```

Direction is where people go wrong: equity → enterprise **adds** net debt, enterprise → equity
**subtracts** it. Use market values where they exist (`markets-trading.md` for marking traded
holdings), adjust for operating leases under the current standard, and exclude restricted cash that is
not available.

| Multiple          | Use when                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| EV / Revenue      | Unprofitable, growth-stage; always pair with gross margin                                                 |
| EV / Gross profit | The best single multiple for mixed-margin businesses — marketplaces, payments, anything with pass-through |
| EV / EBITDA       | Profitable and capital-light; state the EBITDA definition and every adjustment                            |
| P / E             | Mature, stable capital structure                                                                          |
| EV / ARR          | SaaS; state whether current or NTM, which is almost never said                                            |

Build a comp set on business model (not industry keyword), growth band, margin profile, scale,
geography and accounting regime. Use the median, disclose the full set including the members that
hurt, and **state the date** — multiples move 40% in a quarter and an undated comp table is
decorative. Calendarise differing fiscal years, and adjust for accounting differences material to the
metric (capitalised development costs, gross-vs-net presentation per §5).

## 13. Cap table and dilution

```
Post-money = Pre-money + amount raised          Investor % = amount raised / post-money
Price per share = Pre-money / pre-money fully diluted shares
```

"Fully diluted" must be defined in the term sheet: it normally includes all common, preferred
as-converted, issued options, _unissued_ pool options, and often warrants and unconverted SAFEs. Every
share in the pre-money denominator lowers the price per share and dilutes existing holders. That
definition is where value is quietly transferred.

### 13.1 The option-pool shuffle

Founders hold 8,000,000 shares. The offer is "8M pre, 2M in, 10M post — 20%", with a 10% post-money
option pool created **pre-money**.

|                                 | Pool created pre-money            | Pool created post-money           |
| ------------------------------- | --------------------------------- | --------------------------------- |
| Founders                        | 8,000,000 = **70.0%**             | 8,000,000 = **72.0%**             |
| Option pool                     | 1,142,857 = 10.0%                 | 1,111,111 = 10.0%                 |
| Investor                        | 2,285,714 = 20.0%                 | 2,000,000 = **18.0%**             |
| Price per share                 | 2,000,000 / 2,285,714 = **0.875** | 2,000,000 / 2,000,000 = **1.000** |
| Effective pre-money to founders | 8,000,000 × 0.875 = **7,000,000** | 8,000,000                         |

The advertised 8M pre-money is a 7M pre-money to the founders; the pool came entirely out of their
side. This is standard market practice, not sharp practice, but it is a negotiation over two points of
ownership disguised as an administrative detail. Negotiate the pool **size** — built bottom-up from
the next 18 months of hiring — not the principle.

### 13.2 SAFEs and convertible notes

| Term                       | Effect                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| Valuation cap              | Maximum valuation at conversion; sets a floor under the investor's ownership                      |
| Discount                   | 10–25% off the round price; the investor takes the better of cap and discount                     |
| MFN                        | The instrument adopts the best terms given to any later holder; matters for serial notes          |
| Pre- vs post-money cap     | Whether the cap is measured before or after converting instruments — **the critical distinction** |
| Interest, maturity (notes) | Accrues and converts with principal; a note maturing before a round is a negotiation              |

Pre-round fully diluted 10,000,000 shares. A 1,000,000 SAFE with a 20% discount and an 8,000,000
**pre-money** cap. Series A raises 4,000,000 at 16,000,000 pre-money, so the round price is 1.60. The
discount path gives `1.60 × 0.80 = 1.28` → 781,250 shares; the cap path gives
`8,000,000 / 10,000,000 = 0.80` → **1,250,000 shares**. The cap wins.

Note the circularity in the pre-money form: the SAFE's shares enter the fully diluted count, which
changes the price for the new money if pre-money is fixed, and different lawyers resolve it
differently. A **post-money** SAFE fixes the investor's percentage of post-financing capitalisation —
1,000,000 on an 8,000,000 post cap is exactly 12.5% — so the dilution falls on founders and prior
holders instead of being shared with the new round. Know which form you signed before modelling.

### 13.3 Liquidation preferences and the exit waterfall

Founders 8,000,000 common; pool 1,500,000; Seed 2,000,000 shares for 2,000,000 invested, 1×
non-participating; Series A 3,000,000 shares for 12,000,000 invested, 1× non-participating, senior to
Seed. Total 14,500,000 shares — founders are 55.2% of the table.

| Exit        | Series A          | Seed                 | Founders   | Pool       | Note                                     |
| ----------- | ----------------- | -------------------- | ---------- | ---------- | ---------------------------------------- |
| 14,000,000  | 12,000,000 (pref) | 2,000,000 (pref)     | **0**      | **0**      | Preferences exhaust the proceeds         |
| 30,000,000  | 12,000,000 (pref) | 3,130,435 (converts) | 12,521,739 | 2,347,826  | A takes pref; Seed converts (3.13M > 2M) |
| 100,000,000 | 20,689,655        | 13,793,103           | 55,172,414 | 10,344,828 | All convert; pure pro rata               |

The 14,000,000 row is the point: the founders own 55% of the company and receive nothing, because
14,000,000 of preference sits ahead of them. **The founder's percentage is the least interesting
number in the cap table.** The interesting numbers are the size of the preference stack, its
seniority, and whether it participates. Make Series A _participating_ and hold everything else equal:
at a 30,000,000 exit it takes its 12,000,000 preference **and** 20.7% of the 18,000,000 residual, for
15,724,138, and founders fall from 12,521,739 to 9,931,034. One word in the term sheet moved 2.6M.

```python
from dataclasses import dataclass
from money import allocate     # largest-remainder split (money-arithmetic.md §5.1), on minor units

class WaterfallImbalance(ValueError): pass

@dataclass
class Preferred:
    name: str; shares: int; invested: int      # invested in minor units
    multiple: float = 1.0; participating: bool = False; seniority: int = 0  # higher paid first

def waterfall(exit_value: int, common_shares: int, stack: list[Preferred]) -> dict:
    """Greedy conversion: every non-participating class starts on its preference, then any
    class whose as-converted proceeds beat its preference converts; repeat to a fixed point.
    Participation caps and partial-conversion pari passu tiers need the term sheet read
    literally — use this to CHECK the lawyer's model, never to replace it."""
    converted, all_shares = {p.name: False for p in stack}, sum(q.shares for q in stack)
    for _ in range(len(stack) + 1):
        remaining, pref_paid = exit_value, {}
        for tier in sorted({p.seniority for p in stack}, reverse=True):
            claims = {p.name: round(p.invested * p.multiple) for p in stack
                      if p.seniority == tier and not converted[p.name]}
            total = sum(claims.values())
            if not total: continue
            pay = min(total, remaining)
            names = list(claims)                               # pro rata within a tier if short;
            parts = allocate(pay, [claims[n] for n in names])  # the split must sum to `pay` (M5)
            pref_paid.update(zip(names, parts))                # ties: earliest name in `stack` order
            remaining -= pay
        sharing = {p.name: p.shares for p in stack if converted[p.name] or p.participating}
        denom = common_shares + sum(sharing.values())
        resid = {n: round(remaining * s / denom) for n, s in sharing.items()}
        common = remaining - sum(resid.values())   # residual holder absorbs the rounding (M5)
        changed = False
        for p in stack:                            # would converting pay this class more?
            if p.participating or converted[p.name]: continue
            if round(exit_value * p.shares / (common_shares + all_shares)) > pref_paid.get(p.name, 0):
                converted[p.name], changed = True, True
        if not changed: break
    out = {p.name: pref_paid.get(p.name, 0) + resid.get(p.name, 0) for p in stack}
    out["common"] = common
    if sum(out.values()) != exit_value:            # M5: allocation preserves the total
        raise WaterfallImbalance(f"{sum(out.values())} distributed against {exit_value}")
    return out
```

That check is the whole point: a waterfall that does not sum exactly to the exit value has lost or
created money, and the person it was lost from is a real person. It **raises** rather than asserting,
because `python -O` and `PYTHONOPTIMIZE=1` strip `assert` from the bytecode — and a control that
disappears under an interpreter flag is not a control. An `assert` demonstrating an identity in an
example, like the two-root NPV check in §11, is the other kind: stripped, it costs you the
demonstration, not the guarantee.

And the check has to be one the code can actually satisfy. A bare `round()` in the tier split made it
fire on the simplest pari passu case there is: three 1,000,000 preferences against a 1,000,000 exit
gives `[333333, 333333, 333333]`, which is 999,999 — the opening bug of `money-arithmetic.md` §5.1,
reproduced in the cap table. So the split goes through `allocate()`, the largest-remainder helper
defined there, and `money-arithmetic.md` §5.2 applies unchanged: ties break by index, so the order of
`stack` decides who receives the odd minor unit, and that order is a policy to record with the model
rather than an accident of how the list was built.

Other terms that move the answer and
belong in the model: cumulative dividends on preferred; anti-dilution (broad-based weighted average
versus full ratchet, which is brutal in a down round); pay-to-play; a management carve-out taken off
the top before the preference stack; and escrow or holdback in an M&A exit.

## 14. Pricing

Cost-plus (`cost × (1 + markup)`) guarantees margin and ignores value; use it only where the contract
is cost-reimbursable or the price is regulated. Competitive anchoring is a race downward in
undifferentiated markets. **Value-based** — a share of quantified customer value created — is the
default everywhere else, and it requires actually quantifying the value.

The **price metric**, what you charge per, matters more than the level. It should scale with the value
received, be predictable enough to budget, be measurable by both sides, and not punish the behaviour
you want: per-seat discourages rollout, per-call discourages integration, per-outcome aligns but is
hard to measure and to bill.

With contribution margin ratio `m` and a proportional price change `Δ`, the break-even volume
multiplier is `Q'/Q = m / (m + Δ)`:

| m   | −10% price          | +10% price     |
| --- | ------------------- | -------------- |
| 70% | needs +16.7% volume | can lose 12.5% |
| 30% | needs +50.0% volume | can lose 25.0% |

A discount is a volume bet, and the lower the margin the more absurd the bet. Elasticity gives the
revenue direction (`ΔR/R ≈ Δ × (1 + ε)`), but revenue is the wrong objective — optimise contribution,
and quote elasticity only if you measured it in a test rather than assumed it.

**Grandfathering** existing customers is usually right commercially and has three accounting
consequences: MRR stops being comparable across cohorts (report price per unit by cohort); the
migration shows up as expansion or contraction in the bridge (§4.1) and must be labelled a pricing
event, not organic movement; and promised future price protection may be a contract modification under
IFRS 15 / ASC 606 — see `reconciliation-close.md`.

## 15. Publishing numbers

Nothing leaves finance without the five attributes of §2 (M20) — chart, slide, dashboard tile, board
table and investor update alike. A tile is not exempt because it is small; it is the most-read
financial artifact in most companies. Where numbers are investor-, regulator- or tax-facing the basis
is agreed with the finance owner before publication, and the manual journals behind any adjustment
carry the same separation of duties and audit trail as any other money movement (M11, M14,
`compliance-regulatory.md`).

### 15.1 Tie the metric to the ledger

Every published operational metric has a bridge to a ledger figure, maintained as an artifact and
reviewed at close (M9, M19, `reconciliation-close.md`):

| Line                                       | Amount        | Source                                        |
| ------------------------------------------ | ------------- | --------------------------------------------- |
| Billing-system recognised revenue, March   | 4,812,400     | `billing.revenue_schedule`, closed 2026-04-03 |
| less internal / test accounts              | (18,200)      | Account flag `is_internal`                    |
| less credits and refunds not in billing    | (94,600)      | GL 4900                                       |
| plus manual revenue journals               | 61,000        | GL 4000–4099, source `manual`                 |
| less presentation reclass (gross → net)    | (412,000)     | Agent presentation, §5                        |
| **= GL revenue, March, accrual, net, EUR** | **4,348,600** | Trial balance `tb_2026_03_v2`                 |

The unexplained residual must be zero, or below a stated materiality threshold with a named owner and
an age. This one table pre-empts most of the revenue-quality work in a diligence process.

### 15.2 Versioning and restatement

| Change                                      | Treatment                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Late transaction in a closed period         | Post to the open period referencing the original date (M3, M10); do not reopen                   |
| A bug in a metric's calculation             | Restate the full series, publish both versions side by side, state cause and size                |
| A definition change (what counts as active) | Restate all comparatives, keep the old series, version the definition, announce before first use |
| A reclassification (COGS ↔ opex)            | Restate comparatives; disclose the gross-margin effect explicitly                                |
| Improved data coverage                      | Same as a definition change — it _is_ one                                                        |

A metric definition has a version number and an effective date; a series never silently changes shape;
restatements are announced with the delta, not quietly deployed; every report states the definition
version it uses. What this prevents is the board noticing that a chart shown in March does not match
the same chart shown in June, which costs more credibility than the original error.

### 15.3 The definitions artifact

One page, owned by finance, version-controlled beside the chart of accounts, referenced by every
dashboard and every deck. Per metric: **name** as used publicly; **definition** in words and symbols;
**basis** (cash/accrual, gross/net, booked/settled, M20); **source** ledger accounts, tables and the
specific export; **inclusions and exclusions** (internal accounts, trials, one-offs, intercompany,
discontinued lines); **currency and FX** (functional currency, rate type and source, M6); **owner**,
the named human who arbitrates disputes; **version and effective date** with a link to the change log;
and **known limitations** — what it does not capture, and where it disagrees with a neighbouring
metric and why.

If a company owns exactly one financial document beyond its statements, it should be this one. It ends
the recurring argument about what a number means, makes diligence tractable, and lets an engineer
implement a metric without inventing the definition on the way.

## Review questions

1. Show me the balance check and the cash tie-out for every period of this model, forecast periods
   included — and if either is a plug, where is it?
2. Bridge last month's headline revenue to the trial balance, line by line. What is the unexplained
   residual and who owns it (M19)?
3. For each of the four axes in §2, which side is this figure on, and does the audience know?
4. Does the MRR bridge close to the cent, and what happens to the residual when a customer changes
   currency, merges accounts, or is reclassified mid-period?
5. Is this NRR computed on the base of customers present at the _start_ of the period, and does the
   numerator exclude new logos?
6. What are the horizon, discount rate and margin basis of this LTV, and what is it at the longest
   horizon you have actually observed?
7. In this cohort table, which cells are unobserved — and are they blank, or averaged into the trend?
8. Whose judgement is the discount rate, whose is the terminal growth rate, and what is the enterprise
   value at the corners of their defensible ranges?
9. At an exit of 1.2× the total preference stack, what does each holder receive, and does the
   waterfall sum exactly to the exit value?
10. When this metric's definition last changed, were comparatives restated, was the change announced,
    and can you produce both series today?
