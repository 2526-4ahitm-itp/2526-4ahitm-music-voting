package at.htl.endpoints;

import at.htl.domain.*;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class PartyResourceTest {

    // Starts well above the fixed pins used by PartyExpiryServiceTest (11111-44444)
    // to avoid colliding with the party_pin_active_idx unique constraint.
    private static final AtomicInteger PIN_COUNTER = new AtomicInteger(50000);

    @Inject
    PartyRegistry partyRegistry;

    private final List<String> persistedPartyIds = new ArrayList<>();

    @AfterEach
    void cleanupPersistedEntities() {
        if (persistedPartyIds.isEmpty()) return;
        QuarkusTransaction.requiringNew().run(() ->
                PartyEntity.delete("id in ?1", persistedPartyIds));
    }

    private String nextPin() {
        return String.format("%05d", PIN_COUNTER.getAndIncrement());
    }

    @Test
    @TestTransaction
    void create_withSpotifyProvider_returnsCreatedPartyWithPins() {
        String createdId = given()
                .contentType(ContentType.JSON)
                .body(Map.of("provider", "spotify"))
                .when().post("/api/party")
                .then()
                .statusCode(201)
                .body("id", notNullValue())
                .body("pin", matchesPattern("\\d{5}"))
                .body("hostPin", matchesPattern("\\d{5}"))
                .body("joinUrl", containsString("/join/"))
                .extract().path("id");

        persistedPartyIds.add(createdId);
    }

    @Test
    void create_withoutProvider_returnsBadRequest() {
        given()
                .contentType(ContentType.JSON)
                .body(Map.of())
                .when().post("/api/party")
                .then()
                .statusCode(400)
                .body("error", equalTo("Missing provider"));
    }

    @Test
    void create_withInvalidProvider_returnsBadRequest() {
        given()
                .contentType(ContentType.JSON)
                .body(Map.of("provider", "tidal"))
                .when().post("/api/party")
                .then()
                .statusCode(400)
                .body("error", containsString("Invalid provider"));
    }

    @Test
    void join_withKnownPin_returnsPartyId() {
        String partyId = UUID.randomUUID().toString();
        String pin = nextPin();
        String hostPin = nextPin();
        Party party = new Party(PartyId.of(partyId), ProviderKind.SPOTIFY, pin, hostPin);
        partyRegistry.register(party);
        persistPartyEntity(partyId, pin, hostPin, null);

        given()
                .when().get("/api/party/join/{pin}", pin)
                .then()
                .statusCode(200)
                .body("id", equalTo(partyId));
    }

    @Test
    void join_withUnknownPin_returnsNotFound() {
        given()
                .when().get("/api/party/join/{pin}", "00000")
                .then()
                .statusCode(404);
    }

    @Test
    void hostJoin_withKnownHostPin_returnsPartyIdAndGuestPin() {
        String partyId = UUID.randomUUID().toString();
        String pin = nextPin();
        String hostPin = nextPin();
        Party party = new Party(PartyId.of(partyId), ProviderKind.SPOTIFY, pin, hostPin);
        partyRegistry.register(party);
        persistPartyEntity(partyId, pin, hostPin, null);

        given()
                .when().get("/api/party/host-join/{hostPin}", hostPin)
                .then()
                .statusCode(200)
                .body("id", equalTo(partyId))
                .body("guestPin", equalTo(pin));
    }

    @Test
    void hostJoin_withUnknownHostPin_returnsNotFound() {
        given()
                .when().get("/api/party/host-join/{hostPin}", "00099")
                .then()
                .statusCode(404);
    }

    @Test
    void get_withActiveParty_returnsDetailsIncludingHostPin() {
        String partyId = UUID.randomUUID().toString();
        String pin = nextPin();
        String hostPin = nextPin();
        persistPartyEntity(partyId, pin, hostPin, null);

        given()
                .when().get("/api/party/{id}", partyId)
                .then()
                .statusCode(200)
                .body("id", equalTo(partyId))
                .body("pin", equalTo(pin))
                .body("hostPin", equalTo(hostPin));
    }

    @Test
    void get_withEndedParty_returnsNotFound() {
        String partyId = UUID.randomUUID().toString();
        persistPartyEntity(partyId, nextPin(), nextPin(), OffsetDateTime.now());

        given()
                .when().get("/api/party/{id}", partyId)
                .then()
                .statusCode(404);
    }

    @Test
    void get_withUnknownId_returnsNotFound() {
        given()
                .when().get("/api/party/{id}", UUID.randomUUID().toString())
                .then()
                .statusCode(404);
    }

    @Test
    @TestTransaction
    void qr_forKnownParty_returnsPngImage() {
        String partyId = UUID.randomUUID().toString();
        Party party = new Party(PartyId.of(partyId), ProviderKind.SPOTIFY, "55555", "95555");
        partyRegistry.register(party);

        given()
                .when().get("/api/party/{id}/qr", partyId)
                .then()
                .statusCode(200)
                .contentType("image/png");
    }

    @Test
    void qr_forUnknownParty_returnsNotFound() {
        given()
                .when().get("/api/party/{id}/qr", UUID.randomUUID().toString())
                .then()
                .statusCode(404);
    }

    @Test
    @TestTransaction
    void end_withoutAuthHeader_returnsUnauthorized() {
        String partyId = UUID.randomUUID().toString();
        Party party = new Party(PartyId.of(partyId), ProviderKind.SPOTIFY, "66666", "96666");
        partyRegistry.register(party);

        given()
                .when().delete("/api/party/{id}", partyId)
                .then()
                .statusCode(401);
    }

    @Test
    @TestTransaction
    void end_withWrongHostPin_returnsForbidden() {
        String partyId = UUID.randomUUID().toString();
        Party party = new Party(PartyId.of(partyId), ProviderKind.SPOTIFY, "77777", "97777");
        partyRegistry.register(party);

        given()
                .header("Authorization", "Bearer wrong-pin")
                .when().delete("/api/party/{id}", partyId)
                .then()
                .statusCode(403);
    }

    @Test
    void end_withCorrectHostPin_endsPartyAndRemovesFromRegistry() {
        String partyId = UUID.randomUUID().toString();
        String pin = nextPin();
        String hostPin = nextPin();
        Party party = new Party(PartyId.of(partyId), ProviderKind.SPOTIFY, pin, hostPin);
        partyRegistry.register(party);
        persistPartyEntity(partyId, pin, hostPin, null);

        given()
                .header("Authorization", "Bearer " + hostPin)
                .when().delete("/api/party/{id}", partyId)
                .then()
                .statusCode(204);

        assertTrue(partyRegistry.find(PartyId.of(partyId)).isEmpty());

        OffsetDateTime endedAt = QuarkusTransaction.requiringNew().call(
                () -> PartyEntity.<PartyEntity>findById(partyId).endedAt);
        assertNotNull(endedAt);
    }

    @Test
    void end_withUnknownParty_returnsNotFound() {
        given()
                .header("Authorization", "Bearer 00000")
                .when().delete("/api/party/{id}", UUID.randomUUID().toString())
                .then()
                .statusCode(404);
    }

    @Test
    @TestTransaction
    void setDefaultPlaylist_withoutAuthHeader_returnsUnauthorized() {
        String partyId = UUID.randomUUID().toString();
        Party party = new Party(PartyId.of(partyId), ProviderKind.SPOTIFY, "88888", "98888");
        partyRegistry.register(party);

        given()
                .contentType(ContentType.JSON)
                .body(Map.of("playlistId", "pl-1"))
                .when().put("/api/party/{id}/default-playlist", partyId)
                .then()
                .statusCode(401);
    }

    @Test
    @TestTransaction
    void setDefaultPlaylist_withWrongHostPin_returnsForbidden() {
        String partyId = UUID.randomUUID().toString();
        Party party = new Party(PartyId.of(partyId), ProviderKind.SPOTIFY, "89999", "98999");
        partyRegistry.register(party);

        given()
                .header("Authorization", "Bearer wrong-pin")
                .contentType(ContentType.JSON)
                .body(Map.of("playlistId", "pl-1"))
                .when().put("/api/party/{id}/default-playlist", partyId)
                .then()
                .statusCode(403);
    }

    @Test
    void setDefaultPlaylist_withCorrectHostPin_storesPlaylistId() {
        String partyId = UUID.randomUUID().toString();
        String pin = nextPin();
        String hostPin = nextPin();
        Party party = new Party(PartyId.of(partyId), ProviderKind.SPOTIFY, pin, hostPin);
        partyRegistry.register(party);
        persistPartyEntity(partyId, pin, hostPin, null);

        given()
                .header("Authorization", "Bearer " + hostPin)
                .contentType(ContentType.JSON)
                .body(Map.of("playlistId", "pl-42"))
                .when().put("/api/party/{id}/default-playlist", partyId)
                .then()
                .statusCode(200)
                .body("defaultPlaylistId", equalTo("pl-42"));

        String stored = QuarkusTransaction.requiringNew().call(
                () -> PartyEntity.<PartyEntity>findById(partyId).defaultPlaylistId);
        assertEquals("pl-42", stored);
        assertEquals("pl-42", party.defaultPlaylistId());
    }

    private void persistPartyEntity(String partyId, String pin, String hostPin, OffsetDateTime endedAt) {
        persistedPartyIds.add(partyId);
        QuarkusTransaction.requiringNew().run(() -> {
            PartyEntity entity = new PartyEntity();
            entity.id = partyId;
            entity.providerKind = ProviderKind.SPOTIFY.name();
            entity.createdAt = OffsetDateTime.now();
            entity.pin = pin;
            entity.hostPin = hostPin;
            entity.endedAt = endedAt;
            entity.persist();
        });
    }
}
