---
name: backend
description: Guide implementation work in the MusicVoting Quarkus backend (musicvoting/backend/). Use when adding endpoints, entities, services, or Panache queries; when wiring Spotify API calls; or when debugging auth, queue, or voting logic.
---

# MusicVoting — Backend Development Guide

## Stack at a glance

| Component | Detail |
|---|---|
| Framework | Quarkus 3.40.x (Java 25) — exact version in `pom.xml` |
| REST | `quarkus-rest` + `quarkus-rest-jackson` (JAX-RS style) |
| ORM | Hibernate ORM + Panache (`PanacheEntityBase`) |
| DB | PostgreSQL 19 via Docker (`localhost:5432/musicvoting`) |
| Reactive | SmallRye Mutiny (`Multi<T>`) for SSE |
| DI | Quarkus Arc (`@ApplicationScoped`, `@Inject`) |
| Tests | JUnit 5 + REST Assured |

All API paths are under `/api` (set by `RestConfig` → `@ApplicationPath("api")`).

---

## Package map

```
src/main/java/at/htl/
├── endpoints/
│   ├── PartyResource.java         POST /api/party, DELETE|GET /api/party/{id}, PUT {id}/default-playlist,
│   │                              GET join/{pin}, GET host-join/{hostPin}, GET {id}/qr
│   ├── TrackResource.java         /api/party/{partyId}/track/* (search, queue, add, vote, play/next/start/pause/resume, …)
│   ├── BlacklistResource.java     /api/party/{partyId}/blacklist (list/add/delete, artist search) — host only
│   ├── SpotifyTokenResource.java  /api/party/{partyId}/spotify/* (token, status, login, deviceId, playlists)
│   ├── SpotifyCallbackResource.java  GET /api/spotify/callback|ios/callback|events (OAuth callbacks + SSE)
│   ├── HostOnly.java + HostAuthFilter.java  @HostOnly → requires `Authorization: Bearer <hostPin>`
│   ├── LoginEvent.java / LoginEventBus.java SSE payload record + broadcaster
│   └── RestConfig.java            @ApplicationPath("api")
├── domain/
│   ├── Party.java                 In-memory party (NOT a DB entity) — credentials, refill history
│   ├── PartyRegistry.java         In-memory map of active parties (find by id / pin / hostPin)
│   ├── PartyEntity.java           Panache entity → party table
│   ├── QueueEntry.java            Panache entity → queue_entry table
│   ├── Vote.java                  Panache entity → vote table
│   ├── BlacklistEntry.java / BlacklistKind.java  Panache entity → blacklist_entry (WORD | ARTIST | TRACK)
│   ├── PartyId.java               Value object wrapping party ID string
│   └── ProviderKind.java          Enum: SPOTIFY | YOUTUBE
├── provider/
│   ├── MusicProvider.java         Interface (implemented per-provider)
│   ├── MusicProviderFactory.java  @ApplicationScoped factory
│   └── spotify/
│       ├── SpotifyMusicProvider.java  Main Spotify implementation (queue, playback, auto-refill)
│       └── SpotifyCredentials.java    Thread-safe AtomicReference credential holder
├── service/
│   ├── PartyService.java          End party, persist refresh token
│   ├── BlacklistService.java      Blacklist CRUD + whole-word matching
│   └── SpotifyApiErrors.java      Error/response builder, 429 handling
├── scheduler/
│   └── PartyExpiryScheduler.java  Ends idle/expired parties
└── model/
    └── Track.java                 DTO for track metadata
```

---

## In-memory vs. database state

| State | Where |
|---|---|
| Active parties, access token, device ID, refill history | `PartyRegistry` (ConcurrentHashMap) + `SpotifyCredentials` (AtomicReference) |
| Song queue + metadata | `queue_entry` table |
| Votes | `vote` table |
| Party record (kind, pins, default playlist, refresh token, currently-playing FK, playback position) | `party` table |
| Blacklist | `blacklist_entry` table |

**Rule:** Access tokens and device IDs never touch the DB (only the Spotify refresh token is persisted, so a party survives a restart). Queue, votes and blacklist always do.

---

## Key invariants (do not violate)

