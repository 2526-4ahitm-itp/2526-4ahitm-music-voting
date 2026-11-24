# Design

## Context

See proposal.md (Why). Current state that shapes the approach:

- **OpenSpec workflow.** `.claude/skills/openspec-apply-change/SKILL.md` and `/opsx:apply` work through `openspec/changes/<name>/tasks.md` in one interactive session and tick `- [ ]` → `- [x]`. Tasks already carry checkable "Verify:" / "Specs:" lines (e.g. `unify-queue-views/tasks.md`).
- **Hooks.** `.claude/settings.local.json` has the impeccable hooks (SessionStart, PostToolUse on Edit/Write, Stop with 30 s timeout). There is no `.claude/settings.json` yet.
- **Backend tests.** `musicvoting/backend/src/main/resources/application.properties` has one datasource for every profile: `jdbc:postgresql://localhost:5432/musicvoting`. It has no `%test` override, and the schema comes only from `setup.sql`. There are 11 `@QuarkusTest` classes. The tests write into the same DB that `quarkus:dev` uses.
- **Docker.** `musicvoting/docker-compose.yml` runs `postgres:19`, mounts `backend/setup.sql` into `/docker-entrypoint-initdb.d/` and uses the volume `db_data_pg19`. Init scripts only run on an empty volume.
- **Frontend dev.** `proxy.conf.json` sends `/api` to `localhost:8080`, and `ng serve` runs on 4200. The host's own `ng serve` on 4200 must not be touched.
- **Local toolchain traps.** The default `java` is 21, and Java 25 lives at `$HOME/.jdks/temurin-25.0.3`. The nvm default Node is 24.2.0, and Angular 22 needs `nvm use 26`. `playwright-cli` is not on PATH. It runs as `npx -y @playwright/cli@latest` and ships its own agent skill (`playwright-core/lib/tools/skills/playwright-cli/SKILL.md`).
- **Stale context.** `openspec/config.yaml` still says Java 21 / PostgreSQL 16 and lists the empty-queue question as open.

## Goals / Non-Goals

**Goals:**
- One fresh-context pass per task, with state only on disk (tasks.md, ralph-progress.md, git).
- The loop never pushes, never edits proposal/specs/design and never guesses an open question.
- Running the loop does not disturb the host's dev setup: DB, port 4200 and the working tree stay untouched.
- Browser checks for UI tasks without the Chrome extension.

**Non-Goals:**
- A planning loop that writes `tasks.md`. Planning stays interactive with `/opsx:propose` (explore answer 2a).
- `/ralph:ready`, `/ralph:status` and `/ralph:steer`. They are follow-ups after the pilot (explore answer 5b).
- Parallel loops, running in CI, or a container sandbox.
- A `prd.json` or any second task format.

## Decisions

### D1 — tasks.md is the task list; no prd.json
The loop reads and ticks `openspec/changes/<change>/tasks.md` directly. Task IDs are the numbers already in the file (`2.3`, `3b.1`).
*Rationale:* ARBEITSREGELN §1 forbids specs and code drifting apart, and a copy of the task list would drift. *Rejected:* snarktank's `prd` + `ralph` skills that convert to `prd.json`.

### D2 — Bash loop with `claude -p`, not a Stop-hook plugin
`script/ralph.sh` starts a new `claude -p "<one-line prompt>"` process per pass. The prompt only names the change and tells Claude to use the `ralph-iteration` skill.
*Rationale:* a fresh context each pass. The impeccable Stop hook already exists, and a second Stop hook that re-injects the prompt would fight with it. *Rejected:* the official ralph-wiggum Stop-hook plugin, whose context keeps growing; a long `PROMPT.md` file, because a skill is versioned next to the other skills and Claude loads it in the normal way.

### D3 — The rules for one pass live in the `ralph-iteration` skill
The skill is self-contained and follows `openspec-apply-change`, restricted to one task. Steps:
1. `openspec status` + `openspec instructions apply --json` for the change; read proposal, design, delta specs, tasks.
2. Read `ralph-progress.md` (Codebase Patterns first) and `git log --oneline -10`.
3. Pick the first `- [ ]`. If it obviously does not fit one pass → `BLOCKED:task too big: <id>`.
4. Search the code before implementing ("don't assume it is not implemented").
5. Implement with code comments that explain why (§4) and tests with real `expect`s (§3). Load the `backend`/`frontend` skill for the layer it touches.
6. Run the gate (D7), and for UI tasks the browser check (D8). If the gate is red, fix it in this pass or end with `BLOCKED`.
7. Tick the task, append the progress block (D5), and commit (D6).
8. Last line of output: exactly one promise (D4), or none if open tasks remain.

