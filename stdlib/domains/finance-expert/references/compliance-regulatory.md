# The regulatory perimeter

**Verified against primary sources on 2026-09-10.** Dates and thresholds move; confirm the current text of any rule you are about to build against.

Regulation is not a layer you add before launch. It is a set of constraints on the _shape_ of the
system — what data may exist, where it may live, who may touch it, how long it must survive, what it
must be able to prove, and how fast it must come back after a failure. Discovered late, those
constraints are a rewrite. Discovered in §2 of the framing, they are a schema decision.

This file tells you which regime bites, what it demands of the system, and where the engineering question
stops and the legal or compliance question starts. **It is not legal advice.** Nothing here authorises a
design; it tells you which conversation to have and what to bring to it. Dates and statuses move — several
regimes below were mid-flight through 2025–2026 — so wherever this file says "as of 2026", treat it as a
pointer to the current text, not as the current text. And the standing rule: **the regulator does not
accept "the code does this" as evidence; it accepts an artifact — a log, a report, an approval record, a
signed attestation — produced by a control you can describe and demonstrate.** Design for the artifact (M14).

## 1. Determining your perimeter

Start from _activity_, not from product name. "We're a marketplace" tells you nothing; "we hold seller
funds for 14 days before payout" tells you almost everything. Work the table top to bottom and write the
answers into the spec. Each row's decision question is the one that settles it; if the answer is "maybe",
it is a legal question, not an architecture question.

| Activity                                                                        | Regime(s)                                                                                               | Who enforces                                                | The single question that decides                                                                |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Card data touches your systems or your page                                     | PCI DSS v4.x; card-brand rules                                                                          | Acquirer / card brands (contract), QSA validation           | Can cardholder data, or a script that can read it, reach anything you control?                  |
| You initiate or execute payments for others                                     | PSD2 → PSD3/PSR (EU/EEA); PSRs (UK); state MTL + FinCEN MSB (US)                                        | NCA (BaFin, ACPR, CBI…), EBA; FCA; state regulators, FinCEN | Do funds ever come under your instruction or control, even for a second?                        |
| You hold client funds (balance, wallet, float, escrow)                          | Payment institution / EMI authorisation + safeguarding; state MTL + permissible investments             | Same as above                                               | Is there a customer-visible balance you owe, that is not a bank deposit at a bank?              |
| You issue e-money (stored value redeemable at par)                              | EMD2 (EU), soon PSD3/PSR; UK EMRs; US: MTL / prepaid access                                             | NCA / FCA / state                                           | Is the balance redeemable at par on demand, and does it discharge obligations to third parties? |
| You lend, or arrange credit, or offer BNPL                                      | Consumer credit regimes: Reg Z/TILA + ECOA + FCRA (US); CCD2 (EU); CONC (UK); state usury and licensing | CFPB, state AGs, FCA, NCAs                                  | Does anyone owe you money later for value received now, on terms you set?                       |
| You custody securities                                                          | MiFID II + CSDR (EU); Exchange Act 15c3-3 / Advisers Act custody (US)                                   | ESMA/NCAs, SEC/FINRA                                        | Do you hold or control client instruments or the keys/entitlement to them?                      |
| You custody or exchange crypto-assets                                           | MiCA (EU); state MTL / BitLicense, federal patchwork (US); FATF travel rule everywhere                  | NCAs + ESMA/EBA; NYDFS, states, SEC/CFTC/FinCEN             | Do you control private keys, or run an order book, or issue a token?                            |
| You are listed (or filing to be) on a US exchange                               | SOX 302/404/906; SEC disclosure incl. cyber incident rules                                              | SEC, PCAOB, your external auditor                           | Does a number your system produces flow into a financial statement or an 8-K?                   |
| You process personal data of people in the EU/EEA                               | GDPR (+ national law); ePrivacy for tracking                                                            | DPAs (CNIL, Garante, DPC…)                                  | Can a natural person be identified, directly or indirectly, from data you hold?                 |
| You are an EU "financial entity" (bank, PI, EMI, CASP, insurer, trading venue…) | DORA; NIS2 if not covered by DORA                                                                       | NCAs + ESAs                                                 | Does an EU financial-services regime already name your entity type?                             |
| You operate a trading venue, or execute/receive orders                          | MiFID II/MiFIR, EMIR, SFTR; RTS 25 clock sync                                                           | ESMA / NCAs; FCA                                            | Do you decide, route, match or report a transaction in a financial instrument?                  |
| You run a marketplace paying sellers                                            | DAC7 (EU), 1099-K (US), platform VAT/deemed-supplier rules; often MTL or agent-of-payee analysis        | Tax authorities; state regulators                           | Do you know the seller's earnings, and do funds pass through you?                               |
| You take deposits                                                               | Full banking licence; deposit insurance regime; Basel prudential                                        | Central bank / prudential regulator                         | Do you promise repayment of money accepted from the public, on demand?                          |

**Two traps.** First, _the bank-partner illusion_: routing money through a sponsor bank or a licensed
PSP does not automatically move the obligation off you — it moves _some_ of it, by contract, and the
contract is the thing to read (§5). Second, _scope creep by feature_: a "store card for next time"
checkbox, a "hold the payout until delivery" rule, or a "send balance to a friend" button each cross a
regime boundary. Every feature that changes who controls funds, for how long, re-opens this table.

### 1.1 Perimeter as a spec artifact

Record the outcome as a table in `FINANCIAL-SYSTEM-SPEC.md`, not as prose. The "basis" column is the one
that matters; an unexplained "No" is a finding.

| Regime   | Applies?    | Basis for the answer                                     | Owner (named human) | Evidence we can produce            | Next review           |
| -------- | ----------- | -------------------------------------------------------- | ------------------- | ---------------------------------- | --------------------- |
| PCI DSS  | Yes — SAQ A | Redirect-only; no fields on our origin                   | Head of Payments    | AOC, script inventory, ASV scan    | 2027-03               |
| PSD2/PSR | No          | Funds never under our control; PSP is merchant of record | GC                  | Contract §4, flow-of-funds diagram | On any wallet feature |

## 2. The engineer's translation rule

Every regime in this file, whatever its subject, reduces to some combination of six system properties.
This is why a well-built regulated system absorbs a new regime in weeks and a badly built one takes a
year: the second one has to invent the primitives.

| Regime            | Scope reduction                                                         | Access control                                              | Audit trail                                                 | Retention                                       | Reporting                                                     | Resilience                                           |
| ----------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| **PCI DSS**       | Tokenize, redirect, segment networks; keep CHD out of your estate (M15) | MFA on CDE, least privilege, unique IDs, no shared accounts | Log all admin/CHD access; daily review; integrity-protected | ≥12 months logs, 3 months immediately available | AOC/SAQ to acquirer annually                                  | Vulnerability mgmt, patching, incident response plan |
| **PSD2/PSR**      | Minimise data on payment initiation; strong customer data hygiene       | SCA on access and initiation; dedicated interface auth      | Every payment instruction, consent, SCA outcome             | Typically ≥5 years (national law)               | Fraud reporting, major-incident reporting, availability stats | Availability/performance of API; continuity          |
| **MTL/MSB (US)**  | Agent-of-payee or bank-partner structuring; permissible investments     | SoD on funds movement (M11)                                 | Transaction records, licence-condition evidence             | 5 years (BSA)                                   | Call reports per state, FinCEN filings                        | Examiner-ready systems, BCP                          |
| **NACHA/Reg E**   | Limit who can originate; account validation                             | Authorisation capture and proof                             | Authorisation records, dispute case files                   | 2 years (Reg E), 6 years (NACHA auth)           | Return-rate monitoring                                        | Timeline SLAs are hard deadlines                     |
| **AML/CFT**       | Data minimisation is _not_ available; you must collect                  | Restricted access to SAR/STR; tipping-off firewall          | CDD, screening, monitoring alerts, decisions                | 5 years post-relationship (typ.)                | SAR/STR, CTR, threshold reports                               | Screening must be available or you stop onboarding   |
| **SOX**           | Reduce systems in scope for financial reporting                         | Provisioning, quarterly review, SoD in the pipeline         | Change tickets, approvals, deploy records (M14)             | Audit period + retention policy (7 yrs typ.)    | Management assertion, auditor testing                         | Not a resilience regime, but DR evidence is tested   |
| **IFRS/GAAP**     | —                                                                       | Approval of manual journals                                 | Full trace from posting to report figure (M19)              | Statutory (5–10 yrs by country)                 | Statements, disclosures, roll-forwards                        | —                                                    |
| **Basel**         | —                                                                       | Model governance access                                     | Lineage from source system to regulatory return             | Long (multi-year)                               | COREP/FINREP, liquidity returns                               | —                                                    |
| **MiFID II/EMIR** | —                                                                       | Order-entry entitlements                                    | Order/execution record with microsecond stamps (M10)        | 5 yrs (7 on request)                            | Transaction reports T+1, trade reports T+1                    | Venue resilience, kill switches                      |
| **MiCA**          | Segregate client assets from own                                        | Key custody controls, SoD                                   | Custody positions, order/trade records                      | 5 years typ.                                    | Reserve reporting for ARTs/EMTs, market-abuse STORs           | Continuity of custody                                |
| **DORA**          | Reduce critical dependencies                                            | Privileged access management                                | ICT incident records, change records                        | Per policy, plus register                       | Incident reports at 4h/72h/1mo                                | The whole regime is resilience                       |
| **GDPR**          | Minimise, pseudonymise, separate PII from ledger                        | Purpose-bound access, DPIA                                  | Processing records, consent, DSAR handling                  | _Maximum_, not minimum                          | Breach notice 72h                                             | Availability is a security principle                 |

Read the columns, not the rows. **Six primitives serve every regime:** a tokenisation/minimisation
boundary, an authorisation model with separation of duties (M11), an append-only audit trail (M14), a
retention engine that distinguishes minimum from maximum, a report generator that runs off the ledger
(M19), and a resilience programme with tested recovery. Build those six well and each new regime is a
mapping exercise; build them per-regime and you will have four audit trails that disagree — and a money
type, amount representation and rounding policy that differ by report (M4, M5, `money-arithmetic.md`).

## 3. PCI DSS v4.x

PCI DSS is contractual, not statutory — enforced by your acquirer and the card brands, with fines,
forensic investigation costs and card-brand liability behind it. **PCI DSS v4.0.1 (published 11 June 2024) is the only active version**: v4.0 (March 2022) retired on 31 December 2024, and no v4.1 or v5 has
been announced as of September 2026. v4.0.1 added and removed no requirements — it was a clarification
release. Check the SSC document library anyway, because the Council revises SAQs, FAQs and the ROC
template far more often than the standard. Requirements marked "future-dated" in v4.0 became mandatory on
**31 March 2025**; treat all of them as live now. See `payments.md` for the integration mechanics behind
§3.1.