- **`Party.java` ≠ `PartyEntity.java`.** `Party` is the in-memory object held by `PartyRegistry`; `PartyEntity` is the Panache entity for the `party` DB row. They are intentionally separate — do not merge them.
- **`pom.xml` already has** `quarkus-hibernate-orm-panache`, `quarkus-jdbc-postgresql`, and `com.google.zxing`. Do not add duplicates.

---

## Database schema

```sql
party           (id VARCHAR PK, provider_kind, created_at, pin VARCHAR(5), host_pin VARCHAR(5),
                 ended_at, default_playlist_id, spotify_refresh_token,
                 currently_playing_entry_id UUID→queue_entry, playback_started_at, paused_position_ms)
                UNIQUE INDEX on pin WHERE ended_at IS NULL
queue_entry     (id UUID PK, party_id→party, track_uri, track_name, artist_name,
                 album_name, image_url, duration_ms, added_at, autofilled BOOLEAN)
                no (party_id, track_uri) uniqueness — the playing song may be queued again
vote            (id UUID PK, queue_entry_id→queue_entry, device_id, voted_at)
                UNIQUE (queue_entry_id, device_id)
blacklist_entry (id UUID PK, party_id→party, kind, value, label, image_url, created_at)
                UNIQUE (party_id, kind, value)
```

Schema source: `musicvoting/backend/setup.sql`.  
**Never rely on Hibernate schema auto-generation** — `setup.sql` is the source of truth, and the prod schema in the `deployment/k8s` ConfigMap must be kept in sync with it.

### Panache query patterns

```java
// Simple find
QueueEntry entry = QueueEntry.find("trackUri = ?1 and partyId = ?2", uri, partyId).firstResult();

// Count with params
long votes = Vote.count("queueEntry.id = ?1", entry.id);

// Native SQL (for aggregates with JOIN)
em.createNativeQuery(
    "SELECT qe.*, COUNT(v.id) AS like_count " +
    "FROM queue_entry qe LEFT JOIN vote v ON v.queue_entry_id = qe.id " +
    "WHERE qe.party_id = ?1 " +
    "GROUP BY qe.id ORDER BY like_count DESC, qe.added_at ASC",
    QueueEntry.class
).setParameter(1, partyId).getResultList();
```

Always annotate mutating methods with `@Transactional`.

---

## Adding a new REST endpoint

1. Add method to an existing resource (`TrackResource` for queue/playback, `BlacklistResource` for the blacklist, `SpotifyTokenResource` for host Spotify, `SpotifyCallbackResource` for OAuth callbacks/SSE) or create a new `@Path` class. Annotate host-only actions with `@HostOnly`.
2. Inject dependencies via `@Inject`.
3. Resolve the party from the `{partyId}` path param via `partyRegistry.find(PartyId.of(partyId)).orElseThrow(404)`.
4. Delegate business logic to `SpotifyMusicProvider` (or the appropriate `MusicProvider` via `MusicProviderFactory.forParty(party)`).
5. Return `Response` or a concrete DTO; Jackson serializes automatically.

```java
@PathParam("partyId")
String partyId;

private Party resolveParty() {
    return partyRegistry.find(PartyId.of(partyId))
            .orElseThrow(() -> new WebApplicationException(Response.Status.NOT_FOUND));
}

@GET
@Path("/example")
@Produces(MediaType.APPLICATION_JSON)
public Response example(@QueryParam("q") String q) {
    Party party = resolveParty();
    var result = provider.someMethod(party, q);
    return Response.ok(result).build();
}
```

---

## Adding a new Panache entity

```java
@Entity
@Table(name = "my_table")
public class MyEntity extends PanacheEntityBase {
    @Id
    @GeneratedValue
    public UUID id;

    @Column(name = "party_id", nullable = false)
    public String partyId;
    // ...
}
```

- Add the corresponding `CREATE TABLE` to `setup.sql` **and** to the schema ConfigMap under `deployment/k8s/`.
- Run `docker compose down -v && docker compose up -d` to reset and re-init schema.
- Do **not** set `quarkus.hibernate-orm.database.generation=update/drop-and-create`.

---

## Error handling

Use `SpotifyApiErrors` for all Spotify HTTP responses:

```java
HttpResponse<String> resp = sendGet(party, url);
if (resp.statusCode() != 200) {
    return SpotifyApiErrors.buildResponse(resp, "track search");
}
```

For fatal cases throw:
```java
throw SpotifyApiErrors.asException(resp, "play track");
```

