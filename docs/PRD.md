# Shares Gains UK Tax Calculator

**Status:** Draft
**Owner:** Paul Done
**Audience:** Product, Engineering, Architecture, Security, Operations
**Last updated:** 2026-03-28

---

## 1. Product Summary

Shares Gains UK Tax Calculator is a production-grade self-service web application for UK taxpayers who have received equity compensation from a US employer, especially RSUs and related share transactions administered through stock plan or brokerage platforms.

The application is focused on end users who need to import transaction history, understand their share events, and calculate UK capital gains tax outcomes in a clear and structured way.

This is not a generic public tax calculator and not an internal departmental CRUD workbench. It is a specialised end-user product for a narrow but realistic financial workflow.

The application must:

- run locally in development
- run in Docker
- run in Kubernetes
- connect to an external MongoDB Atlas database

Appendices 1–4 at the end of this document provide deep information on tax logic and calculation rules, data sources and import strategy, user experience and outputs, validation and risks to mitigate. **Appendix 5** lists external reference materials (including the HMRC HS284 Example 3 PDF and a companion notes file) used to align and verify implementation against HMRC’s published worked example.

---

## 2. Problem Statement

UK taxpayers with RSUs or similar equity compensation from a US employer often face a messy capital gains workflow.

Their transaction data may be spread across:

- stock plan platform exports
- brokerage records
- vesting events
- sales, transfers, and disposals
- partial lots and historical transactions

This creates several problems:

- users struggle to understand what happened and when
- imported records are not immediately usable for UK tax purposes
- the same data must be repeatedly cleaned, interpreted, and checked
- gains calculations are difficult to trust without clear explanations
- users need a repeatable workflow rather than one-off spreadsheet work

The product should make this process significantly easier, clearer, and more trustworthy for an end user.

---

## 3. Product Vision

Create a modern self-service web application that helps a UK taxpayer:

- import share transaction history
- organise and review their equity events
- calculate UK capital gains outcomes
- understand how those results were derived
- return later and continue safely
- maintain confidence in the data and calculation flow

The architecture should prioritise correctness, modularity, validation, explainability, and future extensibility.

---

## 4. Target Users

### 4.1 Primary users

- UK taxpayers who have received RSUs or similar equity compensation from a US employer
- users with share transactions administered through stock plan or brokerage platforms
- users who need self-service tooling rather than professional back-office handling

### 4.2 Secondary users

- future support or operations staff
- product and engineering stakeholders
- compliance or audit stakeholders for future product evolution

---

## 5. Core Jobs To Be Done

The application should eventually enable users to:

- create and manage a tax calculation workspace
- import transaction history from relevant stock plan or brokerage exports
- inspect and clean imported transaction data
- classify or interpret relevant share events
- calculate UK capital gains outcomes
- understand the calculation inputs and outputs
- review assumptions, data issues, and unresolved items
- update data and rerun calculations safely

---

## 6. Product Positioning

This product is:

- a UK self-service tax workflow application
- focused on equity compensation and share disposal history
- oriented around imported transaction data and explainable outcomes
- designed for a realistic niche user problem

This product is **not**:

- a general-purpose UK tax platform
- a broad personal finance product
- a public “estimate your tax in 30 seconds” toy
- a stock trading platform
- a payroll product
- a tax filing or submission service
- professional tax advice

---

## 7. Scope Framing

### 7.1 Initial build scope

The first implementation should focus on building a strong product and engineering foundation:

- clean application architecture
- self-service user workflow foundations
- validated configuration
- MongoDB integration
- rich CRUD capability where needed
- testable business-logic boundaries
- import-oriented design
- calculation-oriented domain boundaries
- Docker packaging
- Kubernetes deployment assets

### 7.2 Deferred scope

The following can be intentionally deferred until later product discovery is complete:

