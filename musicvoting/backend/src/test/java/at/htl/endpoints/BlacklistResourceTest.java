package at.htl.endpoints;

import at.htl.domain.*;
import at.htl.provider.spotify.SpotifyMusicProvider;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.InjectMock;
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
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@QuarkusTest
class BlacklistResourceTest {

    // Own PIN range so we never collide with other test classes on party_pin_active_idx.
    private static final AtomicInteger PIN_COUNTER = new AtomicInteger(70000);

    @Inject
    PartyRegistry partyRegistry;

    @Inject
    LoginEventBus loginEventBus;

    @InjectMock
    SpotifyMusicProvider spotifyMusicProvider;

    private final List<String> persistedPartyIds = new ArrayList<>();

    @AfterEach
    void cleanup() {
        persistedPartyIds.forEach(id -> partyRegistry.remove(PartyId.of(id)));
        if (persistedPartyIds.isEmpty()) return;
        // blacklist_entry rows go with the party via ON DELETE CASCADE.
        QuarkusTransaction.requiringNew().run(() ->
                PartyEntity.delete("id in ?1", persistedPartyIds));
        persistedPartyIds.clear();
    }

    private String nextPin() {
        return String.format("%05d", PIN_COUNTER.getAndIncrement());
    }

    /** Registers a party in memory and in the DB (blacklist rows need the party row). Returns the host PIN. */
    private String[] newParty() {
        String partyId = UUID.randomUUID().toString();
        String pin = nextPin();
        String hostPin = nextPin();
        partyRegistry.register(new Party(PartyId.of(partyId), ProviderKind.SPOTIFY, pin, hostPin));
        persistedPartyIds.add(partyId);
        QuarkusTransaction.requiringNew().run(() -> {
            PartyEntity entity = new PartyEntity();
            entity.id = partyId;
            entity.providerKind = ProviderKind.SPOTIFY.name();
            entity.createdAt = OffsetDateTime.now();
            entity.pin = pin;
            entity.hostPin = hostPin;
            entity.persist();
        });
        return new String[]{partyId, hostPin};
    }

    private long countEntries(String partyId) {
        return QuarkusTransaction.requiringNew().call(() -> BlacklistEntry.count("partyId", partyId));
    }

    // --- authorization: every endpoint is host-only ---

    @Test
    void list_withoutHostPin_returnsUnauthorized() {
        String[] p = newParty();
        given().when().get("/api/party/{id}/blacklist", p[0]).then().statusCode(401);
    }

    @Test
    void list_withWrongHostPin_returnsForbidden() {
        String[] p = newParty();
        given().header("Authorization", "Bearer wrong-pin")
                .when().get("/api/party/{id}/blacklist", p[0]).then().statusCode(403);
    }

    @Test
    void add_withoutHostPin_returnsUnauthorizedAndAddsNothing() {
        String[] p = newParty();
        given().contentType(ContentType.JSON).body(Map.of("kind", "WORD", "value", "live"))
                .when().post("/api/party/{id}/blacklist", p[0]).then().statusCode(401);
        assertEquals(0, countEntries(p[0]));
    }

    @Test
    void add_withWrongHostPin_returnsForbiddenAndAddsNothing() {
        String[] p = newParty();
        given().header("Authorization", "Bearer wrong-pin")
                .contentType(ContentType.JSON).body(Map.of("kind", "WORD", "value", "live"))
                .when().post("/api/party/{id}/blacklist", p[0]).then().statusCode(403);
        assertEquals(0, countEntries(p[0]));
    }

    @Test
    void remove_withoutHostPin_returnsUnauthorized() {
        String[] p = newParty();
        given().when().delete("/api/party/{id}/blacklist/{entryId}", p[0], UUID.randomUUID().toString())
                .then().statusCode(401);
    }

    @Test
    void remove_withWrongHostPin_returnsForbidden() {
        String[] p = newParty();
        given().header("Authorization", "Bearer wrong-pin")
                .when().delete("/api/party/{id}/blacklist/{entryId}", p[0], UUID.randomUUID().toString())
                .then().statusCode(403);
    }

