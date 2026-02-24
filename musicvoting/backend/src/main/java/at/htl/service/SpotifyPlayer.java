package at.htl.service;

import at.htl.endpoints.SpotifyTokenResource;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
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
            String url = "https://api.spotify.com/v1/search?q=" + encoded + "&type=track&limit=10";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", authHeader())
                    .GET()
                    .build();

            HttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString());

            Map<String, Object> json = mapper.readValue(res.body(), Map.class);

            Map<String, Object> tracks = (Map<String, Object>) json.get("tracks");
            if (tracks == null) {
                tracks = Map.of("items", List.of());
                json.put("tracks", tracks);
            }

            return json;
        } catch (Exception e) {
            e.printStackTrace();
            return Map.of("tracks", Map.of("items", List.of()));
        }
    }


    public Response getTrack(String id) {
        return sendGet("https://api.spotify.com/v1/tracks/" + id);
    }

    public Response play(String uri) {
        try {
            String deviceId = getStoredDeviceId();
            String url = "https://api.spotify.com/v1/me/player/play";
            if (deviceId != null && !deviceId.isBlank()) {
                url += "?device_id=" + deviceId;
            }

            Map<String, String[]> bodyMap = Map.of("uris", new String[]{uri});
            String body = mapper.writeValueAsString(bodyMap);

            return sendPut(url, body);
        } catch (Exception e) {
            return Response.serverError().entity("{\"error\":\"" + e.getMessage() + "\"}").build();
        }
    }

    public Response addTracksToPlaylist(List<String> uris) {
        try {
            String playlistId = tokenStore.getPlaylistId();
            if (playlistId == null || playlistId.isBlank()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("{\"error\":\"No playlist available\"}")
                        .build();
            }

            HttpRequest getRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.spotify.com/v1/playlists/" + playlistId + "/tracks"))
                    .header("Authorization", authHeader())
                    .GET()
                    .build();

            HttpResponse<String> getRes = client.send(getRequest, HttpResponse.BodyHandlers.ofString());
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
            return Response.status(postRes.statusCode())
                    .entity(postRes.body())
                    .type(MediaType.APPLICATION_JSON)
                    .build();

        } catch (Exception e) {
            e.printStackTrace();
            return Response.serverError().entity("{\"error\":\"" + e.getMessage() + "\"}").build();
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
            e.printStackTrace();
            return List.of();
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

            return Response.status(res.statusCode())
                    .entity(res.body())
                    .type(MediaType.APPLICATION_JSON)
                    .build();

        } catch (Exception e) {
            return Response.serverError().entity(e.getMessage()).build();
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
            return Response.status(res.statusCode()).entity(res.body()).type(MediaType.APPLICATION_JSON).build();
        } catch (Exception e) {
            return Response.serverError().entity(e.getMessage()).build();
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
            return Response.status(res.statusCode()).entity(res.body()).build();
        } catch (Exception e) {
            return Response.serverError().entity(e.getMessage()).build();
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
            return Response.status(res.statusCode()).entity("{\"status\":\"success\"}").type(MediaType.APPLICATION_JSON).build();
        } catch (Exception e) {
            return Response.serverError().entity(e.getMessage()).build();
        }
    }


}