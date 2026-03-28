# Implementation Plan - Shares Gains UK Tax Calculator

**Status:** Draft
**Prepared by:** Paul Done
**Last updated:** 2026-03-28

---

## 1. Purpose

This document is the working implementation plan for Shares Gains UK Tax Calculator.

Its purpose is to turn the PRD and project rules into a staged engineering plan before coding begins. It should be updated during planning and delivery.

This is not the final product specification.
It is the execution plan for how the codebase will be created and evolved.

---

## 2. Inputs

This plan should be based on:

- `docs/PRD.md`
- `.cursor/rules/project.mdc`
- the current repository state
- stakeholder answers to unresolved product questions
- any future ADRs or architecture notes
- **`docs/HS284_Example_3_2024.pdf`** — HMRC HS284 Example 3 (2024 artefact in repo); worked example for pool formation, partial disposals, and roll-forward alignment referenced in `docs/PRD.md` **Appendix 4** and **Appendix 5**
- **`docs/references/hs284-example-3-2024-notes.md`** — text companion to the PDF; use for milestones below and to record transcribed figures from the PDF

### 2.1 When to consult HS284 Example 3 materials

- **Milestone 4 — Calculation engine foundation:** Before and while defining calculation services and unit tests for **Section 104 pooling** and **partial disposal** logic, consult **`docs/HS284_Example_3_2024.pdf`** and **`docs/references/hs284-example-3-2024-notes.md`**. Align test cases and explanations with Example 3 where `docs/PRD.md` requires it (see PRD **Appendix 4**).
- **Any milestone** that claims satisfaction of PRD **Appendix 4** validation points involving HS284 Example 3: re-check the PDF (and update the notes file if you transcribe key figures for regression checks).
- **Precedence:** `docs/PRD.md` overrides the PDF if they conflict; document deliberate differences in an ADR or PRD change note (per PRD **Appendix 5**).

---

## 3. Agreed Early Decisions

These decisions are already confirmed:

- Package manager: `npm`
- Next.js routing approach: **App Router**
- Testing framework: `Jest`
- Linting: `ESLint` with Next.js + TypeScript configuration plus strict project rules
- Validation command: `npm run validate`

These decisions should be reflected in the initial scaffolding and tooling.

---

## 4. Delivery Strategy

### 4.1 Principles

- plan before coding
- implement in milestones
- prefer vertical slices
- keep product assumptions explicit
- keep architecture simple and extensible
- verify every milestone with build, lint, and tests
- avoid speculative overbuilding

### 4.2 Definition of done

A milestone is done when:
- the scoped functionality is implemented
- the code structure is consistent with project rules
- validation passes
- key assumptions are documented
- follow-up work is clearly listed

---

## 5. Proposed Technical Architecture

### 5.1 Application shape

A single Next.js application using the App Router and providing:
- a user-facing web interface
- route handlers or server-side endpoints as needed
- domain services for business logic
- repository-based persistence against MongoDB Atlas
- Docker packaging
- Kubernetes deployment manifests

### 5.2 Layering

The codebase should be structured so that:
- React components focus on presentation and interaction
- route handlers and server-side logic orchestrate requests
- domain services implement business rules
- repositories encapsulate database access
- zod schemas validate inputs and configuration
- shared errors and config are centralised

### 5.3 Persistence

MongoDB Atlas is the external database.
Use the native MongoDB Node.js driver.

All persistence should flow through repository classes.

### 5.4 Validation

Use zod for:
- environment validation
- request and input validation
- import data validation
- domain model validation
- transformation boundaries

### 5.5 Testing

Use Jest for:
- unit tests for business logic
- unit tests for parsing and transformation logic
- integration tests for repository and API behaviour

### 5.6 Deployment

The app must support:
- local development
- Docker execution
- Kubernetes deployment
- environment-based configuration for Atlas connectivity

---

## 6. Proposed Repository Structure

This is the initial target structure and may be refined during planning:

```text
/
├─ .cursor/
│└─ rules/
│ └─ project.mdc
├─ docs/
│├─ PRD.md
│└─ IMPLEMENTATION_PLAN.md
├─ src/
│├─ app/
││├─ api/
││├─ globals.css
││├─ layout.tsx
││└─ page.tsx
│├─ components/
││├─ ui/
││└─ feature/
│├─ domain/
││├─ errors/
││├─ models/
││├─ schemas/
││├─ services/
││└─ value-objects/
│├─ repositories/
│├─ lib/
││├─ config/
││├─ db/
││└─ utils/
│└─ test/
│ ├─ integration/
│ └─ unit/
├─ docker/
├─ k8s/
├─ public/
├─ .env.example
├─ package.json
├─ tsconfig.json
└─ ...
```


---

## 7. Milestone Plan

### Milestone 0 - Planning and repo bootstrap

**Goal:** establish the repo, docs, project rules, and initial engineering direction.

#### Tasks

- [ ] Create repo
- [ ] Add starter PRD
- [ ] Add project rule
- [ ] Confirm package manager choice
- [ ] Confirm Next.js App Router approach
- [ ] Confirm initial testing and linting setup
- [ ] Review unresolved product questions

#### Recorded decisions

- [x] Package manager: npm
- [x] Routing approach: Next.js App Router
- [x] Testing framework: Jest
- [x] Linting: ESLint with Next.js + TypeScript plus project-specific strict rules
- [x] Validation command: `npm run validate`

#### Exit criteria