    @Test
    void searchArtists_withoutHostPin_returnsUnauthorized() {
        String[] p = newParty();
        given().queryParam("q", "abba")
                .when().get("/api/party/{id}/blacklist/artists", p[0]).then().statusCode(401);
    }

    @Test
    void searchArtists_withWrongHostPin_returnsForbidden() {
        String[] p = newParty();
        given().header("Authorization", "Bearer wrong-pin").queryParam("q", "abba")
                .when().get("/api/party/{id}/blacklist/artists", p[0]).then().statusCode(403);
    }

    // --- behavior with the correct host PIN ---

    @Test
    void add_createsEntry_thenDuplicateReturnsExisting() {
        String[] p = newParty();

        String id = given().header("Authorization", "Bearer " + p[1])
                .contentType(ContentType.JSON).body(Map.of("kind", "WORD", "value", "Live"))
                .when().post("/api/party/{id}/blacklist", p[0])
                .then().statusCode(201)
                .body("kind", equalTo("WORD"))
                .body("value", equalTo("live"))
                .body("label", equalTo("live"))
                .extract().path("id");

        given().header("Authorization", "Bearer " + p[1])
                .contentType(ContentType.JSON).body(Map.of("kind", "word", "value", " live "))
                .when().post("/api/party/{id}/blacklist", p[0])
                .then().statusCode(200)
                .body("id", equalTo(id));

        assertEquals(1, countEntries(p[0]));
    }

    @Test
    void add_withInvalidKindOrBlankValue_returnsBadRequest() {
        String[] p = newParty();

        given().header("Authorization", "Bearer " + p[1])
                .contentType(ContentType.JSON).body(Map.of("kind", "GENRE", "value", "rock"))
                .when().post("/api/party/{id}/blacklist", p[0])
                .then().statusCode(400);

        given().header("Authorization", "Bearer " + p[1])
                .contentType(ContentType.JSON).body(Map.of("kind", "WORD", "value", "   "))
                .when().post("/api/party/{id}/blacklist", p[0])
                .then().statusCode(400)
                .body("error", notNullValue());

        assertEquals(0, countEntries(p[0]));
    }

    @Test
    void list_returnsAllEntriesOfTheParty() {
        String[] p = newParty();
        for (Map<String, String> body : List.of(
                Map.of("kind", "WORD", "value", "live"),
                Map.of("kind", "ARTIST", "value", "artist-1", "label", "ABBA", "imageUrl", "http://img/a"),
                Map.of("kind", "TRACK", "value", "spotify:track:x", "label", "Song X – A"))) {
            given().header("Authorization", "Bearer " + p[1])
                    .contentType(ContentType.JSON).body(body)
                    .when().post("/api/party/{id}/blacklist", p[0])
                    .then().statusCode(201);
        }

        given().header("Authorization", "Bearer " + p[1])
                .when().get("/api/party/{id}/blacklist", p[0])
                .then().statusCode(200)
                .body("size()", equalTo(3))
                .body("kind", contains("WORD", "ARTIST", "TRACK"))
                .body("[1].label", equalTo("ABBA"))
                .body("[1].imageUrl", equalTo("http://img/a"));
    }

    @Test
    void remove_deletesEntry_andUnknownOrForeignEntryIsNotFound() {
        String[] p = newParty();
        String[] other = newParty();

        String id = given().header("Authorization", "Bearer " + p[1])
                .contentType(ContentType.JSON).body(Map.of("kind", "WORD", "value", "live"))
                .when().post("/api/party/{id}/blacklist", p[0])
                .then().statusCode(201).extract().path("id");

        // Another party's host cannot delete this party's entry.
        given().header("Authorization", "Bearer " + other[1])
                .when().delete("/api/party/{id}/blacklist/{entryId}", other[0], id)
                .then().statusCode(404);
        given().header("Authorization", "Bearer " + p[1])
                .when().delete("/api/party/{id}/blacklist/{entryId}", p[0], "not-a-uuid")
                .then().statusCode(404);
        assertEquals(1, countEntries(p[0]));

        given().header("Authorization", "Bearer " + p[1])
                .when().delete("/api/party/{id}/blacklist/{entryId}", p[0], id)
                .then().statusCode(204);
        assertEquals(0, countEntries(p[0]));
    }

