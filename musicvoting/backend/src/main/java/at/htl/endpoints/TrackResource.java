package at.htl.endpoints;

import at.htl.service.SpotifyPlayer;
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
    SpotifyPlayer spotify;

    @GET
    @Path("/search")
    @Produces(MediaType.APPLICATION_JSON)
    public Map<String, Object> search(@QueryParam("q") String q) {

        return spotify.searchTracks(q);
    }

    @GET
    @Path("/{id}")
    public Response getTrack(@PathParam("id") String id) {
        return spotify.getTrack(id);
    }

    @PUT
    @Path("/play")
    public Response play(Map<String, String> body) {
        if (body == null || !body.containsKey("uri")) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing uri\"}").build();
        }
        return spotify.play(body.get("uri"));
    }


    @POST
    @Path("/saveToPlaylist")
    public Response saveToPlaylist(List<String> uris) {
        if (uris == null || uris.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"No tracks provided\"}")
                    .build();
        }

        return spotify.overwritePlaylist(uris);
    }

    @GET
    @Path("/queue")
    public Response getQueue() {
        List<Map<String, Object>> queue = spotify.getQueue();
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
        return spotify.addTracksToPlaylist(uris);
    }
}