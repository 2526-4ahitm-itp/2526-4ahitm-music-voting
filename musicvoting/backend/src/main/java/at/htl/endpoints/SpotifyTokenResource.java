package at.htl.endpoints;

import at.htl.domain.Party;
import at.htl.domain.PartyId;
import at.htl.domain.PartyRegistry;
import at.htl.provider.spotify.SpotifyCredentials;
import at.htl.provider.spotify.SpotifyMusicProvider;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;

@Path("/party/{partyId}/spotify")
@Produces(MediaType.APPLICATION_JSON)
public class SpotifyTokenResource {

    @PathParam("partyId")
    String partyId;

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

    @ConfigProperty(name = "spotify.ios.redirect.uri", defaultValue = "musicvotingapp://callback")
    String iosRedirectUri;

    private Party resolveParty() {
        return partyRegistry.find(PartyId.of(partyId))
                .orElseThrow(() -> new WebApplicationException(Response.Status.NOT_FOUND));
    }

    private SpotifyCredentials credentials() {
        return resolveParty().getSpotifyCredentials();
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
            return Response.status(Response.Status.NOT_FOUND).entity("").build();
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
        Party party = resolveParty();
        party.getSpotifyCredentials().setDeviceId(normalizedDeviceId);
        spotifyMusicProvider.restoreCurrentTrackFromBeginningOnDevice(party, normalizedDeviceId);
        loginEventBus.emit(new LoginEvent(
                "track-changed",
                Instant.now(),
                Map.of("source", "web", "partyId", party.id().value())
        ));
        return Response.ok(Map.of("status", "Device ID gesetzt")).build();
    }

    @GET
    @Path("/login")
    public Response login(
            @QueryParam("source") @DefaultValue("web") String source,
            @QueryParam("installationId") String installationId
    ) {
        String normalizedSource = "ios".equalsIgnoreCase(source) ? "ios" : "web";

        String state;
        if ("ios".equals(normalizedSource) && installationId != null && !installationId.isBlank()) {
            state = "ios:" + installationId.trim() + ":" + partyId;
        } else if ("ios".equals(normalizedSource)) {
            state = "ios::" + partyId;
        } else {
            state = "web:" + partyId;
        }

        String authorizationRedirectUri = "ios".equals(normalizedSource) ? iosRedirectUri : redirectUri;
        String scope = "streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state playlist-modify-private playlist-read-private";
        String spotifyUri = "https://accounts.spotify.com/authorize" +
                "?response_type=code" +
                "&client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8) +
                "&scope=" + URLEncoder.encode(scope, StandardCharsets.UTF_8) +
                "&redirect_uri=" + URLEncoder.encode(authorizationRedirectUri, StandardCharsets.UTF_8) +
                "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8);

        return Response.seeOther(java.net.URI.create(spotifyUri)).build();
    }
}
