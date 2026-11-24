# Proposal: Add Ralph loop tooling

Based on the explore session of 2026-11-24 (sources: https://github.com/snarktank/ralph, https://ralphloop.sh/, https://ghuntley.com/ralph/).

## Why

Working through a long `tasks.md` with `/opsx:apply` in one interactive session fills the context window, and quality drops on later tasks. A Ralph loop starts a fresh `claude -p` process per task. The state lives on disk (tasks.md, a progress log, git), and tests act as backpressure. OpenSpec already gives us the task list, so we only need the loop around the apply step. We do not need a second PRD format.

## What Changes

- New skill `ralph-iteration` (`.claude/skills/ralph-iteration/SKILL.md`). It holds the rules for exactly one loop pass on one OpenSpec change:
  - take the first open task in `tasks.md` and implement it with tests and code comments;
  - run the test gate, and use `playwright-cli` for browser checks on UI tasks;
  - commit, tick the task, and append to the progress log;
  - end with a promise line: `COMPLETE`, `BLOCKED:<reason>` or `DECIDE:<question>`.
- New script `script/ralph.sh <change> [max-iterations]`:
  - creates or reuses a git worktree on branch `ralph/<change>`;
  - runs preflight checks (Java 25, Node 26, PostgreSQL, test DB, `playwright-cli`, free ports);
  - loops `claude -p` until a promise or the iteration cap. Exit codes: 0 COMPLETE, 1 cap reached, 2 BLOCKED, 3 DECIDE.
- New progress log per change: `openspec/changes/<change>/ralph-progress.md`. A "Codebase Patterns" section sits at the top, followed by one block per task. It is archived with the change.
- Permission allowlist in `.claude/settings.json` for the commands the loop needs (tests, build, `git add`/`commit`, `openspec`, `playwright-cli`). `git push` is explicitly not on it. The loop runs without `--dangerously-skip-permissions`.
- Separate PostgreSQL database `musicvoting_test` for backend tests (`%test` datasource profile, created by a Docker init script and by an idempotent script for existing volumes). The loop's `./mvnw test` then no longer writes into the dev database the host is using. This also changes local dev for the whole team: backend tests need the test DB.
- `ai/ARBEITSREGELN.md` §5 gets a Ralph exception: on a `ralph/<change>` branch the loop may commit locally after each task. It never pushes. Push and merge stay manual and require asking. **Needs team agreement** (Miriam, Marlies).
- Housekeeping: `openspec/config.yaml` context is updated. It still says Java 21 / PostgreSQL 16 and lists the empty-queue question as open, and every loop pass would load that stale context.
- Not in this change, but planned as follow-ups: `/ralph:ready` (checks whether `tasks.md` is fit for the loop) and `/ralph:status`. They will be added after the pilot run on `rename-blacklist-to-blocklist`.

## Capabilities

### New Capabilities
_None._ This is developer tooling. The app's behavior does not change, so the change sets `skip_specs: true`.

### Modified Capabilities
_None._

## Impact

- **Backend:** `application.properties` gets a `%test` datasource URL (`musicvoting_test`). Production code is not affected.
- **DB schema:** `setup.sql` is unchanged. A new init script also creates `musicvoting_test` and loads `setup.sql` into it. Existing `db_data_pg19` volumes need a one-time `script/create-test-db.sh`.
- **Docker:** `musicvoting/docker-compose.yml` mounts the extra init script. `deployment/` is not affected.
- **Frontend:** not affected. Ralph serves it on port 4300 with its own proxy config; port 4200 stays free for the host.
- **iOS:** not affected.
- **Claude tooling:** new skill, new script, `.claude/settings.json` allowlist. The existing impeccable hooks stay. Their Stop hook will also run at the end of each loop pass.
- **Docs:** `ai/ARBEITSREGELN.md` (§3 test DB note, §5 Ralph exception), `README.adoc`, `musicvoting/backend/README.md` (test DB), and a short Ralph section in CLAUDE.md. Hugo docs: optional developer page. The slides (`hugo/content/slides/index.md`) do not become wrong.
