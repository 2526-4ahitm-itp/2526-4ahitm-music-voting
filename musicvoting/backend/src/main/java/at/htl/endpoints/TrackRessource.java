package at.htl.endpoints;

import at.htl.service.SpotifyPlayer;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.Map; // WICHTIG: Dieser Import muss vorhanden sein

@Path("/track")
@Produces(MediaType.APPLICATION_JSON)
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
    @Consumes(MediaType.APPLICATION_JSON)
    public Response play(@QueryParam("deviceId") String deviceId, Map<String, String> body) {
        if (deviceId == null || body == null || !body.containsKey("uri")) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing deviceId or uri\"}").build();
        }
        return spotify.play(deviceId, body.get("uri"));
    }

    @POST
    @Path("/queue")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response queue(@QueryParam("deviceId") String deviceId, Map<String, String> body)
 {
        if (deviceId == null || body == null || !body.containsKey("uri")) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Missing deviceId or uri\"}").build();
        }
        return spotify.queue(deviceId, body.get("uri"));
    }

    @GET
    @Path("/queue")
    public Response getQueue() {
        return spotify.getQueue();
    }



}