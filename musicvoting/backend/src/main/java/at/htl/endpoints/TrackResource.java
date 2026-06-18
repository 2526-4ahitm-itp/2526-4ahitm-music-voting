package at.htl.endpoints;

import at.htl.domain.Party;
import at.htl.domain.PartyId;
import at.htl.domain.PartyRegistry;
import at.htl.domain.ProviderKind;
import at.htl.provider.MusicProvider;
import at.htl.provider.MusicProviderFactory;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Path("/party/{partyId}/track")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TrackResource {

    @PathParam("partyId")
    String partyId;

    @Inject
    PartyRegistry partyRegistry;

    @Inject
    MusicProviderFactory providerFactory;

    @Inject
    LoginEventBus loginEventBus;

    private Party resolveParty() {
        return partyRegistry.find(PartyId.of(partyId))
                .orElseThrow(() -> new WebApplicationException(Response.Status.NOT_FOUND));
    }

    private MusicProvider provider(Party party) {
        return providerFactory.forParty(party);
    }

    @GET
    @Path("/search")
    public Map<String, Object> search(@QueryParam("q") String q) {
        Party party = resolveParty();
        return provider(party).searchTracks(party, q);
    }

    @GET
    @Path("/{id}")
    public Response getTrack(@PathParam("id") String id) {
        Party party = resolveParty();
        return provider(party).getTrack(party, id);
    }

    @PUT
    @Path("/play")
    @HostOnly
    public Response play(Map<String, String> body) {
        if (body == null || !body.containsKey("uri")) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing uri\"}").build();
        }
        Party party = resolveParty();
        return provider(party).play(party, body.get("uri"));
    }

    @POST
    @Path("/saveToPlaylist")
    @HostOnly
    public Response saveToPlaylist(List<String> uris) {
        if (uris == null || uris.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"No tracks provided\"}")
                    .build();
        }
        Party party = resolveParty();
        return provider(party).overwritePlaylist(party, uris);
    }

    @GET
    @Path("/queue")
    public Response getQueue(@QueryParam("deviceId") String deviceId) {
        Party party = resolveParty();
        List<Map<String, Object>> queue = (deviceId != null && !deviceId.isBlank())
                ? provider(party).getQueueForDevice(party, deviceId)
                : provider(party).getQueue(party);
        return Response.ok(Map.of("queue", queue)).build();
    }

    @POST
    @Path("/addToPlaylist")
    public Response addToPlaylist(List<String> uris) {
        if (uris == null || uris.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"No tracks provided\"}")
                    .build();
        }
        Party party = resolveParty();
        Response response = provider(party).addTracksToPlaylist(party, uris);
        if (response.getStatus() >= 200 && response.getStatus() < 300) {
            loginEventBus.emit(new LoginEvent(
                    "queue-updated",
                    Instant.now(),
                    Map.of(
                            "source", "web",
                            "partyId", party.id().value()
                    )
            ));
        }
        return response;
    }

    @DELETE
    @Path("/remove")
    @HostOnly
    public Response removeFromPlaylist(Map<String, String> body) {
        if (body == null || !body.containsKey("uri") || body.get("uri") == null || body.get("uri").isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing uri\"}")
                    .build();
        }
        Party party = resolveParty();
        Response response = provider(party).removeTrack(party, body.get("uri"));
        if (response.getStatus() >= 200 && response.getStatus() < 300) {
            loginEventBus.emit(new LoginEvent(
                    "queue-updated",
                    Instant.now(),
                    Map.of("source", "web", "partyId", party.id().value())
            ));
        }
        return response;
    }

    /**
     * Published ~once per second by the /startpage player (the only client with
     * the Spotify Web Playback SDK). The position/duration are re-broadcast as a
     * "progress" event on the SSE bus so other clients of the party — notably the
     * host dashboard — can mirror the player's progress bar.
     */
    @POST
    @Path("/progress")
    public Response publishProgress(Map<String, Object> body) {
        Party party = resolveParty();
        long position = toLong(body == null ? null : body.get("position"));
        long duration = toLong(body == null ? null : body.get("duration"));
        boolean paused = body != null && Boolean.TRUE.equals(body.get("paused"));
        loginEventBus.emit(new LoginEvent(
                "progress",
                Instant.now(),
                Map.of(
                        "source", "web",
                        "partyId", party.id().value(),
                        "position", String.valueOf(position),
                        "duration", String.valueOf(duration),
                        "paused", String.valueOf(paused)
                )
        ));
        return Response.noContent().build();
    }

    private static long toLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text) {
            try {
                return (long) Double.parseDouble(text);
            } catch (NumberFormatException ignored) {
                return 0;
            }
        }
        return 0;
    }

    @POST
    @Path("/next")
    @HostOnly
    public Response playNext() {
        Party party = resolveParty();
        Response response = provider(party).playNextAndRemove(party);
        if (response.getStatus() >= 200 && response.getStatus() < 300) {
            loginEventBus.emit(new LoginEvent(
                    "track-changed",
                    Instant.now(),
                    Map.of("source", "web", "partyId", party.id().value())
            ));
        }
        return response;
    }

    @POST
    @Path("/pause")
    @HostOnly
    public Response pause() {
        Party party = resolveParty();
        return provider(party).pausePlayback(party);
    }

    @POST
    @Path("/resume")
    @HostOnly
    public Response resume() {
        Party party = resolveParty();
        return provider(party).resumePlayback(party);
    }

    @POST
    @Path("/start")
    @HostOnly
    public Response startFromQueue() {
        Party party = resolveParty();
        Response response = provider(party).startFirstSongWithoutRemoving(party);
        if (response.getStatus() >= 200 && response.getStatus() < 300) {
            loginEventBus.emit(new LoginEvent(
                    "track-changed",
                    Instant.now(),
                    Map.of("source", "web", "partyId", party.id().value())
            ));
        }
        return response;
    }

    @GET
    @Path("/current")
    @SuppressWarnings("unchecked")
    public Response current() {
        Party party = resolveParty();
        Response providerResponse = provider(party).getCurrentPlayback(party);

        boolean deviceActive;
        if (party.providerKind() == ProviderKind.SPOTIFY) {
            String deviceId = party.getSpotifyCredentials().getDeviceId();
            deviceActive = deviceId != null && !deviceId.isBlank();
        } else {
            deviceActive = true;
        }

        if (providerResponse.getStatus() >= 200 && providerResponse.getStatus() < 300
                && providerResponse.getEntity() instanceof Map<?, ?> rawMap) {
            Map<String, Object> payload = new HashMap<>((Map<String, Object>) rawMap);
            payload.put("deviceActive", deviceActive);
            return Response.status(providerResponse.getStatus()).entity(payload).build();
        }

        return providerResponse;
    }

    @POST
    @Path("/vote")
    public Response toggleVote(Map<String, String> body) {
        if (body == null || body.get("uri") == null || body.get("uri").isBlank()
                || body.get("deviceId") == null || body.get("deviceId").isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing uri or deviceId\"}").build();
        }
        Party party = resolveParty();
        Response response = provider(party).toggleVote(party, body.get("uri"), body.get("deviceId"));
        if (response.getStatus() >= 200 && response.getStatus() < 300) {
            loginEventBus.emit(new LoginEvent(
                    "vote-updated",
                    Instant.now(),
                    Map.of("source", "web", "partyId", party.id().value())
            ));
        }
        return response;
    }
}