### 3.1 SAQ by integration pattern

| Integration pattern                                                       | What the customer's browser does                                             | Typical SAQ                                  | Roughly how many requirements                          | What puts you here                                     |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| **Fully outsourced / redirect**                                           | Leaves your site entirely to the PSP's page                                  | SAQ A                                        | Smallest set                                           | You never render a payment field; you never see PAN    |
| **iframe / hosted fields**                                                | Stays on your page; PSP-controlled iframe or JS-injected fields hold the PAN | SAQ A (with conditions)                      | Small set + client-side script obligations in practice | Your page is the container; your scripts share the DOM |
| **Direct post / merchant-controlled fields posting to PSP**               | Your HTML form collects PAN, posts to PSP                                    | SAQ A-EP                                     | Substantially larger                                   | Your code controls the elements that capture PAN       |
| **You receive/process/store PAN** (own gateway, call centre, batch files) | Anything                                                                     | SAQ D (merchant) or SAQ D (service provider) | Full standard                                          | PAN enters your systems in any form                    |
| **P2PE-validated terminals**                                              | Card-present, encrypting terminal from a listed solution                     | SAQ P2PE                                     | Small                                                  | Only with a _listed_ P2PE solution, not "we encrypt"   |
| **Card-present, standalone terminal, no electronic storage**              | —                                                                            | SAQ B / B-IP                                 | Small                                                  | Dial-out or IP terminal, no merchant systems in path   |
| **Virtual terminal, single workstation**                                  | Staff type PAN into PSP's web page                                           | SAQ C-VT                                     | Small                                                  | Isolated workstation, no storage                       |

Two warnings. **The SAQ A eligibility criteria moved, and the move is a trap.** In the SAQ A revision
published January 2025 and effective **31 March 2025**, the Council _removed_ requirements 6.4.3, 11.6.1
and 12.3.1 from the SAQ A question set — and replaced them with an **eligibility criterion**: the merchant
must confirm its site "is not susceptible to attacks from scripts that could affect the merchant's
e-commerce system(s)". Nothing was relieved. The work moved from a question you answer to a condition you
must satisfy before you may use the form at all, and the underlying PCI DSS requirements remain in force
for everyone else. Read the _current_ SAQ A before assuming an iframe integration is trivially in scope
for it. **And your SAQ is a floor:** your acquirer can require more, and above a transaction volume
threshold the brands require a QSA-signed ROC rather than a self-assessment.

### 3.2 What actually puts you in scope

In scope: any system component that stores, processes or transmits cardholder data (CHD) or sensitive
authentication data (SAD); anything connected to or that could affect the security of those systems;
**and anything that can affect the security of the payment page as rendered in the customer's browser** —
the clause that catches most modern architectures, making your tag manager, analytics vendor, chat widget
and CDN payment-page-security relevant even if PAN never touches your servers.

| Data element                          | Storable after authorisation?                                                       | Notes                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------- |
| PAN                                   | Yes, if rendered unreadable (truncation, tokenization, strong crypto with key mgmt) | Max 6 leading / 4 trailing digits displayed by default   |
| Cardholder name, expiry, service code | Yes, protected per policy                                                           | Only with PAN protection in place                        |
| CVV/CVC/CID                           | **Never**                                                                           | Not after authorisation, not "temporarily", not in a log |
| Full track / chip data                | **Never**                                                                           | —                                                        |
| PIN / PIN block                       | **Never**                                                                           | —                                                        |

### 3.3 Scope-reduction patterns, ranked (M15 is the invariant; PCI is what finds you if you break it)

| Pattern                                                          | Effect                                                          | Cost / caveat                                                                                                                                    |
| ---------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Redirect or PSP-hosted page                                      | Removes CHD entirely from your estate                           | Worst conversion, weakest branding control                                                                                                       |
| Hosted fields / iframe with PSP tokenization                     | PAN never in your DOM origin; you receive a token               | You still own the container page and its scripts — as 6.4.3/11.6.1 if you validate above SAQ A, as the SAQ A eligibility criterion if you do not |
| Network tokens / PSP vault for card-on-file                      | No PAN at rest anywhere in your systems                         | Vendor lock-in on the vault; plan token portability early                                                                                        |
| P2PE (listed solution) for card-present                          | Terminal-to-processor encryption; merchant systems out of scope | Must be a listed solution; deviating from the P2PE Instruction Manual voids it                                                                   |
| Network segmentation of any residual CDE                         | Shrinks the assessed estate                                     | Segmentation must be _tested_ (penetration test) to be credited                                                                                  |
| Dedicated PCI account/VPC with its own IAM, logging and pipeline | Prevents CDE scope leaking into the main platform               | Duplicated platform effort                                                                                                                       |

The objective is blunt: **make the answer to "where is PAN?" be "in the PSP's vault, and nowhere else,
ever."** Every other design decision follows from that answer.

### 3.4 The requirements engineers actually implement

| Requirement area                       | Concrete engineering obligation                                                                                                                                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Segmentation (Req 1)                   | Deny-by-default between CDE and everything else; documented data flows; segmentation validated by pen test at least annually (more often for service providers)                                                                            |
| Key management (Req 3)                 | Keys stored separately from data; split knowledge/dual control for clear-text key operations; documented rotation and retirement; HSM or KMS with audited access                                                                           |
| Logging (Req 10)                       | Every access to CHD, every admin action, every auth failure, every change to logging itself; **≥12 months retention, ≥3 months immediately available**; logs protected from alteration (M14); daily review, automated is fine and expected |
| Time (Req 10.6)                        | Synchronised, authenticated time sources; only designated hosts pull external time (pairs with M10 and RTS 25 in §10)                                                                                                                      |
| MFA (Req 8)                            | MFA for all access into the CDE and for _all_ non-console administrative access; unique IDs; no shared accounts — a shared `root` is a finding here and in §8                                                                              |
| Vulnerability management (Req 6, 11)   | Ranked vulnerability intake; patch critical within a defined window; quarterly ASV external scans; internal scans; annual pen test                                                                                                         |
| Change control (Req 6.5)               | Documented approval, separation of dev/test/prod, no live PAN in test data                                                                                                                                                                 |
| Client-side scripts (6.4.3)            | **Inventory every script on the payment page**, with written business justification, and assure its integrity                                                                                                                              |
| Payment page tamper detection (11.6.1) | Detect and alert on unauthorised change to HTTP headers and page content, at least weekly or per a targeted risk analysis                                                                                                                  |

### 3.5 6.4.3 and 11.6.1 in practice on a real checkout page

These two turn checkout from a page into a controlled surface. Build them whether or not your SAQ asks the
questions — for SAQ A merchants they are the substance of the eligibility criterion (§3.1), and everyone
else answers them directly. Minimum viable implementation:

1. **Inventory.** A build-generated, machine-readable manifest of every script the page loads, direct and
   transitive, each with an owner, justification and approval date. A script that appears at runtime and
   not in the manifest is an alert.
2. **Integrity.** SRI on every static third-party script; for scripts that legitimately change, a pinned,
   versioned, self-hosted copy under your own change control. "We trust the vendor's CDN" is not an
   integrity mechanism.
3. **Restriction.** A strict `Content-Security-Policy` with an explicit allowlist (no `unsafe-inline`, no
   wildcard hosts), with `report-to` feeding an alert, not a dashboard nobody reads.
4. **Tamper detection.** Monitor the delivered HTML and the security-relevant response headers (CSP, HSTS,
   frame-ancestors) from outside your network, at least as often as your documented risk analysis
   requires, and alert on diff.
5. **Governance.** Adding a script to checkout is a change with an approver, not a tag-manager
   self-service action. Ask your marketing team whether they can push a tag to checkout without
   engineering approval; if they can, you have a finding, and it is the one the assessor will test.

### 3.6 Test data, fixtures and logs

Non-negotiable, and cheap to enforce mechanically (M15). No live PAN in test, staging, QA, demo,
screenshots, support tickets or fixtures — brand test numbers only. No PAN, CVV, track data, PIN or PSP
secret key in application logs, exception traces, APM payload capture, analytics events, session-replay
tools or crash dumps; session replay on a checkout page is a specific, recurring, catastrophic pattern,
so mask by allowlist, never by denylist. Redact at the emitter, not at the sink: if it reaches the sink,
it happened. `scripts/money_lint.py` catches the obvious cases; test the redaction itself (M18).

## 4. EU payments: PSD2 today, PSD3/PSR next

### 4.1 The current frame

PSD2 (Directive (EU) 2015/2366) plus the SCA/CSC RTS (Delegated Regulation (EU) 2018/389) is the operative
law across the EEA as of September 2026, transposed nationally, with EBA Guidelines and Q&As doing much of
the real interpretive work. The Commission's 2023 package splits it in two: **PSD3** (a directive:
licensing, authorisation, supervision) and the **PSR** (a regulation: conduct rules, SCA, fraud, data
access — directly applicable, so no transposition divergence). **Status as of September 2026: agreed but
not yet law.** Parliament and Council reached provisional political agreement on **27 November 2025**; the
ECON committee approved the agreed texts on **5 May 2026**; formal plenary and Council adoption and
publication in the Official Journal are still outstanding. On the agreed shape, the PSR applies roughly
**18 months after entry into force** and PSD3 must be transposed within about the same window, putting
real application in **2028** — confirm the OJ publication date, because every downstream deadline counts
from it. **FiDA**, the Financial Data Access Regulation that would extend data sharing from payment
accounts to the rest of financial services, is a _separate_ proposal and is **less advanced**: the Council
agreed its general approach on 2 December 2024, trilogues have run through 2025–2026, and there is no
adopted text and no application date. Treat FiDA as a design assumption, not a deadline. Direction of
travel worth designing toward now, because none of it is speculative in engineering terms:

| Theme           | PSD2 today                           | PSD3/PSR direction                                                                                      |
| --------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Fraud liability | Limited to unauthorised transactions | Extended reimbursement in impersonation/spoofing scenarios; IBAN–name verification for credit transfers |
| SCA             | RTS 2018/389, exemption list         | Broadly retained, clarified for MITs, tokenised wallets, accessibility                                  |
| Open banking    | "Dedicated interface" + fallback     | Stronger API performance obligations, removal of screen scraping, permission dashboards for users       |
| E-money         | Separate EMD2 regime                 | Folded into the payment-services regime                                                                 |
| Fraud data      | National reporting                   | More granular, harmonised reporting                                                                     |

