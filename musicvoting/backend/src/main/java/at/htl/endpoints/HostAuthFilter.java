package at.htl.endpoints;

import at.htl.domain.Party;
import at.htl.domain.PartyRegistry;
import jakarta.inject.Inject;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;

import java.util.Optional;

@Provider
@HostOnly
public class HostAuthFilter implements ContainerRequestFilter {

    @Inject
    PartyRegistry partyRegistry;

    @Override
    public void filter(ContainerRequestContext ctx) {
        MultivaluedMap<String, String> params = ctx.getUriInfo().getPathParameters();
        String partyIdStr = params.containsKey("partyId")
                ? params.getFirst("partyId")
                : params.getFirst("id");

        if (partyIdStr == null) {
            ctx.abortWith(Response.status(Response.Status.BAD_REQUEST).build());
            return;
        }

        Optional<Party> partyOpt = partyRegistry.findById(partyIdStr);
        if (partyOpt.isEmpty()) {
            ctx.abortWith(Response.status(Response.Status.NOT_FOUND).build());
            return;
        }

        String authHeader = ctx.getHeaderString("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            ctx.abortWith(Response.status(Response.Status.UNAUTHORIZED).build());
            return;
        }

        String token = authHeader.substring("Bearer ".length()).trim();
        if (!partyOpt.get().hostPin().equals(token)) {
            ctx.abortWith(Response.status(Response.Status.FORBIDDEN).build());
        }
    }
}