Hard rules: never `git push`, never edit `proposal.md`/`design.md`/`specs/`, never archive, never touch the main working tree, never decide an open question (→ `DECIDE`).

### D4 — Three promises, exit codes, last-line match
Promise lines: `<promise>COMPLETE</promise>` (no `- [ ]` left), `<promise>BLOCKED:<reason></promise>`, `<promise>DECIDE:<question></promise>`. The script matches only the **last non-empty line** of the output. Exit codes: 0 COMPLETE, 1 cap reached, 2 BLOCKED, 3 DECIDE. On BLOCKED/DECIDE the reason is also written to `ralph-progress.md`.
*Rationale:* snarktank greps the whole output, so a quoted promise (e.g. in a progress note) ends the loop by accident. DECIDE implements CLAUDE.md "Open questions … do not assume". *Rejected:* COMPLETE only (explore answer 6b).

### D5 — Progress log in the change folder
The file is `openspec/changes/<change>/ralph-progress.md`. It is committed together with each task and archived with the change (explore answer 4b). Structure:
- `## Codebase Patterns`: short and reusable; the pass rewrites it when needed.
- `## Log`: append-only, one block per pass with date/time, task ID, what was done, files, gate results, browser check result or "manual check needed: …", learnings.

Patterns that matter beyond this change go to the `backend`/`frontend` skills or CLAUDE.md, never into the log only.
*Rejected:* `ai/scratch/` (lost after the run); `ai/continuations/` (meant for hand-offs between humans and sessions, not per-task logs).

### D6 — Branch, worktree, commits
`script/ralph.sh` creates `git worktree add ../<repo>-ralph-<change> -b ralph/<change>`, starting from the current branch, or reuses it if it exists. All passes run there. One commit per task, Conventional Commits with the task ID, e.g. `feat(frontend): 2.3 show search results in place of the queue`. Code, the tick in tasks.md and the progress block go into the same commit. No push. ARBEITSREGELN §5 gets the matching exception (explore answer 1a).
*Rationale:* the host's working tree, including the running `ng serve`, stays untouched. The git log is part of Ralph's memory. *Rejected:* no commits (memory only in the log); auto-push.

### D7 — Test gate per touched layer
- Backend touched: `JAVA_HOME=$HOME/.jdks/temurin-25.0.3 ./mvnw test` (runs against `musicvoting_test`, D9).
- Frontend touched: `npx ng test --watch=false --browsers=ChromeHeadless` with `CHROME_BIN=/usr/bin/chromium-browser` under Node 26, plus `npx ng build`.
- `openspec/` touched: `openspec validate <change>`.
- iOS touched: no automated gate; the pass ends with `BLOCKED:ios task needs manual build`.

`ralph.sh` exports `JAVA_HOME`, `CHROME_BIN` and the Node 26 PATH once, so the skill does not have to know about nvm.

### D8 — Browser checks with playwright-cli
For tasks that change visible UI, the pass starts an isolated stack in the worktree:
- backend: `./mvnw quarkus:dev -Dapp.public.port=8180 -Dquarkus.datasource.jdbc.url=jdbc:postgresql://localhost:5432/musicvoting_test` (port 8180; `quarkus.http.port` is derived from `app.public.port`);
- frontend: `npx ng serve --port 4300 --proxy-config proxy.ralph.json` (`/api` → 8180).

It then uses `playwright-cli -s=ralph open/goto/snapshot/click/fill/screenshot` on `localhost:4300`. Screenshots go to `ai/scratch/ralph/<change>/` (git-ignored). The pass stops the stack before it ends. Flows that need Spotify/YouTube OAuth or DRM playback cannot run headless (memory: the player needs a DRM browser). For those the pass relies on DOM specs and logs "manual check needed: …".
`playwright-cli` is called through a wrapper in `ralph.sh` (`npx -y @playwright/cli@latest`, or a global install if there is one). Its agent skill is installed into `.claude/skills/playwright-cli/`, so the pass knows the commands.
*Rejected:* the Chrome extension (not available in `claude -p`, and the user does not have it here); Playwright test specs in the repo (a bigger change; the team can decide that separately).

