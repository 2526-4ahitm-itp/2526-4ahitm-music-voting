package at.htl.endpoints;

import at.htl.service.SpotifyPlayer;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Path("/spotify")
@Produces(MediaType.APPLICATION_JSON)
public class SpotifyTokenResource {

    @Inject
    SpotifyPlayer spotifyPlayer;

    private String token;

    @ConfigProperty(name = "spotify.client.id")
    String clientId;

    @ConfigProperty(name = "spotify.redirect.uri")
    String redirectUri;

    @ConfigProperty(name = "spotify.client.secret")
    String clientSecret;

    @GET
    @Path("/token")
    public Map<String, String> getToken() {
        Map<String, String> map = new HashMap<>();
        map.put("token", token);
        return map;
    }



    @GET
    @Path("/login")
    public Response login() {
        String scope = "streaming user-read-email user-read-private user-modify-playback-state";
        String spotifyUri = "https://accounts.spotify.com/authorize" +
                "?response_type=code" +
                "&client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8) +
                "&scope=" + URLEncoder.encode(scope, StandardCharsets.UTF_8) +
                "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8);


        return Response.seeOther(java.net.URI.create(spotifyUri)).build();
    }


    @GET
    @Path("/callback")
    public Response callback(@QueryParam("code") String code) {
        try {
            String body = "grant_type=authorization_code" +
                    "&code=" + URLEncoder.encode(code, StandardCharsets.UTF_8) +
                    "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8) +
                    "&client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8) +
                    "&client_secret=" + URLEncoder.encode(clientSecret, StandardCharsets.UTF_8);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://accounts.spotify.com/api/token"))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = HttpClient.newHttpClient()
                    .send(request, HttpResponse.BodyHandlers.ofString());

            Map<String, String> tokenMap = new ObjectMapper().readValue(response.body(), Map.class);

            this.token = tokenMap.get("access_token");
            spotifyPlayer.setToken(this.token);

            return Response.seeOther(URI.create("http://localhost:4200/host/?token=" + this.token)).build();
        } catch (Exception e) {
            return Response.serverError()
                    .entity("{\"error\":\"" + e.getMessage() + "\"}")
                    .build();
        }
    }


}




