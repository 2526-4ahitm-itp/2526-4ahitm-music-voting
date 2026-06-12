package at.htl.endpoints;

import at.htl.domain.Party;
import at.htl.domain.PartyId;
import at.htl.domain.PartyRegistry;
import at.htl.domain.ProviderKind;
import at.htl.provider.spotify.SpotifyMusicProvider;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class SpotifyTokenResourceTest {

    @Inject
    PartyRegistry partyRegistry;

    @Inject
    LoginEventBus loginEventBus;

    @InjectMock
    SpotifyMusicProvider spotifyMusicProvider;

    private Party registeredParty;

    private Party registerParty() {
        Party party = new Party(PartyId.newRandom(), ProviderKind.SPOTIFY, "00002", "90002");
        partyRegistry.register(party);
        registeredParty = party;
        return party;
    }

    @AfterEach
    void cleanup() {
        if (registeredParty != null) {
            partyRegistry.remove(registeredParty.id());
            registeredParty = null;
        }
    }

    @Test
    void getToken_forUnknownParty_returnsNotFound() {
        given()
                .when().get("/api/party/{partyId}/spotify/token", UUID.randomUUID().toString())
                .then()
                .statusCode(404);
    }

    @Test
    void getToken_returnsCurrentAccessToken() {
        Party party = registerParty();
        party.getSpotifyCredentials().setToken("access-token-123");

        given()
                .when().get("/api/party/{partyId}/spotify/token", party.id().value())
                .then()
                .statusCode(200)
                .body(equalTo("access-token-123"));
    }

    @Test
    void status_web_withToken_returnsLoggedInTrue() {
        Party party = registerParty();
        party.getSpotifyCredentials().setToken("access-token-123");

        given()
                .when().get("/api/party/{partyId}/spotify/status", party.id().value())
                .then()
                .statusCode(200)
                .body("loggedIn", equalTo(true));
    }

    @Test
    void status_web_withoutToken_returnsLoggedInFalse() {
        Party party = registerParty();

        given()
                .when().get("/api/party/{partyId}/spotify/status", party.id().value())
                .then()
                .statusCode(200)
                .body("loggedIn", equalTo(false));
    }

    @Test
    void status_ios_withMatchingInstallId_returnsLoggedInTrue() {
        Party party = registerParty();
        party.getSpotifyCredentials().setToken("access-token-123");
        party.getSpotifyCredentials().setIosInstallationId("install-1");

        given()
                .queryParam("source", "ios")
                .header("X-Install-Id", "install-1")
                .when().get("/api/party/{partyId}/spotify/status", party.id().value())
                .then()
                .statusCode(200)
                .body("loggedIn", equalTo(true));
    }

    @Test
    void status_ios_withMismatchedInstallId_returnsLoggedInFalse() {
        Party party = registerParty();
        party.getSpotifyCredentials().setToken("access-token-123");
        party.getSpotifyCredentials().setIosInstallationId("install-1");

        given()
                .queryParam("source", "ios")
                .header("X-Install-Id", "install-2")
                .when().get("/api/party/{partyId}/spotify/status", party.id().value())
                .then()
                .statusCode(200)
                .body("loggedIn", equalTo(false));
    }

    @Test
    void getDeviceId_whenNotSet_returnsNotFound() {
        Party party = registerParty();

        given()
                .when().get("/api/party/{partyId}/spotify/deviceId", party.id().value())
                .then()
                .statusCode(404);
    }

    @Test
    void getDeviceId_whenSet_returnsDeviceId() {
        Party party = registerParty();
        party.getSpotifyCredentials().setDeviceId("device-abc");

        given()
                .when().get("/api/party/{partyId}/spotify/deviceId", party.id().value())
                .then()
                .statusCode(200)
                .body(equalTo("device-abc"));
    }

    @Test
    void setDeviceId_withBlankBody_returnsBadRequest() {
        Party party = registerParty();

        given()
                .contentType(ContentType.TEXT)
                .body("   ")
                .when().put("/api/party/{partyId}/spotify/deviceId", party.id().value())
                .then()
                .statusCode(400)
                .body("error", equalTo("Device ID darf nicht leer sein"));
    }

    @Test
    void setDeviceId_withValidBody_setsDeviceIdAndEmitsTrackChanged() {
        Party party = registerParty();

        List<LoginEvent> events = new CopyOnWriteArrayList<>();
        var subscription = loginEventBus.stream().subscribe().with(events::add);

        try {
            given()
                    .contentType(ContentType.TEXT)
                    .body(" device-xyz ")
                    .when().put("/api/party/{partyId}/spotify/deviceId", party.id().value())
                    .then()
                    .statusCode(200)
                    .body("status", equalTo("Device ID gesetzt"));

            assertEquals("device-xyz", party.getSpotifyCredentials().getDeviceId());
            assertTrue(events.stream().anyMatch(e -> "track-changed".equals(e.type())
                    && party.id().value().equals(e.payload().get("partyId"))));
        } finally {
            subscription.cancel();
        }
    }

    @Test
    void login_web_redirectsToSpotifyAuthorizeWithWebState() {
        Party party = registerParty();

        given()
                .redirects().follow(false)
                .when().get("/api/party/{partyId}/spotify/login", party.id().value())
                .then()
                .statusCode(303)
                .header("Location", containsString("https://accounts.spotify.com/authorize"))
                .header("Location", containsString("state=web%3A" + party.id().value()));
    }

    @Test
    void login_ios_withInstallationId_redirectsWithIosState() {
        Party party = registerParty();

        given()
                .redirects().follow(false)
                .queryParam("source", "ios")
                .queryParam("installationId", "install-99")
                .when().get("/api/party/{partyId}/spotify/login", party.id().value())
                .then()
                .statusCode(303)
                .header("Location", containsString("https://accounts.spotify.com/authorize"))
                .header("Location", containsString("state=ios%3Ainstall-99%3A" + party.id().value()));
    }
}
