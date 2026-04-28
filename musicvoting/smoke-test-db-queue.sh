#!/usr/bin/env bash
# Smoke tests for add-db-backed-queue (tasks 6.1 – 6.5)
# Usage: ./smoke-test-db-queue.sh
# Requires: docker compose up -d (DB running), backend running on port 8080, jq

set -euo pipefail

BASE="http://localhost:8080/api"
DB_CONTAINER="musicvoting-db-1"
PSQL="docker exec -i $DB_CONTAINER psql -U musicvoting -d musicvoting -q"
PASS=0; FAIL=0

green() { printf '\033[0;32m✓ %s\033[0m\n' "$*"; }
red()   { printf '\033[0;31m✗ %s\033[0m\n' "$*"; }
info()  { printf '\033[0;34m  %s\033[0m\n' "$*"; }

check() {
  local name="$1" actual="$2" expected="$3"
  if echo "$actual" | grep -qF "$expected"; then
    green "$name"
    ((PASS++)) || true
  else
    red "$name"
    info "expected to contain: $expected"
    info "got: $actual"
    ((FAIL++)) || true
  fi
}

check_http() {
  local name="$1" actual_code="$2" expected_code="$3"
  if [ "$actual_code" = "$expected_code" ]; then
    green "$name (HTTP $actual_code)"
    ((PASS++)) || true
  else
    red "$name"
    info "expected HTTP $expected_code, got $actual_code"
    ((FAIL++)) || true
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MusicVoting — DB Queue Smoke Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Wait for backend ──────────────────────────────────────────────────────────
printf 'Waiting for backend'
for i in $(seq 1 30); do
  if curl -sf "$BASE/track/queue" > /dev/null 2>&1; then
    printf '\n'; break
  fi
  printf '.'; sleep 1
  if [ "$i" = 30 ]; then
    printf '\n'
    red "Backend not reachable at $BASE after 30s — start it first"
    exit 1
  fi
done

# ── Seed DB ───────────────────────────────────────────────────────────────────
echo ""
echo "Seeding test data…"
$PSQL <<'SQL'
\set ON_ERROR_STOP 1
-- clean up any previous run
DELETE FROM vote WHERE device_id IN ('smoke-device-1', 'smoke-device-2');
DELETE FROM queue_entry WHERE party_id = 'default'
  AND track_uri IN (
    'spotify:track:SMOKE_A',
    'spotify:track:SMOKE_B',
    'spotify:track:SMOKE_C',
    'spotify:track:SMOKE_D'
  );
DELETE FROM party WHERE id = 'default';

-- party stub (provider_kind matches ProviderKind.SPOTIFY enum name)
INSERT INTO party (id, provider_kind) VALUES ('default', 'SPOTIFY');

-- four songs; A=0 votes, B=1 vote (added later), C=3 votes, D=1 vote (added earlier)
INSERT INTO queue_entry (party_id, track_uri, track_name, artist_name, added_at) VALUES
  ('default', 'spotify:track:SMOKE_A', 'Smoke Song A', 'Artist A', '2026-01-01 10:00:00+00'),
  ('default', 'spotify:track:SMOKE_B', 'Smoke Song B', 'Artist B', '2026-01-01 10:01:00+00'),
  ('default', 'spotify:track:SMOKE_C', 'Smoke Song C', 'Artist C', '2026-01-01 10:02:00+00'),
  ('default', 'spotify:track:SMOKE_D', 'Smoke Song D', 'Artist D', '2026-01-01 09:55:00+00');

-- votes for C (3 different devices)
INSERT INTO vote (queue_entry_id, device_id, voted_at)
  SELECT id, 'smoke-device-c1', NOW() FROM queue_entry WHERE track_uri = 'spotify:track:SMOKE_C';
INSERT INTO vote (queue_entry_id, device_id, voted_at)
  SELECT id, 'smoke-device-c2', NOW() FROM queue_entry WHERE track_uri = 'spotify:track:SMOKE_C';
INSERT INTO vote (queue_entry_id, device_id, voted_at)
  SELECT id, 'smoke-device-c3', NOW() FROM queue_entry WHERE track_uri = 'spotify:track:SMOKE_C';

-- vote for B (1 device)
INSERT INTO vote (queue_entry_id, device_id, voted_at)
  SELECT id, 'smoke-device-b1', NOW() FROM queue_entry WHERE track_uri = 'spotify:track:SMOKE_B';

-- vote for D (1 device, added earlier than B → should appear before B in ties)
INSERT INTO vote (queue_entry_id, device_id, voted_at)
  SELECT id, 'smoke-device-d1', NOW() FROM queue_entry WHERE track_uri = 'spotify:track:SMOKE_D';
SQL
echo "Seed done."

# ── 6.1  Sort order ───────────────────────────────────────────────────────────
echo ""
echo "── 6.1  GET /track/queue sort order ──"
QUEUE=$(curl -sf "$BASE/track/queue")
info "Raw: $(echo "$QUEUE" | jq -c '.queue | map({name:.name, likes:.likeCount})')"

# Extract names in order from the response
NAMES=$(echo "$QUEUE" | jq -r '.queue[].name')
FIRST=$(echo  "$NAMES" | sed -n '1p')
SECOND=$(echo "$NAMES" | sed -n '2p')
THIRD=$(echo  "$NAMES" | sed -n '3p')
FOURTH=$(echo "$NAMES" | sed -n '4p')

# C=3 votes → first; D and B both 1 vote, D added at 09:55 < B at 10:01 → D second, B third; A=0 → last
check "6.1a most-liked song is first (Song C, 3 votes)" "$FIRST"  "Smoke Song C"
check "6.1b tied-votes resolved FIFO: Song D before Song B" "$SECOND" "Smoke Song D"
check "6.1c tied-votes resolved FIFO: Song B after Song D"  "$THIRD"  "Smoke Song B"
check "6.1d zero-vote song is last"                          "$FOURTH" "Smoke Song A"

# ── 6.2  Duplicate rejection ──────────────────────────────────────────────────
echo ""
echo "── 6.2  Duplicate rejection ──"
DUP_CODE=$(curl -s -o /tmp/dup_body.json -w "%{http_code}" \
  -X POST "$BASE/track/addToPlaylist" \
  -H "Content-Type: application/json" \
  -d '["spotify:track:SMOKE_A"]')
DUP_BODY=$(cat /tmp/dup_body.json)

check_http "6.2a duplicate add returns HTTP 409"        "$DUP_CODE" "409"
check      "6.2b error message is correct German string" "$DUP_BODY" "Song ist schon in der Warteschlange."

# ── 6.3  Vote toggle ──────────────────────────────────────────────────────────
echo ""
echo "── 6.3  Vote toggle ──"
VOTE1=$(curl -sf -X POST "$BASE/track/vote" \
  -H "Content-Type: application/json" \
  -d '{"uri":"spotify:track:SMOKE_A","deviceId":"smoke-device-1"}')
info "First vote:  $VOTE1"

VOTE2=$(curl -sf -X POST "$BASE/track/vote" \
  -H "Content-Type: application/json" \
  -d '{"uri":"spotify:track:SMOKE_A","deviceId":"smoke-device-1"}')
info "Second vote: $VOTE2"

VOTE3=$(curl -sf -X POST "$BASE/track/vote" \
  -H "Content-Type: application/json" \
  -d '{"uri":"spotify:track:SMOKE_A","deviceId":"smoke-device-2"}')
info "Third vote (different device): $VOTE3"

check "6.3a first vote → liked=true"                  "$(echo "$VOTE1" | jq -r '.liked')"     "true"
check "6.3b first vote → likeCount=1"                 "$(echo "$VOTE1" | jq -r '.likeCount')" "1"
check "6.3c second vote same device → liked=false"    "$(echo "$VOTE2" | jq -r '.liked')"     "false"
check "6.3d second vote same device → likeCount=0"    "$(echo "$VOTE2" | jq -r '.likeCount')" "0"
check "6.3e different device can still vote → liked=true"  "$(echo "$VOTE3" | jq -r '.liked')" "true"
check "6.3f different device vote → likeCount=1"      "$(echo "$VOTE3" | jq -r '.likeCount')" "1"

# ── 6.4  No Spotify playlist GET (manual) ────────────────────────────────────
echo ""
echo "── 6.4  No Spotify playlist GET in logs ──"
info "Manual check: look at your backend log output above."
info "You should NOT see any line like:"
info "  GET https://api.spotify.com/v1/playlists/..."
info "or:"
info "  GET https://api.spotify.com/v1/me/playlists"
info "The queue read above issued zero Spotify HTTP calls — verify in the terminal where './mvnw quarkus:dev' is running."

# ── 6.5  Queue persistence across restart ────────────────────────────────────
echo ""
echo "── 6.5  Queue persists across restart ──"
info "Restart the backend (Ctrl-C then './mvnw quarkus:dev'), then run:"
info "  curl -s http://localhost:8080/api/track/queue | jq '.queue | length'"
info "Expected: 4 (the seeded songs are still in the DB)"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf "Results: "
[ $PASS -gt 0 ] && printf '\033[0;32m%d passed\033[0m' $PASS
[ $FAIL -gt 0 ] && printf '  \033[0;31m%d failed\033[0m' $FAIL
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Clean up seed data
echo ""
echo "Cleaning up test rows…"
$PSQL <<'SQL'
\set ON_ERROR_STOP 1
DELETE FROM queue_entry WHERE party_id = 'default'
  AND track_uri IN (
    'spotify:track:SMOKE_A',
    'spotify:track:SMOKE_B',
    'spotify:track:SMOKE_C',
    'spotify:track:SMOKE_D'
  );
SQL

[ $FAIL -eq 0 ] && exit 0 || exit 1
