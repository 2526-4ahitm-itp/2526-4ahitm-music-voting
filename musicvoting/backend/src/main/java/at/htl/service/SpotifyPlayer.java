package at.htl.service;

import at.htl.endpoints.SpotifyTokenResource;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
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
public class SpotifyPlayer {

    @Inject
    SpotifyTokenResource spotifyTokenResource;

    @Inject
    TokenStore tokenStore;

    private final HttpClient client = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    private String authHeader() {
        return "Bearer " + tokenStore.getToken();
    }

    private String getStoredDeviceId() {
        return tokenStore.getDeviceId();
    }

    public Map<String, Object> searchTracks(String query) {
        try {
            String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url = "https://api.spotify.com/v1/search?q=" + encoded + "&type=track&limit=25";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", authHeader())
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


    public Response getTrack(String id) {
        return sendGet("https://api.spotify.com/v1/tracks/" + id);
    }

    public Response play(String uri) {
        try {
            String deviceId = resolvePlayableDeviceId();
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

            Response response = sendPut(url, body);
            if (response.getStatus() >= 200 && response.getStatus() < 300) {
                updateCachedPlayback(uri, true);
            }
            return response;
        } catch (Exception e) {
            return propagateOrUnexpected("Das Starten der Wiedergabe", e);
        }
    }

    public Response addTracksToPlaylist(List<String> uris) {
        try {
            String playlistId = tokenStore.getPlaylistId();
            if (playlistId == null || playlistId.isBlank()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "No playlist available"))
                        .type(MediaType.APPLICATION_JSON)
                        .build();
            }

            HttpRequest getRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.spotify.com/v1/playlists/" + playlistId + "/tracks"))
                    .header("Authorization", authHeader())
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
                    .header("Authorization", authHeader())
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

    public Response removeTrack(String uri) {
        try {
            removeTrackFromPlaylist(uri);
            return Response.ok(Map.of("status", "removed")).build();
        } catch (Exception e) {
            return propagateOrUnexpected("Das Entfernen des Songs aus der Playlist", e);
        }
    }


    public List<Map<String, Object>> getQueue() {
        try {
            String playlistId = tokenStore.getPlaylistId();
            if (playlistId == null || playlistId.isBlank()) {
                return List.of();
            }

            String url = "https://api.spotify.com/v1/playlists/" + playlistId + "/tracks";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", authHeader())
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

    public void fetchAndStoreUserId() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.spotify.com/v1/me"))
                .header("Authorization", authHeader())
                .GET()
                .build();

        HttpResponse<String> res =
                client.send(request, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() < 200 || res.statusCode() >= 300) {
            throw SpotifyApiErrors.asException(res, "Das Laden des Spotify-Profils");
        }

        Map<String, Object> map =
                mapper.readValue(res.body(), Map.class);

        tokenStore.setSpotifyUserId((String) map.get("id"));
    }

    public void ensurePartyPlaylistExists() throws Exception {

        String existingId = findExistingPlaylist();

        if (existingId != null) {
            tokenStore.setPlaylistId(existingId);
            return;
        }

        createPartyPlaylist();
    }

    private String findExistingPlaylist() throws Exception {

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.spotify.com/v1/me/playlists?limit=50"))
                .header("Authorization", authHeader())
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

    private void createPartyPlaylist() throws Exception {

        String userId = tokenStore.getSpotifyUserId();

        Map<String, Object> bodyMap = Map.of(
                "name", "Musicvoting party",
                "public", false,
                "description", "Generated by MusicVoting"
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.spotify.com/v1/users/" + userId + "/playlists"))
                .header("Authorization", authHeader())
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

        tokenStore.setPlaylistId((String) map.get("id"));
    }

    public Response overwritePlaylist(List<String> uris) {

        try {
            String playlistId = tokenStore.getPlaylistId();

            Map<String, Object> bodyMap = Map.of("uris", uris);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.spotify.com/v1/playlists/" + playlistId + "/tracks"))
                    .header("Authorization", authHeader())
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

    public Response playNextAndRemove() {
        try {
            List<Map<String, Object>> currentQueue = getQueue();

            if (currentQueue == null || currentQueue.isEmpty()) {
                // Wenn nichts mehr da ist, senden wir einen Hinweis
                return Response.ok(Map.of("status", "empty", "message", "Warteschlange ist leer")).build();
            }

            // If the currently playing track is still at the top of the queue,
            // remove it first to avoid replaying the same song after it ended.
            String currentUri = getCurrentlyPlayingUri();
            if (currentUri != null && !currentUri.isBlank()) {
                String firstUri = (String) currentQueue.get(0).get("uri");
                if (currentUri.equals(firstUri)) {
                    removeTrackFromPlaylist(currentUri);
                    currentQueue = getQueue();
                    if (currentQueue == null || currentQueue.isEmpty()) {
                        return Response.ok(Map.of("status", "empty", "message", "Warteschlange ist leer")).build();
                    }
                }
            }

            // 1. Hol den (neuen) ersten Track aus der Liste
            Map<String, Object> nextTrack = currentQueue.get(0);
            String uri = (String) nextTrack.get("uri");

            // 2. Abspielen starten
            Response playResponse = play(uri);
            if (playResponse.getStatus() < 200 || playResponse.getStatus() >= 300) {
                return playResponse;
            }

            // 3. Aus der Spotify-Playlist löschen
            removeTrackFromPlaylist(uri);

            return Response.ok(Map.of(
                    "status", "playing",
                    "trackName", nextTrack.get("name")
            )).build();

        } catch (Exception e) {
            return propagateOrUnexpected("Das Wechseln zum naechsten Song", e);
        }
    }

    public Response pausePlayback() {
        try {
            String deviceId = resolvePlayableDeviceId();
            if (deviceId == null || deviceId.isBlank()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "No active Spotify device found."))
                        .type(MediaType.APPLICATION_JSON)
                        .build();
            }

            String url = "https://api.spotify.com/v1/me/player/pause?device_id=" + deviceId;
            Response response = sendPut(url, null);
            if (response.getStatus() >= 200 && response.getStatus() < 300) {
                tokenStore.setLastPlaybackActive(false);
            }
            return response;
        } catch (Exception e) {
            return propagateOrUnexpected("Das Pausieren der Wiedergabe", e);
        }
    }

    public Response resumePlayback() {
        try {
            String deviceId = resolvePlayableDeviceId();
            if (deviceId == null || deviceId.isBlank()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "No active Spotify device found."))
                        .type(MediaType.APPLICATION_JSON)
                        .build();
            }

            String url = "https://api.spotify.com/v1/me/player/play?device_id=" + deviceId;
            Response response = sendPut(url, null);
            if (response.getStatus() >= 200 && response.getStatus() < 300) {
                tokenStore.setLastPlaybackActive(true);
            }
            return response;
        } catch (Exception e) {
            return propagateOrUnexpected("Das Fortsetzen der Wiedergabe", e);
        }
    }

    public void restoreCurrentTrackFromBeginningOnDevice(String deviceId) {
        try {
            if (deviceId == null || deviceId.isBlank()) {
                return;
            }

            String uri = null;
            Map<String, Object> snapshot = getCurrentPlaybackSnapshot();
            if (snapshot != null && Boolean.TRUE.equals(snapshot.get("isPlaying"))) {
                uri = (String) snapshot.get("uri");
            }

            if ((uri == null || uri.isBlank()) && Boolean.TRUE.equals(tokenStore.getLastPlaybackActive())) {
                uri = tokenStore.getLastPlaybackUri();
            }

            if (uri == null || uri.isBlank()) {
                return;
            }

            Map<String, Object> bodyMap = Map.of("uris", List.of(uri));
            String url = "https://api.spotify.com/v1/me/player/play?device_id=" + deviceId;
            Response response = sendPut(url, mapper.writeValueAsString(bodyMap));
            if (response.getStatus() >= 200 && response.getStatus() < 300) {
                updateCachedPlayback(uri, true);
            }
        } catch (Exception ignored) {
            // Device registration should still succeed even if restore fails.
        }
    }

    public Response startFirstSongWithoutRemoving() {
        try {
            List<Map<String, Object>> currentQueue = getQueue();
            if (currentQueue == null || currentQueue.isEmpty()) {
                return Response.ok(Map.of(
                        "status", "empty",
                        "message", "Warteschlange ist leer"
                )).build();
            }

            Map<String, Object> firstTrack = currentQueue.get(0);
            String uri = (String) firstTrack.get("uri");
            Response playResponse = play(uri);
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

    public Response getCurrentPlayback() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.spotify.com/v1/me/player/currently-playing"))
                    .header("Authorization", authHeader())
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
                tokenStore.setLastPlaybackActive(isPlaying);
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
            updateCachedPlayback((String) item.get("uri"), isPlaying);

            return Response.ok(payload).build();
        } catch (Exception e) {
            return propagateOrUnexpected("Das Laden der aktuellen Wiedergabe", e);
        }
    }

    // --- Hilfsmethoden ---
    private Response sendGet(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", authHeader())
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

    private Response sendPut(String url, String body) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", authHeader())
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

    private Response sendPost(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", authHeader())
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .build();

            HttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() < 200 || res.statusCode() >= 300) {
                return SpotifyApiErrors.buildResponse(res, "Die Spotify-POST-Anfrage");
            }
            return Response.status(res.statusCode()).entity("{\"status\":\"success\"}").type(MediaType.APPLICATION_JSON).build();
        } catch (Exception e) {
            return propagateOrUnexpected("Die Spotify-POST-Anfrage", e);
        }
    }

    private String resolvePlayableDeviceId() {
        String stored = getStoredDeviceId();

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.spotify.com/v1/me/player/devices"))
                    .header("Authorization", authHeader())
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
                tokenStore.setDeviceId(selected);
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

    private void removeTrackFromPlaylist(String uri) throws Exception {
        if (uri == null || uri.isBlank()) return;
        String playlistId = tokenStore.getPlaylistId();
        if (playlistId == null || playlistId.isBlank()) return;

        Map<String, Object> trackObj = Map.of("uri", uri);
        Map<String, Object> deleteBody = Map.of("tracks", List.of(trackObj));
        String jsonDelete = mapper.writeValueAsString(deleteBody);

        HttpRequest deleteRequest = HttpRequest.newBuilder()
                .uri(URI.create("https://api.spotify.com/v1/playlists/" + playlistId + "/tracks"))
                .header("Authorization", authHeader())
                .header("Content-Type", "application/json")
                .method("DELETE", HttpRequest.BodyPublishers.ofString(jsonDelete))
                .build();

        HttpResponse<String> response = client.send(deleteRequest, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw SpotifyApiErrors.asException(response, "Das Entfernen des Songs aus der Playlist");
        }
    }

    private Map<String, Object> getCurrentPlaybackSnapshot() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.spotify.com/v1/me/player/currently-playing"))
                .header("Authorization", authHeader())
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

    private void updateCachedPlayback(String uri, boolean isPlaying) {
        if (uri != null && !uri.isBlank()) {
            tokenStore.setLastPlaybackUri(uri);
        }
        tokenStore.setLastPlaybackActive(isPlaying);
    }

    private String getCurrentlyPlayingUri() {
        try {
            Map<String, Object> snapshot = getCurrentPlaybackSnapshot();
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