For unexpected non-HTTP exceptions:
```java
return SpotifyApiErrors.unexpectedError("save playlist", e);
```

**All user-facing strings must be German.** Preserved strings:
- `"Nicht erlaubt."`
- `"Zu viele Anfragen — bitte kurz warten."`
- `"Song ist schon in der Warteschlange."`
- `"Warteschlange ist leer"`

HTTP 429 responses automatically include `retryAfterSeconds` and `retryAt` in the JSON body.

---

## SSE pattern (login events)

```java
// Emit from OAuth callback:
LoginEvent event = new LoginEvent("login-success", Instant.now(), Map.of("source", "web"));
loginEventBus.emit(event);

// Stream to client (in resource):
@GET @Path("/events")
@Produces(MediaType.SERVER_SENT_EVENTS)
@RestStreamElementType(MediaType.APPLICATION_JSON)
public Multi<LoginEvent> events(@QueryParam("source") String source) {
    return loginEventBus.stream()
        .filter(e -> source.equals(e.payload().get("source")));
}
```

`LoginEventBus` uses a `CopyOnWriteArrayList<MultiEmitter<LoginEvent>>` — emitters self-remove on client disconnect.

---

## Spotify HTTP helpers

`SpotifyMusicProvider` provides two internal helpers:

```java
Response sendGet(Party party, String url);
Response sendPut(Party party, String url, String body);
```

Both are private, return a JAX-RS `Response`, and inject the `Authorization: Bearer <token>` header (via `getValidAccessToken(party)`, which refreshes an expired token). For POST/DELETE calls, build the request manually using the same pattern.

---

## Auth flow summary

```
GET /api/party/{id}/spotify/login?source=web|ios
  → state = "web:<partyId>"  or  "ios:<installationId>:<partyId>"
  → redirect to Spotify authorize URL

GET /api/spotify/callback?code=&state=       (web — path stays here, registered in Spotify console)
GET /api/spotify/ios/callback?code=&state=   (iOS)
  → parse partyId from state
  → PartyRegistry.find(partyId) → Party
  → exchange code for token, store on Party credentials
  → check the account is Spotify Premium (non-Premium is rejected)
  → persist the refresh token on the party row
  → emit LoginEvent via LoginEventBus
  → redirect (web) / JSON response (iOS)
```

The iOS callback path does **not** emit a web SSE event to avoid interrupting active playback.

---

## Queue operations reference

| Operation | Method | Transactional |
|---|---|---|
| Get sorted queue (with vote counts) | `getQueue(party)` | No (read) |
| Add track (dedup enforced) | `addTracksToPlaylist(party, uris)` | Yes |
| Remove track | `removeTrack(party, uri)` | Yes |
| Replace entire queue | `overwritePlaylist(party, uris)` | Yes |
| Advance to next track | `playNextAndRemove(party)` | Yes |
| Start first song from the queue | `startFirstSongWithoutRemoving(party)` | Yes |
| Toggle like/unlike | `toggleVote(party, uri, deviceId)` | Yes |

Queue sort order (DB-level, native query): **currently playing first, guest adds before auto-filled songs, votes DESC, added_at ASC**.

When only the playing song is left, `refillQueue(party)` auto-fills: default playlist → similar songs → Top-Charts → Spotify search (see `openspec/specs/playback/spec.md`).

---

## Running locally

```bash
# Start PostgreSQL
cd musicvoting && docker compose up -d

# Run Quarkus in dev mode (hot reload)
cd musicvoting/backend && ./mvnw quarkus:dev

# Run tests
./mvnw test
```

Dev mode exposes the Quarkus Dev UI at `http://localhost:8080/q/dev`.

---

## Common pitfalls

- **Forgetting `@Transactional`** on a method that calls `entity.persist()` or `entity.delete()` → `TransactionRequiredException` at runtime.
- **Using `Party` where `PartyEntity` is needed** (or vice versa) → the in-memory object has no DB ID.
- **Calling Spotify API without resolving the device ID first** → 404 from Spotify if the stored device is stale; use `resolvePlayableDeviceId(party)`.
- **Modifying `openspec/specs/` directly** instead of going through a change proposal — always use the OpenSpec workflow.
- **Hardcoded `localhost` URLs** — use the injected `app.public.host`/`app.public.port` config properties for redirect URIs.