- exact import formats and mappings
- precise CGT rules and every edge case
- portfolio-wide advanced scenario modelling
- reporting and export formats
- authentication provider selection
- subscription and billing
- advanced support and admin tooling
- document generation
- broader tax-year workflow features

---

## 8. Functional Requirement Themes

This section is intentionally thematic rather than final. It should be refined after product discovery.

### 8.1 User workspace

The application should support a user returning to an existing workspace rather than treating each interaction as a one-shot calculation.

**TBD detail to refine later:**

- what is the top-level object: user workspace, tax year, calculation case, or portfolio
- how should saved work be organised
- what is draft vs final vs archived

### 8.2 Import and transaction data handling

The application should support importing transaction history from stock plan or brokerage exports and normalising it into an internal model.

**TBD detail to refine later:**

- which import formats are required first
- how much transformation is automatic vs user-assisted
- what data-quality checks are required
- how import errors are surfaced to users

### 8.3 Event review and data correction

The application should allow users to review imported events and resolve data ambiguities safely.

**TBD detail to refine later:**

- which fields are editable
- whether manual adjustments are permitted
- whether original imported data must remain immutable
- what audit trail should exist for corrections

### 8.4 Capital gains calculation

The application should support a calculation layer that is isolated from the UI and independently testable.

**TBD detail to refine later:**

- exact UK CGT rules and assumptions
- how share matching and lot treatment are represented
- what outputs and breakdowns users need
- how explanations should be presented

### 8.5 Explainability and user confidence

The application should help users understand how results were produced.

**TBD detail to refine later:**

- what explanation views are required
- what warnings or unresolved issues must be shown
- what assumptions must be explicit
- how confidence or data completeness should be communicated

---

## 9. Non-Functional Requirements

### 9.1 Correctness and validation

- Business logic must be strongly validated.
- Invalid or ambiguous input must fail clearly.
- Domain calculations must be testable independently of UI concerns.

### 9.2 Explainability

- The application should make it easy for a user to understand why a result was produced.
- Important assumptions and unresolved issues must be visible.
- Calculations should not behave like a black box.

### 9.3 Security

- Secure defaults are required.
- Secrets must never be hard-coded.
- Environment variables must be validated on startup.
- Sensitive user data must be treated carefully throughout the design.

### 9.4 Maintainability

- The codebase should remain modular and understandable.
- Domain logic must not be tightly coupled to UI components.
- The architecture should support iterative product discovery.

### 9.5 Operability

- The application must run locally in development.
- It must run in Docker.
- It must be deployable to Kubernetes.
- It must connect to an external Atlas-hosted MongoDB database.

### 9.6 Developer quality gates

- Build, lint, unit tests, and integration tests must be part of the validation workflow.
- Changes are not complete until validation passes cleanly.

---

## 10. Technical Constraints

### 10.1 Required stack

- TypeScript targeting ES2023
- Node.js >= 22.21.1
- Next.js
- React
- Tailwind CSS
- MongoDB native Node.js driver
- zod
- Jest
- Docker
- Kubernetes
- MongoDB Atlas

### 10.2 Agreed engineering decisions

- Package manager: npm
- Routing approach: Next.js App Router
- Testing framework: Jest
- Linting: ESLint with Next.js + TypeScript and project-specific strict rules
- Validation command: `npm run validate`

### 10.3 Architecture constraints

- repository pattern for all database access
- zod-based schema definitions and validation
- clear separation between UI, domain logic, repositories, configuration, and error handling
- no barrel files unless absolutely necessary
- strict typing with minimal ambiguity
- async/await only

---

## 11. Delivery Principles

- Build in milestones, not in one giant step.
- Prefer thin vertical slices over disconnected layers.
- Avoid inventing product requirements.
- Surface assumptions explicitly.
- Keep the initial architecture simple and extensible.
- Do not preserve backwards compatibility during refactors; update dependent code immediately.
- Remove dead code and unused imports as part of normal delivery.
- Do not suppress lint errors with eslint-disable comments.

