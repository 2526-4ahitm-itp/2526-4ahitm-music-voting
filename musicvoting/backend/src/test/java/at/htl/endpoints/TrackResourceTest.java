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
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@QuarkusTest
class TrackResourceTest {

    @Inject
    PartyRegistry partyRegistry;

    @Inject
    LoginEventBus loginEventBus;

    @InjectMock
    SpotifyMusicProvider spotifyMusicProvider;

    private final List<PartyId> registeredPartyIds = new CopyOnWriteArrayList<>();

    @AfterEach
    void cleanup() {
        registeredPartyIds.forEach(partyRegistry::remove);
        registeredPartyIds.clear();
    }

    private Party registerSpotifyParty(String pin, String hostPin) {
        String partyId = UUID.randomUUID().toString();
        Party party = new Party(PartyId.of(partyId), ProviderKind.SPOTIFY, pin, hostPin);
        partyRegistry.register(party);
        registeredPartyIds.add(party.id());
        return party;
    }

    private Party registerYoutubeParty() {
        String partyId = UUID.randomUUID().toString();
        Party party = new Party(PartyId.of(partyId), ProviderKind.YOUTUBE, "12345", "54321");
        partyRegistry.register(party);
        registeredPartyIds.add(party.id());
        return party;
    }

    // ---------- search ----------

    @Test
    void search_returnsProviderResult() {
        Party party = registerSpotifyParty("10001", "20001");
        when(spotifyMusicProvider.searchTracks(eq(party), eq("queen")))
                .thenReturn(Map.of("tracks", List.of(Map.of("uri", "spotify:track:abc", "name", "Bohemian Rhapsody"))));

        given()
                .queryParam("q", "queen")
                .when().get("/api/party/{partyId}/track/search", party.id().value())
                .then()
                .statusCode(200)
                .body("tracks[0].uri", equalTo("spotify:track:abc"))
                .body("tracks[0].name", equalTo("Bohemian Rhapsody"));
    }

    @Test
    void search_forUnknownParty_returnsNotFound() {
        given()
                .queryParam("q", "queen")
                .when().get("/api/party/{partyId}/track/search", UUID.randomUUID().toString())
                .then()
                .statusCode(404);
    }

    @Test
    void search_forYoutubeParty_returnsServerError() {
        Party party = registerYoutubeParty();

        given()
                .queryParam("q", "queen")
                .when().get("/api/party/{partyId}/track/search", party.id().value())
                .then()
                .statusCode(500);
    }

    // ---------- getTrack ----------

    @Test
    void getTrack_returnsProviderResult() {
        Party party = registerSpotifyParty("10002", "20002");
        when(spotifyMusicProvider.getTrack(eq(party), eq("abc")))
                .thenReturn(Response.ok(Map.of("id", "abc", "name", "Some Track")).build());

        given()
                .when().get("/api/party/{partyId}/track/{id}", party.id().value(), "abc")
                .then()
                .statusCode(200)
                .body("id", equalTo("abc"))
                .body("name", equalTo("Some Track"));
    }

    // ---------- play ----------

    @Test
    void play_withoutUri_returnsBadRequest() {
        Party party = registerSpotifyParty("10003", "20003");

        given()
                .header("Authorization", "Bearer 20003")
                .contentType(ContentType.JSON)
                .body(Map.of())
                .when().put("/api/party/{partyId}/track/play", party.id().value())
                .then()
                .statusCode(400);
    }

    @Test
    void play_withoutAuth_returnsUnauthorized() {
        Party party = registerSpotifyParty("10004", "20004");

        given()
                .contentType(ContentType.JSON)
                .body(Map.of("uri", "spotify:track:abc"))
                .when().put("/api/party/{partyId}/track/play", party.id().value())
                .then()
                .statusCode(401);
    }

    @Test
    void play_withUriAndAuth_delegatesToProvider() {
        Party party = registerSpotifyParty("10005", "20005");
        when(spotifyMusicProvider.play(eq(party), eq("spotify:track:abc")))
                .thenReturn(Response.noContent().build());

        given()
                .header("Authorization", "Bearer 20005")
                .contentType(ContentType.JSON)
                .body(Map.of("uri", "spotify:track:abc"))
                .when().put("/api/party/{partyId}/track/play", party.id().value())
                .then()
                .statusCode(204);
    }

