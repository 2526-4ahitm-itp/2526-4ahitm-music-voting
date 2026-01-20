package at.htl.endpoints;

import at.htl.service.SpotifyPlayer;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.HashMap;
import java.util.Map;

@Path("/spotify")
@Produces(MediaType.APPLICATION_JSON)
public class SpotifyTokenResource {

    @ConfigProperty(name = "spotify.token")
    String token;

    @GET
    @Path("/token")
    public Map<String, String> getToken() {
        Map<String, String> map = new HashMap<>();
        map.put("token", token);
        return map;
    }
}


