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

    public Response searchTracks(String query) {
        try {
            String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url = "https://api.spotify.com/v1/search?q=" + encoded + "&type=track&limit=10";

            return sendGet(url);
        } catch (Exception e) {
            return Response.serverError().entity("{\"error\":\"" + e.getMessage() + "\"}").build();
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

    public Response pause() {
        String deviceId = getStoredDeviceId();
        String url = "https://api.spotify.com/v1/me/player/pause";
        if (deviceId != null && !deviceId.isBlank()) {
            url += "?device_id=" + deviceId;
        }
        return sendPut(url, null);
    }

    public Response next() {
        String deviceId = getStoredDeviceId();
        String url = "https://api.spotify.com/v1/me/player/next";
        if (deviceId != null && !deviceId.isBlank()) {
            url += "?device_id=" + deviceId;
        }
        return sendPost(url);
    }

    public Response queue(String uri) {
        String deviceId = getStoredDeviceId();
        String url = "https://api.spotify.com/v1/me/player/queue?uri=" + URLEncoder.encode(uri, StandardCharsets.UTF_8);

        if (deviceId != null && !deviceId.isBlank()) {
            url += "&device_id=" + deviceId;
        }

        return sendPost(url);
    }

    public Response getQueue() {
        return sendGet("https://api.spotify.com/v1/me/player/queue");
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