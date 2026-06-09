# Proposal: Fix Guest Session Requirement Keyword

## Why

`specs/guest/spec.md` fails `openspec validate` — the "Guest Session Persists Across Reloads" requirement is worded with "SHOULD" and contains no SHALL/MUST keyword, which the OpenSpec schema requires. This is a pre-existing spec-hygiene gap (unrelated to any feature) that keeps the spec set from validating cleanly.

## What Changes

- Reword "Guest Session Persists Across Reloads" so the normative behavior uses MUST: the guest's anonymous identity MUST be restored on reload **when a previously stored identity exists**. The conditional preserves the original soft intent — the persistence *mechanism* is still an open question (localStorage vs cookie vs device ID) — while satisfying the schema and matching the existing scenario.

## Non-goals

- Does not decide the persistence mechanism — that remains an open question.
- No code changes.
