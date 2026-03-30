# HS284 Example 3 (2024) — companion notes

**Companion to:** `docs/HS284_Example_3_2024.pdf`  
**Related PRD:** `docs/PRD.md` — **Appendix 4** (validation), **Appendix 5** (reference materials)

## Purpose

HMRC’s Help Sheet HS284 Example 3 is a **worked example** for share pooling and related steps. This Markdown file gives a **text-first** anchor for engineering review and AI-assisted work: the **PDF** remains the source for exact figures, tables, and wording.

Keep this file **under version control** next to the PDF. When you transcribe key numbers or steps from the PDF into this file, note the **PDF page or section** where each value appears.

## What to verify against the PDF

Cross-check the product and tests against the PDF for behaviours that `docs/PRD.md` **Appendix 4** calls out, including:

- **Section 104 pool formation** and updates after acquisitions and disposals.
- **Partial disposal** fraction logic (e.g. pool cost apportionment using sold vs held; pool roll-forward after the disposal).
- Consistency of the **computation narrative** with how the application explains pool steps (see PRD goals for explainability).

## Key figures and steps (from PDF)

**PDF:** `docs/HS284_Example_3_2024.pdf` — Example 3, pages 1–2 (“Example 3” / “Example 3 continued”).

### Narrative (dates and quantities)

| Event | Description |
|-------|-------------|
| Apr 2015 | Buys **1,000** Lobster plc shares at **400p** per share plus dealing costs **£150** (incl. VAT). First acquisition. |
| Sep 2018 | Buys **500** shares at **410p** per share plus dealing costs **£80** (incl. VAT). |
| May 2023 | Sells **700** shares at **480p** per share (**£3,360** disposal proceeds), dealing costs **£100** (incl. VAT). |
| Feb 2024 | Sells **400** shares at **520p** per share (**£2,080** disposal proceeds), dealing costs **£105** (incl. VAT). |

### Pool formation and roll-forward (PDF whole pounds)

The PDF rounds pool cost apportionment to **whole pounds** at each step. The product engine uses **penny precision (2dp)** for the pool; see “Engine expectations” below.

| Step | Event | Shares in pool | Pool of actual cost |
|------|--------|----------------|---------------------|
| 1 | Apr 2015 — pool formed | 1,000 | £4,150 |
| 2 | Sep 2018 — add new shares | 1,500 | £6,280 |
| 3a | May 2023 — disposal (cost fraction 700/1,500 of £6,280) | 800 | £3,349 (PDF; after deducting **£2,931**) |
| 4a | Feb 2024 — disposal (cost fraction 400/800 of £3,349) | 400 | £1,674 (PDF; after deducting **£1,675**) |

### May 2023 disposal (PDF)

- Allowable cost: £6,280 × 700 ÷ 1,500 = **£2,931** (PDF rounded).
- Gain: £3,360 − £2,931 − £100 (costs) = **£329** chargeable gain (PDF).

### Feb 2024 disposal (PDF)

- Allowable cost: £3,349 × 400 ÷ 800 = **£1,675** (PDF rounded).
- Gain: £2,080 − £1,675 − £105 = **£300** chargeable gain (PDF).

### Engine expectations (penny precision, Milestone 4)

Same narrative with **2dp** pool arithmetic:

| After event | Shares | Pool cost (GBP, 2dp) |
|-------------|--------|----------------------|
| Apr 2015 acquisition | 1,000 | 4,150.00 |
| Sep 2018 acquisition | 1,500 | 6,280.00 |
| May 2023 disposal | 800 | 3,349.33 |
| Feb 2024 disposal | 400 | 1,674.66 (2dp remainder after £1,674.67 allowable) |

- May 2023: allowable cost = £6,280 × 700 ÷ 1,500 = **£2,930.67**; gain = £3,360 − £2,930.67 − £100 = **£329.33**; SA108 rounded = **£329**.
- Feb 2024: allowable cost = £3,349.33 × 400 ÷ 800 = **£1,674.67**; gain = £2,080 − £1,674.67 − £105 = **£300.33**; SA108 rounded = **£300**.

### UK tax years (UTC date-only)

Both disposals fall in tax year **2023-24** (6 April 2023–5 April 2024): **2023-05-01** and **2024-02-01**.

Annual summary (illustrative): combined chargeable gains **£629.66**; AEA for 2023-24 **£6,000** (PRD); CGT **£0** at typical rates because gains are below AEA.

## Precedence

If anything here conflicts with **`docs/PRD.md`**, the **PRD wins**. Update this file or an ADR when the product intentionally diverges from the PDF.
