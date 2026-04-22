package at.htl.endpoints;

import at.htl.domain.Party;
import at.htl.domain.PartyRegistry;
import at.htl.provider.spotify.SpotifyCredentials;
import at.htl.provider.spotify.SpotifyMusicProvider;
import at.htl.service.SpotifyApiErrors;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.RestStreamElementType;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;

@Path("/spotify")
@Produces(MediaType.APPLICATION_JSON)
public class SpotifyTokenResource {

    @Inject
    PartyRegistry partyRegistry;

    @Inject
    SpotifyMusicProvider spotifyMusicProvider;

    @Inject
    LoginEventBus loginEventBus;

    @ConfigProperty(name = "spotify.client.id")
    String clientId;

    @ConfigProperty(name = "spotify.redirect.uri")
    String redirectUri;

    @ConfigProperty(name = "spotify.client.secret")
    String clientSecret;

    @ConfigProperty(name = "spotify.web.redirect.uri", defaultValue = "http://localhost:4200/host")
    String webRedirectUri;

    @ConfigProperty(name = "spotify.ios.redirect.uri", defaultValue = "musicvotingapp://callback")
    String iosRedirectUri;

    private SpotifyCredentials credentials() {
        return partyRegistry.getOrCreateDefault().getSpotifyCredentials();
    }

    @GET
    @Path("/token")
    public String getToken() {
        return credentials().getToken();
    }

    @GET
    @Path("/status")
    public Map<String, Boolean> status(
            @QueryParam("source") @DefaultValue("web") String source,
            @HeaderParam("X-Install-Id") String installId
    ) {
        SpotifyCredentials creds = credentials();
        String token = creds.getToken();
        boolean tokenAvailable = token != null && !token.isBlank();
        boolean iosSource = "ios".equalsIgnoreCase(source);

        boolean loggedIn;
        if (iosSource) {
            String storedInstallId = creds.getIosInstallationId();
            boolean installMatches = installId != null
                    && !installId.isBlank()
                    && installId.equals(storedInstallId);
            loggedIn = tokenAvailable && installMatches;
        } else {
            loggedIn = tokenAvailable;
        }

        return Map.of("loggedIn", loggedIn);
    }