    @Test
    void searchArtists_blankQuery_returnsEmptyListWithoutCallingSpotify() {
        String[] p = newParty();

        given().header("Authorization", "Bearer " + p[1]).queryParam("q", "  ")
                .when().get("/api/party/{id}/blacklist/artists", p[0])
                .then().statusCode(200)
                .body("size()", equalTo(0));

        verify(spotifyMusicProvider, never()).searchArtists(any(), any());
    }

    @Test
    void searchArtists_returnsProviderResults() {
        String[] p = newParty();
        when(spotifyMusicProvider.searchArtists(any(), eq("abba")))
                .thenReturn(List.of(Map.of("id", "artist-1", "name", "ABBA", "imageUrl", "http://img/a")));

        given().header("Authorization", "Bearer " + p[1]).queryParam("q", "abba")
                .when().get("/api/party/{id}/blacklist/artists", p[0])
                .then().statusCode(200)
                .body("[0].id", equalTo("artist-1"))
                .body("[0].name", equalTo("ABBA"));
    }

    // --- live update: guests re-run their search when the blacklist changes ---

    @Test
    void addAndRemove_emitBlacklistUpdated_withOnlyThePartyId() {
        String[] p = newParty();
        List<LoginEvent> events = new CopyOnWriteArrayList<>();
        var subscription = loginEventBus.stream().subscribe().with(events::add);
        try {
            String id = given().header("Authorization", "Bearer " + p[1])
                    .contentType(ContentType.JSON).body(Map.of("kind", "TRACK", "value", "spotify:track:x"))
                    .when().post("/api/party/{id}/blacklist", p[0])
                    .then().statusCode(201).extract().path("id");
            assertEquals(1, countUpdated(events, p[0]));
            // Guests must not learn the entry: the payload is the party ID and nothing else.
            assertEquals(Map.of("partyId", p[0]), events.stream()
                    .filter(e -> e.type().equals("blacklist-updated")).findFirst().orElseThrow().payload());

            // A duplicate add changes nothing, so no event.
            given().header("Authorization", "Bearer " + p[1])
                    .contentType(ContentType.JSON).body(Map.of("kind", "TRACK", "value", "spotify:track:x"))
                    .when().post("/api/party/{id}/blacklist", p[0])
                    .then().statusCode(200);
            assertEquals(1, countUpdated(events, p[0]));

            given().header("Authorization", "Bearer " + p[1])
                    .when().delete("/api/party/{id}/blacklist/{entryId}", p[0], id)
                    .then().statusCode(204);
            assertEquals(2, countUpdated(events, p[0]));
        } finally {
            subscription.cancel();
        }
    }

    @Test
    void failedAddOrRemove_doesNotEmitBlacklistUpdated() {
        String[] p = newParty();
        List<LoginEvent> events = new CopyOnWriteArrayList<>();
        var subscription = loginEventBus.stream().subscribe().with(events::add);
        try {
            given().header("Authorization", "Bearer " + p[1])
                    .contentType(ContentType.JSON).body(Map.of("kind", "WORD", "value", "  "))
                    .when().post("/api/party/{id}/blacklist", p[0])
                    .then().statusCode(400);
            given().header("Authorization", "Bearer " + p[1])
                    .when().delete("/api/party/{id}/blacklist/{entryId}", p[0], UUID.randomUUID().toString())
                    .then().statusCode(404);

            assertTrue(events.stream().noneMatch(e -> e.type().equals("blacklist-updated")));
        } finally {
            subscription.cancel();
        }
    }

    private static long countUpdated(List<LoginEvent> events, String partyId) {
        return events.stream()
                .filter(e -> e.type().equals("blacklist-updated") && partyId.equals(e.payload().get("partyId")))
                .count();
    }
}
