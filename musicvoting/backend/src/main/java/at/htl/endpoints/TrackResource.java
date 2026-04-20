package at.htl.endpoints;

import at.htl.domain.Party;
import at.htl.domain.PartyRegistry;
import at.htl.provider.MusicProvider;
import at.htl.provider.MusicProviderFactory;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.Map;

@Path("/track")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TrackResource {

    @Inject
    PartyRegistry partyRegistry;

    @Inject
    MusicProviderFactory providerFactory;

    private Party party() {
        return partyRegistry.getOrCreateDefault();
    }

    private MusicProvider provider(Party party) {
        return providerFactory.forParty(party);
    }

    @GET
    @Path("/search")
    @Produces(MediaType.APPLICATION_JSON)
    public Map<String, Object> search(@QueryParam("q") String q) {
        Party party = party();
        return provider(party).searchTracks(party, q);
    }

    @GET
    @Path("/{id}")
    public Response getTrack(@PathParam("id") String id) {
        Party party = party();
        return provider(party).getTrack(party, id);
    }

    @PUT
    @Path("/play")
    public Response play(Map<String, String> body) {
        if (body == null || !body.containsKey("uri")) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing uri\"}").build();
        }
        Party party = party();
        return provider(party).play(party, body.get("uri"));
    }

    @POST
    @Path("/saveToPlaylist")
    public Response saveToPlaylist(List<String> uris) {
        if (uris == null || uris.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"No tracks provided\"}")
                    .build();
        }
        Party party = party();
        return provider(party).overwritePlaylist(party, uris);
    }

    @GET
    @Path("/queue")
    public Response getQueue() {
        Party party = party();
        List<Map<String, Object>> queue = provider(party).getQueue(party);
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
        Party party = party();
        return provider(party).addTracksToPlaylist(party, uris);
    }

    @DELETE
    @Path("/remove")
    public Response removeFromPlaylist(Map<String, String> body) {
        if (body == null || !body.containsKey("uri") || body.get("uri") == null || body.get("uri").isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing uri\"}")
                    .build();
        }
        Party party = party();
        return provider(party).removeTrack(party, body.get("uri"));
    }

    @POST
    @Path("/next")
    public Response playNext() {
        Party party = party();
        return provider(party).playNextAndRemove(party);
    }

    @POST
    @Path("/pause")
    public Response pause() {
        Party party = party();
        return provider(party).pausePlayback(party);
    }

    @POST
    @Path("/resume")
    public Response resume() {
        Party party = party();
        return provider(party).resumePlayback(party);
    }

    @POST
    @Path("/start")
    public Response startFromQueue() {
        Party party = party();
        return provider(party).startFirstSongWithoutRemoving(party);
    }

    @GET
    @Path("/current")
    public Response current() {
        Party party = party();
        return provider(party).getCurrentPlayback(party);
    }
}