- [ ] repo exists
- [ ] planning documents exist
- [ ] initial architecture direction is agreed

---

### Milestone 1 - Application foundation

**Goal:** create a production-grade application skeleton with validated configuration and deployable runtime assets.

#### Tasks

- [ ] Bootstrap Next.js + React + TypeScript + Tailwind
- [ ] Establish source directory layout
- [ ] Add zod-based environment validation
- [ ] Add MongoDB connection scaffolding
- [ ] Add repository base patterns
- [ ] Add shared error and config structure
- [ ] Add Jest setup
- [ ] Add ESLint config
- [ ] Add Dockerfile(s)
- [ ] Add initial Kubernetes manifests
- [ ] Add a basic landing or health page
- [ ] Ensure app starts and builds locally

#### Exit criteria

- [ ] app runs locally
- [ ] config is validated on startup
- [ ] Docker build works
- [ ] Kubernetes manifests exist in initial form
- [ ] validation commands run successfully

---

### Milestone 2 - First thin vertical slice

**Goal:** prove the architecture with one complete end-to-end workflow.

#### Candidate scope

Implement one small but realistic feature slice that includes:

- one persisted entity
- one repository
- one domain service
- one route or server-side mutation path
- one UI page
- validation
- unit tests
- integration tests

#### Exit criteria

- [ ] a complete slice works end-to-end
- [ ] the architecture feels practical
- [ ] tests cover the key logic boundaries
- [ ] no major structural rework is immediately required

---

### Milestone 3 - Import workflow foundation

**Goal:** establish the first meaningful import-oriented workflow for stock transaction data.

#### Candidate tasks

- [ ] define import file boundary and input contract
- [ ] define internal transaction or event model
- [ ] add parsing and normalisation services
- [ ] add validation and error reporting for imported data
- [ ] add UI for import review
- [ ] add unit tests for import and transformation logic

#### Exit criteria

- [ ] at least one import flow is demonstrated end-to-end
- [ ] normalised data model is testable and understandable
- [ ] invalid input is surfaced clearly

---

### Milestone 4 - Calculation engine foundation

**Goal:** introduce modular calculation behaviour without coupling it tightly to the UI.

#### Candidate tasks

- [ ] define calculation input and output contracts
- [ ] add calculation services
- [ ] add explanation and breakdown structures
- [ ] add focused unit tests for calculation rules
- [ ] keep calculation logic isolated from rendering concerns

#### Exit criteria

- [ ] calculations are independently testable
- [ ] outputs are understandable and inspectable
- [ ] business rules are not buried in UI code

---

### Milestone 5 - User trust and operational hardening

**Goal:** make the system more credible for real user-facing use.

#### Candidate tasks

- [ ] add history or audit-friendly change tracking where needed
- [ ] improve error handling and user messaging
- [ ] improve data quality warnings and unresolved-item handling
- [ ] refine Docker and Kubernetes assets
- [ ] review security and configuration handling
- [ ] improve operational and support docs

#### Exit criteria

- [ ] important user actions are traceable where required
- [ ] deployment assets are credible
- [ ] the product is easier to operate, support, and trust

---

## 8. Immediate Open Questions

These questions should be answered before Milestone 2 is finalised:

- what is the primary top-level object
- what is the minimum useful end-to-end workflow
- what import format should be supported first
- what exact calculation behaviour is in or out for the first meaningful slice
- what explanation output is required for user trust
- what persistence model is needed from day one
- is authentication required immediately or can it be deferred
- what operational constraints exist for Docker and Kubernetes deployment

---

## 9. ADR Candidates

Potential decisions that may deserve ADRs:

- choice of application folder structure
- Next.js server action vs route-handler boundaries
- repository abstraction design
- error taxonomy
- environment and config loading strategy
- test structure and execution strategy
- import pipeline design
- calculation-service boundary design
- authentication and authorization approach

---

## 10. Validation Strategy

For each meaningful milestone:

- run `npm run build`
- run `npm run lint`
- run `npm test`
- run `npm run validate`

For refactors and feature work, `npm run validate` is the final quality gate.

No milestone should be marked complete while validation is failing.

---

## 11. Risks

- product scope may become tax-domain heavy before the data model is stable
- import formats may prove messy and inconsistent
- explainability requirements may push more domain modelling earlier than expected
- unclear user workflow boundaries may create rework
- premature over-modelling could slow delivery
- under-modelling could create a messy codebase quickly

---

## 12. Assumptions

- this is a self-service end-user product
- the initial goal is architectural strength, not complete tax-domain coverage
- MongoDB Atlas is fixed
- Docker and Kubernetes are both relevant deployment targets
- strict linting, validation, and testing are required
- backwards compatibility is not a goal during early refactoring

---

## 13. Plan Review Checklist

Before implementation starts, confirm:

- [ ] PRD has been reviewed
- [ ] project rules are in place
- [ ] the smallest useful milestone is identified
- [ ] open product questions are clearly listed
- [ ] initial repo structure is agreed
- [ ] validation strategy is agreed
- [ ] Milestone 1 scope is approved

---

## 14. Cursor Planning Prompt To Reuse

Use this prompt when starting or revising the plan:

> Read `docs/PRD.md` and `.cursor/rules/project.mdc`.  
> Do not write code yet.  
> Identify open questions, challenge weak assumptions, and update this implementation plan.  
> Propose the smallest safe next milestone, the files likely to be created or changed, the validation strategy, and any ADRs that should be written before implementation.