    @GET
    @Path("/deviceId")
    @Produces(MediaType.TEXT_PLAIN)
    public Response getDeviceId() {
        String deviceId = credentials().getDeviceId();
        if (deviceId == null || deviceId.isBlank()) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("")
                    .build();
        }
        return Response.ok(deviceId).build();
    }

    @PUT
    @Path("/deviceId")
    @Consumes(MediaType.TEXT_PLAIN)
    public Response setDeviceId(String deviceId) {
        if (deviceId == null || deviceId.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Device ID darf nicht leer sein"))
                    .type(MediaType.APPLICATION_JSON)
                    .build();
        }

        String normalizedDeviceId = deviceId.trim();
        Party party = partyRegistry.getOrCreateDefault();
        party.getSpotifyCredentials().setDeviceId(normalizedDeviceId);
        spotifyMusicProvider.restoreCurrentTrackFromBeginningOnDevice(party, normalizedDeviceId);
        return Response.ok(Map.of("status", "Device ID gesetzt")).build();
    }

    @GET
    @Path("/login")
    public Response login(
            @QueryParam("source") @DefaultValue("web") String source,
            @QueryParam("installationId") String installationId
    ) {

        String normalizedSource = "ios".equalsIgnoreCase(source) ? "ios" : "web";
        String normalizedState = normalizedSource;
        if ("ios".equals(normalizedSource) && installationId != null && !installationId.isBlank()) {
            normalizedState = "ios:" + installationId.trim();
        }

        String scope = "streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state playlist-modify-private playlist-read-private";
        String authorizationRedirectUri = "ios".equals(normalizedSource) ? iosRedirectUri : redirectUri;
        String spotifyUri = "https://accounts.spotify.com/authorize" +
                "?response_type=code" +
                "&client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8) +
                "&scope=" + URLEncoder.encode(scope, StandardCharsets.UTF_8) +
                "&redirect_uri=" + URLEncoder.encode(authorizationRedirectUri, StandardCharsets.UTF_8) +
                "&state=" + URLEncoder.encode(normalizedState, StandardCharsets.UTF_8);

        return Response.seeOther(java.net.URI.create(spotifyUri)).build();
    }

    @GET
    @Path("/ios/callback")
    public Response iosCallback(
            @QueryParam("code") String code,
            @QueryParam("state") String state,
            @HeaderParam("X-Install-Id") String installId
    ) {
        try {
            if (code == null || code.isBlank()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "Missing code"))
                        .type(MediaType.APPLICATION_JSON)
                        .build();
            }

            String installationId = null;
            if (state != null && state.toLowerCase(Locale.ROOT).startsWith("ios")) {
                String[] parts = state.split(":", 2);
                if (parts.length == 2 && !parts[1].isBlank()) {
                    installationId = parts[1].trim();
                }
            }

            if (installationId != null
                    && installId != null
                    && !installId.isBlank()
                    && !installationId.equals(installId.trim())) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "Installation ID mismatch"))
                        .type(MediaType.APPLICATION_JSON)
                        .build();
            }

            Map<String, String> tokenMap = exchangeAuthorizationCode(code, iosRedirectUri);
            tokenStore.setToken(tokenMap.get("access_token"));

            spotifyPlayer.fetchAndStoreUserId();
            spotifyPlayer.ensurePartyPlaylistExists();

            if (installationId != null && !installationId.isBlank()) {
                tokenStore.setIosInstallationId(installationId);
            }

            loginEventBus.emit(new LoginEvent(
                    "login-success",
                    java.time.Instant.now(),
                    Map.of(
                            "source", "ios",
                            "installationId", installationId == null ? "" : installationId
                    )
            ));

            return Response.ok(Map.of("status", "ok")).build();
        } catch (Exception e) {
            if (e instanceof WebApplicationException webApplicationException) {
                return webApplicationException.getResponse();
            }
            return SpotifyApiErrors.unexpectedError("Die Spotify-Anmeldung", e);
        }
    }

    @GET
    @Path("/callback")
    public Response callback(@QueryParam("code") String code, @QueryParam("state") String state) {
        try {

            Map<String, String> tokenMap = exchangeAuthorizationCode(code, redirectUri);

            tokenStore.setToken(tokenMap.get("access_token"));

            spotifyPlayer.fetchAndStoreUserId();

            spotifyPlayer.ensurePartyPlaylistExists();

            boolean iosSource = state != null && state.toLowerCase(Locale.ROOT).startsWith("ios");
            String installationId = null;
            if (iosSource) {
                String[] parts = state.split(":", 2);
                if (parts.length == 2 && !parts[1].isBlank()) {
                    installationId = parts[1].trim();
                    creds.setIosInstallationId(installationId);
                }
            }

            if (iosSource) {
                loginEventBus.emit(new LoginEvent(
                        "login-success",
                        java.time.Instant.now(),
                        Map.of(
                                "source", "ios",
                                "installationId", installationId == null ? "" : installationId
                        )
                ));
                // Do NOT emit a web login-success for iOS logins. Emitting a web event causes the
                // web client to re-initialize its player and may transfer playback away from the
                // currently active device. Keeping the event restricted to iOS avoids interrupting
                // playback on other clients.
                String iosTarget = iosRedirectUri + (iosRedirectUri.contains("?") ? "&" : "?") + "success=1";
                return Response.seeOther(URI.create(iosTarget)).build();
            }

            loginEventBus.emit(new LoginEvent(
                    "login-success",
                    java.time.Instant.now(),
                    Map.of("source", "web")
            ));
            return Response.seeOther(URI.create(webRedirectUri)).build();

        } catch (Exception e) {
            if (e instanceof WebApplicationException webApplicationException) {
                return webApplicationException.getResponse();
            }
            return SpotifyApiErrors.unexpectedError("Die Spotify-Anmeldung", e);
        }
    }

    private Map<String, String> exchangeAuthorizationCode(String code, String redirectUriToUse) throws Exception {
        String body = "grant_type=authorization_code" +
                "&code=" + URLEncoder.encode(code, StandardCharsets.UTF_8) +
                "&redirect_uri=" + URLEncoder.encode(redirectUriToUse, StandardCharsets.UTF_8) +
                "&client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8) +
                "&client_secret=" + URLEncoder.encode(clientSecret, StandardCharsets.UTF_8);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://accounts.spotify.com/api/token"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw SpotifyApiErrors.asException(response, "Die Spotify-Anmeldung");
        }

        return new ObjectMapper().readValue(response.body(), Map.class);
    }

    @GET
    @Path("/events")
    @Produces(MediaType.SERVER_SENT_EVENTS)
    @RestStreamElementType(MediaType.APPLICATION_JSON)
    public io.smallrye.mutiny.Multi<LoginEvent> events(
            @QueryParam("source") @DefaultValue("web") String source,
            @QueryParam("installationId") String installationId
    ) {
        var stream = loginEventBus.stream();
        if ("ios".equalsIgnoreCase(source) && installationId != null && !installationId.isBlank()) {
            return stream.select().where(event ->
                    "ios".equalsIgnoreCase(event.payload().get("source"))
                            && installationId.equals(event.payload().get("installationId")));
        }
        if ("web".equalsIgnoreCase(source)) {
            return stream.select().where(event -> "web".equalsIgnoreCase(event.payload().get("source")));
        }
        return stream;
    }
}
