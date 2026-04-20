# Continuation — Functional spec in OpenSpec format

## Context

Brownfield school project: **MusicVoting** (HTBLA Leonding, 4AHITM ITP, Prof. Thomas Stütz). Web app for parties — guests join anonymously from their phone via QR code, add/like songs, music plays on a shared monitor/TV in the browser. Host authenticates once per party with Spotify or YouTube via OAuth. Team: Miriam Gnadlinger (lead), Simone Sperrer, Marlies Winklbauer. Stack: Quarkus backend, Angular frontend, optional Swift app, Hugo docs site.

Project was almost undocumented; functional spec is being reconstructed from:
- `README.adoc`
- `hugo/content/docs/specification.md` — prose functional spec, primary source
- `hugo/content/docs/runinstructions.md`, `developerinstructions.md`, `hugo.md`
- `hugo/content/project/projectassignment.md`
- `hugo/content/project/systemarchitektur/systemarchitektur.md`
- `hugo/content/project/wireframes/wireframes.md`
- `hugo/content/project/mom/*.md` — ~9 sprint/planning MoMs from 2025-11-10 through 2026-03-16
- `hugo/content/swift/docs/swift-specification.md`
- Skill: `.claude/skills/openspec/SKILL.md`

## What was done (2026-04-20)

Scaffolded `openspec/` as a baseline snapshot of current agreed behavior (not as a change proposal — no deltas yet). Nine domain specs + project overview:

```
openspec/
├── project.md
├── changes/{.gitkeep, archive/.gitkeep}
└── specs/
    ├── party/spec.md       # lifecycle, PIN/QR, provider selection, end, cross-client reconnect
    ├── guest/spec.md        # anonymous identity, QR join, 10-adds/min rate limit
    ├── host/spec.md         # pause/skip/remove, blacklist mgmt, host-only authz
    ├── queue/spec.md        # single queue, likes-desc + FIFO tiebreak, dedupe, blacklist check
    ├── voting/spec.md       # one-like-per-guest toggle, live updates
    ├── playback/spec.md     # dashboard-only audio, advance on end/skip, empty-queue, no history
    ├── dashboard/spec.md    # persistent elements, no host controls, no attribution, PIN-less reload
    ├── search/spec.md       # provider-scoped search, top-10 charts fallback, add-only-via-search
    └── provider/spec.md     # OAuth per party, token scoping, Spotify Premium, YouTube ads best-effort
```

Format: RFC 2119 keywords (MUST/SHALL/SHOULD) + Given/When/Then scenarios. English structure, German user-facing strings preserved verbatim (`"Nicht erlaubt."`, `"Zu viele Anfragen — bitte kurz warten."`, `"Song ist schon in der Warteschlange."`, `"Warteschlange ist leer"`).

## Key decisions

- **Nine domains, not one monolith** — cleaner future delta changes, matches OpenSpec convention.
- **Cross-client reconnect lives in `party`**; PIN-less dashboard reload lives in `dashboard`.
- **Swift app deferred** — flagged as "zusätzliches Feature" in swift-specification.md; spec only the web flow for now. When Swift scope firms up, add it as a `mobile-app` domain or a change proposal.
- **Only QR join spec'd for web** — swift-specification.md mentions a 5-digit join code, but `hugo/content/docs/specification.md` (primary source) only covers QR. Confirm with user whether web should also support code entry.
- **Provider-specific details kept light** — Spotify Premium requirement and YouTube ads-best-effort are in `provider/spec.md`. Implementation details (token refresh strategy, DeviceId storage, multithreading protection — all mentioned in MoMs) belong in `design.md` of specific changes, not the spec.

## Likely next steps

1. **Verify pass** (OpenSpec flow section 8) — compare specs against actual Quarkus backend (`musicvoting/backend/`) and Angular frontend (`musicvoting/frontend/`). Surface drift. Expect divergence around: rate-limit window implementation, token refresh, blacklist substring matching, reconnect/sync behavior, dashboard PIN-less rebinding.
2. **Clarify open questions** before touching code:
   - Web-app join via 5-digit code — supported or QR only?
   - Empty queue: web spec says "stoppt/pausiert"; Swift spec says "random songs aus Top-Charts." Which is canonical?
   - Blacklist: substring case-insensitive? Partial word matching intentional (per MoM it seems so, but verify).
   - Guest identity persistence mechanism (localStorage? cookie? DeviceId discussed in MoM 2026-01-26).
3. **First change proposal** likely candidates based on recent MoMs (2026-03-16): fix "too many requests" problem, refresh-token handling. These should go under `openspec/changes/<kebab-name>/` with delta specs against the baseline.
4. **Hugo docs integration** — consider whether `hugo/content/docs/specification.md` should now point to `openspec/` as source of truth or stay as the narrative version.

## Pitfalls specific to this repo

- **MoM dates in 2025-12-15 meeting are wrong** (say "20.06.2020" etc. — clearly typos). Don't trust those deadlines.
- **Two system architecture diagrams exist** (`sys_img.png` + `ALT_sys_img.png`) — the ALT one is outdated, PlantUML source is in comments in `systemarchitektur.md`.
- **Three repos side-by-side**: `musicvoting/` (current app), `legacyProject/` (predecessor — ignore unless asked), `hugo/` (docs site).
- Repo is in German; keep user-facing strings in German when writing tests or specs.

## How to resume

Read `openspec/project.md` and every file under `openspec/specs/` first. Then read `.claude/skills/openspec/SKILL.md` if you need to propose changes — baseline specs are done, but any new feature or correction must go through a change proposal under `openspec/changes/<name>/` with delta specs (ADDED/MODIFIED/REMOVED), not by editing the baseline directly.

If the user's first message is about verifying specs against code, go straight to `musicvoting/backend/` and `musicvoting/frontend/` with the Explore agent. If the user wants to extend the spec (e.g. for the Swift app, or for a new feature), start with `proposal.md` in a new `openspec/changes/<name>/` folder.
