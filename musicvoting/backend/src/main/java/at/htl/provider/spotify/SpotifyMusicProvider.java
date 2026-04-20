package at.htl.provider.spotify;

import at.htl.domain.Party;
import at.htl.provider.MusicProvider;
import at.htl.service.SpotifyApiErrors;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class SpotifyMusicProvider implements MusicProvider {

    private final HttpClient client = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    private String authHeader(Party party) {
        return "Bearer " + party.getSpotifyCredentials().getToken();
    }

    @Override
    public Map<String, Object> searchTracks(Party party, String query) {
        try {
            String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url = "https://api.spotify.com/v1/search?q=" + encoded + "&type=track&limit=25";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", authHeader(party))
                    .GET()
                    .build();

            HttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString());
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
    public Response play(Party party, String uri) {
        try {
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
                updateCachedPlayback(party, uri, true);
            }
            return response;
        } catch (Exception e) {
            return propagateOrUnexpected("Das Starten der Wiedergabe", e);
        }
    }

    @Override
    public Response addTracksToPlaylist(Party party, List<String> uris) {
        try {
            String playlistId = party.getSpotifyCredentials().getPlaylistId();
            if (playlistId == null || playlistId.isBlank()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "No playlist available"))
                        .type(MediaType.APPLICATION_JSON)
                        .build();
            }

            HttpRequest getRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.spotify.com/v1/playlists/" + playlistId + "/tracks"))
                    .header("Authorization", authHeader(party))
                    .GET()
                    .build();

            HttpResponse<String> getRes = client.send(getRequest, HttpResponse.BodyHandlers.ofString());
            if (getRes.statusCode() < 200 || getRes.statusCode() >= 300) {
                throw SpotifyApiErrors.asException(getRes, "Das Laden der Playlist");
            }
            Map<String, Object> json = mapper.readValue(getRes.body(), Map.class);
            List<Map<String, Object>> items = (List<Map<String, Object>>) json.get("items");

            List<String> existingUris = items.stream()
                    .map(item -> (Map<String, Object>) item.get("track"))
                    .map(track -> (String) track.get("uri"))
                    .toList();

            List<String> newUris = uris.stream()
                    .filter(uri -> !existingUris.contains(uri))
                    .toList();

            if (newUris.isEmpty()) {
                return Response.ok("{\"status\":\"No new tracks to add\"}").build();
            }

            Map<String, Object> bodyMap = Map.of("uris", newUris);
            HttpRequest postRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.spotify.com/v1/playlists/" + playlistId + "/tracks"))
                    .header("Authorization", authHeader(party))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(bodyMap)))
                    .build();

            HttpResponse<String> postRes = client.send(postRequest, HttpResponse.BodyHandlers.ofString());
            if (postRes.statusCode() < 200 || postRes.statusCode() >= 300) {
                return SpotifyApiErrors.buildResponse(postRes, "Das Hinzufuegen des Songs zur Playlist");
            }
            return Response.status(postRes.statusCode())
                    .entity(postRes.body())
                    .type(MediaType.APPLICATION_JSON)
                    .build();

        } catch (Exception e) {
            return propagateOrUnexpected("Das Hinzufuegen des Songs zur Playlist", e);
        }
    }

    @Override
    public Response removeTrack(Party party, String uri) {
        try {
            removeTrackFromPlaylist(party, uri);
            return Response.ok(Map.of("status", "removed")).build();
        } catch (Exception e) {
            return propagateOrUnexpected("Das Entfernen des Songs aus der Playlist", e);
        }
    }

    @Override
    public List<Map<String, Object>> getQueue(Party party) {
        try {
            String playlistId = party.getSpotifyCredentials().getPlaylistId();
            if (playlistId == null || playlistId.isBlank()) {
                return List.of();
            }

            String url = "https://api.spotify.com/v1/playlists/" + playlistId + "/tracks";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", authHeader(party))
                    .GET()
                    .build();

            HttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() < 200 || res.statusCode() >= 300) {
                throw SpotifyApiErrors.asException(res, "Das Laden der Warteschlange");
            }
            Map<String, Object> json = mapper.readValue(res.body(), Map.class);
            List<Map<String, Object>> items = (List<Map<String, Object>>) json.get("items");

            return items.stream().map(item -> {
                Map<String, Object> track = (Map<String, Object>) item.get("track");

                List<Map<String, Object>> artists = (List<Map<String, Object>>) track.get("artists");

                Map<String, Object> album = (Map<String, Object>) track.get("album");
                List<Map<String, Object>> images = (List<Map<String, Object>>) album.get("images");

                return Map.of(
                        "id", track.get("id"),
                        "uri", track.get("uri"),
                        "name", track.get("name"),
                        "artists", artists,
                        "album", Map.of(
                                "name", album.get("name"),
                                "images", images
                        )
                );
            }).toList();

        } catch (Exception e) {
            if (e instanceof WebApplicationException webApplicationException) {
                throw webApplicationException;
            }
            throw new WebApplicationException(SpotifyApiErrors.unexpectedError("Das Laden der Warteschlange", e));
        }
    }

    public void fetchAndStoreUserId(Party party) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.spotify.com/v1/me"))
                .header("Authorization", authHeader(party))
                .GET()
                .build();

        HttpResponse<String> res =
                client.send(request, HttpResponse.BodyHandlers.ofString());
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
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.spotify.com/v1/me/playlists?limit=50"))
                .header("Authorization", authHeader(party))
                .GET()
                .build();

        HttpResponse<String> res =
                client.send(request, HttpResponse.BodyHandlers.ofString());
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

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.spotify.com/v1/users/" + userId + "/playlists"))
                .header("Authorization", authHeader(party))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                        mapper.writeValueAsString(bodyMap)))
                .build();

        HttpResponse<String> res =
                client.send(request, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() < 200 || res.statusCode() >= 300) {
            throw SpotifyApiErrors.asException(res, "Das Anlegen der Party-Playlist");
        }

        Map<String, Object> map =
                mapper.readValue(res.body(), Map.class);

        party.getSpotifyCredentials().setPlaylistId((String) map.get("id"));
    }

    @Override
    public Response overwritePlaylist(Party party, List<String> uris) {
        try {
            String playlistId = party.getSpotifyCredentials().getPlaylistId();

            Map<String, Object> bodyMap = Map.of("uris", uris);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.spotify.com/v1/playlists/" + playlistId + "/tracks"))
                    .header("Authorization", authHeader(party))
                    .header("Content-Type", "application/json")
                    .PUT(HttpRequest.BodyPublishers.ofString(
                            mapper.writeValueAsString(bodyMap)))
                    .build();

            HttpResponse<String> res =
                    client.send(request, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() < 200 || res.statusCode() >= 300) {
                return SpotifyApiErrors.buildResponse(res, "Das Speichern der Playlist");
            }

            return Response.status(res.statusCode())
                    .entity(res.body())
                    .type(MediaType.APPLICATION_JSON)
                    .build();

        } catch (Exception e) {
            return propagateOrUnexpected("Das Speichern der Playlist", e);
        }
    }

    @Override
    public Response playNextAndRemove(Party party) {
        try {
            List<Map<String, Object>> currentQueue = getQueue(party);

            if (currentQueue == null || currentQueue.isEmpty()) {
                return Response.ok(Map.of("status", "empty", "message", "Warteschlange ist leer")).build();
            }

            // If the currently playing track is still at the top of the queue,
            // remove it first to avoid replaying the same song after it ended.
            String currentUri = getCurrentlyPlayingUri(party);
            if (currentUri != null && !currentUri.isBlank()) {
                String firstUri = (String) currentQueue.get(0).get("uri");
                if (currentUri.equals(firstUri)) {
                    removeTrackFromPlaylist(party, currentUri);
                    currentQueue = getQueue(party);
                    if (currentQueue == null || currentQueue.isEmpty()) {
                        return Response.ok(Map.of("status", "empty", "message", "Warteschlange ist leer")).build();
                    }
                }
            }

            Map<String, Object> nextTrack = currentQueue.get(0);
            String uri = (String) nextTrack.get("uri");

            Response playResponse = play(party, uri);
            if (playResponse.getStatus() < 200 || playResponse.getStatus() >= 300) {
                return playResponse;
            }

            removeTrackFromPlaylist(party, uri);

            return Response.ok(Map.of(
                    "status", "playing",
                    "trackName", nextTrack.get("name")
            )).build();

        } catch (Exception e) {
            return propagateOrUnexpected("Das Wechseln zum naechsten Song", e);
        }
    }

    @Override
    public Response pausePlayback(Party party) {
        try {
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
            }
            return response;
        } catch (Exception e) {
            return propagateOrUnexpected("Das Pausieren der Wiedergabe", e);
        }
    }

    @Override
    public Response resumePlayback(Party party) {
        try {
            String deviceId = resolvePlayableDeviceId(party);
            if (deviceId == null || deviceId.isBlank()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "No active Spotify device found."))
                        .type(MediaType.APPLICATION_JSON)
                        .build();
            }

            String url = "https://api.spotify.com/v1/me/player/play?device_id=" + deviceId;
            Response response = sendPut(party, url, null);
            if (response.getStatus() >= 200 && response.getStatus() < 300) {
                party.getSpotifyCredentials().setLastPlaybackActive(true);
            }
            return response;
        } catch (Exception e) {
            return propagateOrUnexpected("Das Fortsetzen der Wiedergabe", e);
        }
    }

    public void restoreCurrentTrackFromBeginningOnDevice(Party party, String deviceId) {
        try {
            if (deviceId == null || deviceId.isBlank()) {
                return;
            }

            try {
                HttpRequest devReq = HttpRequest.newBuilder()
                        .uri(URI.create("https://api.spotify.com/v1/me/player/devices"))
                        .header("Authorization", authHeader(party))
                        .GET()
                        .build();
                HttpResponse<String> devRes = client.send(devReq, HttpResponse.BodyHandlers.ofString());
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
                return;
            }

            Map<String, Object> bodyMap = Map.of("uris", List.of(uri));
            String url = "https://api.spotify.com/v1/me/player/play?device_id=" + deviceId;
            Response response = sendPut(party, url, mapper.writeValueAsString(bodyMap));
            if (response.getStatus() >= 200 && response.getStatus() < 300) {
                updateCachedPlayback(party, uri, true);
            }
        } catch (Exception ignored) {
            // Device registration should still succeed even if restore fails.
        }
    }

    @Override
    public Response startFirstSongWithoutRemoving(Party party) {
        try {
            List<Map<String, Object>> currentQueue = getQueue(party);
            if (currentQueue == null || currentQueue.isEmpty()) {
                return Response.ok(Map.of(
                        "status", "empty",
                        "message", "Warteschlange ist leer"
                )).build();
            }

            Map<String, Object> firstTrack = currentQueue.get(0);
            String uri = (String) firstTrack.get("uri");
            Response playResponse = play(party, uri);
            if (playResponse.getStatus() < 200 || playResponse.getStatus() >= 300) {
                return Response.status(playResponse.getStatus())
                        .entity(playResponse.getEntity())
                        .type(MediaType.APPLICATION_JSON)
                        .build();
            }

            Map<String, Object> payload = new HashMap<>();
            payload.put("status", "playing");
            payload.put("track", firstTrack);
            return Response.ok(payload).build();
        } catch (Exception e) {
            return propagateOrUnexpected("Das Starten des ersten Songs", e);
        }
    }

    @Override
    public Response getCurrentPlayback(Party party) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.spotify.com/v1/me/player/currently-playing"))
                    .header("Authorization", authHeader(party))
                    .GET()
                    .build();

            HttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (res.statusCode() == 204) {
                return Response.ok(Map.of(
                        "isPlaying", false,
                        "progressMs", 0
                )).build();
            }

            if (res.statusCode() < 200 || res.statusCode() >= 300) {
                return SpotifyApiErrors.buildResponse(res, "Das Laden der aktuellen Wiedergabe");
            }

            Map<String, Object> json = mapper.readValue(res.body(), Map.class);
            boolean isPlaying = Boolean.TRUE.equals(json.get("is_playing"));
            Number progressMs = (Number) json.get("progress_ms");

            Object itemObj = json.get("item");
            if (!(itemObj instanceof Map<?, ?> item)) {
                party.getSpotifyCredentials().setLastPlaybackActive(isPlaying);
                return Response.ok(Map.of(
                        "isPlaying", isPlaying,
                        "progressMs", progressMs == null ? 0 : progressMs.intValue()
                )).build();
            }

            List<Map<String, Object>> artists = (List<Map<String, Object>>) item.get("artists");
            Map<String, Object> album = (Map<String, Object>) item.get("album");
            List<Map<String, Object>> images = album == null
                    ? List.of()
                    : (List<Map<String, Object>>) album.getOrDefault("images", List.of());

            Map<String, Object> albumPayload = new HashMap<>();
            albumPayload.put("name", album == null ? null : album.get("name"));
            albumPayload.put("images", images);

            Map<String, Object> trackPayload = new HashMap<>();
            trackPayload.put("id", item.get("id"));
            trackPayload.put("uri", item.get("uri"));
            trackPayload.put("name", item.get("name"));
            trackPayload.put("artists", artists == null ? List.of() : artists);
            trackPayload.put("album", albumPayload);

            Map<String, Object> payload = new HashMap<>();
            payload.put("isPlaying", isPlaying);
            payload.put("progressMs", progressMs == null ? 0 : progressMs.intValue());
            payload.put("track", trackPayload);
            updateCachedPlayback(party, (String) item.get("uri"), isPlaying);

            return Response.ok(payload).build();
        } catch (Exception e) {
            return propagateOrUnexpected("Das Laden der aktuellen Wiedergabe", e);
        }
    }

    // --- helpers ---

    private Response sendGet(Party party, String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", authHeader(party))
                    .GET()
                    .build();

            HttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString());
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
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", authHeader(party))
                    .header("Content-Type", "application/json")
                    .PUT(body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString());
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
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.spotify.com/v1/me/player/devices"))
                    .header("Authorization", authHeader(party))
                    .GET()
                    .build();

            HttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString());
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

    private void removeTrackFromPlaylist(Party party, String uri) throws Exception {
        if (uri == null || uri.isBlank()) return;
        String playlistId = party.getSpotifyCredentials().getPlaylistId();
        if (playlistId == null || playlistId.isBlank()) return;

        Map<String, Object> trackObj = Map.of("uri", uri);
        Map<String, Object> deleteBody = Map.of("tracks", List.of(trackObj));
        String jsonDelete = mapper.writeValueAsString(deleteBody);

        HttpRequest deleteRequest = HttpRequest.newBuilder()
                .uri(URI.create("https://api.spotify.com/v1/playlists/" + playlistId + "/tracks"))
                .header("Authorization", authHeader(party))
                .header("Content-Type", "application/json")
                .method("DELETE", HttpRequest.BodyPublishers.ofString(jsonDelete))
                .build();

        HttpResponse<String> response = client.send(deleteRequest, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw SpotifyApiErrors.asException(response, "Das Entfernen des Songs aus der Playlist");
        }
    }

    private Map<String, Object> getCurrentPlaybackSnapshot(Party party) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.spotify.com/v1/me/player/currently-playing"))
                .header("Authorization", authHeader(party))
                .GET()
                .build();

        HttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString());
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