---

## 12. Success Criteria

The initial build is successful if it provides:

- a clean production-grade application foundation
- one end-to-end vertical slice proving the architecture works
- validated configuration
- Mongo connectivity through repository abstractions
- meaningful test coverage for core business logic boundaries
- containerised deployment assets
- Kubernetes deployment assets
- a codebase that can be safely extended as the product is refined

---

## 13. Risks and Assumptions

### Assumptions

- the target user is a UK taxpayer using the product in self-service mode
- the product is focused on equity compensation and share disposal workflows
- MongoDB Atlas is the approved persistence platform
- Docker and Kubernetes are valid deployment targets

### Risks

- tax-domain rules may become complex quickly
- imported brokerage and platform data may be messy or inconsistent
- product scope may drift into broader tax workflows too early
- explainability requirements may be more demanding than initially expected

---

## 14. Open Questions

- what is the primary top-level object: workspace, tax year, calculation case, or something else
- what import format should be supported first
- what is the smallest useful end-to-end user flow
- what exact calculations are in scope for the first meaningful version
- what explanation views are required for user trust
- what audit history is required for user edits
- is authentication required immediately or can it be deferred
- what level of persistence is needed from day one

---

## 15. Out of Scope for This Starter PRD

This document does not yet define:

- exact CGT formulas and edge cases
- final import mappings
- final authentication model
- final deployment topology
- complete user workflow details
- all screens and UI interactions
- every validation rule
- production support tooling

Those items should be clarified during planning and milestone definition.


## APPENDIX 1: Tax logic and calculation rules

This section defines the minimum correct UK CGT treatment the calculation engine must implement for share disposals.

### Share identification and matching order

HMRC’s shares helpsheet HS284 sets out the legally required identification order when you dispose of shares of the same class in the same company (post‑6 April 2008 rules): 

1. Same-day rule: match shares disposed of on day D to shares acquired on day D.
2. 30-day (bed and breakfasting) rule: match remaining shares disposed of on day D to shares acquired in the 30 days following day D, subject to conditions (including UK residence at time of acquisition for acquisitions where that condition matters).
3. Section 104 holding: any remaining disposals are matched to the pooled holding (average cost pool). 

CG51560 (HMRC Capital Gains Manual) adds critical mechanical detail the app must follow:

* All acquisitions on the same day are treated as a single acquisition; all disposals on the same day as a single disposal.
* If there is both an acquisition and a disposal on the same day, the disposal is identified first against that same-day acquisition.
* The 30‑day rule applies to acquisitions within the 30 days after the disposal and has priority over other rules except same‑day matching. 

This means the app must never do FIFO by default, and it must never simply “sell the oldest RSUs first”. That approach is wrong under UK rules once you have multiple acquisitions. 

### Section 104 holding mechanics

HS284 is explicit that, since 6 April 2008, shares of the same class in the same company are held together in a Section 104 holding, where all costs are pooled and each share is treated as acquired at the same average cost, except where same-day and 30-day rules remove shares from the pool.
When a disposal is matched to the Section 104 holding, HS284 describes the allowable expenditure calculation:

* If all shares are disposed, allowable expenditure is the whole pool.
* If some shares are disposed, allowable expenditure is:
pool\_cost × (shares\_sold ÷ total\_shares\_in\_pool)
and then the pool is reduced accordingly. 

HMRC’s Example 3 (HS284 Example 3 2024\) is an authoritative worked example of how the pool is formed, how partial disposals take a fraction of pool cost, and how the pool carries forward after each disposal. The app must be able to reproduce this example’s mechanics exactly (at least for GBP‑denominated shares). 

### RSU-specific CGT base cost

For RSUs (typical “free shares because of your job”), HS287 states that when you acquire free or cheap shares outside an approved share scheme (and not via exercising a share option), the CGT cost is generally the market value at the date you acquire them. In RSU terms: vest/delivery date value is the natural acquisition point for CGT base cost.
HMRC’s Employment Related Securities Manual (ERSM180030) reinforces that, when shares are acquired in connection with employment, acquisition cost is typically:

* open market value at the date of acquisition, plus
* certain additional amounts charged to Income Tax as employment income (added for CGT purposes on the first disposal after acquisition, in relevant cases). 

Implication for product design:
The calculator must capture, per vesting event, at minimum:

* vest/delivery date
* number of shares delivered/treated as acquired
* market value per share (or total market value) on that date
so it can build correct acquisition “lots” (before applying UK pooling rules). 

### Foreign currency conversion (USD to GBP)

HMRC’s Capital Gains Manual (CG78310) states that where assets are acquired or sold for foreign currency, the sterling measure is the sterling worth at the date of acquisition or disposal of what is given or received, and that foreign currency amounts must be converted to sterling at the time the amount is incurred/received. The manual also states HMRC does not prescribe a single exchange-rate reference point, but expects a reasonable and consistent method.
Implication for product design:
The app must calculate each acquisition cost and disposal proceeds in GBP at the transaction date, not by computing a USD gain and converting once at the end. 

### Allowable costs on share disposals

HMRC (CG15250) lists what counts as allowable “incidental costs of acquisition and disposal” under the legislation, including professional fees/commissions, costs of transfer, advertising, and valuation/apportionment costs; the list is exhaustive and must be “wholly and exclusively” for acquisition/disposal.
Implication for product design:
The app must support including brokerage commissions/fees and similar transaction costs as allowable costs (for shares, these are typically captured as part of trade confirmations / transaction history). HS284 Example 3 explicitly subtracts dealing costs on disposal in computing the gain. 

### Date of disposal and tax-year assignment

HMRC’s CG14250 explains that where disposal/acquisition takes place under contract, section 28 TCGA 1992 fixes the time of disposal; for an unconditional contract, the disposal date is the date the contract is made (not completion).
Implication for product design:
For US stock trades, the relevant “CGT date” should default to the trade date (contract date), not settlement date, because the rate/allowance year boundary and the 30 October 2024 rate change are date-based. 

### Losses and carry-forward logic

GOV.UK states you can claim a capital loss on your return (or by writing if not in Self Assessment), and you can claim up to 4 years after the end of the tax year in which the disposal occurred.
HMRC’s CG15800 states:

* chargeable gains are reduced by current-year allowable losses, then by prior-year allowable losses (brought forward)
* losses brought forward are deducted after losses accruing in the tax year
* brought-forward losses cannot reduce net chargeable gains below the annual exempt amount (if relevant); any undeducted losses remain available for later years 

Implication for product design:
The engine must model:

* current-year netting of gains/losses
* optional usage of brought-forward losses only down to the annual exempt amount (not below)
* explicit user input for available brought-forward loss pool (because HMRC’s internal tracking is not automatically visible to users)

### Allowances, rates, and reporting thresholds from 2016 onwards

#### Annual exempt amount (AEA)

From 2016–17 onwards, the AEA values relevant to individuals are:

* 2016–17: £11,100 (no CPI increase; no Order made for that year)
* 2017–18: £11,300
* 2018–19: £11,700
* 2019–20: £12,000
* 2020–21 to 2022–23: £12,300
* 2023–24: £6,000
* 2024–25 and 2025–26: £3,000 

Note: HMRC guidance explicitly says you can use your AEA against gains charged at the highest rates to reduce tax due—this matters in 2024–25 because rates changed mid-year. 

#### CGT rates relevant to share disposals (higher-rate assumption)