Engineering consequence today: build IBAN–name (VoP/Confirmation of Payee) checks as a _first-class step
in the payment flow with its own recorded outcome_, not a UI nicety; keep SCA outcomes as auditable
events; and make consent/permission state a queryable object with an expiry, because a user-facing
permission dashboard is coming and it must render from data you already keep (`payments.md` for the 3DS
and rail mechanics; `banking-open-finance.md` for consent and the dedicated interface).

**Do not wait for the PSR for any of that, because the Instant Payments Regulation already made most of it
binding.** Regulation (EU) 2024/886 amends SEPA and is in force now, on a staged calendar by currency area
and firm type. Its engineering demands are unconditional: reachability 24 hours a day on any calendar day;
funds available on the payee's account **within 10 seconds** of the payer's PSP receiving the payment order
(Art. 5a(4)(c)) — a hard latency budget, not an SLO; charges no higher than the equivalent non-instant
transfer; a Verification of Payee check on _every_ euro credit transfer, instant or not (Art. 5c),
before the payer authorises, and an inversion of the sanctions control: Art. 5d requires screening of your
own payment service users **at least once every calendar day and immediately after any new designation
enters into force**, and _prohibits_ transaction-level sanctions screening during execution of an instant
credit transfer. If your architecture screens synchronously in the payment path, that is now the
non-compliant design for euro instant payments.

| Obligation                                                  | Euro-area PSPs | Non-euro-area PSPs | PIs/EMIs                               |
| ----------------------------------------------------------- | -------------- | ------------------ | -------------------------------------- |
| Receive instant credit transfers                            | 9 January 2025 | 9 January 2027     | 9 April 2027                           |
| Send instant credit transfers                               | 9 October 2025 | 9 July 2027        | 9 April 2027 (euro area) / 9 July 2027 |
| Charges no higher than non-instant                          | 9 January 2025 | 9 January 2027     | with the above                         |
| **Verification of Payee**                                   | 9 October 2025 | 9 July 2027        | with the above                         |
| Non-euro national-currency transfers outside business hours | —              | 9 June 2028        | —                                      |

VoP is a match/close-match/no-match/not-possible outcome that must be presented to the payer _before_
authorisation, recorded against the payment, and — where the payer proceeds against a mismatch — retained
as the evidence that shifts liability. Model it as a state in the payment machine with four terminal
outcomes and a stored response, never as a synchronous UI call whose result is discarded (M14).

**The UK went further, earlier, and it is another hard timer.** Since **7 October 2024** the UK Payment
Systems Regulator's mandatory APP-scam reimbursement requirement (not to be confused with the EU PSR above)
has applied to Faster Payments and CHAPS payments sent and received by UK PSPs: the sending PSP must reimburse within **five business days** of a claim (the clock
pausable for information requests, with a longstop at the 35th business day), up to **£85,000** per claim,
with an optional excess of at most **£100** — and the **receiving PSP owes the sending PSP 50%** of what was
paid out. Two of those are schema decisions rather than policy ones: the 50/50 split is an inter-PSP
receivable that has to be posted and reconciled (M16, M9), and the vulnerable-customer carve-outs (no
excess, no gross-negligence exception) mean vulnerability is an attribute your claims engine must read.

**The message format underneath all of this has also finished moving.** Swift's ISO 20022 **CBPR+
coexistence period for cross-border payments ended on 22 November 2025**. MT payment instructions sent on
FINplus after that are subject to additional validation and automatic conversion, and conversion became
chargeable from **1 January 2026**; MT 199/MT 299 for gpi tracking remain, deprecated, with no announced
end date. The consequence is not "support a new format" but a data one: `pacs.008`/`pacs.009` carry
structured parties, structured postal addresses, purpose codes, remittance information and an end-to-end
identifier that MT truncated. If your payment records were shaped by MT field limits, you are now storing
less than the rail carries — which degrades sanctions screening, reconciliation matching (M9) and travel-rule
data (§11.2) at the same time. Model the ISO 20022 fields, not the MT ones.

### 4.2 SCA and the exemption set

SCA = two independent factors from knowledge / possession / inherence, plus **dynamic linking** for
remote payments (the authentication code is bound to amount and payee; changing either invalidates it).
Dynamic linking is the part engineers get wrong: a generic OTP that authenticates a _session_ rather
than a _transaction_ is not SCA.

| Exemption / exclusion                  | Condition (verify current thresholds)                                                                         | Who decides                          | System obligation                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Low-value remote                       | ≈ €30 per transaction, with cumulative caps (≈€100 or 5 consecutive)                                          | Issuer applies; acquirer may request | Track the counter per instrument; expect the issuer to override                                       |
| Transaction Risk Analysis (TRA)        | Value band tied to the PSP's own fraud rate (bands roughly ≤€100/€250/€500 at descending fraud-rate ceilings) | The PSP claiming it                  | Requires real-time scoring **and** audited fraud-rate calculation; you must be able to prove the rate |
| Trusted beneficiary                    | Payer has whitelisted the payee at their bank                                                                 | Payer + issuer                       | Nothing to build; expect variance                                                                     |
| Recurring, same amount, same payee     | SCA on the first; subsequent exempt                                                                           | Issuer                               | Detect amount change → re-authenticate                                                                |
| Merchant-initiated transactions (MIT)  | Out of scope, if a valid mandate was set up with SCA                                                          | Merchant/PSP                         | Store the mandate reference and the initial SCA evidence; MIT without it will be disputed             |
| Contactless at POS                     | ≈ €50, cumulative caps                                                                                        | Terminal/issuer                      | —                                                                                                     |
| Unattended transport/parking terminals | Category-based                                                                                                | —                                    | —                                                                                                     |
| Corporate payments                     | Dedicated secure processes/protocols                                                                          | PSP + corporate                      | —                                                                                                     |
| MOTO                                   | Out of scope of SCA entirely                                                                                  | —                                    | Do not build MOTO as a fraud loophole; the liability is yours                                         |
| One-leg-out                            | SCA not required where one PSP is outside the EEA                                                             | —                                    | "Best efforts" expectations still apply                                                               |

Two rules. **Exemptions are requests, not decisions** — the issuer decides, and your flow must handle a
soft decline with a step-up (M8-style retry semantics apply: the retry must be idempotent, M7).
**Whoever claims TRA must be able to evidence the fraud rate** with a reproducible calculation from the
ledger and the dispute records (M19). If you cannot produce that number on demand, you are not entitled
to the exemption you are claiming.

### 4.3 Licensing shapes and what each means for the build

| Shape                                  | What you may do                                  | What you must have                                                                      | Where the ledger burden lands                                                                 |
| -------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Merchant using a PSP**               | Accept payments for your own goods/services      | Contract, PCI compliance                                                                | You reconcile to the PSP (M9); the PSP is the regulated party                                 |
| **Agent of a licensed PI/EMI**         | Provide payment services in the principal's name | Registration by the principal, oversight, AML obligations flowed down                   | The principal's ledger is authoritative; yours is a sub-ledger that must reconcile exactly    |
| **Distributor (e-money)**              | Distribute/redeem e-money                        | Registration; no holding of funds in your own right                                     | Same as agent                                                                                 |
| **Payment Institution (PI)**           | Execute payments, acquire, initiate, provide AIS | Authorisation, own funds, safeguarding, governance, audit, incident and fraud reporting | You are the ledger of record for client money; safeguarding reconciliation is a daily control |
| **Electronic Money Institution (EMI)** | Issue e-money + PI services                      | As PI plus e-money own-funds and redemption obligations                                 | As PI, plus par-value redemption on demand                                                    |
| **Bank / credit institution**          | Take deposits, lend                              | Full prudential regime (§9)                                                             | Everything above, plus regulatory reporting lineage                                           |

**Being a PSP versus using one is the single largest architectural fork in this file.** Using one, your
system records claims and reconciles to an external authority. Being one, your system _is_ the authority,
and the regulator's questions ("every client's balance at close of business on 12 March, and the
corresponding safeguarded funds") land on your schema.

### 4.4 Safeguarding, operationally

Safeguarding (PSD2 Art. 10 and its UK equivalent) means relevant funds are either segregated into a
designated safeguarding account or secure liquid assets, or covered by insurance or a comparable
guarantee. **The UK reform has landed:** FCA policy statement PS25/12 (August 2025) introduced an interim
"supplementary regime" that came into force on **7 May 2026** for authorised payment institutions, and
authorised and small e-money institutions — requiring **daily internal and external reconciliation** (each
business day), a resolution pack retrievable within 48 hours, a distinct treatment for unallocated and
unidentified funds, a monthly safeguarding return and an annual independent safeguarding audit. A later
"post-repeal" regime modelled on CASS follows the legislative changes; it is not in force. What it means
_to your ledger_
(`ledger.md` for the account structures, `reconciliation-close.md` for the daily control):

| Obligation           | Engineering translation                                                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Segregation          | A distinct account structure in the chart of accounts for client money, never netted against corporate cash; a posting rule that makes commingling structurally impossible, not merely discouraged (M2)             |
| No commingling       | Fees you earn must be _swept out_ on a declared schedule via explicit postings (M16), not left implicitly inside the client balance                                                                                 |
| Daily reconciliation | An automated internal reconciliation (sum of client balances vs safeguarded account balance) run at least daily, with a documented break process, owner and escalation (M9)                                         |
| Shortfall detection  | The reconciliation produces a signed difference; a shortfall triggers a same-day top-up from corporate funds and an incident record                                                                                 |
| Timing               | Funds received are safeguarded by the end of the business day following receipt (jurisdiction-specific — confirm); your ledger must be able to evidence _when_ each receipt was safeguarded (M10)                   |
| Insolvency readiness | You must be able to produce a per-client balance at an arbitrary point in time from postings alone, quickly. This is a hard requirement on M1 + M3 + M10, and it is how the design gets tested when things go wrong |
| Records              | Reconciliation results retained and re-producible for the statutory period (M14)                                                                                                                                    |

If your system cannot produce "the safeguarding reconciliation for last Tuesday, with the break list and
who closed each break", it is not safeguarding-ready regardless of what the bank account is called.

## 5. US money movement

### 5.1 State money transmitter licensing

There is no federal money-transmitter licence. Money transmission is licensed state by state (roughly all
states plus DC and territories; a small number of outliers have historically not licensed — check current
status), through NMLS, with divergent definitions, net-worth requirements, surety bonds,
permissible-investment rules and reporting. The CSBS **Money Transmission Modernization Act** model law is
slowly harmonising definitions — by 2026 well over half the states had enacted some version of it, and
most of the rest had introduced one — but enactments vary in which articles they adopt and how they amend
them. It is a trend, not a uniform code: check the enacting state's own text, not the model.

