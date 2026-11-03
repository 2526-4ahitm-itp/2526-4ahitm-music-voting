## Why

`openspec/specs/host/spec.md` contains three iOS requirements twice, word for word:

- "iOS Host Controls Include Authorization Header"
- "iOS Admin View Previews First Queued Song Before Playback"
- "iOS Host PIN Entry Uses Digit-Box Input"

The second copies were added when nine changes were archived together on 2026-06-23 (commit `38899fd9`). OpenSpec requires unique requirement names, so `openspec validate` fails on the host spec and **no change with a host delta can be archived** (currently `hide-blocked-artists-in-search` and `refactor-design-fixes`).

## What Changes

- Delete the second, identical copy of the three requirements (the block after "iOS Admin Shows a Loading Indicator While the QR Code Fetches"). The first copy stays unchanged.
- No behaviour changes, no code changes. Because nothing about the agreed behaviour changes, this change has no delta specs and is archived with `--skip-specs`.

## Impact

- Affected spec: `openspec/specs/host/spec.md` (housekeeping only).
- Unblocks archiving `hide-blocked-artists-in-search` and later `refactor-design-fixes`.