### D9 — Separate test database `musicvoting_test`
- `application.properties`: `%test.quarkus.datasource.jdbc.url=jdbc:postgresql://localhost:5432/musicvoting_test`. Same user and password.
- New `musicvoting/backend/init-test-db.sh` in `/docker-entrypoint-initdb.d/`. It runs after `setup.sql`, creates `musicvoting_test` owned by `musicvoting` and loads `setup.sql` into it. It covers fresh volumes.
- New `script/create-test-db.sh` for existing volumes. It is idempotent: create the DB if it is missing, then load `setup.sql`. It uses `docker compose exec db psql`.
- `ralph.sh` preflight checks that `musicvoting_test` exists and prints the command to create it if not.

*Rationale:* backend tests and the host's `quarkus:dev` no longer share data, inside and outside the loop. *Rejected:* Dev Services / Testcontainers (pulls a container per test run and differs from the Docker setup the team knows); only running the loop while the host is idle (explore answer 3a chose a separate DB).

### D10 — Permissions: allowlist instead of skip-permissions
A new, committed `.claude/settings.json` holds `permissions.allow` for:
- `./mvnw test`, `./mvnw quarkus:dev`;
- `npx ng test`, `npx ng build`, `npx ng serve`;
- `npx -y @playwright/cli*`, `playwright-cli *`;
- `openspec status|instructions|validate|list *`;
- `git status|diff|log|add|commit|worktree *`;
- read-only shell tools.

It holds `permissions.deny` for `git push*`, `git reset --hard*`, `rm -rf*` and `docker compose down*`. `ralph.sh` runs `claude -p` with `--permission-mode acceptEdits`, so edits need no prompt and Bash stays on the allowlist. Any command not on the list makes the pass fail, and Ralph reports it as `BLOCKED`.
*Rationale:* this runs on the host's own machine with Docker and a live dev server (explore answer 3a). *Rejected:* `--dangerously-skip-permissions`; a container sandbox (explore answer 3c).

### D11 — Preflight in ralph.sh
Before the first pass the script checks:
- the change exists and has open tasks (`openspec status --json`);
- Java 25 is at `JAVA_HOME`;
- Node ≥ 26 is available via nvm;
- PostgreSQL answers on 5432 and `musicvoting_test` exists;
- `playwright-cli` runs;
- ports 8180/4300 are free;
- `claude` is on PATH;
- the worktree is clean.

The script also runs `npm ci` in the worktree's frontend once. Any failure → exit 2 with a clear message, before tokens are spent.

### D12 — config.yaml context refresh
Update `openspec/config.yaml`:
- Java 25, PostgreSQL 19, Angular 22;
- replace "Open question … empty queue" with the resolved auto-refill rule;
- mention the test DB;
- mention that Ralph passes may commit on `ralph/*` branches.

## Risks / Trade-offs

- [The pass marks a task done with a weak or placeholder implementation] → the skill forbids placeholders, tasks carry Verify lines, the gate must be green, and the human reviews the branch before pushing.
- [Duplicate implementations because the search missed existing code] → the "search first" step in D3; Codebase Patterns in the progress log.
- [Token cost of a runaway loop] → iteration cap (default 10); BLOCKED/DECIDE end early; preflight before the first pass.
- [The impeccable Stop hook adds ~30 s per pass] → acceptable. Revisit after the pilot.
- [Quarkus test port 8081 / Karma port 9876 collide if the host runs tests at the same time] → documented; only one loop at a time.
- [Team members without the test DB get red backend tests after pulling] → README + ARBEITSREGELN §3 note; `script/create-test-db.sh`; the fresh-volume init script.
- [OAuth/DRM flows cannot be checked headless] → DOM specs plus a "manual check needed" log line that the human works through at review.
- [§5 exception not accepted by the team] → the loop can run with commits disabled (`RALPH_NO_COMMIT=1`): it only ticks tasks and logs, and the human commits.

## Migration Plan

1. Merge the test DB (D9) first. Each developer runs `script/create-test-db.sh` once, or recreates the volume.
2. Add the skill, script and allowlist. Run the pilot on `rename-blacklist-to-blocklist` once its tasks exist.
3. Rollback: delete the worktree and the `ralph/<change>` branch. The main branch is never touched by the loop.

## Open Questions

- Whether the impeccable Stop hook should be skipped inside loop passes, e.g. via an env var. Decide after the pilot.
