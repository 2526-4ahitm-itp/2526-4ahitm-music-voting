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

    private final HttpClient client = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    private String authHeader() {
        return "Bearer " + spotifyTokenResource.getToken();
    }

    /**
     * Sucht nach Tracks (z.B. Taylor Swift) und limitiert das Ergebnis auf 10.
     */
    public Response searchTracks(String query) {
        try {
            String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url = "https://api.spotify.com/v1/search?q=" + encoded + "&type=track&limit=10";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", authHeader())
                    .GET()
                    .build();

            HttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString());

            return Response.status(res.statusCode())
                    .entity(res.body())
                    .type(MediaType.APPLICATION_JSON)
                    .build();

        } catch (Exception e) {
            return Response.serverError()
                    .entity("{\"error\":\"" + e.getMessage() + "\"}")
                    .type(MediaType.APPLICATION_JSON)
                    .build();
        }
    }

    /**
     * Holt Details zu einem spezifischen Track.
     */
    public Response getTrack(String id) {
        return sendGet("https://api.spotify.com/v1/tracks/" + id);
    }

    /**
     * Startet das Abspielen eines Tracks auf einem bestimmten Gerät.
     */
    public Response play(String deviceId, String uri) {
        try {
            String url = "https://api.spotify.com/v1/me/player/play?device_id=" + deviceId;

            // Spotify erwartet ein JSON Objekt mit dem Key "uris" als Array
            Map<String, String[]> bodyMap = Map.of("uris", new String[]{uri});
            String body = mapper.writeValueAsString(bodyMap);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", authHeader())
                    .header("Content-Type", "application/json")
                    .PUT(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString());

            return Response.status(res.statusCode()).build();
        } catch (Exception e) {
            return Response.serverError()
                    .entity("{\"error\":\"" + e.getMessage() + "\"}")
                    .build();
        }
    }

    /**
     * Pausiert die Wiedergabe auf dem Gerät.
     */
    public Response pause(String deviceId) {
        return sendPut("https://api.spotify.com/v1/me/player/pause?device_id=" + deviceId, null);
    }

    /**
     * Springt zum nächsten Track.
     */
    public Response next(String deviceId) {
        return sendPost("https://api.spotify.com/v1/me/player/next?device_id=" + deviceId);
    }

    /**
     * Fügt einen Track zur Warteschlange hinzu.
     */
    public Response queue(String deviceId, String uri) {
        String url = "https://api.spotify.com/v1/me/player/queue?device_id=" + deviceId + "&uri=" + uri;
        return sendPost(url);
    }

    // --- Private Hilfsmethoden für HTTP Requests ---

    private Response sendGet(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", authHeader())
                    .GET()
                    .build();

            HttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString());
            return Response.status(res.statusCode())
                    .entity(res.body())
                    .type(MediaType.APPLICATION_JSON)
                    .build();
        } catch (Exception e) {
            return Response.serverError().entity(e.getMessage()).build();
        }
    }

    private Response sendPut(String url, String body) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", authHeader())
                    .header("Content-Type", "application/json")
                    .PUT(body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));

            HttpResponse<String> res = client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            return Response.status(res.statusCode()).build();
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
            return Response.status(res.statusCode()).build();
        } catch (Exception e) {
            return Response.serverError().entity(e.getMessage()).build();
        }
    }

}