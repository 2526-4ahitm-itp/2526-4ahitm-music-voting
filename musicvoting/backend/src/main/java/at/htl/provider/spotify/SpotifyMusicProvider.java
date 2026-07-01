package at.htl.provider.spotify;

import at.htl.domain.Party;
import at.htl.domain.PartyEntity;
import at.htl.domain.QueueEntry;
import at.htl.domain.Vote;
import at.htl.endpoints.LoginEvent;
import at.htl.endpoints.LoginEventBus;
import at.htl.provider.MusicProvider;
import at.htl.service.PartyService;
import at.htl.service.SpotifyApiErrors;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
import java.util.stream.Collectors;

@ApplicationScoped
public class SpotifyMusicProvider implements MusicProvider {

    private final HttpClient client = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    @Inject
    EntityManager em;

    @Inject
    LoginEventBus loginEventBus;

    @Inject
    PartyService partyService;

    @ConfigProperty(name = "spotify.client.id")
    String clientId;

    @ConfigProperty(name = "spotify.client.secret")
    String clientSecret;

    @ConfigProperty(name = "spotify.topcharts.playlist.id")
    Optional<String> topChartsPlaylistId;

    @ConfigProperty(name = "spotify.market", defaultValue = "AT")
    String market;

    private String authHeader(Party party) {
        return "Bearer " + party.getSpotifyCredentials().getToken();
    }

    /**
     * Emits one INFO log line capturing backend-vs-device playback state at the moment a
     * start/stop operation begins. Pure observability: gathering the data is best-effort and
     * MUST NOT change the outcome of the operation. See change
     * {@code add-playback-transition-logging}.
     */
    private void logPlaybackTransition(String op, Party party) {
        try {
            String partyId = party.id().value();

            // Ordered queue, exactly as /track/queue returns it (name | uri | id per entry).
            List<Map<String, Object>> queue;
            try {
                queue = getQueue(party);
            } catch (Exception e) {
                queue = List.of();
            }
            String queueStr = queue.stream()
                    .map(e -> e.get("name") + " | " + e.get("uri") + " | " + e.get("id"))
                    .collect(Collectors.joining(" ;; "));
            if (queueStr.isEmpty()) {
                queueStr = "<empty>";
            }

            // The entry the backend considers current/displayed.
            PartyEntity pe = PartyEntity.findById(partyId);
            String currentId = (pe != null && pe.currentlyPlayingEntryId != null)
                    ? pe.currentlyPlayingEntryId.toString()
                    : null;
            String currentStr;
            if (currentId == null) {
                currentStr = "none";
            } else {
                currentStr = queue.stream()
                        .filter(e -> currentId.equals(e.get("id").toString()))
                        .findFirst()
                        .map(e -> e.get("name") + " | " + e.get("uri") + " | " + currentId)
                        .orElse(currentId + " (not in queue)");
            }

            // Next song, computed exactly as playNextAndRemove does (first entry whose id != current).
            String nextStr = queue.stream()
                    .filter(e -> currentId == null || !e.get("id").toString().equals(currentId))
                    .findFirst()
                    .map(e -> e.get("name") + " | " + e.get("uri") + " | " + e.get("id"))
                    .orElse("none");

            // What the Spotify device actually holds — best-effort, never fatal.
            String deviceStr;
            try {
                Map<String, Object> snapshot = getCurrentPlaybackSnapshot(party);
                if (snapshot == null) {
                    deviceStr = "unavailable (no content)";
                } else {
                    deviceStr = snapshot.get("uri") + " | is_playing=" + Boolean.TRUE.equals(snapshot.get("isPlaying"));
                }
            } catch (Exception e) {
                deviceStr = "unavailable";
            }

            Log.infof("[playback %s] party=%s | queue=[%s] | current=%s | next=%s | device=%s",
                    op, partyId, queueStr, currentStr, nextStr, deviceStr);
        } catch (Exception e) {
            // Logging must never break or alter playback.
            Log.debugf("logPlaybackTransition failed for op=%s: %s", op, e.getMessage());
        }
    }

    @Override
    public Map<String, Object> searchTracks(Party party, String query) {
        try {
            String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url = "https://api.spotify.com/v1/search?q=" + encoded + "&type=track&limit=25";

            HttpResponse<String> res = executeSpotifyRequest(party, () ->
                    HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .header("Authorization", authHeader(party))
                            .GET()
                            .build());
            if (res.statusCode() < 200 || res.statusCode() >= 300) {
                throw SpotifyApiErrors.asException(res, "Die Spotify-Suche");
            }

            Map<String, Object> json = mapper.readValue(res.body(), Map.class);

            Map<String, Object> tracks = (Map<String, Object>) json.get("tracks");
            if (tracks == null) {
                tracks = Map.of("items", List.of());
                json.put("tracks", tracks);
            }

            return json;
        } catch (Exception e) {
            if (e instanceof WebApplicationException webApplicationException) {
                throw webApplicationException;
            }
            throw new WebApplicationException(SpotifyApiErrors.unexpectedError("Die Spotify-Suche", e));
        }
    }

    @Override
    public Response getTrack(Party party, String id) {
        return sendGet(party, "https://api.spotify.com/v1/tracks/" + id);
    }

    @Override
    @Transactional
    public Response play(Party party, String uri) {
        try {
            logPlaybackTransition("PLAY", party);
            String deviceId = resolvePlayableDeviceId(party);
            if (deviceId == null || deviceId.isBlank()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "No active Spotify device found."))
                        .type(MediaType.APPLICATION_JSON)
                        .build();
            }

            String url = "https://api.spotify.com/v1/me/player/play";
            url += "?device_id=" + deviceId;

            Map<String, String[]> bodyMap = Map.of("uris", new String[]{uri});
            String body = mapper.writeValueAsString(bodyMap);

