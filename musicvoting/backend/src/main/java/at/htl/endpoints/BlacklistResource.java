package at.htl.endpoints;

import at.htl.domain.BlacklistEntry;
import at.htl.domain.BlacklistKind;
import at.htl.domain.Party;
import at.htl.domain.PartyRegistry;
import at.htl.provider.MusicProviderFactory;
import at.htl.service.BlacklistService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Host-only management of a party's blacklist. Every method is {@link HostOnly}: guests
 * must neither read nor change the blacklist — they only see a {@code blocked} flag on
 * search results (see {@code SpotifyMusicProvider#searchTracks}).
 */
@Path("/party/{partyId}/blacklist")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class BlacklistResource {

    @PathParam("partyId")
    String partyId;

    @Inject
    PartyRegistry partyRegistry;

    @Inject
    MusicProviderFactory providerFactory;

    @Inject
    BlacklistService blacklistService;

    @Inject
    LoginEventBus loginEventBus;

    private Party resolveParty() {
        return partyRegistry.findById(partyId)
                .orElseThrow(() -> new WebApplicationException(Response.Status.NOT_FOUND));
    }

    /** All entries of the party, oldest first. */
    @GET
    @HostOnly
    public List<Map<String, Object>> list() {
        Party party = resolveParty();
        return blacklistService.list(party.id().value()).stream().map(BlacklistResource::toJson).toList();
    }

    /**
     * Adds an entry. 201 when created, 200 with the existing entry when it was already
     * blacklisted (so the setup page can add without checking first), 400 on invalid input.
     */
    @POST
    @HostOnly
    public Response add(Map<String, String> body) {
        Party party = resolveParty();
        if (body == null) {
            return badRequest("Ungueltiger Eintrag.");
        }
        BlacklistKind kind;
        try {
            kind = BlacklistKind.valueOf(String.valueOf(body.get("kind")).trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return badRequest("Ungueltige Art. Erlaubt: WORD, ARTIST, TRACK.");
        }
        try {
            BlacklistService.AddResult result = blacklistService.add(party.id().value(), kind,
                    body.get("value"), body.get("label"), body.get("imageUrl"));
            if (result.created()) {
                emitBlacklistUpdated(party);
            }
            return Response.status(result.created() ? Response.Status.CREATED : Response.Status.OK)
                    .entity(toJson(result.entry()))
                    .build();
        } catch (IllegalArgumentException e) {
            return badRequest("Eintrag darf nicht leer sein.");
        }
    }

    /** Removes one entry. 404 if it does not exist or belongs to another party. */
    @DELETE
    @Path("/{entryId}")
    @HostOnly
    public Response remove(@PathParam("entryId") String entryId) {
        Party party = resolveParty();
        UUID id;
        try {
            id = UUID.fromString(entryId);
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        if (!blacklistService.remove(party.id().value(), id)) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        emitBlacklistUpdated(party);
        return Response.noContent().build();
    }

    /**
     * Tells open web clients of this party that the blacklist changed, so guests re-run their
     * search and see the new greyed-out state right away. The payload carries only the party
     * ID — never the entry — because guests must not learn what is on the blacklist.
     */
    private void emitBlacklistUpdated(Party party) {
        loginEventBus.emit(new LoginEvent(
                "blacklist-updated",
                Instant.now(),
                Map.of("partyId", party.id().value())
        ));
    }

    /** Artist search for the setup page. A blank query returns an empty list without calling Spotify. */
    @GET
    @Path("/artists")
    @HostOnly
    public List<Map<String, Object>> searchArtists(@QueryParam("q") String query) {
        Party party = resolveParty();
        if (query == null || query.isBlank()) {
            return List.of();
        }
        return providerFactory.forParty(party).searchArtists(party, query);
    }

    private static Map<String, Object> toJson(BlacklistEntry e) {
        // HashMap instead of Map.of: label and imageUrl may be null.
        Map<String, Object> json = new HashMap<>();
        json.put("id", e.id.toString());
        json.put("kind", e.kind.name());
        json.put("value", e.value);
        json.put("label", e.label);
        json.put("imageUrl", e.imageUrl);
        return json;
    }

    private static Response badRequest(String message) {
        return Response.status(Response.Status.BAD_REQUEST)
                .entity(Map.of("error", message))
                .type(MediaType.APPLICATION_JSON)
                .build();
    }
}
