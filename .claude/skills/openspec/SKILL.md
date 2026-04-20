---
name: openspec
description: Guide the user through spec-driven development using the OpenSpec standard (Fission-AI/OpenSpec). Use when the user asks to create a proposal, write specs, design a change, draft tasks, apply/archive a change, or otherwise says "openspec", "/opsx:*", "spec-driven", "write a spec", "propose a change", or works inside an `openspec/` directory.
---

# OpenSpec — Spec-Driven Development

This skill guides the user through the **OpenSpec** methodology (https://github.com/Fission-AI/OpenSpec): a lightweight framework for specification-driven development where humans and AI agents agree on behavior before code is written.

**Guiding principles** (from OpenSpec): *fluid not rigid, iterative not waterfall, easy not complex, brownfield-first.* Dependencies between artifacts are enablers, not gates — create what makes sense, in the order that makes sense.

## When to invoke which sub-flow

Inspect the user's intent and jump straight to the matching section below. Do not walk through all sections sequentially.

| User says / situation | Go to |
|---|---|
| "Set up OpenSpec", no `openspec/` directory yet | [1. Initialize](#1-initialize) |
| "Propose a change", "new feature", `/opsx:propose`, `/opsx:new` | [2. Create a change](#2-create-a-change) |
| "Write a spec", "add requirements", editing `specs/**/spec.md` | [3. Write specs](#3-write-specs-source-of-truth) |
| "Write a delta spec", modifying existing behavior in a change | [4. Write delta specs](#4-write-delta-specs-insidea-change) |
| "Write the design", `design.md`, architecture decisions | [5. Write the design](#5-write-designmd) |
| "Break this into tasks", `tasks.md`, implementation checklist | [6. Write tasks](#6-write-tasksmd) |
| "Implement the tasks", `/opsx:apply` | [7. Apply](#7-apply-implement) |
| "Verify", check implementation against spec | [8. Verify](#8-verify) |
| "Archive", `/opsx:archive`, merge deltas into main specs | [9. Archive](#9-archive) |

## Directory model (memorize this)

```
openspec/
├── specs/                       # Source of truth — current system behavior
│   └── <domain>/spec.md         # One domain per folder (auth, payments, ui, …)
└── changes/                     # Proposed modifications — one folder per change
    ├── <change-name>/
    │   ├── proposal.md          # Why + what (intent, scope, approach)
    │   ├── design.md            # How (technical approach, decisions)
    │   ├── tasks.md             # Implementation checklist
    │   └── specs/               # DELTA specs (ADDED / MODIFIED / REMOVED)
    │       └── <domain>/spec.md
    └── archive/
        └── YYYY-MM-DD-<change-name>/   # Completed changes, preserved for history
```

Key distinction: **`openspec/specs/`** describes how the system works *now*. **`openspec/changes/<name>/specs/`** describes what's *changing* (as deltas, not full specs).

## 1. Initialize

If `openspec/` does not exist in the repo, scaffold it:

```
openspec/
├── specs/
│   └── .gitkeep
├── changes/
│   ├── archive/
│   │   └── .gitkeep
│   └── .gitkeep
└── project.md      # brief description of the product for future agents (optional)
```

The OpenSpec CLI (`openspec init`, requires Node ≥ 20.19) does this automatically and also registers slash commands with your AI tool. If the user has it installed, prefer the CLI. Otherwise, create the folders by hand and proceed.

## 2. Create a change

When the user wants to propose a new feature, fix, or modification:

1. **Pick a kebab-case name** describing the change — `add-dark-mode`, `fix-login-redirect`, `implement-2fa`, `optimize-product-query`. Avoid generic names (`feature-1`, `update`, `wip`).
2. **Create the folder** `openspec/changes/<name>/`.
3. **Ask the user for intent and scope** *before* drafting anything. You need:
   - Why this change? What problem does it solve?
   - What's explicitly in scope? Out of scope?
   - Any constraints (deadlines, dependencies, compatibility)?
4. **Draft `proposal.md` first** (see template below). Get alignment before writing specs or tasks.
5. **Then** move on to specs/design/tasks as needed. Dependencies (from the default `spec-driven` schema):
   - `proposal.md` — no deps
   - `specs/**/*.md` (delta specs) — requires `proposal.md`
   - `design.md` — requires `proposal.md` (parallel with specs)
   - `tasks.md` — requires specs *and* design

### `proposal.md` template

```markdown
# Proposal: <Change title>

## Intent
<One short paragraph: why this change exists, what problem it solves, who asked for it.>

## Scope
In scope:
- <bullet>
- <bullet>

Out of scope:
- <bullet — things you explicitly will NOT do, to prevent scope creep>

## Approach
<2–5 sentences describing the high-level approach. Stay at the "what/why" level; keep implementation details for design.md.>
```

**Update the proposal whenever:** scope narrows/expands, intent clarifies, or the approach fundamentally shifts.

## 3. Write specs (source of truth)

Specs in `openspec/specs/<domain>/spec.md` describe **current, agreed-upon behavior**. Write them directly only when you're documenting existing behavior or greenfield-initializing a spec. For *changes* to existing behavior, use delta specs (section 4).

### Spec structure

```markdown
# <Domain> Specification

## Purpose
<One short paragraph describing what this spec covers.>

## Requirements

### Requirement: <Short requirement name>
The system SHALL/MUST/SHOULD <behavior statement>.

#### Scenario: <Concrete example name>
- GIVEN <precondition>
- WHEN <trigger/action>
- THEN <observable outcome>
- AND <additional outcome, optional>

#### Scenario: <Another example — cover edge cases and error paths>
- GIVEN …
- WHEN …
- THEN …

### Requirement: <Next requirement>
…
```

### Rules for good specs

- **Behavior, not implementation.** If implementation can change without changing externally visible behavior, it doesn't belong in the spec. Move class names, library choices, and step-by-step plans to `design.md` or `tasks.md`.
- **RFC 2119 keywords:**
  - `MUST` / `SHALL` — absolute requirement.
  - `SHOULD` — recommended; exceptions allowed with justification.
  - `MAY` — optional.
- **Every requirement needs at least one scenario.** Prefer 2+: a happy path and an edge/error case. Scenarios must be testable — a reader should be able to write an automated test from the Given/When/Then.
- **Keep it lightweight.** Start with a Lite spec (short requirements, a few acceptance checks). Only expand to full rigor for higher-risk changes (cross-team, API/contracts, migrations, security, privacy).
- **Organize specs by domain**, not by file type. Common patterns: by feature area (`auth/`, `payments/`), by component (`api/`, `frontend/`), or by bounded context (`ordering/`, `fulfillment/`).

## 4. Write delta specs (inside a change)

A **delta spec** lives at `openspec/changes/<change-name>/specs/<domain>/spec.md` and describes what's changing relative to `openspec/specs/<domain>/spec.md`. This is the key pattern that makes OpenSpec work for brownfield code.

### Delta spec template

```markdown
# Delta for <Domain>

## ADDED Requirements

### Requirement: <New requirement name>
The system MUST <behavior>.

#### Scenario: <Happy path>
- GIVEN …
- WHEN …
- THEN …

#### Scenario: <Edge or error case>
- GIVEN …
- WHEN …
- THEN …

## MODIFIED Requirements

### Requirement: <Existing requirement name — must match current spec>
The system MUST <new behavior>.
(Previously: <old behavior, one line>)

#### Scenario: <Updated scenario>
- GIVEN …
- WHEN …
- THEN …

## REMOVED Requirements

### Requirement: <Name of requirement being removed>
(Deprecated because <one-line reason>. <Optional: what replaces it>.)
```

### Delta section semantics (what archiving does)

| Section | On archive |
|---|---|
| `## ADDED Requirements` | Appended to main spec |
| `## MODIFIED Requirements` | Replaces the matching requirement in main spec |
| `## REMOVED Requirements` | Deleted from main spec |

**Only include sections you actually use.** A pure addition needs only `## ADDED Requirements`. Don't write empty `MODIFIED` / `REMOVED` sections.

**Requirement names under `MODIFIED` and `REMOVED` must match the names in the main spec** — that's how the archive merge locates them.

## 5. Write `design.md`

The design captures the **technical approach and architecture decisions** — the "how" that was deliberately kept out of the spec.

```markdown
# Design: <Change title>

## Technical Approach
<2–4 paragraphs describing the overall solution.>

## Architecture Decisions

### Decision: <Short decision name>
<Chosen option.> Because:
- <reason>
- <reason>
Alternatives considered: <brief>.

### Decision: <Next decision>
…

## Data Flow
<Optional: ASCII diagram, sequence description, or component interaction.>

## File Changes
- `path/to/new-file.ts` (new)
- `path/to/existing.ts` (modified)
- `path/to/old.ts` (deleted)
```

Only write a design doc when there's something worth recording — non-trivial trade-offs, architectural shifts, or decisions future-you will want to revisit. Small changes can skip `design.md` entirely.

## 6. Write `tasks.md`

Tasks are the **implementation checklist**: concrete, checkboxable steps. The AI (or human) works through them during `/opsx:apply`.

```markdown
# Tasks

## 1. <Group name — e.g. "Data model">
- [ ] 1.1 <Small, verifiable step>
- [ ] 1.2 <Small, verifiable step>

## 2. <Next group — e.g. "API endpoints">
- [ ] 2.1 <…>
- [ ] 2.2 <…>

## 3. <Tests & verification>
- [ ] 3.1 <…>
```

### Task rules

- Group related tasks under a numbered heading.
- Use hierarchical numbering (`1.1`, `1.2`, `2.1`, …).
- Each task small enough to complete in one session.
- Prefer verbs that produce artifacts: *Add*, *Create*, *Wire up*, *Migrate*, *Write test for*.
- Include a final group for tests / verification / documentation.

Check tasks off (`- [x]`) as they're completed.

## 7. Apply (implement)

When the user runs `/opsx:apply` or asks "implement these tasks":

1. Read `proposal.md`, `design.md`, and each delta `spec.md` — they constrain the implementation.
2. Work through `tasks.md` top to bottom, checking off each item as it lands.
3. If you discover the design won't work or the spec was wrong: **update the artifact first**, then implement. Don't silently deviate.
4. If scope grew: stop, discuss with the user, decide whether to update the current change or start a new one (rule of thumb: same intent → update; new intent → new change).

## 8. Verify

Before archiving, sanity-check implementation against artifacts across three dimensions:

| Dimension | Check |
|---|---|
| **Completeness** | All tasks checked off? All requirements have matching code? All scenarios covered (ideally by tests)? |
| **Correctness** | Does the code actually satisfy the spec's behavior? Edge cases from scenarios handled? Error states match? |
| **Coherence** | Do design decisions show up in the code? Naming / patterns consistent with `design.md`? |

Surface warnings to the user, but don't block archiving on them — let the user decide.

## 9. Archive

When the change is complete:

1. **Merge delta specs into main specs** — for each delta `spec.md` in the change:
   - Append `ADDED` requirements to `openspec/specs/<domain>/spec.md`.
   - Replace `MODIFIED` requirements (match by requirement name).
   - Delete `REMOVED` requirements.
2. **Move the change folder** from `openspec/changes/<name>/` to `openspec/changes/archive/YYYY-MM-DD-<name>/` (use today's date).
3. Confirm to the user what was merged and where.

The archive preserves the full context — proposal, design, tasks, delta specs — so future readers understand not just *what* changed but *why*.

## Common pitfalls to avoid

- **Putting implementation detail in `spec.md`.** If it names a class, library, or file, it probably belongs in `design.md`.
- **Writing full specs instead of deltas for a change.** Changes should use `ADDED`/`MODIFIED`/`REMOVED` deltas — full specs make conflicts and merges painful.
- **Requirements without scenarios.** Every requirement needs at least one concrete Given/When/Then.
- **Scope creep inside one change.** "Add X and also refactor Y" → two changes. Keeps review, history, and rollback clean.
- **Generic change names.** `feature-1`, `update`, `wip` are useless in the archive. Use verb-phrase kebab-case: `add-…`, `fix-…`, `migrate-…`, `optimize-…`.
- **Skipping the proposal.** Even for small changes, a 5-line proposal (intent + scope) prevents misalignment later.

## Quick reference: authoring order

```
proposal.md  →  specs/ (delta)  →  design.md  →  tasks.md  →  implement  →  verify  →  archive
   why              what              how           steps
```

Dependencies are enablers, not gates — you *may* skip `design.md` for a trivial change, or write specs before design. The order above is the default that works for most work.