For disposals from 6 April 2016, HMRC policy documents explain the main CGT rates for most assets (including shares) were reduced from 18%/28% to 10%/20% (with exclusions such as residential property and carried interest), effective 6 April 2016\.
Given the product assumption, the default “higher-rate” share CGT rate is therefore 20% for disposals before 30 October 2024 (unless future legislation changes it).
For 2024–25, HMRC guidance states the main CGT rates changed for disposals on or after 30 October 2024, and the SA return did not automatically calculate the new main rates for that year, requiring an adjustment mechanism.
HMRC’s published rates page shows, for individuals, the main rates were 10%/20% up to 29 October 2024, then 18%/24% from 30 October 2024, and 18%/24% from 6 April 2025 onwards.
Implication for product design:
With the “higher-rate taxpayer” assumption, the app must compute:

* 20% CGT on share gains where the disposal date is on/before 29 Oct 2024 (and on/after 6 Apr 2016), and
* 24% CGT on share gains where the disposal date is on/after 30 Oct 2024\. 

#### Reporting thresholds (Self Assessment triggers)

HMRC’s “work out if you need to pay” guidance states that from the 2023–24 tax year onwards, even if taxable gains are below the allowance, you still need to report in your tax return if:

* total amount you sold assets for was more than £50,000, and
* you’re registered for Self Assessment. 

The Autumn Statement 2022 policy paper explicitly states the measure fixes the CGT proceeds reporting limit at £50,000, and explains that prior law required CGT pages where total consideration exceeded four times the AEA.
Implication for product design:
The app should include a “Do I need to report?” section per tax year:

* 2016–17 to 2022–23: use the “4× AEA proceeds” concept (as described in the policy background)
* 2023–24 onwards: use the £50,000 proceeds threshold (plus gains \> AEA)


## APPENDIX 2: Data sources and import strategy

### FX rates (USD/GBP) using the Bank of England

The app must use daily USD/GBP spot rates from the Bank of England database, as requested. The Bank of England publishes daily spot rates against sterling and explicitly notes they are not official rates and “no more authoritative than that of any commercial bank”.
The Bank of England database provides a daily spot series for “US $ into Sterling” (commonly referenced by series code XUDLUSS), which can be retrieved by date range and used as the conversion reference.
HMRC’s CG78310 confirms HMRC does not prescribe a single exchange-rate reference point, but expects a method that is reasonable and consistent—so using the Bank of England consistently is defensible.
Functional data requirements

* Store daily rates for all trade/vesting dates used.
* Make the applied rate visible per transaction in the computation output (auditability).
* Handle missing dates (e.g., bank holidays) by applying a documented fallback rule (e.g., “use the most recent prior published rate”), and flag it to the user (because this is a methodological choice, not a hard-coded HMRC prescription). 

### RSU vesting inputs (the non-negotiable data)

To compute UK CGT correctly, vesting/delivery events must be represented as acquisitions with:

* date acquired
* shares acquired
* market value (USD) per share or total (USD) at acquisition

HS287 and ERSM180030 together make clear that employment-related “free or cheap shares” generally take market value at acquisition as CGT base cost (plus relevant income-tax-charged amounts in some cases).
If the broker’s “transaction history” export does not include vesting acquisitions cleanly, the app must support importing vesting confirmations. The E\*TRADE Equity Edge Online reporting documentation for a “Confirmation of Release” states the confirmation statement provides information including date, award type, number of shares released, market value, and award price per share. 

### Sell transactions and broker exports

At minimum, the calculator must import sell transactions with:

* trade date (contract date for CGT purposes)
* symbol
* quantity
* sale price and currency (USD)
* transaction costs/fees (if available)
* gross and/or net proceeds (USD)

E\*TRADE exposes transaction retrieval capability via its API (“List Transactions” endpoint), which is relevant either for a future direct integration or as evidence of a structured transaction model.
Third-party import guides indicate E\*TRADE exports a transaction history file (commonly referenced as “DownloadTxHistory.csv”) and warn about limitations such as missing trade times, implying date-level matching is realistic.
Import approach (PRD requirement) Because real-world exports vary by account type (stock plan vs brokerage, US vs non-US participant view, employer customisations), the importer must be robust:

* accept common formats: CSV and “Excel-style CSV”
* provide a mapping UI: user maps columns to required fields
* infer event types (sell vs vest/release vs misc. cash movement) with a transparent rule set
* support multiple file uploads per user (e.g., a trades CSV plus vesting confirmations)

## APPENDIX 3: User experience and outputs

### Core workflow

The product must guide the user through a predictable sequence:

1. Set scope and assumptions
* confirm UK tax years covered (2016–17 onward)
* confirm “Higher-rate taxpayer assumption”
* confirm asset scope: US shares acquired via RSU vesting
* confirmation that FX uses Bank of England daily spot rates
2. Import data
* upload transaction history (sales)
* upload vesting/release data (or manually enter vesting rows if needed)
* show validation: missing vest prices, missing share counts, unknown symbols, duplicated rows, negative quantities, mismatched totals
3. Review and normalise
* show a ledger view grouped by tax year (6 April–5 April)
* show the USD→GBP rate used per date
* allow the user to override the rate source for a specific date only by adding a note (audit trail), because HMRC expects consistent methodology.
4. Calculate and explain
For each disposal, the output must show:
* disposal date and tax year
* quantity sold
* matching breakdown: “same day”, “within 30 days after disposal”, “Section 104 pool”
* allowable cost calculation (including pool fraction where relevant)
* gain/loss in GBP
* updated Section 104 pool position after the disposal
5. Annual summary
For each tax year, show:
* total gains, total losses
* net gains after losses
* annual exempt amount applied (including “apply to highest-rate gains” logic)
* losses brought forward used (and remaining carried forward, if any)
* computed CGT due (using the “higher-rate” rate per applicable date window)
* show whether the user is likely required to report based on proceeds/gains rules for that year (including the £50,000 threshold from 2023–24 onward). 

### Key “RSU timing nuance” explanations (must be in-product)

The app should explicitly explain these patterns, because they will confuse users:

* Sell on the same day as vesting: same-day rule means the disposal is identified first against the acquisition on that day.
* Sell, then vest within 30 days: the disposal can be matched to shares acquired within 30 days after the disposal under the bed and breakfasting rule, which can change the gain/loss compared with “I sold what I already had”.
* Vest, then sell within 30 days: the 30‑day rule is about acquisitions after a disposal; the vesting acquisition being before the sale doesn’t automatically trigger 30‑day matching, but later acquisitions after the sale might. The tool should explain this directionality in plain English, backed by the rule definition (“acquired within the 30 days after the disposal”). 

### Outputs and export formats

Outputs must be designed to be useful for Self Assessment record keeping and for answering HMRC questions. At minimum:

* “Computation pack” PDF (or print view) including:
* transaction ledger
* exchange rates used
* per-disposal computations
* Section 104 pool roll-forward schedule (showing pool shares and pool cost after each operative event, mirroring HS284’s approach)
* CSV export of all computed disposals including matched-share source (same-day / 30-day / pool)
* A year summary view aligned with the concepts in SA108 (without trying to auto-fill SA108 fields blindly)

For 2024–25, the product must explicitly flag that the main CGT rate changed on 30 October 2024 and that HMRC created an adjustment approach because Self Assessment did not automatically handle the new main rates in that year.

## APPENDIX 4: Validation + Risks To Mitigate

### Validation strategy (minimum acceptance tests)

The CGT engine must pass at least these validation points:

* Section 104 pool arithmetic:
Reproduce HS284 Example 3 pool formation and partial-disposal fraction logic (pool cost × sold/held; pool roll-forward). See **Appendix 5** for repository paths to the HMRC PDF and the companion notes file.
* Same-day matching:
A disposal and acquisition on the same day must match first against that day’s acquisitions.
* 30-day rule directionality:
Later acquisitions within 30 days after a disposal must be matched in priority after same-day matching.
* FX handling:
Prohibit “compute gain in USD then convert once”; instead, store sterling equivalents per transaction date, consistent with HMRC guidance.
* Loss utilisation rules:
Current-year losses before brought-forward; brought-forward losses only down to AEA (not below).
* 2024–25 rate change:
Disposals before and after 30 Oct 2024 in the same tax year must use the correct rates and surface the “rate change year” explanation. 

