package at.htl.endpoints;

import at.htl.service.SpotifyPlayer;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;

@Path("/track")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TrackRessource {

    @Inject
    SpotifyPlayer spotify;

    @GET
    @Path("/search")
    public Response search(@QueryParam("q") String q) {
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
    @Path("/queue")
    public Response queue(Map<String, String> body) {
        if (body == null || !body.containsKey("uri")) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing uri\"}").build();
        }
        return spotify.queue(body.get("uri"));
    }

    @GET
    @Path("/queue")
    public Response getQueue() {
        return spotify.getQueue();
    }
}