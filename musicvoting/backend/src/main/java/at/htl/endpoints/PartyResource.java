package at.htl.endpoints;

import at.htl.domain.*;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Map;

@Path("/party")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class PartyResource {

    @Inject
    PartyRegistry partyRegistry;

    @Inject
    LoginEventBus loginEventBus;

    @ConfigProperty(name = "musicvoting.join.base-url", defaultValue = "http://localhost:4200/join")
    String joinBaseUrl;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @POST
    @Transactional
    public Response create(Map<String, String> body) {
        if (body == null || body.get("provider") == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Missing provider")).build();
        }
        ProviderKind providerKind;
        try {
            providerKind = ProviderKind.valueOf(body.get("provider").toUpperCase());
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Invalid provider: must be 'spotify' or 'youtube'")).build();
        }

        String pin = generateUniquePin();
        if (pin == null) {
            return Response.status(503)
                    .entity(Map.of("error", "Could not generate a unique PIN — please retry")).build();
        }

        PartyId partyId = PartyId.newRandom();

        PartyEntity entity = new PartyEntity();
        entity.id = partyId.value();
        entity.providerKind = providerKind.name();
        entity.createdAt = OffsetDateTime.now();
        entity.pin = pin;
        entity.persist();

        Party party = new Party(partyId, providerKind, pin);
        partyRegistry.register(party);

        String joinUrl = joinBaseUrl + "/" + pin;
        return Response.status(Response.Status.CREATED)
                .entity(Map.of("id", partyId.value(), "pin", pin, "joinUrl", joinUrl))
                .build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response end(@PathParam("id") String id) {
        PartyId partyId = PartyId.of(id);
        Party party = partyRegistry.find(partyId)
                .orElseThrow(() -> new WebApplicationException(Response.Status.NOT_FOUND));

        QueueEntry.delete("partyId", id);

        if (party.providerKind() == ProviderKind.SPOTIFY) {
            party.getSpotifyCredentials().setToken(null);
        }

        PartyEntity entity = PartyEntity.findById(id);
        if (entity != null) {
            entity.endedAt = OffsetDateTime.now();
            entity.persist();
        }

        partyRegistry.remove(partyId);

        loginEventBus.emit(new LoginEvent("party-ended", Instant.now(), Map.of("partyId", id)));

        return Response.noContent().build();
    }

    @GET
    @Path("/join/{pin}")
    public Response join(@PathParam("pin") String pin) {
        return partyRegistry.findByPin(pin)
                .map(party -> Response.ok(Map.of("id", party.id().value())).build())
                .orElse(Response.status(Response.Status.NOT_FOUND).build());
    }

    @GET
    @Path("/{id}")
    public Response get(@PathParam("id") String id) {
        PartyEntity entity = PartyEntity.find("id = ?1 and endedAt is null", id).firstResult();
        if (entity == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(Map.of("id", entity.id, "pin", entity.pin)).build();
    }

    @GET
    @Path("/{id}/qr")
    @Produces("image/png")
    public Response qr(@PathParam("id") String id) {
        Party party = partyRegistry.find(PartyId.of(id))
                .orElseThrow(() -> new WebApplicationException(Response.Status.NOT_FOUND));

        String joinUrl = joinBaseUrl + "/" + party.pin();
        try {
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix bitMatrix = writer.encode(joinUrl, BarcodeFormat.QR_CODE, 300, 300);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", out);
            return Response.ok(out.toByteArray()).type("image/png").build();
        } catch (WriterException | IOException e) {
            return Response.serverError()
                    .entity(Map.of("error", "QR-Code konnte nicht generiert werden")).build();
        }
    }

    private String generateUniquePin() {
        for (int i = 0; i < 10; i++) {
            String candidate = String.format("%05d", SECURE_RANDOM.nextInt(100_000));
            if (PartyEntity.findByPin(candidate).isEmpty()) {
                return candidate;
            }
        }
        return null;
    }
}