### Major risks and how to mitigates them

**Incomplete vesting data**
If the user only has sell transactions and no vesting market values, the CGT base cost is guesswork. HS287/ERSM guidance makes clear base cost depends on market value (and/or taxed amounts) at acquisition. The PRD must therefore treat vesting data as mandatory and block “final calculation” until vesting acquisitions are complete.

**Export variability across E\*TRADE/Morgan Stanley at Work setups**
You will not reliably get one universal CSV schema. The mapping-based importer and support for “confirmation of release” sources is how you avoid building a brittle parser. The Equity Edge Online confirmation documents are a realistic vesting source because they include release date and market value fields.

**Users silently falling outside assumptions**

* Not a UK resident at relevant times: 30-day rule has residence-linked conditions in HMRC guidance; the PRD should require an onboarding “residence confirmation” with a warning that the calculator is not for mixed-residence cases.
* Users not actually higher-rate for CGT banding: the PRD should require the UI to label results as “higher-rate assumption”, and the export should include that assumption.

**Corporate actions and reorganisations**
HS284 explicitly flags share reorganisations and takeovers as exceptions where events may not be treated as acquisitions. That is out of scope for v1, but the roadmap should include it.

## APPENDIX 5: External reference materials (HS284 Example 3)

This appendix does **not** restate tax law. It tells **product and engineering** where to find the HMRC worked example and how it relates to this PRD.

### A5.1 Files in the repository

| File | Purpose |
|------|---------|
| `docs/HS284_Example_3_2024.pdf` | **HMRC Help Sheet HS284** — Example 3 (2024 version as stored in the repo). Authoritative **layout, narrative, and figures** for that worked example. |
| `docs/references/hs284-example-3-2024-notes.md` | **Companion notes** in Markdown: what to verify against the PDF, cross-links to PRD validation points, and space to record key figures in plain text for reviews and AI-assisted work. |

Commit the PDF under `docs/` so paths remain stable. If the PDF filename or tax year label changes, update this appendix and the notes file.

### A5.2 How these materials should be used

- **Engineering and QA:** When implementing or testing **Section 104 pooling**, **partial disposals**, and **pool roll-forward** behaviour described in this PRD (including **Appendix 4** acceptance tests), consult **`docs/HS284_Example_3_2024.pdf`** and align explanations and arithmetic with that example unless this PRD explicitly differs.
- **AI-assisted implementation:** Treat the **PDF** as the visual and numeric reference; treat **`docs/references/hs284-example-3-2024-notes.md`** as the first text-native place to anchor automated reasoning. Prefer updating the notes file with transcribed tables or step summaries when the PDF is hard to index.
- **Users and support:** The application remains a self-service tool, not a filing service. These files support **internal correctness**, not end-user filing instructions.

### A5.3 Precedence if sources disagree

1. **`docs/PRD.md`** (including appendices 1–4) defines **product scope and domain rules** for this application.
2. **`docs/HS284_Example_3_2024.pdf`** is the reference for **alignment with HMRC’s published Example 3** for the behaviours this PRD says must match it (see **Appendix 4**).
3. If the **PDF** (or HMRC guidance) appears to conflict with **`docs/PRD.md`**, **the PRD wins** for product behaviour; record the deliberate divergence (or error) in an ADR or PRD change note—do not silently follow the PDF.

### A5.4 Relationship to Appendix 4

**Appendix 4** requires the CGT engine to pass validation points that explicitly reference reproducing **HS284 Example 3** pool and partial-disposal logic. Use the files in **A5.1** as the concrete artefacts for that comparison.