    // ---------- saveToPlaylist ----------

    @Test
    void saveToPlaylist_withEmptyList_returnsBadRequest() {
        Party party = registerSpotifyParty("10006", "20006");

        given()
                .header("Authorization", "Bearer 20006")
                .contentType(ContentType.JSON)
                .body(List.of())
                .when().post("/api/party/{partyId}/track/saveToPlaylist", party.id().value())
                .then()
                .statusCode(400);
    }

    @Test
    void saveToPlaylist_withUris_delegatesToProvider() {
        Party party = registerSpotifyParty("10007", "20007");
        when(spotifyMusicProvider.overwritePlaylist(eq(party), eq(List.of("spotify:track:a", "spotify:track:b"))))
                .thenReturn(Response.ok().build());

        given()
                .header("Authorization", "Bearer 20007")
                .contentType(ContentType.JSON)
                .body(List.of("spotify:track:a", "spotify:track:b"))
                .when().post("/api/party/{partyId}/track/saveToPlaylist", party.id().value())
                .then()
                .statusCode(200);
    }

    // ---------- getQueue ----------

    @Test
    void getQueue_wrapsProviderResultInQueueField() {
        Party party = registerSpotifyParty("10008", "20008");
        when(spotifyMusicProvider.getQueue(eq(party)))
                .thenReturn(List.of(Map.of("uri", "spotify:track:a"), Map.of("uri", "spotify:track:b")));

        given()
                .when().get("/api/party/{partyId}/track/queue", party.id().value())
                .then()
                .statusCode(200)
                .body("queue", hasSize(2))
                .body("queue[0].uri", equalTo("spotify:track:a"))
                .body("queue[1].uri", equalTo("spotify:track:b"));
    }

    // ---------- addToPlaylist ----------

    @Test
    void addToPlaylist_withEmptyList_returnsBadRequest() {
        Party party = registerSpotifyParty("10009", "20009");

        given()
                .contentType(ContentType.JSON)
                .body(List.of())
                .when().post("/api/party/{partyId}/track/addToPlaylist", party.id().value())
                .then()
                .statusCode(400);
    }

    @Test
    void addToPlaylist_onSuccess_emitsQueueUpdatedEvent() {
        Party party = registerSpotifyParty("10010", "20010");
        when(spotifyMusicProvider.addTracksToPlaylist(eq(party), eq(List.of("spotify:track:a"))))
                .thenReturn(Response.ok().build());

        List<LoginEvent> events = new CopyOnWriteArrayList<>();
        var subscription = loginEventBus.stream().subscribe().with(events::add);
        try {
            given()
                    .contentType(ContentType.JSON)
                    .body(List.of("spotify:track:a"))
                    .when().post("/api/party/{partyId}/track/addToPlaylist", party.id().value())
                    .then()
                    .statusCode(200);

            assertTrue(events.stream().anyMatch(e ->
                    e.type().equals("queue-updated") && party.id().value().equals(e.payload().get("partyId"))));
        } finally {
            subscription.cancel();
        }
    }

    @Test
    void addToPlaylist_onProviderError_doesNotEmitEvent() {
        Party party = registerSpotifyParty("10011", "20011");
        when(spotifyMusicProvider.addTracksToPlaylist(eq(party), eq(List.of("spotify:track:a"))))
                .thenReturn(Response.status(Response.Status.BAD_GATEWAY).build());

        List<LoginEvent> events = new CopyOnWriteArrayList<>();
        var subscription = loginEventBus.stream().subscribe().with(events::add);
        try {
            given()
                    .contentType(ContentType.JSON)
                    .body(List.of("spotify:track:a"))
                    .when().post("/api/party/{partyId}/track/addToPlaylist", party.id().value())
                    .then()
                    .statusCode(502);

            assertFalse(events.stream().anyMatch(e -> e.type().equals("queue-updated")));
        } finally {
            subscription.cancel();
        }
    }

    // ---------- removeFromPlaylist ----------

    @Test
    void removeFromPlaylist_withMissingUri_returnsBadRequest() {
        Party party = registerSpotifyParty("10012", "20012");

        given()
                .header("Authorization", "Bearer 20012")
                .contentType(ContentType.JSON)
                .body(Map.of())
                .when().delete("/api/party/{partyId}/track/remove", party.id().value())
                .then()
                .statusCode(400);
    }

