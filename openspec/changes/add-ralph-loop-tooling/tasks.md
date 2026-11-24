# Tasks

Backend tests: `cd musicvoting/backend && JAVA_HOME=$HOME/.jdks/temurin-25.0.3 ./mvnw test` (needs `cd musicvoting && docker compose up -d`; after group 1 also the `musicvoting_test` DB).
Frontend tests (regression only, no frontend code changes): `cd musicvoting/frontend && nvm use 26 && CHROME_BIN=/usr/bin/chromium-browser npx ng test --watch=false --browsers=ChromeHeadless`.
Shell scripts get a header comment and comments on non-obvious steps (why, not what). Script checks are run commands with an observable result. They are not "tests without expect".

## 1. Separate test database (design D9)

- [ ] 1.1 Add `musicvoting/backend/init-test-db.sh` (creates `musicvoting_test` owned by `musicvoting`, loads `setup.sql`) and mount it in `musicvoting/docker-compose.yml` after `setup.sql`. Verify: with a throw-away volume (`docker compose -p mvtest up -d` on another port), `psql -l` lists `musicvoting_test` and `\dt` shows the same tables as `musicvoting`
- [ ] 1.2 Add idempotent `script/create-test-db.sh` for existing volumes (create if missing, then load `setup.sql`; uses `docker compose exec db`). Verify: running it twice on the local volume exits 0 both times, and `musicvoting_test` has all tables from `setup.sql`
- [ ] 1.3 Add `%test.quarkus.datasource.jdbc.url=…/musicvoting_test` to `application.properties` with a comment explaining why. Add a `@QuarkusTest` that asserts the datasource's current database is `musicvoting_test` (`SELECT current_database()`). Verify: the new test passes; all backend tests pass; a row count in the dev DB `musicvoting` is unchanged before/after `./mvnw test`
- [ ] 1.4 Document the test DB in `musicvoting/backend/README.md`, `README.adoc` (local dev section) and `ai/ARBEITSREGELN.md` §3 (run `script/create-test-db.sh` once). Verify: the documented commands run as written

## 2. Permissions and playwright-cli (design D8, D10)

- [ ] 2.1 Create `.claude/settings.json` with the `permissions.allow` / `permissions.deny` lists from design D10 (keep `settings.local.json` hooks untouched). Verify: `python3 -m json.tool .claude/settings.json` succeeds; `git push` and `git reset --hard` are in `deny`; `claude -p "run git push --dry-run"` in a scratch worktree is refused
- [ ] 2.2 Install the playwright-cli agent skill into `.claude/skills/playwright-cli/` (via `playwright-cli install --skills` if the CLI offers it, else copy the shipped `SKILL.md`, noting the source version). Verify: `.claude/skills/playwright-cli/SKILL.md` exists and names `open`, `snapshot`, `screenshot`
- [ ] 2.3 Add `musicvoting/frontend/proxy.ralph.json` (`/api` → `http://localhost:8180`). Verify: with the isolated stack from design D8 running, `npx -y @playwright/cli@latest -s=ralph open http://localhost:4300` then `snapshot` shows the start page, and `curl localhost:4300/api/...` reaches the 8180 backend

## 3. ralph-iteration skill (design D3, D4, D5, D7, D8)

- [ ] 3.1 Write `.claude/skills/ralph-iteration/SKILL.md`:
  - frontmatter description (only for loop passes on one OpenSpec change);
  - the 8 steps of D3;
  - the hard rules;
  - the promise format of D4 as the last line;
  - the `ralph-progress.md` structure of D5;
  - the gate table of D7;
  - the browser check flow of D8 and the "manual check needed" fallback for OAuth/DRM.

  Verify: `openspec validate add-ralph-loop-tooling` still passes; the skill references only commands that are on the D10 allowlist
- [ ] 3.2 Add a `ralph-progress.md` template (Codebase Patterns + Log) inside the skill folder; the skill creates the file from it on the first pass. Verify: the template contains both headings and one example log block

## 4. ralph.sh loop (design D2, D4, D6, D11)

- [ ] 4.1 Write `script/ralph.sh <change> [max=10]`:
  - preflight (D11);
  - worktree + branch `ralph/<change>` (D6);
  - env export (`JAVA_HOME`, `CHROME_BIN`, Node 26 PATH, `playwright-cli` wrapper);
  - the loop with `claude -p --permission-mode acceptEdits`;
  - last-non-empty-line promise match;
  - exit codes 0/1/2/3;
  - `RALPH_NO_COMMIT=1` switch.

  Verify: `bash -n script/ralph.sh` and `shellcheck script/ralph.sh` (if installed) report nothing
- [ ] 4.2 Add `script/test/ralph-promise.sh`. It feeds sample outputs to the script's promise parser (sourced as a function) and asserts the result:
  - COMPLETE as the last line → 0;
  - BLOCKED → 2, with the reason extracted;
  - DECIDE → 3;
  - a promise quoted in the middle with a normal last line → "continue";
  - empty output → "continue".

  Verify: the script exits 0 and prints one PASS per case
- [ ] 4.3 Preflight dry run: `script/ralph.sh does-not-exist` exits 2 with "Change not found". With port 4300 occupied, it exits 2 naming the port. Verify: both exit codes and messages are observed

## 5. Rules, context and docs (design D6, D12)

- [ ] 5.1 Update `openspec/config.yaml` context: Java 25, PostgreSQL 19, Angular 22, auto-refill instead of the open empty-queue question, test DB, Ralph branches (D12). Verify: `openspec instructions proposal --change add-ralph-loop-tooling --json` shows the new context
- [ ] 5.2 Add the Ralph exception to `ai/ARBEITSREGELN.md` §5: local commits per task only on `ralph/<change>`, never push, merge/push after asking. Mark it as pending team agreement until Miriam and Marlies confirm. Verify: the paragraph exists and names the branch pattern
- [ ] 5.3 Add a short "Ralph loop" section to `CLAUDE.md` and `README.adoc`: when to use it, `script/ralph.sh <change> [max]`, exit codes, where the log lives, review before push. Verify: the documented command runs the preflight

## 6. Integration

- [ ] 6.1 Smoke run: create a throw-away change with two trivial tasks, e.g. add a comment and a docs line. Run `script/ralph.sh <it> 3`. Verify:
  - exit 0;
  - two commits on `ralph/<it>`;
  - both tasks ticked;
  - two log blocks in `ralph-progress.md`;
  - nothing pushed (`git log origin/...` unchanged);
  - the main working tree is untouched.

  Then remove the worktree, branch and change
- [ ] 6.2 All backend and frontend tests pass

## Workflow follow-up

- Get team agreement on the §5 exception (Miriam, Marlies).
- Pilot: finish `rename-blacklist-to-blocklist` (specs, design, tasks) interactively, then run `script/ralph.sh rename-blacklist-to-blocklist 10` and review the branch.
- After the pilot: propose `/ralph:ready` and `/ralph:status`; decide the impeccable Stop hook question (design Open Questions).
- Archive this change after review.