| Structure                             | Do you need MTLs?                                 | Trade-off                                                                                                                                                                                                                   |
| ------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Merchant of record for your own sales | Generally no                                      | Limited to your own goods/services                                                                                                                                                                                          |
| Agent-of-payee exemption              | Sometimes — highly state-specific                 | Requires a genuine agency agreement making payment to you discharge the buyer's debt to the seller; the _contracts_ carry the exemption, so legal writes them and engineering must not contradict them in the flow of funds |
| Bank-partner / sponsor bank ("BaaS")  | Usually not, if funds are held in the bank's name | The bank owns the compliance obligation and will push it back to you contractually; the bank's regulator effectively examines you                                                                                           |
| Licensed PSP as the regulated party   | No                                                | You are a technology provider; keep it that way in the contract and the fund flow                                                                                                                                           |
| Own MTLs                              | Yes — multi-year, multi-million programme         | Full control, full obligation: examinations, call reports, permissible investments, bonding                                                                                                                                 |

FinCEN **MSB registration** is separate and federal: money transmitters, dealers in foreign exchange,
prepaid access providers/sellers and (per FinCEN's long-standing guidance) many convertible-virtual-
currency businesses must register with FinCEN. Registration (Form 107) is due **within 180 days** of the
date the MSB is established, then renewed **by 31 December of the second calendar year** following
registration and every 24 months thereafter. Registration is not a licence and confers no authorisation;
it is an AML-programme trigger (§6).

**Where responsibility actually sits in a bank-partner model:** legally with the bank, operationally with
you, contractually wherever the agreement puts it. The bank's audit and its regulator's expectations
therefore become _your_ requirements — a control matrix, evidence of BSA/AML controls, change-management
records, access reviews and incident reports, on the bank's timetable. Build §15 for the bank first.

### 5.2 ACH and the NACHA Operating Rules

The NACHA Operating Rules are contractual (through your ODFI) and are enforced with fines and, at the
extreme, loss of ACH access.

| Rule area                    | Requirement                                                                                                                                                                                                                                                                              | System obligation                                                                                                                                                                                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authorisation                | Debits require the receiver's authorisation in the form the SEC code prescribes (WEB, PPD, CCD, TEL…)                                                                                                                                                                                    | Store the authorisation artifact — text presented, timestamp, IP/device, consent record — and be able to produce it on demand for 2 years after termination                                                                                                                                                     |
| WEB debit account validation | For the first use of an account number (or after a change), validate the account                                                                                                                                                                                                         | Integrate a validation method (micro-deposits, network validation, open-banking verification) and record the result and method                                                                                                                                                                                  |
| Return-rate thresholds       | Unauthorised returns **0.5%** (enforcement threshold); administrative returns (R02/R03/R04) **3.0%** and overall debit returns **15.0%** (inquiry levels, not automatic enforcement)                                                                                                     | Measured over the preceding 60 days or two calendar months. Compute rolling rates per originator/programme; alert before the threshold, not after                                                                                                                                                               |
| Return windows               | Consumer unauthorised returns can arrive up to 60 calendar days after settlement                                                                                                                                                                                                         | Never treat ACH funds as final on settlement date; hold or reserve accordingly (M13), and size exposure to the _longest_ window                                                                                                                                                                                 |
| Fraud monitoring             | Nacha's risk-management amendments are now in force in two phases: **20 March 2026** (all ODFIs; non-consumer Originators, TPSPs and Third-Party Senders with 2023 origination volume ≥6m; RDFIs with 2023 receipt volume ≥10m) and **19 June 2026** (everyone else, thresholds removed) | Risk-based processes to identify entries suspected of being unauthorised **or authorised under false pretences** — i.e. credit-push fraud, so monitoring must cover outbound credits, not only debits — reviewed at least annually. Nacha prescribes no method; you must be able to describe and evidence yours |
| Reversals                    | Narrow permitted grounds and tight deadlines                                                                                                                                                                                                                                             | A reversal is a new entry with its own posting, never an edit (M3)                                                                                                                                                                                                                                              |

### 5.3 Reg E (12 CFR 1005) — the timelines are the requirement

Reg E governs electronic fund transfers for consumer accounts. Its error-resolution clock is the most
common source of "our system cannot do that" in US fintech, because the deadlines are unconditional.

| Step                   | Deadline (verify current text)                                                                                                                 | What the system must do                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Consumer notice window | Within 60 days of the statement/disclosure showing the error                                                                                   | Accept a dispute through any documented channel and timestamp it; the clock starts at _receipt_, not at triage                     |
| Investigation          | 10 business days (20 for new accounts)                                                                                                         | Case object with owner, SLA timer, escalation before breach                                                                        |
| Provisional credit     | If not resolved in 10 business days, provisionally credit and extend to 45 days (90 days for POS, foreign-initiated, or new-account transfers) | Post provisional credit as a real, reversible ledger entry (M2, M3), not a UI adjustment; expose it labelled to the customer (M20) |
| Report results         | Within 3 business days of completing the investigation                                                                                         | Generate and retain the notice; log the decision and its rationale                                                                 |
| Adverse decision       | Explain and give the consumer the right to request documents                                                                                   | Retain the evidence relied on                                                                                                      |
| Liability tiers        | $50 / $500 / unlimited depending on when the consumer reports                                                                                  | Encode the tier calculation; do not hand-adjudicate                                                                                |
| Record retention       | 2 years                                                                                                                                        | Case file, communications, decision, postings                                                                                      |

Engineering translation: disputes are a **first-class state machine with hard timers**, not a support
inbox. Every transition is logged (M14), every credit and debit is a posting (M1), every timer breach is
an alert with an owner. A queue that relies on a human noticing an ageing ticket fails an examination.

### 5.4 Reg Z, and CFPB 1033

**Reg Z / TILA (12 CFR 1026)** governs consumer credit: APR calculation and disclosure, disclosure
timing, credit-card rules (CARD Act — rate-change limits, payment allocation to highest-APR balances
first, ability-to-pay), and billing-error resolution on open-end credit (broadly: acknowledge within 30
days, resolve within two billing cycles / 90 days). The sharp edges for engineers: the APR is a _legally
specified_ computation, not a business formula — implement it from the regulation's method and test it
against published examples (M18); payment allocation order is prescribed; and disclosure timing is
evidenced by system records, so log what was shown, when, and in what version.

**CFPB 1033 (personal financial data rights).** The October 2024 final rule set staged compliance dates
starting **1 April 2026** for the largest institutions out toward 2030. It is not in effect. Sequence, as
it stands on **10 September 2026**: the Bureau reversed position in 2025 and issued an **advance notice of
proposed rulemaking in August 2025** to reconsider the rule; on **29 October 2025** the Eastern District of
Kentucky (_Forcht Bank v. CFPB_) granted a **preliminary injunction** barring enforcement, holding the
fixed compliance deadlines likely arbitrary and capricious because they depend on consensus standards that
do not yet exist; the 1 April 2026 date therefore passed with no enforceable obligation; and in **August
2026** the Bureau sent a replacement NPRM to OIRA for review — not yet published in the Federal Register.
The rule is **enjoined, not vacated**, and the replacement is expected to revisit the fee prohibition,
qualified third parties and liability allocation. **Do not commit a roadmap to a compliance date until the
new proposal is published and finalised.** Build the capability regardless, because the market converged on
it independently: token-based access instead of credential sharing, per-scope consent with expiry and
revocation, a developer API with published performance metrics, and an audit trail of every third-party
data access (M14). Note also that several states began legislating their own data-access rules in 2026, so
"there is no federal rule" is not the same as "there is no obligation". See `banking-open-finance.md` for
the API shape and FAPI-grade security profile.

## 6. AML/CFT

### 6.1 The source and the three layers

FATF's 40 Recommendations are the global source; they bind states, not you. States implement them, and
that implementation binds you. The layers that matter:

| Layer           | Instrument                                                                                                                                               | Note as of 2026                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Global standard | FATF 40 Recommendations + Interpretive Notes; mutual evaluations; grey/black lists                                                                       | R.16 is the travel rule (§11); R.10 CDD; R.20 STR                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| EU              | The 2024 AML package: **AMLR** (Reg. (EU) 2024/1624, the single rulebook), **AMLD6** (Dir. (EU) 2024/1640), and the **AMLA Regulation** ((EU) 2024/1620) | AMLA has been operational in Frankfurt since **1 July 2025** and is issuing technical standards through 2026. **AMLR applies from 10 July 2027**; AMLD6's transposition deadline is the same date; AMLA's _direct_ supervision of up to 40 selected high-risk cross-border entities starts from 2028. Two AMLR numbers to design for now: the beneficial-ownership threshold becomes **25% or more** (not "more than 25%"), and there is an EU-wide **€10,000** cash-payment limit                                                                                  |
| US              | Bank Secrecy Act (31 U.S.C. 5311 et seq.) + 31 CFR Chapter X, FinCEN; sanctions administered separately by OFAC                                          | **Beneficial-ownership reporting under the Corporate Transparency Act has been withdrawn for domestic entities.** After the March 2025 interim final rule, FinCEN's **final rule effective 14 August 2026** permanently removes BOI reporting for US companies and US persons, leaves the obligation only on foreign reporting companies (and only as to foreign beneficial owners), and deletes previously reported US-person data. This changes _filing_, not _diligence_: customer due diligence on beneficial owners under the CDD rule remains your obligation |
| National        | UK MLRs, Singapore MAS Notices, etc.                                                                                                                     | Local thresholds and filing mechanics differ; never hard-code one country's numbers as global defaults                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

### 6.2 What the law demands _of the system_

| Obligation                  | System requirement                                                                                                                                                                                      | Retention (typical — confirm locally)                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| CDD / KYC / KYB             | Identity attributes, documents, verification results, beneficial-ownership graph, risk rating, and the _reason_ for the rating; re-verification triggers                                                | 5 years after the end of the relationship                       |
| Ongoing due diligence       | Periodic review scheduling driven by risk rating; the system must know when each customer is next due                                                                                                   | Same                                                            |
| Sanctions and PEP screening | Screen at onboarding, on change, on payment, and on every list update; store the list version, the match score, the decision and the decider                                                            | 5 years (screening is also the control that must _fail closed_) |
| Transaction monitoring      | Rules and/or models producing alerts; every alert is a case with disposition and rationale; model/rule changes are versioned and evidenced                                                              | 5 years                                                         |
| SAR/STR filing              | Filing workflow with a hard deadline (US: generally 30 days from detection, 60 if no suspect identified), immutable copy of what was filed, and the supporting documentation                            | 5 years from filing                                             |
| CTR / threshold reports     | Automated aggregation (US CTR at >$10,000 cash, with structuring detection)                                                                                                                             | 5 years                                                         |
| Travel rule                 | Originator/beneficiary data transmitted with qualifying transfers (§11)                                                                                                                                 | 5 years                                                         |
| Tipping-off                 | **Access to SAR/STR existence and content is restricted by law.** Not in the customer-facing app, not in the general audit log everyone can query, not in a support tool, not in an analytics warehouse | Permanent restriction                                           |
| Record production           | Ability to answer "everything about this customer and their transactions for the last five years" within days                                                                                           | —                                                               |

**Tipping-off deserves a specific architecture note.** A generic "audit everything into one queryable
store" design (M14) collides with a legal prohibition on disclosure. The resolution is a separate,
access-controlled compliance data store with its own authorisation model and its own audit trail of who
read what — not a flag on a shared record. Support tooling must not render a reason code that reveals a
filing. Test this like a security control (M18).

### 6.3 Where engineering stops

Engineering builds the mechanism; the compliance officer (MLRO/BSA officer) owns the _calibration_.
Engineering does not choose risk-rating weights, monitoring thresholds, acceptable alert volumes, what
constitutes suspicion, whether to file, whether to exit a customer, or the screening match threshold.
Propose defaults, make them configurable with versioning and an approval record, and make every threshold
change an auditable event with an approver (M11): a threshold changed by a deploy with no compliance
approval is a finding, and a serious one. Implementation detail — scoring, screening architecture, case
management, model governance — lives in `risk-fraud-aml.md`.

## 7. Financial reporting standards for engineers

The standard does not tell your accountant what to think; it tells your _system_ what it must be able to
produce and evidence. Treat each standard as a query specification, and each figure it yields as one that
must carry its period, currency, basis and source when it reaches a human (M20, `corporate-finance.md`).

| Standard                                               | The economic question                                 | What the system must produce and evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **IFRS 15 / ASC 606** (revenue)                        | When and how much revenue is recognised               | Contract as a first-class object; identified performance obligations; transaction price including variable consideration and its constraint; allocation of price to obligations (a remainder-preserving allocation, M5); recognition events tied to satisfaction of each obligation; contract asset/liability (deferred revenue) balances that roll forward and reconcile; a full audit trail from contract change → revised allocation → catch-up posting (M3)                                                                                                       |
| **IFRS 9 / ASC 326** (financial instruments, ECL/CECL) | Classification, measurement, and expected credit loss | Instrument classification and its basis; effective-interest amortisation schedules; staging (IFRS 9 stages 1/2/3) or lifetime-loss modelling (CECL); the model inputs _as they were at the reporting date_, reproducibly; ECL by portfolio with a roll-forward reconciling opening to closing; evidence of model governance and of who approved the assumptions                                                                                                                                                                                                       |
| **IFRS 16 / ASC 842** (leases)                         | Right-of-use asset and lease liability                | Lease inventory with term, options, discount rate and its source; the amortisation and interest schedules; remeasurement events with their trigger; disclosure roll-forwards                                                                                                                                                                                                                                                                                                                                                                                          |
| **IAS 21 / ASC 830** (FX)                              | Translation and remeasurement                         | Rate, rate source and timestamp on every conversion; a CTA account; the ability to re-run translation for a period (M6)                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **IFRS 18** (presentation)                             | Structure of the income statement                     | Issued April 2024; replaces IAS 1; **effective for annual reporting periods beginning on or after 1 January 2027**, early application permitted, and comparatives must be restated. Its practical consequence for engineers is a mapping requirement: your chart of accounts must map to the prescribed categories (operating, investing, financing), and management-defined performance measures must be disclosed and reconcilable to the nearest IFRS subtotal (M19, M20). A 2027 first-time application means the 2026 comparative period is being recorded _now_ |
| **IFRS 19** (reduced disclosure)                       | Whether a subsidiary can disclose less                | Same effective date — annual periods beginning on or after **1 January 2027**, early application permitted. Eligible subsidiaries without public accountability keep full IFRS recognition and measurement but may substitute IFRS 19's reduced disclosure set. Relevant if your group runs a single reporting pipeline for parent and subsidiaries: the disclosure layer becomes entity-dependent while the ledger does not                                                                                                                                          |

The common thread: **every reported figure must be reconstructible from postings, with the inputs and the
policy version that produced it (M1, M19).** A revenue number produced by a spreadsheet reading the
orders table is a restatement waiting to happen; the same number produced by recognition postings against
the contract object is defensible. Recognition mechanics, deferred-revenue roll-forwards, the close
calendar and the GL export live in `reconciliation-close.md`. Two boundaries: the _choice_ of policy
(recognition timing, ECL model, capitalisation) belongs to the finance owner and the auditor, and a policy
change that affects published figures is a restatement with its own process — never a refactor.

## 8. SOX, in engineering terms

If you are listed on a US exchange or heading there, SOX section 404 makes management assert — and, over
a size threshold, the external auditor attest to — the effectiveness of internal control over financial
reporting (ICFR). For engineers this materialises almost entirely as **ITGCs** over the systems that
produce or affect financial data.

| ITGC domain                | What the auditor tests                                                                                                                      | What a good answer looks like                                                                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Change management**      | A sample of production changes: was it authorised, tested, approved by someone other than the author, and deployed by a controlled process? | Every change traces ticket → PR → review by a different person → CI evidence → deploy record with commit SHA, actor and timestamp. The deploy record is generated by the pipeline, not typed by a human                       |
| **Access provisioning**    | How access is granted, and whether it was approved                                                                                          | Role-based access requested through a ticket, approved by the resource owner, provisioned automatically, and the provisioning event logged. No standing production write access by default                                    |
| **Access de-provisioning** | Leavers                                                                                                                                     | Termination in the HR system triggers revocation within a defined SLA; evidence is a report, not a memory                                                                                                                     |
| **Periodic access review** | Quarterly recertification of who has access to in-scope systems                                                                             | An automated extract per system, routed to the owner, with sign-off recorded and exceptions remediated and tracked. Manual screenshots are the sign of a programme that will fail at scale                                    |
| **Segregation of duties**  | Can one person write code, approve it, and deploy it to production?                                                                         | Branch protection requiring a second reviewer; deployment identity distinct from developer identity; break-glass path that is logged, alerted and reviewed within days. Automation deploys; automation does not approve (M11) |
| **Computer operations**    | Job scheduling, failure handling, backup/restore                                                                                            | Job success/failure monitored with alerting; restore actually tested and the test evidenced                                                                                                                                   |
| **Log integrity**          | Can the audit trail be altered?                                                                                                             | Append-only storage with retention lock/WORM, restricted delete permissions separated from write permissions, hash-chaining or a signed digest, synchronised time (M14, M10)                                                  |
| **Key reports / IPE**      | Is the report used as control evidence complete and accurate?                                                                               | Reports generated from the ledger by a versioned, reviewed query (M19); parameters captured with the output; the report is reproducible                                                                                       |

**Why a shared production admin account is an immediate finding.** It destroys attribution: no control
that depends on "who did this" can operate, so change management, SoD, access review and log integrity
all fail simultaneously from one root cause. It is also unfixable retroactively — you cannot reconstruct
who used `ops-admin` last quarter. Named identities with assumed roles, MFA, session recording for
privileged access, and time-bounded elevation are the fix — and they must be in place _before_ the audit
period you intend to rely on, because auditors test operating effectiveness over a period, not design at
a point in time. Two corollaries: **start early** (a control that has operated for six weeks cannot
support an annual assertion), and **scope deliberately** (a clear, defended scoping with data-flow
diagrams is cheaper than defending every service you own).

## 9. Banking prudential, briefly

If you are a bank — or you supply a bank — Basel III and its "Basel III finalisation"/"Basel IV" package
(output floor, revised credit-risk standardised approach, revised operational risk, FRTB market risk)
reaches engineering almost entirely through **reporting and data lineage**, not through the capital
maths itself. Implementation dates have diverged so far that there is no longer a meaningful global date —
**state the jurisdiction, and do not assume a common timetable.** Where it stands on 10 September 2026:

| Jurisdiction       | Status                                                                                                                                                                                                                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **EU (CRR3/CRD6)** | CRR3 applies since **1 January 2025**. The market-risk framework (FRTB) was deferred by one year to **1 January 2027**, and a Commission delegated act of **4 June 2026** under CRR Art. 461a layers time-limited targeted adjustments on it, running to **1 January 2030**                                                       |
| **UK (Basel 3.1)** | PRA final rules in **PS1/26**; implementation **1 January 2027**, with the internal model approach for market risk delayed to **1 January 2028**                                                                                                                                                                                  |
| **US**             | The 2023 "Basel III endgame" proposal was rescinded. The Fed, OCC and FDIC issued **three re-proposals on 19 March 2026** (expanded risk-based approach, revised standardised approach, GSIB surcharge); the comment period closed **18 June 2026**. **Nothing is final and no effective date is set** — do not plan to a US date |

What the package asks of the system is stable across all three, whatever their dates:

| Concept                                         | Engineering consequence                                                                                                                                                                                                                                                                  |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Risk-weighted assets                            | Exposure-level data with counterparty, product, collateral, rating and maturity attributes, retained and reproducible at reporting dates                                                                                                                                                 |
| Output floor                                    | The same exposure must be computable under two approaches from the same source data — dual computation, one lineage                                                                                                                                                                      |
| LCR / NSFR (liquidity)                          | Cash-flow bucketing by maturity and behaviour; daily or intraday granularity; the ability to explain a movement between two reporting dates                                                                                                                                              |
| Leverage ratio                                  | Off-balance-sheet exposures must be captured, not just the ledger                                                                                                                                                                                                                        |
| **BCBS 239** (risk data aggregation principles) | The one every engineer actually feels: accuracy, completeness, timeliness and **adaptability** of risk data, with documented lineage from source system to the number in the return. Manual spreadsheet steps between the ledger and a regulatory return are precisely what this targets |
| Stress testing                                  | Re-run the same computation on scenario inputs, with the scenario version recorded (M20)                                                                                                                                                                                                 |

The design rule: **a regulatory return is a report from the ledger and its source systems (M19), with
lineage metadata attached to every figure.** If a number in a return cannot be traced to postings and
source records without a human explaining a spreadsheet, that is the finding.

## 10. Markets

Cross-ref `markets-trading.md` for order lifecycle, instrument identifiers and P&L; here, only the
regulatory obligations that shape the system.

| Obligation                                | What it requires                                                                                                                                                                                                                                                                                                                                                                                                                                 | System consequence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Best execution (MiFID II Art. 27)**     | Take all sufficient steps to obtain the best possible result, considering price, cost, speed, likelihood of execution and settlement, size and nature                                                                                                                                                                                                                                                                                            | Record the venue choice and the _inputs to the choice_ per order; monitor execution quality; be able to demonstrate the policy was followed for a specific order months later                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **RTS 27 / RTS 28**                       | Venue execution-quality reports and firms' top-5-venue reports                                                                                                                                                                                                                                                                                                                                                                                   | **Both are gone, and something more demanding replaced them.** The 2024 MiFID/MiFIR review removed the periodic reports in the EU (the UK removed them earlier), and the Commission's new **RTS on investment firms' order execution policies** — adopted 14 April 2026, published in the OJ 23 July 2026, in force 12 August 2026, **applying from 12 February 2028** — formally repeals RTS 27 and RTS 28 and replaces them with prescriptive requirements on instrument classes and sub-classes, venue selection, routing criteria, execution-quality monitoring, client instructions and dealing on own account. Do not read the removal of a report as removal of an obligation: the disclosure went away and the demonstrable process became the deliverable |
| **Transaction reporting (MiFIR Art. 26)** | Report executed transactions to the NCA no later than T+1, with ~65 fields including identifiers, decision-makers and trading capacity                                                                                                                                                                                                                                                                                                           | A reporting pipeline with completeness and accuracy reconciliation against your own execution records, plus a correction/cancellation path (M3-style: correct by a new record, never by editing history)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **EMIR reporting**                        | Both counterparties report derivative trades to a trade repository by T+1                                                                                                                                                                                                                                                                                                                                                                        | EMIR Refit standards (ISO 20022 XML, expanded field set, UTI generation and pairing rules) applied from 2024. **EMIR 3 (Regulation (EU) 2024/2987)** added the active account requirement, effective for the first tranche of counterparties from **25 June 2025**, with the RTS on operational conditions in force **26 February 2026**, expanded reporting fields effective **29 April 2026** and the first AAR report due **July 2026**. Systems must generate and share UTIs deterministically, and file _error and omission notifications_ to the regulator when reporting fails — meaning your reconciliation between internal trades and repository acknowledgements is itself a regulatory control (M9)                                                    |
| **LEI**                                   | Legal Entity Identifier for reporting counterparties and issuers                                                                                                                                                                                                                                                                                                                                                                                 | "No LEI, no trade" — LEI validity and renewal status must be a checked attribute on counterparty onboarding, with expiry monitoring                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **T+1 settlement**                        | A one-business-day standard settlement cycle                                                                                                                                                                                                                                                                                                                                                                                                     | Done in North America: the US, Canada and Mexico moved in **May 2024**. Europe follows on a single coordinated date — **11 October 2027** — for the EU (under **Regulation (EU) 2025/2075** amending CSDR), the UK, Switzerland, Liechtenstein and Norway. The engineering is not the settlement date field: it is the compression of affirmation, allocation, FX funding and securities-lending recall into the trade date itself, which turns overnight batch steps into intraday ones and makes any manual exception queue a settlement-fail generator                                                                                                                                                                                                          |
| **Clock synchronisation (RTS 25)**        | Delegated Regulation (EU) 2017/574 sets maximum divergence from UTC and timestamp granularity by activity: **100 microseconds / 1 microsecond** for high-frequency algorithmic trading; **1 millisecond / 1 millisecond** for other activity of trading-venue members; **1 second / 1 second** for voice trading, RFQ with human intervention and negotiated transactions. Read the table for _your_ activity — it is per activity, not per firm | Traceable time distribution (GPS/PTP with a documented traceability chain to UTC), **monitored drift with alerting**, and evidence of the divergence achieved. Business timestamps must carry the granularity the regime requires, not whatever the ORM defaults to. This is the sharp end of M10: event time is a regulated field, and truncating to milliseconds because the database column is a `TIMESTAMP` is a reportable defect                                                                                                                                                                                                                                                                                                                             |

RTS 25 has a quiet architectural consequence: NTP over the public internet on a cloud VM is generally not
sufficient evidence of traceability for the tighter tiers. Decide that before choosing a deployment
topology, not after.

## 11. Crypto

### 11.1 MiCA (EU)

Regulation (EU) 2023/1114. The asset-referenced/e-money-token titles applied from 30 June 2024 and the
remainder from 30 December 2024, with member-state transitional ("grandfathering") windows for existing
providers. **Those windows are closed.** ESMA confirmed in 2026 that the transitional period expired
uniformly across the EU on **1 July 2026**, with no extensions and no member-state variation: an entity
providing crypto-asset services to EU clients without a MiCA authorisation is in breach of EU law and must
have executed a wind-down plan, and NCAs were directed to act against unauthorised provision. The live
questions are now operational, not transitional — is your authorisation actually granted (not pending),
does the service list on it cover what you ship, and is your passport notification in place for each
member state you serve.

| MiCA element               | Obligation                                                                                                                                 | Engineering consequence                                                                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CASP authorisation         | Authorisation in one member state, passportable; specified services (custody, exchange, operation of a trading platform, transfer, advice) | The _service list_ in your authorisation constrains features. Shipping a feature that constitutes an unauthorised service is a licensing breach, not a product decision                                       |
| Custody and administration | Segregation of client crypto-assets from the CASP's own; a register of positions per client; liability for loss                            | Per-client entitlement ledger (M1, M2) that reconciles to on-chain balances daily (M9); key management with dual control; a documented mapping between wallet addresses and the client entitlements they back |
| Client funds (fiat)        | Safeguarding equivalent to §4.4                                                                                                            | Same daily reconciliation obligation                                                                                                                                                                          |
| ART / EMT (stablecoins)    | Reserve composition, custody and reporting; redemption at par; issuance limits for significant tokens                                      | Reserve attestation data must be produced from a ledger, on a schedule, with the same evidentiary quality as a financial statement                                                                            |
| Market abuse (Title VI)    | Insider dealing, unlawful disclosure, market manipulation prohibitions; obligation to detect and report                                    | Order and trade surveillance with alerting and case management; STOR filing workflow; retention of order book data                                                                                            |
| White papers and marketing | Disclosure obligations for offers and admissions                                                                                           | Versioned content with approval records                                                                                                                                                                       |

### 11.2 The travel rule

FATF Recommendation 16 extended to virtual assets: originator and beneficiary information must accompany
qualifying transfers between VASPs. In the EU, Regulation (EU) 2023/1113 (the recast Transfer of Funds
Regulation) has applied to crypto-asset transfers since **30 December 2024**, **with no de minimis
threshold**, alongside the EBA's Travel Rule Guidelines. The US BSA travel rule threshold remains
**$3,000**: the 2020 joint FinCEN/Federal Reserve proposal to cut it to $250 for cross-border transfers
and to name convertible virtual currency explicitly was never finalised, so it is a proposal, not a rule.
Engineering consequences: a counterparty-VASP directory and its trust model; a protocol
implementation (IVMS 101 over one of the messaging networks); handling of transfers to self-hosted
wallets, which carry their own verification expectations; and a _blocking_ decision point — the transfer
does not leave until the data obligation is satisfied or an exception is recorded. Build it as a step in
the payment state machine with its own posting-relevant outcome, never as an async afterthought.

### 11.3 US status, stated carefully

As of 10 September 2026 the US framework is partially built and moving. **Stablecoins**: the **GENIUS Act**
was enacted on **18 July 2025**, creating a federal framework for payment stablecoin issuers — permitted
issuers only; reserves backing outstanding stablecoins **on an at least one-to-one basis** in a closed list
of eligible assets (US currency and Federal Reserve balances, insured demand deposits, Treasuries with
**93 days or less** remaining maturity, overnight Treasury-backed repo, and money market funds holding only
those); **monthly public reports of outstanding supply and reserve composition, examined by a registered
public accounting firm and certified by the CEO and CFO** under criminal penalty; redemption on a published
policy; BSA/AML and sanctions programme obligations; and a **prohibition on paying interest or yield** to a
holder solely for holding the stablecoin. It takes effect on the **earlier of 18
months after enactment (18 January 2027) or 120 days after the primary federal regulators issue final
implementing regulations**. Rulemaking is under way but **unfinished**: the OCC proposed rules in March
2026 and Treasury's NPRM on issuance, offer and sale was published **18 August 2026** with comments due
**19 October 2026**. No final rules yet, so the effective date is currently tracking the January 2027
backstop. **Market structure**: the CLARITY Act (H.R. 3633) passed the House in July 2025 and remains
before the Senate, where procedural votes opened in August 2026 and a floor vote slipped into September 2026. **It is not law.** Do not build to a claimed SEC/CFTC boundary that Congress has not drawn.
**Everything else remains in force meanwhile**: FinCEN MSB registration and the BSA for exchangers and
administrators; OFAC sanctions including sanctioned addresses (screening on-chain counterparties is an
operational requirement, not an option); state regimes including NYDFS and state MTLs; SEC and CFTC
enforcement under existing law; and IRS digital-asset broker reporting on its own phased dates. Custody
accounting moved too: SAB 121 was rescinded in early 2025 (SAB 122), changing balance-sheet treatment for
entities safeguarding crypto for others (§7). The engineering-safe position: **build for segregation,
per-client entitlement accounting, on-chain reconciliation, sanctions screening and travel-rule data
regardless of which US regime lands** — every plausible outcome requires all five.

## 12. DORA

Regulation (EU) 2022/2554, applicable since 17 January 2025, covering essentially all EU financial
entities (banks, PIs, EMIs, investment firms, insurers, CASPs, trading venues and more) plus, indirectly,
their ICT providers. DORA is the regime that turns "resilience engineering" into a legal obligation with
deadlines.

| Pillar                                     | Obligation                                                                                                                                                                                      | Concrete engineering consequence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ICT risk management**                    | A documented framework, board-approved, covering identification, protection, detection, response, recovery and learning                                                                         | An asset and dependency inventory that is actually current — services, data flows, ICT third parties, and which business function each supports. Most firms discover their CMDB is fiction here                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Incident classification and reporting**  | Classify ICT-related incidents against criteria (clients affected, data losses, duration, geographical spread, economic impact, criticality of services) and report major ones on a fixed clock | Art. 5 of the incident-reporting RTS, verbatim: **initial notification within 4 hours of classifying the incident as major and no later than 24 hours from becoming aware of it; intermediate report within 72 hours of the initial notification** — even if nothing has changed — **and a final report within one month of the intermediate (or the latest updated intermediate) report.** The weekend/bank-holiday extension to noon the next working day does _not_ apply to credit institutions, CCPs, trading-venue operators, or entities designated essential or important under NIS2. This forces classification to be _fast and mechanical_: the criteria must be evaluable from telemetry during an incident, not reconstructed a week later |
| **Register of information**                | Maintain a register of all contractual arrangements with ICT third-party providers, submitted to the regulator                                                                                  | An **annual** cycle: reference date 31 December, submitted through the NCA in roughly a February–March/April window the following year. A structured, machine-generated register: provider LEI, function supported, criticality, data location, substitutability, exit plan status. Maintaining it by spreadsheet fails at the first submission cycle: validation on identifiers and taxonomy fields is strict and rejections at submission are routine, so build in time to resubmit before the window closes                                                                                                                                                                                                                                         |
| **Digital operational resilience testing** | Regular testing; **threat-led penetration testing (TLPT)**, TIBER-EU-based, for entities identified as significant, typically on a multi-year cycle                                             | Pre-agreed rules of engagement for red-teaming production, with a safety envelope and a ledger-safety plan (a red team must not be able to move money, M11/M12)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Third-party risk**                       | Contractual requirements (audit rights, subcontracting, termination, exit); designation of Critical ICT Third-Party Providers subject to EU oversight                                           | **Exit plans that are technically real**: data export in a usable format, a documented migration runbook, and a periodic test of at least the export. "We could migrate if we had to" is not an exit plan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Information sharing**                    | Voluntary threat-intelligence sharing                                                                                                                                                           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

Worth acting on even outside the EU: a dependency inventory generated from infrastructure-as-code and
service manifests rather than by hand; incident classification implemented as a decision function with
logged inputs; and DR objectives _tested and evidenced_ rather than asserted — for a ledger the only
acceptable RPO for committed postings is zero, and you must prove it (`architecture-ops.md`).

## 13. Privacy versus financial record-keeping

### 13.1 The collision

GDPR requires erasure on request (Art. 17) and storage limitation (Art. 5(1)(e)); the ledger requires
immutability (M3) and the regimes above require multi-year retention. Reconcilable, but only by design,
and only if you separated the data in the first place (`ledger.md`).

| Question                                                | Answer for a regulated financial system                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lawful basis for AML/KYC processing                     | **Legal obligation** (Art. 6(1)(c)), not consent. Consent is the wrong basis: it is withdrawable, and you cannot stop screening because a customer withdrew consent                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Lawful basis for fraud prevention                       | Typically legitimate interests (Art. 6(1)(f)) with a documented balancing test, or legal obligation where prescribed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Does the right to erasure defeat retention obligations? | No — Art. 17(3)(b) excepts processing necessary for compliance with a legal obligation. But the exception is _scoped_: it covers the records the obligation requires, not your entire data estate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Automated decisioning                                   | Art. 22 constrains solely-automated decisions with legal or similarly significant effects (declines, account closures, credit refusals). Design for a documented human-review path and an explanation capability                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Special-category data                                   | Biometrics used for identity verification, and inferences about health or beliefs, carry extra conditions. Keep verification vendors' biometric data at the vendor where possible                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| The EU AI Act, where it touches you                     | Annex III classifies as **high-risk** both the evaluation of natural persons' **creditworthiness or credit scoring**, and **risk assessment and pricing for life and health insurance**. Those Chapter III obligations were due 2 August 2026 but the AI Omnibus, **Regulation (EU) 2026/1744** (in force 27 July 2026), moved standalone Annex III systems to **2 December 2027** and product-embedded high-risk systems to 2 August 2028. The postponement is unconditional but **partial**: prohibited practices (since 2 February 2025), GPAI obligations (since 2 August 2025) and the Art. 50 transparency duties, market surveillance, post-market monitoring and serious-incident reporting that started on 2 August 2026 are all unaffected |

### 13.2 Accepted resolutions

| Pattern                          | How it works                                                                                                                                                                                        | When it is the right answer                                                                                                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Data separation by design**    | The ledger stores a subject _identifier_ and monetary facts only; all PII lives in a separate customer store with its own lifecycle. Postings never embed a name, address, email or document number | Always. This is the decision that makes every other option available, and it must be made at schema time                                                                                               |
| **Pseudonymisation**             | Postings reference an opaque subject key; the mapping to identity lives in the restricted PII store                                                                                                 | Standard practice; note that pseudonymised data is still personal data under GDPR while the mapping exists                                                                                             |
| **Crypto-shredding**             | PII is encrypted with a per-subject key; erasure destroys the key, rendering the PII unrecoverable while the financial record and its integrity remain intact                                       | Where PII genuinely must sit in an immutable store; requires disciplined key management, backup handling (backups contain the ciphertext, which is the point) and evidence that the key is really gone |
| **Retention-driven suppression** | The record survives for the statutory period, then a scheduled job removes or anonymises it; the deletion itself is logged                                                                          | The default path for data whose retention clock has run                                                                                                                                                |
| **Aggregation**                  | After the retention period, keep only irreversibly aggregated figures for analytics                                                                                                                 | Where analytics is the only remaining purpose                                                                                                                                                          |

What is **not** an acceptable resolution: deleting or editing postings (M3), overwriting a name in place
in an append-only store (the prior version is still in the log), or refusing the request outright without
a documented legal basis for the refusal.

### 13.3 DSARs in a ledger system

A subject access request in a financial system is an engineering feature, not a manual export. Build it:
a documented inventory of every store holding personal data (the Record of Processing Activities made
executable); a query per store keyed on the subject identifier; assembly into a portable format;
**redaction of third-party personal data and of anything covered by the tipping-off prohibition or
otherwise exempt** (§6.2 — SAR/STR content must never appear in a DSAR response); a legal review gate
before release; and a log of the request, the reviewer and the release (M14). The clock is one month,
extendable by two for complexity. A system that cannot enumerate its own PII stores cannot answer a DSAR
correctly, and that is the common failure.

### 13.4 Residency and transfers

Residency arises from three sources engineers routinely conflate — privacy law (transfer mechanisms),
sector regulation (local processing or local records for supervised entities), and contract (a bank
partner or enterprise customer imposing it). Resolve each separately.

| Mechanism                               | Use                                                      | Caveat                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adequacy decision                       | Transfer to a country the Commission has deemed adequate | Adequacy can be withdrawn or annulled; do not build a topology that assumes permanence                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| EU–US Data Privacy Framework            | Transfers to self-certified US organisations             | **Valid, and under appeal.** The General Court dismissed the annulment action in _Latombe v Commission_ (T-553/23) on **3 September 2025**, finding the Data Protection Review Court sufficiently independent; an appeal was lodged with the Court of Justice in October 2025 and is pending. Given that the CJEU struck down both predecessor mechanisms, do not make it your _sole_ transfer mechanism — keep SCCs and a transfer impact assessment in reserve so a fallback is a contract change, not a re-architecture |
| Standard Contractual Clauses (2021/914) | The general-purpose mechanism                            | Requires a documented transfer impact assessment and, often, supplementary technical measures                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Binding Corporate Rules                 | Intra-group transfers                                    | Long approval process                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Local processing / regional isolation   | Regulator or contract requires it                        | The expensive one: it forces regional data planes, regional keys, and a decision about whether the _ledger itself_ is regional or global                                                                                                                                                                                                                                                                                                                                                                                   |

Decide the residency model before the ledger's partitioning model. Retrofitting regional isolation onto a
global ledger is one of the most expensive migrations in this domain.

### 13.5 Retention schedule as a table

Retention has a **minimum** (regulatory) and a **maximum** (privacy). The system must enforce both, and
the gap between them is a policy decision with a named owner.

| Data class                                      | Minimum retention (typical — confirm per jurisdiction)    | Maximum retention                                                  | Who decides           |
| ----------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ | --------------------- |
| Ledger postings / journal entries               | Statutory books-and-records period, commonly 5–10 years   | Indefinite if de-identified; otherwise the minimum + policy buffer | Finance owner + GC    |
| KYC/CDD records and documents                   | 5 years after end of relationship                         | Minimum, then delete                                               | MLRO                  |
| Sanctions/PEP screening results                 | 5 years                                                   | Minimum                                                            | MLRO                  |
| Transaction monitoring alerts and dispositions  | 5 years                                                   | Minimum                                                            | MLRO                  |
| SAR/STR and supporting documents                | 5 years from filing                                       | Minimum; access restricted throughout                              | MLRO                  |
| Payment authorisation records (ACH/mandates)    | 2 years post-termination (Reg E) / longer under NACHA     | Per policy                                                         | Payments owner        |
| Dispute and chargeback case files               | Scheme rules + Reg E (2 years); often longer for evidence | Per policy                                                         | Payments owner        |
| Card data                                       | Only while a business need exists; SAD never              | Business need                                                      | Payments owner + CISO |
| Security and access logs                        | 12 months minimum under PCI; longer for SOX evidence      | Per policy, typically 12–24 months                                 | CISO                  |
| Application/debug logs containing personal data | None                                                      | Short — days to weeks                                              | Engineering + DPO     |
| Order and execution records (markets)           | 5 years, 7 on regulator request                           | Minimum                                                            | Compliance            |
| Employee access-review evidence                 | Audit period + policy                                     | Per policy                                                         | CISO                  |
| Marketing/analytics data                        | None                                                      | Consent-bound, short                                               | DPO                   |

Encode this table as configuration that a retention job reads, not as tribal knowledge. Every deletion
run writes an audit record of what class it removed and how many records (M14) — because "we deleted it
on schedule" is itself something you will be asked to prove.

## 14. Tax obligations that reach engineering

| Regime                                | What it is                                                                             | What your system must do                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FATCA** (US)                        | US persons' foreign accounts; 30% withholding for non-compliance; implemented via IGAs | Self-certification capture (W-9/W-8 series), indicia detection, classification, annual reporting to the IRS or local tax authority in the prescribed schema                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **CRS** (OECD)                        | Multilateral automatic exchange of financial account information                       | Tax-residency self-certification with change-of-circumstances monitoring, account classification, annual XML reporting per jurisdiction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **CARF / DAC8** (crypto)              | Crypto-Asset Reporting Framework and its EU implementation                             | DAC8 had a transposition deadline of **31 December 2025** and applies from **1 January 2026**: reporting crypto-asset service providers collect on transactions from that date, first report within nine months of the fiscal year end (so by **30 September 2027**), first automatic exchange between authorities by the same date. Non-EU CARF adopters run their own calendars — confirm the schema version per jurisdiction                                                                                                                                                                                                                                                                                                                                                                                         |
| **1099-K** (US)                       | Payment-card and third-party-network payee reporting                                   | Aggregate per payee per year and file. **The threshold has whipsawed and has now reverted.** The One Big Beautiful Bill Act (July 2025) retroactively reinstated the pre-ARPA threshold, so it is **gross payments exceeding $20,000 _and_ more than 200 transactions** — both conditions, per IRS guidance issued October 2025 — for 2025 and later. Some states set lower thresholds of their own. Never hard-code it: make the threshold a versioned, dated configuration value with an owner and a jurisdiction, and confirm the current-year value before each filing season                                                                                                                                                                                                                                       |
| **DAC7** (EU)                         | Platform-operator reporting of sellers' income                                         | Collect and verify seller identity, TIN and (for immovable property) address; report per quarter/annum in the prescribed schema; freeze payouts for non-responsive sellers where the rules require                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **VAT/GST place of supply**           | Where the supply is taxed, and who accounts for it                                     | Determine customer location with the evidentiary standard the rules require (typically two non-contradictory pieces), determine B2B vs B2C, apply reverse charge where applicable, validate VAT numbers against VIES and store the validation result with a timestamp                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Marketplace/deemed-supplier rules** | The platform is liable for VAT/sales tax on facilitated sales                          | The platform's liability must be modelled in the postings (M16), not netted into seller payouts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **E-invoicing mandates**              | Real-time or near-real-time invoice clearance                                          | Italy's SdI (long-standing, clearance model); **France**, whose reform is now live — from **1 September 2026** every established business must be able to _receive_ structured e-invoices through an approved platform, and large and mid-cap (ETI) companies must _issue_ them and meet the e-reporting obligation, with small and micro businesses' issuing obligation following on **1 September 2027**; enforcement is being applied with a documented soft-landing for genuine start-up difficulty, which is not the same as a deferral. LATAM clearance models (Brazil NF-e, Mexico CFDI, Chile) are the strictest — an invoice is not valid until the tax authority signs it                                                                                                                                     |
| **ViDA** (EU)                         | The VAT in the Digital Age package                                                     | Adopted **11 March 2025** as Directive (EU) 2025/516 with Regulation (EU) 2025/517 and Implementing Regulation (EU) 2025/518. Since **14 April 2025** member states may impose domestic e-invoicing mandates without a Commission derogation — which is why national mandates are now proliferating. Then: **1 January 2027** OSS/IOSS clarifications; **1 July 2028** deemed-supplier rules for short-term accommodation and passenger-transport platforms, single VAT registration and mandatory reverse charge; **1 July 2030** digital reporting requirements and structured e-invoicing for intra-EU B2B; **1 January 2035** domestic systems must converge on the EU model. Design invoice data to the EU standard now; retrofitting structured invoice data across a live billing system is a multi-year project |

**The standing advice: integrate a tax engine; do not hand-roll rates.** Rates, boundaries, product
taxability, thresholds and nexus rules change constantly and per jurisdiction; a hard-coded rate table is
a liability with a compounding interest rate. What _you_ own regardless of the engine: the determination
_inputs_ (location evidence, product tax codes, entity and registration data), the posting of tax as a
separate liability (M16) and the rounding policy applied to it (M5, `money-arithmetic.md`), the
immutability of a cleared e-invoice (M3 — in a clearance country the invoice number sequence and its
cleared state are regulated artifacts), and reconciliation between the engine, the ledger and the filed
return (M9, M19).

## 15. Building for audit

Audit readiness is a system property. Firms that treat it as a quarterly scramble pay twice: once in
engineering time reconstructing evidence, once in findings caused by evidence that does not exist.

### 15.1 The control matrix as an artifact

Maintain one document — versioned, in the repo, reviewed like code — mapping each obligation to a control,
an owner, an implementation and its evidence:

| Column      | Content                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------- |
| Obligation  | The regime and the specific requirement (e.g. "PCI DSS 10.4.1 — daily log review")              |
| Control     | What actually happens ("automated anomaly detection on CDE logs with alert routing to on-call") |
| Type        | Preventive / detective; automated / manual                                                      |
| Owner       | A named person, not a team                                                                      |
| Frequency   | Continuous, daily, quarterly, annual                                                            |
| Evidence    | The artifact and where it is generated from                                                     |
| Last tested | Date and result                                                                                 |

Coverage is bidirectional: every obligation maps to at least one control, and every control maps to at
least one obligation (a control with no obligation is either undocumented risk management or waste).

### 15.2 Evidence generation as a feature

Treat evidence like an API: a stable interface, a versioned query, reproducible output. Practically —
each control's evidence is produced by a scheduled job that writes a timestamped, immutable artifact to
audit storage with the parameters used; sampling is by a deterministic, documented method (auditors will
re-run it); and evidence about a period is generated _during_ that period, not reconstructed after it.

### 15.3 Log integrity

An audit trail that can be edited is not evidence. Minimum bar (M14): append-only storage with object-lock
/ WORM retention; write permissions separated from delete, with delete held by no standing human role;
hash-chaining or periodic signed digests, stored under different control than the logs, so tampering is
detectable; synchronised traceable time (M10, and §10 if markets rules apply); retention aligned to
§13.5. Then falsify it — have someone with production access attempt an alteration and confirm they are
both prevented and detected (M18).

### 15.4 Access review automation

Manual quarterly recertification consumes weeks and produces rubber-stamps. Automate: extract entitlements
from every in-scope system on a schedule; join against the HR roster to flag leavers, transfers and
dormant accounts; route each owner only their own delta; record decisions with timestamp and identity;
auto-revoke on non-response; and emit the auditor's evidence pack as an output of the process. Non-human
identities go through the same review — service accounts with standing production credentials and no
owner are a recurring finding.

### 15.5 Regulatory change process

Regimes move; this file's own hedging is the proof. Keep a watchlist of the regimes in your §1.1 table
with named owners; review on a schedule (quarterly, plus an event-driven path for consultations and final
rules); make each change produce an assessment (does it apply, what changes, by when), a dated backlog
item, and a control-matrix update; and re-run the §1 perimeter table annually, because your product
changed even if the law did not.

### 15.6 Artifacts every regulated-adjacent system should be able to produce on request

| Artifact                                                                                                                 | Answers                                                             | Should take |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ----------- |
| Trial balance for any past date, per currency                                                                            | "Do the books balance?" (M2)                                        | Seconds     |
| A named customer's full balance history reconstructed from postings                                                      | "Why is this balance what it is?" (M1, M3)                          | Seconds     |
| Reconciliation pack for any date: external statement vs ledger, with the break list, ages and owners                     | "Does your record match the world's?" (M9)                          | Minutes     |
| Complete audit trail for a single transaction: actor, approvals, idempotency key, resulting entries, external references | "Who did this and on what authority?" (M14, M11)                    | Seconds     |
| Access list for an in-scope system with last review date and sign-off                                                    | "Who can touch the money?" (M11)                                    | Minutes     |
| Change record for a production deploy: ticket, reviewer, tests, deployer, SHA, time                                      | "Was this change controlled?" (§8)                                  | Minutes     |
| Payment-page script inventory with justification and integrity mechanism                                                 | PCI 6.4.3 / 11.6.1                                                  | Minutes     |
| Retention and deletion run report by data class                                                                          | "Did you delete what you had to, and keep what you had to?" (§13.5) | Minutes     |
| Incident record with classification inputs, timeline and reports filed                                                   | DORA / breach notification                                          | Minutes     |
| ICT third-party register with criticality and exit-plan status                                                           | DORA                                                                | Minutes     |
| Report-to-ledger lineage for any published figure, and the last verification of every cached balance                     | "Where did this number come from?" (M19, M20, M17)                  | Minutes     |
| Control matrix with last-tested dates                                                                                    | "What controls do you have?" (§15.1)                                | Immediate   |

If any of these takes days, that is the finding — before the auditor arrives.

## Where to check the current text

This file was verified on 2026-09-10 and will decay. These are the sources to re-check against, not
secondary summaries — the §15.5 watchlist should point here.

| Regime                                                                    | Authoritative source                                                                                                          |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| EU legislation, consolidated texts, OJ publication dates                  | `eur-lex.europa.eu` — check the consolidated version date, and whether a "provisional agreement" has actually reached the OJ  |
| PSD2/PSD3/PSR, AML, safeguarding, instant payments RTS and Q&As           | `eba.europa.eu` (single rulebook + interactive Q&A)                                                                           |
| MiFID II/MiFIR, EMIR, CSDR/T+1, MiCA, CASP and ART/EMT registers          | `esma.europa.eu`                                                                                                              |
| DORA RTS/ITS, register of information taxonomy, incident templates        | the three ESAs; your own NCA for the submission portal and window                                                             |
| PCI DSS, SAQs, AOCs, ROC templates, FAQs, listed P2PE solutions           | `pcisecuritystandards.org` document library — the SAQs change more often than the standard                                    |
| Nacha Operating Rules, effective dates, return-rate thresholds            | `nacha.org/rules`                                                                                                             |
| US federal rules, comment deadlines, effective dates                      | `federalregister.gov`; `consumerfinance.gov`, `fincen.gov`, `occ.gov`, `federalreserve.gov` for the issuing agency's own page |
| FATF Recommendations, interpretive notes, list of high-risk jurisdictions | `fatf-gafi.org`                                                                                                               |
| IFRS standards and effective dates                                        | `ifrs.org`; `fasb.org` for ASC                                                                                                |
| Basel standards and jurisdictional implementation monitoring              | `bis.org/bcbs`; the PRA and the US agencies for their own rules                                                               |
| ISO 20022 message definitions, CBPR+ usage guidelines, migration status   | `swift.com/standards/iso-20022` and `iso20022.org`                                                                            |
| UK payments: safeguarding, APP reimbursement, PSR/FCA rules               | `fca.org.uk` and `psr.org.uk`                                                                                                 |

## Review questions

1. For each activity in §1, has someone _named_ recorded whether the regime applies and the basis for
   that answer — and would a new feature that changes who controls funds re-open the table automatically,
   or only if someone remembers?
2. Where is PAN, exactly, in every environment including test, logs, backups and analytics — and can you
   prove the answer mechanically rather than by assertion (M15)?
3. Who can add a script to the checkout page, and does that path include an approval and an integrity
   mechanism, or does a tag manager bypass both (PCI 6.4.3/11.6.1)?
4. If you claim an SCA exemption, can you reproduce the fraud rate that entitles you to it, from the
   ledger and the dispute records, for the relevant window (M19)?
5. If you hold client funds, can you produce every client's balance as at close of business on an
   arbitrary past date, reconciled to the safeguarding account, with the break list — and how long does
   it take (M1, M9, M10)?
6. Which of your regulatory clocks (Reg E error resolution, DORA 4/24/72 hours, DSAR one month, SAR
   deadlines) are enforced by timers and alerts in the system, and which depend on a human noticing a
   queue?
7. Can one identity write code, approve it, and deploy it to production — and is there any shared
   privileged account anywhere in the path to the ledger (M11, §8)?
8. When a customer demands erasure, what exactly happens to the postings, the PII, the KYC file and the
   backups — and is that answer written down with a legal basis, or improvised per request (M3, §13)?
9. Where does a number in your most regulator-facing report come from, step by step, and how many of
   those steps are a spreadsheet or a hand-run query (M19, §9)?
10. Which obligations in your control matrix have no evidence generated automatically — and what is the
    plan for the audit period that has already started?
