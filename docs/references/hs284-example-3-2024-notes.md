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

Add subsections below as you extract them from the PDF (optional but recommended for regression reviews).

## Key figures and steps (fill from PDF)

_Transcribe from `docs/HS284_Example_3_2024.pdf` when validating the calculation engine. Replace this placeholder content._

| Step / label | Value or description | PDF location (page/section) |
|--------------|------------------------|-----------------------------|
| _TBD_ | | |

## Precedence

If anything here conflicts with **`docs/PRD.md`**, the **PRD wins**. Update this file or an ADR when the product intentionally diverges from the PDF.