    @Test
    void removeFromPlaylist_withBlankUri_returnsBadRequest() {
        Party party = registerSpotifyParty("10013", "20013");

        given()
                .header("Authorization", "Bearer 20013")
                .contentType(ContentType.JSON)
                .body(Map.of("uri", "  "))
                .when().delete("/api/party/{partyId}/track/remove", party.id().value())
                .then()
                .statusCode(400);
    }

    @Test
    void removeFromPlaylist_onSuccess_emitsQueueUpdatedEvent() {
        Party party = registerSpotifyParty("10014", "20014");
        when(spotifyMusicProvider.removeTrack(eq(party), eq("spotify:track:a")))
                .thenReturn(Response.ok().build());

        List<LoginEvent> events = new CopyOnWriteArrayList<>();
        var subscription = loginEventBus.stream().subscribe().with(events::add);
        try {
            given()
                    .header("Authorization", "Bearer 20014")
                    .contentType(ContentType.JSON)
                    .body(Map.of("uri", "spotify:track:a"))
                    .when().delete("/api/party/{partyId}/track/remove", party.id().value())
                    .then()
                    .statusCode(200);

            assertTrue(events.stream().anyMatch(e -> e.type().equals("queue-updated")));
        } finally {
            subscription.cancel();
        }
    }

    // ---------- progress ----------

    @Test
    void progress_emitsProgressEventWithParsedValues() {
        Party party = registerSpotifyParty("10015", "20015");

        List<LoginEvent> events = new CopyOnWriteArrayList<>();
        var subscription = loginEventBus.stream().subscribe().with(events::add);
        try {
            given()
                    .contentType(ContentType.JSON)
                    .body(Map.of("position", 42000, "duration", 200000, "paused", false))
                    .when().post("/api/party/{partyId}/track/progress", party.id().value())
                    .then()
                    .statusCode(204);

            LoginEvent event = events.stream().filter(e -> e.type().equals("progress")).findFirst().orElseThrow();
            assertEquals(party.id().value(), event.payload().get("partyId"));
            assertEquals("42000", event.payload().get("position"));
            assertEquals("200000", event.payload().get("duration"));
            assertEquals("false", event.payload().get("paused"));
        } finally {
            subscription.cancel();
        }
    }

    @Test
    void progress_withMissingFields_defaultsToZero() {
        Party party = registerSpotifyParty("10016", "20016");

        List<LoginEvent> events = new CopyOnWriteArrayList<>();
        var subscription = loginEventBus.stream().subscribe().with(events::add);
        try {
            given()
                    .contentType(ContentType.JSON)
                    .body(Map.of())
                    .when().post("/api/party/{partyId}/track/progress", party.id().value())
                    .then()
                    .statusCode(204);

            LoginEvent event = events.stream().filter(e -> e.type().equals("progress")).findFirst().orElseThrow();
            assertEquals("0", event.payload().get("position"));
            assertEquals("0", event.payload().get("duration"));
            assertEquals("false", event.payload().get("paused"));
        } finally {
            subscription.cancel();
        }
    }

    // ---------- next ----------

    @Test
    void next_onSuccess_emitsTrackChangedEvent() {
        Party party = registerSpotifyParty("10017", "20017");
        when(spotifyMusicProvider.playNextAndRemove(eq(party))).thenReturn(Response.ok().build());

        List<LoginEvent> events = new CopyOnWriteArrayList<>();
        var subscription = loginEventBus.stream().subscribe().with(events::add);
        try {
            given()
                    .header("Authorization", "Bearer 20017")
                    .contentType(ContentType.JSON)
                    .when().post("/api/party/{partyId}/track/next", party.id().value())
                    .then()
                    .statusCode(200);

            assertTrue(events.stream().anyMatch(e -> e.type().equals("track-changed")));
        } finally {
            subscription.cancel();
        }
    }

    @Test
    void next_withoutAuth_returnsUnauthorized() {
        Party party = registerSpotifyParty("10018", "20018");

        given()
                .contentType(ContentType.JSON)
                .when().post("/api/party/{partyId}/track/next", party.id().value())
                .then()
                .statusCode(401);
    }