            Response response = sendPut(party, url, body);
            if (response.getStatus() >= 200 && response.getStatus() < 300) {
                try {
                    sendPut(party, "https://api.spotify.com/v1/me/player/repeat?state=off&device_id=" + deviceId, null);
                } catch (Exception ignored) {}
                updateCachedPlayback(party, uri, true);
                PartyEntity pe = PartyEntity.findById(party.id().value());
                if (pe != null) {
                    pe.playbackStartedAt = OffsetDateTime.now();
                    pe.pausedPositionMs = null;
                }
            }
            return response;
        } catch (Exception e) {
            return propagateOrUnexpected("Das Starten der Wiedergabe", e);
        }
    }

    @Override
    @Transactional
    public Response addTracksToPlaylist(Party party, List<String> uris) {
        try {
            PartyEntity pe = PartyEntity.findById(party.id().value());
            UUID currentEntryId = pe != null ? pe.currentlyPlayingEntryId : null;
            for (String uri : uris) {
                // Only block if the song is already *waiting* in the queue. The currently playing
                // song is excluded, so a song that is (or was just) playing can be queued again.
                long waiting = currentEntryId == null
                        ? QueueEntry.count("partyId = ?1 AND trackUri = ?2", party.id().value(), uri)
                        : QueueEntry.count("partyId = ?1 AND trackUri = ?2 AND id <> ?3", party.id().value(), uri, currentEntryId);
                if (waiting > 0) {
                    return Response.status(Response.Status.CONFLICT)
                            .entity(Map.of("error", "Song ist schon in der Warteschlange."))
                            .type(MediaType.APPLICATION_JSON)
                            .build();
                }

                String trackId = uri.contains(":") ? uri.substring(uri.lastIndexOf(":") + 1) : uri;
                Map<String, Object> meta = fetchTrackMetadata(party, trackId);

                QueueEntry entry = new QueueEntry();
                entry.partyId = party.id().value();
                entry.trackUri = uri;
                entry.trackName = (String) meta.get("name");
                entry.artistName = parseArtistName(meta);
                entry.albumName = parseAlbumName(meta);
                entry.imageUrl = parseImageUrl(meta);
                entry.durationMs = meta.get("duration_ms") instanceof Number n ? n.intValue() : null;
                entry.addedAt = OffsetDateTime.now();
                entry.persist();

                // Remember this song's artists so the "similar songs" auto-fill can vary across
                // all the artists the crowd has added.
                parseArtistIds(meta).forEach(party::recordSeenArtist);
            }

            return Response.ok(Map.of("status", "added")).build();
        } catch (Exception e) {
            return propagateOrUnexpected("Das Hinzufuegen des Songs zur Playlist", e);
        }
    }

    @Override
    @Transactional
    public Response removeTrack(Party party, String uri) {
        try {
            // Never delete the currently playing entry here — only the waiting copy/copies — so
            // removing a re-queued song from the list doesn't cut off the song that's playing.
            PartyEntity pe = PartyEntity.findById(party.id().value());
            UUID currentEntryId = pe != null ? pe.currentlyPlayingEntryId : null;
            long deleted = currentEntryId == null
                    ? QueueEntry.delete("partyId = ?1 AND trackUri = ?2", party.id().value(), uri)
                    : QueueEntry.delete("partyId = ?1 AND trackUri = ?2 AND id <> ?3", party.id().value(), uri, currentEntryId);
            if (deleted == 0) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity(Map.of("error", "Song nicht in der Warteschlange."))
                        .type(MediaType.APPLICATION_JSON)
                        .build();
            }
            return Response.ok(Map.of("status", "removed")).build();
        } catch (Exception e) {
            return propagateOrUnexpected("Das Entfernen des Songs aus der Playlist", e);
        }
    }

    @Override
    @Transactional
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getQueue(Party party) {
        try {
            backfillMissingImageUrls(party);

            List<Object[]> rows = em.createNativeQuery(
                    "SELECT qe.id, qe.track_uri, qe.track_name, qe.artist_name, qe.album_name, " +
                    "qe.image_url, qe.duration_ms, COUNT(v.id) AS like_count, " +
                    "COALESCE(p.currently_playing_entry_id = qe.id, FALSE) AS is_currently_playing " +
                    "FROM queue_entry qe " +
                    "LEFT JOIN vote v ON v.queue_entry_id = qe.id " +
                    "LEFT JOIN party p ON p.id = qe.party_id " +
                    "WHERE qe.party_id = :partyId " +
                    "GROUP BY qe.id, p.currently_playing_entry_id " +
                    "ORDER BY COALESCE(p.currently_playing_entry_id = qe.id, FALSE) DESC, qe.autofilled ASC, COUNT(v.id) DESC, qe.added_at ASC"
            ).setParameter("partyId", party.id().value()).getResultList();

            return rows.stream().map(row -> {
                Map<String, Object> entry = new HashMap<>();
                entry.put("id", row[0].toString());
                entry.put("uri", row[1]);
                entry.put("name", row[2]);
                entry.put("artists", List.of(Map.of("name", row[3] != null ? row[3] : "")));
                entry.put("album", Map.of(
                        "name", row[4] != null ? row[4] : "",
                        "images", row[5] != null ? List.of(Map.of("url", row[5])) : List.of()
                ));
                entry.put("duration_ms", row[6]);
                entry.put("likeCount", ((Number) row[7]).longValue());
                entry.put("isCurrentlyPlaying", Boolean.TRUE.equals(row[8]));
                return entry;
            }).toList();

        } catch (Exception e) {
            if (e instanceof WebApplicationException wae) throw wae;
            throw new WebApplicationException(SpotifyApiErrors.unexpectedError("Das Laden der Warteschlange", e));
        }
    }

    @Override
    @Transactional
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getQueueForDevice(Party party, String deviceId) {
        try {
            backfillMissingImageUrls(party);

            List<Object[]> rows = em.createNativeQuery(
                    "SELECT qe.id, qe.track_uri, qe.track_name, qe.artist_name, qe.album_name, " +
                    "qe.image_url, qe.duration_ms, COUNT(v.id) AS like_count, " +
                    "COUNT(CASE WHEN v.device_id = :deviceId THEN 1 END) > 0 AS has_voted, " +
                    "COALESCE(p.currently_playing_entry_id = qe.id, FALSE) AS is_currently_playing " +
                    "FROM queue_entry qe " +
                    "LEFT JOIN vote v ON v.queue_entry_id = qe.id " +
                    "LEFT JOIN party p ON p.id = qe.party_id " +
                    "WHERE qe.party_id = :partyId " +
                    "GROUP BY qe.id, p.currently_playing_entry_id " +
                    "ORDER BY COALESCE(p.currently_playing_entry_id = qe.id, FALSE) DESC, qe.autofilled ASC, COUNT(v.id) DESC, qe.added_at ASC"
            ).setParameter("partyId", party.id().value())
             .setParameter("deviceId", deviceId)
             .getResultList();

            return rows.stream().map(row -> {
                Map<String, Object> entry = new HashMap<>();
                entry.put("id", row[0].toString());
                entry.put("uri", row[1]);
                entry.put("name", row[2]);
                entry.put("artists", List.of(Map.of("name", row[3] != null ? row[3] : "")));
                entry.put("album", Map.of(
                        "name", row[4] != null ? row[4] : "",
                        "images", row[5] != null ? List.of(Map.of("url", row[5])) : List.of()
                ));
                entry.put("duration_ms", row[6]);
                entry.put("likeCount", ((Number) row[7]).longValue());
                entry.put("hasVoted", Boolean.TRUE.equals(row[8]));
                entry.put("isCurrentlyPlaying", Boolean.TRUE.equals(row[9]));
                return entry;
            }).toList();

        } catch (Exception e) {
            if (e instanceof WebApplicationException wae) throw wae;
            throw new WebApplicationException(SpotifyApiErrors.unexpectedError("Das Laden der Warteschlange", e));
        }
    }

    /**
     * For queue entries missing image_url (e.g. added before this field existed),
     * fetch metadata from Spotify and persist the URL. Silently skips failures.
     * Caps at 5 entries per call so it never blocks a queue fetch noticeably.
     * Must be called from within an active transaction.
     */
    private void backfillMissingImageUrls(Party party) {
        try {
            @SuppressWarnings("unchecked")
            List<Object[]> missing = em.createNativeQuery(
                    "SELECT id, track_uri FROM queue_entry " +
                    "WHERE party_id = :partyId AND image_url IS NULL AND track_uri IS NOT NULL " +
                    "LIMIT 5"
            ).setParameter("partyId", party.id().value()).getResultList();

            for (Object[] row : missing) {
                try {
                    String uri = (String) row[1];
                    String trackId = uri.contains(":") ? uri.substring(uri.lastIndexOf(":") + 1) : uri;
                    Map<String, Object> meta = fetchTrackMetadata(party, trackId);
                    String imageUrl = parseImageUrl(meta);
                    if (imageUrl != null) {
                        em.createNativeQuery(
                                "UPDATE queue_entry SET image_url = :imageUrl WHERE id = :id"
                        ).setParameter("imageUrl", imageUrl)
                         .setParameter("id", row[0])
                         .executeUpdate();
                    }
                } catch (Exception ignored) {
                    // Skip individual entries that can't be resolved
                }
            }
        } catch (Exception ignored) {
            // Never fail a queue fetch due to backfill errors
        }
    }

    public void fetchAndStoreUserId(Party party) throws Exception {
        HttpResponse<String> res = executeSpotifyRequest(party, () ->
                HttpRequest.newBuilder()
                        .uri(URI.create("https://api.spotify.com/v1/me"))
                        .header("Authorization", authHeader(party))
                        .GET()
                        .build());
        if (res.statusCode() < 200 || res.statusCode() >= 300) {
            throw SpotifyApiErrors.asException(res, "Das Laden des Spotify-Profils");
        }

        Map<String, Object> map =
                mapper.readValue(res.body(), Map.class);

        party.getSpotifyCredentials().setSpotifyUserId((String) map.get("id"));
    }

    public void ensurePartyPlaylistExists(Party party) throws Exception {
        String existingId = findExistingPlaylist(party);

        if (existingId != null) {
            party.getSpotifyCredentials().setPlaylistId(existingId);
            return;
        }

        createPartyPlaylist(party);
    }

    private String findExistingPlaylist(Party party) throws Exception {
        HttpResponse<String> res = executeSpotifyRequest(party, () ->
                HttpRequest.newBuilder()
                        .uri(URI.create("https://api.spotify.com/v1/me/playlists?limit=50"))
                        .header("Authorization", authHeader(party))
                        .GET()
                        .build());
        if (res.statusCode() < 200 || res.statusCode() >= 300) {
            throw SpotifyApiErrors.asException(res, "Das Laden der Playlists");
        }

        Map<String, Object> map =
                mapper.readValue(res.body(), Map.class);

        List<Map<String, Object>> items =
                (List<Map<String, Object>>) map.get("items");

        for (Map<String, Object> playlist : items) {
            if ("Musicvoting party".equals(playlist.get("name"))) {
                return (String) playlist.get("id");
            }
        }

        return null;
    }

    private void createPartyPlaylist(Party party) throws Exception {
        String userId = party.getSpotifyCredentials().getSpotifyUserId();

        Map<String, Object> bodyMap = Map.of(
                "name", "Musicvoting party",
                "public", false,
                "description", "Generated by MusicVoting"
        );
        String playlistBody = mapper.writeValueAsString(bodyMap);

        HttpResponse<String> res = executeSpotifyRequest(party, () ->
                HttpRequest.newBuilder()
                        .uri(URI.create("https://api.spotify.com/v1/users/" + userId + "/playlists"))
                        .header("Authorization", authHeader(party))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(playlistBody))
                        .build());
        if (res.statusCode() < 200 || res.statusCode() >= 300) {
            throw SpotifyApiErrors.asException(res, "Das Anlegen der Party-Playlist");
        }

        Map<String, Object> map =
                mapper.readValue(res.body(), Map.class);

        party.getSpotifyCredentials().setPlaylistId((String) map.get("id"));
    }

    @Override
    @Transactional
    public Response overwritePlaylist(Party party, List<String> uris) {
        try {
            QueueEntry.delete("partyId", party.id().value());

            for (String uri : uris) {
                String trackId = uri.contains(":") ? uri.substring(uri.lastIndexOf(":") + 1) : uri;
                Map<String, Object> meta = fetchTrackMetadata(party, trackId);

                QueueEntry entry = new QueueEntry();
                entry.partyId = party.id().value();
                entry.trackUri = uri;
                entry.trackName = (String) meta.get("name");
                entry.artistName = parseArtistName(meta);
                entry.albumName = parseAlbumName(meta);
                entry.imageUrl = parseImageUrl(meta);
                entry.durationMs = meta.get("duration_ms") instanceof Number n ? n.intValue() : null;
                entry.addedAt = OffsetDateTime.now();
                entry.persist();
            }

            return Response.ok(Map.of("status", "overwritten")).build();
        } catch (Exception e) {
            return propagateOrUnexpected("Das Speichern der Playlist", e);
        }
    }

    @Override
    @Transactional
    public Response playNextAndRemove(Party party) {
        try {
            logPlaybackTransition("NEXT", party);
            PartyEntity partyEntity = PartyEntity.findById(party.id().value());
            if (partyEntity == null) throw new WebApplicationException(Response.Status.NOT_FOUND);

            List<Map<String, Object>> queue = getQueue(party);
            if (queue == null || queue.isEmpty()) {
                return Response.ok(Map.of("status", "empty", "message", "Warteschlange ist leer")).build();
            }

            // Exclude the currently playing entry so we always advance to the next one
            String currentId = partyEntity.currentlyPlayingEntryId != null
                    ? partyEntity.currentlyPlayingEntryId.toString()
                    : null;

            Map<String, Object> nextTrack = queue.stream()
                    .filter(t -> !t.get("id").toString().equals(currentId))
                    .findFirst()
                    .orElse(null);

            if (nextTrack == null) {
                // Nothing queued. The player normally preloads a playlist song ~3s before the end
                // (POST /track/prepare-next); this is the safety net if that was missed — pull one
                // now so playback doesn't dead-stop (may cause a short gap).
                refillQueue(party);
                nextTrack = getQueue(party).stream()
                        .filter(t -> !t.get("id").toString().equals(currentId))
                        .findFirst()
                        .orElse(null);

                if (nextTrack == null) {
                    // Still nothing (no default playlist / refill yielded nothing) — remove the
                    // finished song and report empty.
                    if (partyEntity.currentlyPlayingEntryId != null) {
                        QueueEntry.deleteById(partyEntity.currentlyPlayingEntryId);
                        partyEntity.currentlyPlayingEntryId = null;
                    }
                    return Response.ok(Map.of("status", "empty", "message", "Warteschlange ist leer")).build();
                }
            }

            String uri = (String) nextTrack.get("uri");

            // Try to start playback first. Only if playback succeeds remove the previous entry.
            // Commit on the 2xx — do NOT probe getCurrentPlaybackSnapshot to confirm the switch:
            // Spotify's currently-playing read lags the play command by seconds and reports the
            // *previous* track meanwhile, so gating the commit on it refuses healthy advances and
            // stalls autoplay. Any real drift is observed via the logging and corrected by the
            // resume re-assert. See change fix-resume-plays-previous-song (advance-confirmation reverted).
            Response playResponse = play(party, uri);
            if (playResponse.getStatus() < 200 || playResponse.getStatus() >= 300) {
                return playResponse;
            }

            if (partyEntity.currentlyPlayingEntryId != null) {
                QueueEntry.deleteById(partyEntity.currentlyPlayingEntryId);
            }

            partyEntity.currentlyPlayingEntryId = UUID.fromString((String) nextTrack.get("id"));

            return Response.ok(Map.of("status", "playing", "trackName", nextTrack.get("name"))).build();
        } catch (Exception e) {
            return propagateOrUnexpected("Das Wechseln zum naechsten Song", e);
        }
    }

    @Override
    @Transactional
    public Response pausePlayback(Party party) {
        try {
            logPlaybackTransition("PAUSE", party);
            String deviceId = resolvePlayableDeviceId(party);
            if (deviceId == null || deviceId.isBlank()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "No active Spotify device found."))
                        .type(MediaType.APPLICATION_JSON)
                        .build();
            }

            String url = "https://api.spotify.com/v1/me/player/pause?device_id=" + deviceId;
            Response response = sendPut(party, url, null);
            if (response.getStatus() >= 200 && response.getStatus() < 300) {
                party.getSpotifyCredentials().setLastPlaybackActive(false);
                PartyEntity pe = PartyEntity.findById(party.id().value());
                if (pe != null && pe.playbackStartedAt != null && pe.pausedPositionMs == null) {
                    pe.pausedPositionMs = Duration.between(pe.playbackStartedAt, OffsetDateTime.now()).toMillis();
                }
            }
            return response;
        } catch (Exception e) {
            return propagateOrUnexpected("Das Pausieren der Wiedergabe", e);
        }
    }

    /**
     * Body for the resume play call. When a current track uri is known, re-asserts it (with the
     * paused position when available) so resume plays the displayed song deterministically;
     * otherwise falls back to a bare resume ({@code position_ms} only, or {@code null}).
     */
    String buildResumeBody(String currentUri, Long pausedPositionMs) throws Exception {
        if (currentUri != null && !currentUri.isBlank()) {
            Map<String, Object> bodyMap = pausedPositionMs != null
                    ? Map.of("uris", List.of(currentUri), "position_ms", pausedPositionMs)
                    : Map.of("uris", List.of(currentUri));
            return mapper.writeValueAsString(bodyMap);
        }
        return pausedPositionMs != null
                ? mapper.writeValueAsString(Map.of("position_ms", pausedPositionMs))
                : null;
    }

    @Override
    @Transactional
    public Response resumePlayback(Party party) {
        try {
            logPlaybackTransition("RESUME", party);
            String deviceId = resolvePlayableDeviceId(party);
            if (deviceId == null || deviceId.isBlank()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "No active Spotify device found."))
                        .type(MediaType.APPLICATION_JSON)
                        .build();
            }

            PartyEntity peBefore = PartyEntity.findById(party.id().value());
            Long pausedPositionMs = peBefore != null ? peBefore.pausedPositionMs : null;

            // Re-assert the current track's uri so resume always plays the displayed song,
            // regardless of what the device happens to hold after an auto-advance. Falls back
            // to a bare resume only when there is no known current track.
            String currentUri = null;
            if (peBefore != null && peBefore.currentlyPlayingEntryId != null) {
                QueueEntry current = QueueEntry.findById(peBefore.currentlyPlayingEntryId);
                if (current != null && current.trackUri != null && !current.trackUri.isBlank()) {
                    currentUri = current.trackUri;
                }
            }

            String url = "https://api.spotify.com/v1/me/player/play?device_id=" + deviceId;
            String body = buildResumeBody(currentUri, pausedPositionMs);
            Response response = sendPut(party, url, body);
            if (response.getStatus() >= 200 && response.getStatus() < 300) {
                party.getSpotifyCredentials().setLastPlaybackActive(true);
                PartyEntity pe = PartyEntity.findById(party.id().value());
                if (pe != null && pe.pausedPositionMs != null) {
                    pe.playbackStartedAt = OffsetDateTime.now().minus(Duration.ofMillis(pe.pausedPositionMs));
                    pe.pausedPositionMs = null;
                }
            }
            return response;
        } catch (Exception e) {
            return propagateOrUnexpected("Das Fortsetzen der Wiedergabe", e);
        }
    }

    @Transactional
    public void restoreCurrentTrackOnDevice(Party party, String deviceId) {
        try {
            if (deviceId == null || deviceId.isBlank()) {
                return;
            }

            try {
                HttpResponse<String> devRes = executeSpotifyRequest(party, () ->
                        HttpRequest.newBuilder()
                                .uri(URI.create("https://api.spotify.com/v1/me/player/devices"))
                                .header("Authorization", authHeader(party))
                                .GET()
                                .build());
                if (devRes.statusCode() >= 200 && devRes.statusCode() < 300) {
                    Map<String, Object> devJson = mapper.readValue(devRes.body(), Map.class);
                    List<Map<String, Object>> devices = (List<Map<String, Object>>) devJson.get("devices");
                    if (devices != null) {
                        boolean otherActive = devices.stream().anyMatch(d -> Boolean.TRUE.equals(d.get("is_active")) && !deviceId.equals(d.get("id")));
                        if (otherActive) {
                            try {
                                Map<String, Object> currentSnapshot = getCurrentPlaybackSnapshot(party);
                                if (currentSnapshot != null) {
                                    String snapUri = (String) currentSnapshot.get("uri");
                                    Boolean snapPlaying = Boolean.TRUE.equals(currentSnapshot.get("isPlaying"));
                                    if (snapUri != null && !snapUri.isBlank()) {
                                        updateCachedPlayback(party, snapUri, snapPlaying);
                                    }
                                }
                            } catch (Exception ignoredSnapshot) {
                                // ignore snapshot failures
                            }
                            return;
                        }
                    }
                }
            } catch (Exception ignoredDevCheck) {
                // If device check fails, continue with restore attempt (best effort).
            }

            String uri = null;
            Map<String, Object> snapshot = getCurrentPlaybackSnapshot(party);
            if (snapshot != null && Boolean.TRUE.equals(snapshot.get("isPlaying"))) {
                uri = (String) snapshot.get("uri");
            }

            SpotifyCredentials creds = party.getSpotifyCredentials();
            if ((uri == null || uri.isBlank()) && Boolean.TRUE.equals(creds.getLastPlaybackActive())) {
                uri = creds.getLastPlaybackUri();
            }

            if (uri == null || uri.isBlank()) {
                // No track to restore — still transfer playback to this device so Spotify
                // marks it as active. Without this, resolvePlayableDeviceId may not find
                // the device immediately after registration (Spotify propagation delay).
                Map<String, Object> transferBody = Map.of("device_ids", List.of(deviceId), "play", false);
                try {
                    sendPut(party, "https://api.spotify.com/v1/me/player", mapper.writeValueAsString(transferBody));
                } catch (Exception ignored) {}
                return;
            }

            // Resume at the position the party has already reached instead of
            // restarting at 0:00, so opening the web player doesn't rewind the song.
            long positionMs = currentPlaybackPositionMs(party);

            Map<String, Object> bodyMap = positionMs > 0
                    ? Map.of("uris", List.of(uri), "position_ms", positionMs)
                    : Map.of("uris", List.of(uri));
            String url = "https://api.spotify.com/v1/me/player/play?device_id=" + deviceId;
            Response response = sendPut(party, url, mapper.writeValueAsString(bodyMap));
            if (response.getStatus() >= 200 && response.getStatus() < 300) {
                updateCachedPlayback(party, uri, true);
                PartyEntity pe = PartyEntity.findById(party.id().value());
                if (pe != null) {
                    // Keep the elapsed-progress model consistent with the resumed position.
                    pe.playbackStartedAt = OffsetDateTime.now().minus(Duration.ofMillis(positionMs));
                    pe.pausedPositionMs = null;
                }
            }
        } catch (Exception ignored) {
            // Device registration should still succeed even if restore fails.
        }
    }

    /**
     * Current playback position (ms) as tracked by the party's elapsed-progress
     * model — the same source {@code /track/current} reports.
     */
    private long currentPlaybackPositionMs(Party party) {
        PartyEntity pe = PartyEntity.findById(party.id().value());
        if (pe == null) {
            return 0;
        }
        if (pe.pausedPositionMs != null) {
            return Math.max(0, pe.pausedPositionMs);
        }
        if (pe.playbackStartedAt != null) {
            return Math.max(0, Duration.between(pe.playbackStartedAt, OffsetDateTime.now()).toMillis());
        }
        return 0;
    }

    @Override
    @Transactional
    public Response startFirstSongWithoutRemoving(Party party) {
        try {
            logPlaybackTransition("START", party);
            List<Map<String, Object>> queue = getQueue(party);
            if (queue == null || queue.isEmpty()) {
                return Response.ok(Map.of("status", "empty", "message", "Warteschlange ist leer")).build();
            }

            Map<String, Object> firstTrack = queue.get(0);
            String uri = (String) firstTrack.get("uri");

            Response playResponse = play(party, uri);
            if (playResponse.getStatus() < 200 || playResponse.getStatus() >= 300) {
                return Response.status(playResponse.getStatus())
                        .entity(playResponse.getEntity())
                        .type(MediaType.APPLICATION_JSON)
                        .build();
            }

            PartyEntity partyEntity = PartyEntity.findById(party.id().value());
            if (partyEntity == null) throw new WebApplicationException(Response.Status.NOT_FOUND);
            partyEntity.currentlyPlayingEntryId = UUID.fromString((String) firstTrack.get("id"));

            Map<String, Object> payload = new HashMap<>();
            payload.put("status", "playing");
            payload.put("track", firstTrack);
            return Response.ok(payload).build();
        } catch (Exception e) {
            return propagateOrUnexpected("Das Starten des ersten Songs", e);
        }
    }

    @Override
    @Transactional
    public Response getCurrentPlayback(Party party) {
        try {
            PartyEntity partyEntity = PartyEntity.findById(party.id().value());
            if (partyEntity != null && partyEntity.currentlyPlayingEntryId != null) {
                List<Object[]> rows = em.createNativeQuery(
                        "SELECT qe.id, qe.track_uri, qe.track_name, qe.artist_name, qe.album_name, " +
                        "qe.image_url, qe.duration_ms, COUNT(v.id) AS like_count " +
                        "FROM queue_entry qe " +
                        "LEFT JOIN vote v ON v.queue_entry_id = qe.id " +
                        "WHERE qe.id = :id " +
                        "GROUP BY qe.id"
                ).setParameter("id", partyEntity.currentlyPlayingEntryId).getResultList();

                if (!rows.isEmpty()) {
                    Object[] row = rows.get(0);
                    Map<String, Object> trackPayload = new HashMap<>();
                    trackPayload.put("id", row[0].toString());
                    trackPayload.put("uri", row[1]);
                    trackPayload.put("name", row[2]);
                    trackPayload.put("artists", List.of(Map.of("name", row[3] != null ? row[3] : "")));
                    trackPayload.put("album", Map.of(
                            "name", row[4] != null ? row[4] : "",
                            "images", row[5] != null ? List.of(Map.of("url", row[5])) : List.of()
                    ));
                    trackPayload.put("duration_ms", row[6]);
                    trackPayload.put("likeCount", ((Number) row[7]).longValue());

                    Boolean cached = party.getSpotifyCredentials().getLastPlaybackActive();
                    boolean isPlaying = cached != null ? cached
                            : (partyEntity.playbackStartedAt != null && partyEntity.pausedPositionMs == null);

                    int progressMs = 0;
                    if (partyEntity.pausedPositionMs != null) {
                        progressMs = partyEntity.pausedPositionMs.intValue();
                    } else if (partyEntity.playbackStartedAt != null) {
                        long elapsed = Duration.between(partyEntity.playbackStartedAt, OffsetDateTime.now()).toMillis();
                        if (row[6] instanceof Number dur) {
                            elapsed = Math.min(elapsed, dur.longValue());
                        }
                        progressMs = (int) elapsed;
                    }

                    Map<String, Object> payload = new HashMap<>();
                    payload.put("isPlaying", isPlaying);
                    payload.put("progressMs", progressMs);
                    payload.put("track", trackPayload);
                    if (isPlaying && partyEntity.playbackStartedAt != null) {
                        payload.put("playbackStartedAt", partyEntity.playbackStartedAt.toInstant().toString());
                    }
                    return Response.ok(payload).build();
                }
            }

            return Response.ok(Map.of("isPlaying", false, "progressMs", 0)).build();
        } catch (Exception e) {
            return propagateOrUnexpected("Das Laden der aktuellen Wiedergabe", e);
        }
    }

    @Override
    @Transactional
    public Response toggleVote(Party party, String trackUri, String deviceId) {
        try {
            // If the same URI is both playing and queued, vote on the waiting copy (the one
            // shown in the queue), falling back to any match.
            PartyEntity pe = PartyEntity.findById(party.id().value());
            UUID currentEntryId = pe != null ? pe.currentlyPlayingEntryId : null;
            QueueEntry entry = currentEntryId == null ? null
                    : QueueEntry.find("partyId = ?1 AND trackUri = ?2 AND id <> ?3",
                        party.id().value(), trackUri, currentEntryId).firstResult();
            if (entry == null) {
                entry = QueueEntry.find("partyId = ?1 AND trackUri = ?2",
                        party.id().value(), trackUri).firstResult();
            }
            if (entry == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity(Map.of("error", "Song nicht in der Warteschlange."))
                        .type(MediaType.APPLICATION_JSON)
                        .build();
            }

            Vote existing = Vote.find("queueEntry = ?1 AND deviceId = ?2", entry, deviceId).firstResult();
            boolean liked;
            if (existing != null) {
                existing.delete();
                liked = false;
            } else {
                Vote vote = new Vote();
                vote.queueEntry = entry;
                vote.deviceId = deviceId;
                vote.votedAt = OffsetDateTime.now();
                vote.persist();
                liked = true;
            }

            long likeCount = Vote.count("queueEntry", entry);
            return Response.ok(Map.of("liked", liked, "likeCount", likeCount)).build();
        } catch (Exception e) {
            return propagateOrUnexpected("Das Abstimmen", e);
        }
    }

    // --- default playlist & queue auto-refill ---

    /**
     * Lists the authenticated host's own Spotify playlists for the creation-time
     * picker. Each entry carries id, name, trackCount and (optional) imageUrl.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listHostPlaylists(Party party) {
        try {
            HttpResponse<String> res = executeSpotifyRequest(party, () ->
                    HttpRequest.newBuilder()
                            .uri(URI.create("https://api.spotify.com/v1/me/playlists?limit=50"))
                            .header("Authorization", authHeader(party))
                            .GET()
                            .build());
            if (res.statusCode() < 200 || res.statusCode() >= 300) {
                throw SpotifyApiErrors.asException(res, "Das Laden der Playlists");
            }

            Map<String, Object> json = mapper.readValue(res.body(), Map.class);
            List<Map<String, Object>> items = (List<Map<String, Object>>) json.get("items");
            if (items == null) {
                return List.of();
            }

            List<Map<String, Object>> result = new ArrayList<>();
            for (Map<String, Object> playlist : items) {
                Map<String, Object> entry = new HashMap<>();
                entry.put("id", playlist.get("id"));
                entry.put("name", playlist.get("name"));
                int trackCount = 0;
                if (playlist.get("tracks") instanceof Map<?, ?> tracks && tracks.get("total") instanceof Number n) {
                    trackCount = n.intValue();
                }
                entry.put("trackCount", trackCount);
                entry.put("imageUrl", firstImageUrl(playlist));
                result.add(entry);
            }
            return result;
        } catch (Exception e) {
            if (e instanceof WebApplicationException wae) throw wae;
            throw new WebApplicationException(SpotifyApiErrors.unexpectedError("Das Laden der Playlists", e));
        }
    }

    /**
     * Track URIs of a playlist, used to refill the queue from a default (or
     * Top-Charts fallback) playlist. Best-effort: returns an empty list if the
     * playlist can't be read so the caller can fall through to its next source.
     */
    @SuppressWarnings("unchecked")
    public List<String> getPlaylistTrackUris(Party party, String playlistId) {
        if (playlistId == null || playlistId.isBlank()) {
            return List.of();
        }
        try {
            String fields = URLEncoder.encode("items(track(uri))", StandardCharsets.UTF_8);
            String url = "https://api.spotify.com/v1/playlists/" + playlistId + "/tracks?limit=100&fields=" + fields;
            HttpResponse<String> res = executeSpotifyRequest(party, () ->
                    HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .header("Authorization", authHeader(party))
                            .GET()
                            .build());
            if (res.statusCode() < 200 || res.statusCode() >= 300) {
                return List.of();
            }

            Map<String, Object> json = mapper.readValue(res.body(), Map.class);
            List<Map<String, Object>> items = (List<Map<String, Object>>) json.get("items");
            if (items == null) {
                return List.of();
            }

            List<String> uris = new ArrayList<>();
            for (Map<String, Object> item : items) {
                if (item.get("track") instanceof Map<?, ?> track && track.get("uri") instanceof String uri && !uri.isBlank()) {
                    uris.add(uri);
                }
            }
            return uris;
        } catch (Exception e) {
            return List.of();
        }
    }

    /**
     * Tracks "similar" to what the crowd added, used to refill the queue when no default playlist
     * is set. Spotify deprecated {@code /v1/recommendations} and related-artists for newer apps
     * (404), and the artist endpoint no longer returns genres — so we rotate randomly across the
     * top tracks of <em>all artists seen this party</em> (falling back to the seed track's artists
     * if none recorded yet). Both the artist pool and each artist's tracks are shuffled so
     * successive refills vary. Best-effort: empty list on failure, so the caller falls back to the
     * configured Top-Charts playlist.
     */
    public List<String> getSimilarTrackUris(Party party, String seedTrackId) {
        List<String> artistPool = new ArrayList<>(party.seenArtistIds());
        if (artistPool.isEmpty() && seedTrackId != null && !seedTrackId.isBlank()) {
            try {
                artistPool.addAll(parseArtistIds(fetchTrackMetadata(party, seedTrackId)));
            } catch (Exception ignored) {
                // fall through — no seed artists available
            }
        }
        if (artistPool.isEmpty()) {
            return List.of();
        }

        Collections.shuffle(artistPool);
        List<String> uris = new ArrayList<>();
        int artistsTried = 0;
        for (String artistId : artistPool) {
            if (artistsTried >= 3) break; // bound the number of Spotify calls per refill
            artistsTried++;
            List<String> tops = new ArrayList<>(getArtistTopTrackUris(party, artistId));
            Collections.shuffle(tops);
            uris.addAll(tops);
        }
        return uris;
    }

    @SuppressWarnings("unchecked")
    private List<String> getArtistTopTrackUris(Party party, String artistId) {
        try {
            String url = "https://api.spotify.com/v1/artists/" + artistId + "/top-tracks?market="
                    + URLEncoder.encode(market, StandardCharsets.UTF_8);
            HttpResponse<String> res = executeSpotifyRequest(party, () ->
                    HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .header("Authorization", authHeader(party))
                            .GET()
                            .build());
            if (res.statusCode() < 200 || res.statusCode() >= 300) {
                return List.of();
            }

            Map<String, Object> json = mapper.readValue(res.body(), Map.class);
            List<Map<String, Object>> tracks = (List<Map<String, Object>>) json.get("tracks");
            if (tracks == null) {
                return List.of();
            }

            List<String> uris = new ArrayList<>();
            for (Map<String, Object> track : tracks) {
                if (track.get("uri") instanceof String uri && !uri.isBlank()) {
                    uris.add(uri);
                }
            }
            return uris;
        } catch (Exception e) {
            return List.of();
        }
    }

    /**
     * Keeps playback going when the queue would otherwise empty out. While a song
     * is playing and no other songs are queued, adds up to {@link #REFILL_BATCH}
     * songs to the bottom of the queue — from the party's default playlist if set,
     * otherwise from recommendations seeded by the current track, otherwise from a
     * configured Top-Charts playlist. Auto-filled entries are marked so they always
     * sort below guest-added songs. Runs inside the caller's transaction.
     */
    @Override
    @Transactional
    public void refillQueue(Party party) {
        try {
            PartyEntity pe = PartyEntity.findById(party.id().value());
            if (pe == null || pe.currentlyPlayingEntryId == null) {
                return; // nothing is playing — don't conjure a queue out of nowhere
            }

            long others = QueueEntry.count("partyId = ?1 AND id <> ?2",
                    party.id().value(), pe.currentlyPlayingEntryId);
            if (others > 0) {
                return; // real songs still queued — no filler needed
            }

            String defaultPlaylistId = party.defaultPlaylistId();

            // If the host didn't choose a default playlist, try to create/find a "Musicvoting party"
            // playlist in the host's account as a best-effort fallback so autoplay still works.
            if (defaultPlaylistId == null || defaultPlaylistId.isBlank()) {
                try {
                    ensurePartyPlaylistExists(party);
                    defaultPlaylistId = party.defaultPlaylistId();
                } catch (Exception ignored) {
                    // best-effort: continue to other fallbacks if this fails
                }
            }

            // One shared fall-through chain: the default playlist is just the first preference, so
            // it can never dead-end. If reading it yields nothing (transient error / unreadable /
            // empty), keep going — similar songs → Top-Charts → search — exactly like the
            // no-default-playlist path, so autoplay always advances.
            List<String> candidates = List.of();
            if (defaultPlaylistId != null && !defaultPlaylistId.isBlank()) {
                candidates = getPlaylistTrackUris(party, defaultPlaylistId);
            }
            if (candidates.isEmpty()) {
                candidates = getSimilarTrackUris(party, currentSeedTrackId(pe));
            }
            if (candidates.isEmpty()) {
                candidates = getPlaylistTrackUris(party, topChartsPlaylistId.orElse(null));
            }
            if (candidates.isEmpty()) {
                // Last resort that survives Spotify's API restrictions: /search still works
                // (it powers the in-app search), so search for more tracks by the current
                // song's artist. This keeps autoplay going on-vibe without any host config.
                candidates = getSearchFallbackUris(party, currentTrackArtistName(pe));
            }
            if (candidates.isEmpty()) {
                return; // refill genuinely yields nothing → playback stops ("Warteschlange ist leer")
            }

            Set<String> alreadyQueued = QueueEntry.<QueueEntry>list("partyId", party.id().value())
                    .stream().map(e -> e.trackUri).collect(Collectors.toSet());

            // Add exactly one song. Prefer a track we haven't auto-filled before, so the refill
            // walks the playlist forward; if every candidate was already used (playlist exhausted),
            // allow a repeat so the music keeps going instead of stopping.
            final List<String> pool = candidates;
            String pick = pool.stream()
                    .filter(u -> u != null && !u.isBlank() && !alreadyQueued.contains(u) && !party.wasAutoFilled(u))
                    .findFirst()
                    .orElseGet(() -> pool.stream()
                            .filter(u -> u != null && !u.isBlank() && !alreadyQueued.contains(u))
                            .findFirst()
                            .orElse(null));
            if (pick == null) {
                return;
            }

            try {
                String trackId = pick.contains(":") ? pick.substring(pick.lastIndexOf(":") + 1) : pick;
                Map<String, Object> meta = fetchTrackMetadata(party, trackId);

                QueueEntry entry = new QueueEntry();
                entry.partyId = party.id().value();
                entry.trackUri = pick;
                entry.trackName = (String) meta.get("name");
                entry.artistName = parseArtistName(meta);
                entry.albumName = parseAlbumName(meta);
                entry.imageUrl = parseImageUrl(meta);
                entry.durationMs = meta.get("duration_ms") instanceof Number n ? n.intValue() : null;
                entry.addedAt = OffsetDateTime.now();
                entry.autofilled = true;
                entry.persist();

                party.recordAutoFilled(pick);

                loginEventBus.emit(new LoginEvent(
                        "queue-updated",
                        Instant.now(),
                        Map.of("source", "web", "partyId", party.id().value())));
            } catch (Exception ignored) {
                // Skip a track that can't be loaded.
            }
        } catch (Exception ignored) {
            // Auto-refill is best-effort; never break the advance/start flow.
        }
    }

    private String currentTrackArtistName(PartyEntity pe) {
        if (pe.currentlyPlayingEntryId == null) {
            return null;
        }
        QueueEntry current = QueueEntry.findById(pe.currentlyPlayingEntryId);
        return current != null ? current.artistName : null;
    }

    /**
     * Reliable last-resort refill source. Spotify's recommendation, related-artist and
     * editorial-playlist endpoints are all blocked for newer apps, but {@code /search}
     * still works — so we search for tracks by the current song's artist, and if that
     * yields nothing fall back to a broad query. This guarantees there is always a next
     * song so autoplay never dead-stops. Best-effort: empty list only if every search
     * fails (e.g. no network).
     */
    @SuppressWarnings("unchecked")
    private List<String> getSearchFallbackUris(Party party, String artistName) {
        String primaryArtist = null;
        if (artistName != null && !artistName.isBlank()) {
            primaryArtist = artistName.contains(",")
                    ? artistName.substring(0, artistName.indexOf(",")).trim()
                    : artistName.trim();
        }

        List<String> byArtist = (primaryArtist == null || primaryArtist.isBlank())
                ? List.of()
                : searchTrackUris(party, "artist:" + primaryArtist);
        if (!byArtist.isEmpty()) {
            return byArtist;
        }
        // Nothing by that artist (or no artist known) — a broad query so something always plays.
        return searchTrackUris(party, "year:2010-2025");
    }

    @SuppressWarnings("unchecked")
    private List<String> searchTrackUris(Party party, String query) {
        try {
            String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url = "https://api.spotify.com/v1/search?q=" + encoded
                    + "&type=track&limit=50&market=" + URLEncoder.encode(market, StandardCharsets.UTF_8);
            HttpResponse<String> res = executeSpotifyRequest(party, () ->
                    HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .header("Authorization", authHeader(party))
                            .GET()
                            .build());
            if (res.statusCode() < 200 || res.statusCode() >= 300) {
                return List.of();
            }
            Map<String, Object> json = mapper.readValue(res.body(), Map.class);
            Map<String, Object> tracks = (Map<String, Object>) json.get("tracks");
            if (tracks == null) {
                return List.of();
            }
            List<Map<String, Object>> items = (List<Map<String, Object>>) tracks.get("items");
            if (items == null) {
                return List.of();
            }
            List<String> uris = new ArrayList<>();
            for (Map<String, Object> item : items) {
                if (item != null && item.get("uri") instanceof String uri && !uri.isBlank()) {
                    uris.add(uri);
                }
            }
            Collections.shuffle(uris);
            return uris;
        } catch (Exception e) {
            return List.of();
        }
    }

    private String currentSeedTrackId(PartyEntity pe) {
        if (pe.currentlyPlayingEntryId == null) {
            return null;
        }
        QueueEntry current = QueueEntry.findById(pe.currentlyPlayingEntryId);
        if (current == null || current.trackUri == null) {
            return null;
        }
        String uri = current.trackUri;
        return uri.contains(":") ? uri.substring(uri.lastIndexOf(":") + 1) : uri;
    }

    @SuppressWarnings("unchecked")
    private String firstImageUrl(Map<String, Object> playlist) {
        if (playlist.get("images") instanceof List<?> images && !images.isEmpty()
                && images.get(0) instanceof Map<?, ?> image && image.get("url") instanceof String url) {
            return url;
        }
        return null;
    }

    // --- token refresh ---

    private void refreshAccessToken(Party party) {
        SpotifyCredentials creds = party.getSpotifyCredentials();
        String refreshToken = creds.getRefreshToken();
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new WebApplicationException(Response.status(401)
                    .entity(Map.of("error", "Spotify-Sitzung abgelaufen. Bitte neu anmelden."))
                    .type(MediaType.APPLICATION_JSON)
                    .build());
        }
        try {
            String body = "grant_type=refresh_token"
                    + "&refresh_token=" + URLEncoder.encode(refreshToken, StandardCharsets.UTF_8)
                    + "&client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
                    + "&client_secret=" + URLEncoder.encode(clientSecret, StandardCharsets.UTF_8);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://accounts.spotify.com/api/token"))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() < 200 || res.statusCode() >= 300) {
                throw new WebApplicationException(Response.status(401)
                        .entity(Map.of("error", "Spotify-Sitzung abgelaufen. Bitte neu anmelden."))
                        .type(MediaType.APPLICATION_JSON)
                        .build());
            }

            Map<String, Object> tokenMap = mapper.readValue(res.body(), Map.class);
            String newAccessToken = (String) tokenMap.get("access_token");
            if (newAccessToken != null && !newAccessToken.isBlank()) {
                creds.setToken(newAccessToken);
            }
            String newRefreshToken = (String) tokenMap.get("refresh_token");
            if (newRefreshToken != null && !newRefreshToken.isBlank()) {
                creds.setRefreshToken(newRefreshToken);
                partyService.persistSpotifyRefreshToken(party.id(), newRefreshToken);
            }
            Object expiresInObj = tokenMap.get("expires_in");
            if (expiresInObj instanceof Number expiresIn) {
                creds.setExpiresAt(Instant.now().plusSeconds(expiresIn.longValue() - 60));
            }
        } catch (WebApplicationException e) {
            throw e;
        } catch (Exception e) {
            throw new WebApplicationException(Response.status(401)
                    .entity(Map.of("error", "Spotify-Sitzung abgelaufen. Bitte neu anmelden."))
                    .type(MediaType.APPLICATION_JSON)
                    .build());
        }
    }

    private void ensureValidToken(Party party) {
        SpotifyCredentials creds = party.getSpotifyCredentials();
        String token = creds.getToken();
        boolean tokenMissing = token == null || token.isBlank();
        Instant expiresAt = creds.getExpiresAt();
        boolean expired = expiresAt != null && Instant.now().isAfter(expiresAt);
        // Refresh on expiry, and also when the access token is missing but a refresh token exists
        // (e.g. right after a restart, where only the persisted refresh token was reloaded).
        if (tokenMissing || expired) {
            String refresh = creds.getRefreshToken();
            if (refresh != null && !refresh.isBlank()) {
                refreshAccessToken(party);
            }
        }
    }

    /** Ensures a (re-minted if needed) access token and returns it; empty if none can be obtained. */
    public String getValidAccessToken(Party party) {
        try {
            ensureValidToken(party);
        } catch (Exception ignored) {
            // best-effort — fall through and return whatever token we currently have
        }
        return party.getSpotifyCredentials().getToken();
    }

    private HttpResponse<String> executeSpotifyRequest(Party party, Supplier<HttpRequest> builder)
            throws Exception {
        ensureValidToken(party);
        HttpResponse<String> res = client.send(builder.get(), HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() == 401) {
            refreshAccessToken(party);
            res = client.send(builder.get(), HttpResponse.BodyHandlers.ofString());
        }
        return res;
    }

    // --- helpers ---

    private Response sendGet(Party party, String url) {
        try {
            HttpResponse<String> res = executeSpotifyRequest(party, () ->
                    HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .header("Authorization", authHeader(party))
                            .GET()
                            .build());
            if (res.statusCode() < 200 || res.statusCode() >= 300) {
                return SpotifyApiErrors.buildResponse(res, "Die Spotify-Anfrage");
            }
            return Response.status(res.statusCode()).entity(res.body()).type(MediaType.APPLICATION_JSON).build();
        } catch (Exception e) {
            return propagateOrUnexpected("Die Spotify-Anfrage", e);
        }
    }

    private Response sendPut(Party party, String url, String body) {
        try {
            HttpResponse<String> res = executeSpotifyRequest(party, () ->
                    HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .header("Authorization", authHeader(party))
                            .header("Content-Type", "application/json")
                            .PUT(body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body))
                            .build());
            if (res.statusCode() < 200 || res.statusCode() >= 300) {
                return SpotifyApiErrors.buildResponse(res, "Die Spotify-Wiedergabeanfrage");
            }
            return Response.status(res.statusCode())
                    .entity(res.body())
                    .type(MediaType.APPLICATION_JSON)
                    .build();
        } catch (Exception e) {
            return propagateOrUnexpected("Die Spotify-Wiedergabeanfrage", e);
        }
    }

    private String resolvePlayableDeviceId(Party party) {
        SpotifyCredentials creds = party.getSpotifyCredentials();
        String stored = creds.getDeviceId();

        try {
            HttpResponse<String> res = executeSpotifyRequest(party, () ->
                    HttpRequest.newBuilder()
                            .uri(URI.create("https://api.spotify.com/v1/me/player/devices"))
                            .header("Authorization", authHeader(party))
                            .GET()
                            .build());
            if (res.statusCode() < 200 || res.statusCode() >= 300) {
                throw SpotifyApiErrors.asException(res, "Das Laden der Spotify-Geraete");
            }

            Map<String, Object> map = mapper.readValue(res.body(), Map.class);
            List<Map<String, Object>> devices = (List<Map<String, Object>>) map.get("devices");
            if (devices == null || devices.isEmpty()) {
                return null;
            }

            String validatedStored = devices.stream()
                    .filter(d -> {
                        String id = (String) d.get("id");
                        return stored != null && !stored.isBlank() && stored.equals(id);
                    })
                    .map(d -> (String) d.get("id"))
                    .filter(id -> id != null && !id.isBlank())
                    .findFirst()
                    .orElse(null);
            if (validatedStored != null) {
                return validatedStored;
            }

            String active = devices.stream()
                    .filter(d -> Boolean.TRUE.equals(d.get("is_active")))
                    .map(d -> (String) d.get("id"))
                    .filter(id -> id != null && !id.isBlank())
                    .findFirst()
                    .orElse(null);

            String selected = active != null ? active : (String) devices.get(0).get("id");
            if (selected != null && !selected.isBlank()) {
                creds.setDeviceId(selected);
            }
            return selected;
        } catch (Exception e) {
            if (stored != null && !stored.isBlank()) {
                return stored;
            }
            if (e instanceof WebApplicationException webApplicationException) {
                throw webApplicationException;
            }
            throw new WebApplicationException(SpotifyApiErrors.unexpectedError("Das Laden der Spotify-Geraete", e));
        }
    }

    private Map<String, Object> fetchTrackMetadata(Party party, String trackId) throws Exception {
        HttpResponse<String> res = executeSpotifyRequest(party, () ->
                HttpRequest.newBuilder()
                        .uri(URI.create("https://api.spotify.com/v1/tracks/" + trackId))
                        .header("Authorization", authHeader(party))
                        .GET()
                        .build());
        if (res.statusCode() < 200 || res.statusCode() >= 300) {
            throw SpotifyApiErrors.asException(res, "Das Laden der Track-Informationen");
        }
        return mapper.readValue(res.body(), Map.class);
    }

    @SuppressWarnings("unchecked")
    private List<String> parseArtistIds(Map<String, Object> meta) {
        List<Map<String, Object>> artists = (List<Map<String, Object>>) meta.get("artists");
        if (artists == null) return List.of();
        return artists.stream()
                .map(a -> a.get("id"))
                .filter(id -> id instanceof String s && !s.isBlank())
                .map(id -> (String) id)
                .toList();
    }

    @SuppressWarnings("unchecked")
    private String parseArtistName(Map<String, Object> meta) {
        List<Map<String, Object>> artists = (List<Map<String, Object>>) meta.get("artists");
        if (artists == null || artists.isEmpty()) return "";
        return artists.stream()
                .map(a -> (String) a.get("name"))
                .filter(n -> n != null)
                .collect(Collectors.joining(", "));
    }

    @SuppressWarnings("unchecked")
    private String parseAlbumName(Map<String, Object> meta) {
        Map<String, Object> album = (Map<String, Object>) meta.get("album");
        return album != null ? (String) album.get("name") : null;
    }

    @SuppressWarnings("unchecked")
    private String parseImageUrl(Map<String, Object> meta) {
        Map<String, Object> album = (Map<String, Object>) meta.get("album");
        if (album == null) return null;
        List<Map<String, Object>> images = (List<Map<String, Object>>) album.get("images");
        if (images == null || images.isEmpty()) return null;
        return (String) images.get(0).get("url");
    }

    private void removeTrackFromPlaylist(Party party, String uri) throws Exception {
        if (uri == null || uri.isBlank()) return;
        String playlistId = party.getSpotifyCredentials().getPlaylistId();
        if (playlistId == null || playlistId.isBlank()) return;

        Map<String, Object> trackObj = Map.of("uri", uri);
        Map<String, Object> deleteBody = Map.of("tracks", List.of(trackObj));
        String jsonDelete = mapper.writeValueAsString(deleteBody);

        HttpResponse<String> response = executeSpotifyRequest(party, () ->
                HttpRequest.newBuilder()
                        .uri(URI.create("https://api.spotify.com/v1/playlists/" + playlistId + "/tracks"))
                        .header("Authorization", authHeader(party))
                        .header("Content-Type", "application/json")
                        .method("DELETE", HttpRequest.BodyPublishers.ofString(jsonDelete))
                        .build());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw SpotifyApiErrors.asException(response, "Das Entfernen des Songs aus der Playlist");
        }
    }

    private Map<String, Object> getCurrentPlaybackSnapshot(Party party) throws Exception {
        HttpResponse<String> res = executeSpotifyRequest(party, () ->
                HttpRequest.newBuilder()
                        .uri(URI.create("https://api.spotify.com/v1/me/player/currently-playing"))
                        .header("Authorization", authHeader(party))
                        .GET()
                        .build());
        if (res.statusCode() == 204) {
            return null;
        }

        if (res.statusCode() < 200 || res.statusCode() >= 300) {
            throw SpotifyApiErrors.asException(res, "Das Laden der aktuellen Wiedergabe");
        }

        Map<String, Object> json = mapper.readValue(res.body(), Map.class);
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("isPlaying", Boolean.TRUE.equals(json.get("is_playing")));

        Object itemObj = json.get("item");
        if (itemObj instanceof Map<?, ?> item) {
            snapshot.put("item", item);
            snapshot.put("uri", item.get("uri"));
        }

        return snapshot;
    }

    private void updateCachedPlayback(Party party, String uri, boolean isPlaying) {
        SpotifyCredentials creds = party.getSpotifyCredentials();
        if (uri != null && !uri.isBlank()) {
            creds.setLastPlaybackUri(uri);
        }
        creds.setLastPlaybackActive(isPlaying);
    }

    private String getCurrentlyPlayingUri(Party party) {
        try {
            Map<String, Object> snapshot = getCurrentPlaybackSnapshot(party);
            if (snapshot == null) {
                return null;
            }

            Object itemObj = snapshot.get("item");
            if (!(itemObj instanceof Map<?, ?> item)) {
                return null;
            }
            return (String) item.get("uri");
        } catch (Exception e) {
            return null;
        }
    }

    private Response propagateOrUnexpected(String actionLabel, Exception exception) {
        if (exception instanceof WebApplicationException webApplicationException) {
            return webApplicationException.getResponse();
        }
        return SpotifyApiErrors.unexpectedError(actionLabel, exception);
    }
}