    @Test
    void next_withWrongHostPin_returnsForbidden() {
        Party party = registerSpotifyParty("10019", "20019");

        given()
                .header("Authorization", "Bearer wrong-pin")
                .contentType(ContentType.JSON)
                .when().post("/api/party/{partyId}/track/next", party.id().value())
                .then()
                .statusCode(403);
    }

    // ---------- pause / resume ----------

    @Test
    void pause_delegatesToProvider() {
        Party party = registerSpotifyParty("10020", "20020");
        when(spotifyMusicProvider.pausePlayback(eq(party))).thenReturn(Response.noContent().build());

        given()
                .header("Authorization", "Bearer 20020")
                .contentType(ContentType.JSON)
                .when().post("/api/party/{partyId}/track/pause", party.id().value())
                .then()
                .statusCode(204);
    }

    @Test
    void resume_delegatesToProvider() {
        Party party = registerSpotifyParty("10021", "20021");
        when(spotifyMusicProvider.resumePlayback(eq(party))).thenReturn(Response.noContent().build());

        given()
                .header("Authorization", "Bearer 20021")
                .contentType(ContentType.JSON)
                .when().post("/api/party/{partyId}/track/resume", party.id().value())
                .then()
                .statusCode(204);
    }

    // ---------- start ----------

    @Test
    void start_onSuccess_emitsTrackChangedEvent() {
        Party party = registerSpotifyParty("10022", "20022");
        when(spotifyMusicProvider.startFirstSongWithoutRemoving(eq(party))).thenReturn(Response.ok().build());

        List<LoginEvent> events = new CopyOnWriteArrayList<>();
        var subscription = loginEventBus.stream().subscribe().with(events::add);
        try {
            given()
                    .header("Authorization", "Bearer 20022")
                    .contentType(ContentType.JSON)
                    .when().post("/api/party/{partyId}/track/start", party.id().value())
                    .then()
                    .statusCode(200);

            assertTrue(events.stream().anyMatch(e -> e.type().equals("track-changed")));
        } finally {
            subscription.cancel();
        }
    }

    // ---------- current ----------

    @Test
    void current_delegatesToProvider() {
        Party party = registerSpotifyParty("10023", "20023");
        when(spotifyMusicProvider.getCurrentPlayback(eq(party)))
                .thenReturn(Response.ok(Map.of("isPlaying", true)).build());

        given()
                .when().get("/api/party/{partyId}/track/current", party.id().value())
                .then()
                .statusCode(200)
                .body("isPlaying", equalTo(true));
    }

    // ---------- vote ----------

    @Test
    void vote_withMissingFields_returnsBadRequest() {
        Party party = registerSpotifyParty("10024", "20024");

        given()
                .contentType(ContentType.JSON)
                .body(Map.of("uri", "spotify:track:a"))
                .when().post("/api/party/{partyId}/track/vote", party.id().value())
                .then()
                .statusCode(400);
    }

    @Test
    void vote_withBlankFields_returnsBadRequest() {
        Party party = registerSpotifyParty("10025", "20025");

        given()
                .contentType(ContentType.JSON)
                .body(Map.of("uri", " ", "deviceId", " "))
                .when().post("/api/party/{partyId}/track/vote", party.id().value())
                .then()
                .statusCode(400);
    }

    @Test
    void vote_onSuccess_emitsVoteUpdatedEvent() {
        Party party = registerSpotifyParty("10026", "20026");
        when(spotifyMusicProvider.toggleVote(eq(party), eq("spotify:track:a"), eq("device-1")))
                .thenReturn(Response.ok(Map.of("votes", 1)).build());

        List<LoginEvent> events = new CopyOnWriteArrayList<>();
        var subscription = loginEventBus.stream().subscribe().with(events::add);
        try {
            given()
                    .contentType(ContentType.JSON)
                    .body(Map.of("uri", "spotify:track:a", "deviceId", "device-1"))
                    .when().post("/api/party/{partyId}/track/vote", party.id().value())
                    .then()
                    .statusCode(200)
                    .body("votes", equalTo(1));

            assertTrue(events.stream().anyMatch(e -> e.type().equals("vote-updated")));
        } finally {
            subscription.cancel();
        }
    }
}
