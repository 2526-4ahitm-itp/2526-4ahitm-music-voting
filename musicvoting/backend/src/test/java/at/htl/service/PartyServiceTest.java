package at.htl.service;

import at.htl.domain.*;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class PartyServiceTest {

    @Inject
    PartyService partyService;

    @Inject
    PartyRegistry partyRegistry;

    @Test
    @TestTransaction
    void endParty_removesQueueEntriesRegistryEntryAndMarksEntityEnded() {
        String partyId = UUID.randomUUID().toString();
        Party party = new Party(PartyId.of(partyId), ProviderKind.SPOTIFY, "12121", "91212");
        party.getSpotifyCredentials().setToken("some-token");
        partyRegistry.register(party);

        PartyEntity entity = new PartyEntity();
        entity.id = partyId;
        entity.providerKind = ProviderKind.SPOTIFY.name();
        entity.createdAt = OffsetDateTime.now();
        entity.pin = "12121";
        entity.hostPin = "91212";
        entity.persist();

        QueueEntry queueEntry = new QueueEntry();
        queueEntry.partyId = partyId;
        queueEntry.trackUri = "spotify:track:xyz";
        queueEntry.trackName = "Some Track";
        queueEntry.artistName = "Some Artist";
        queueEntry.addedAt = OffsetDateTime.now();
        queueEntry.persist();

        partyService.endParty(PartyId.of(partyId));

        assertEquals(0, QueueEntry.count("partyId", partyId));
        assertEquals("", party.getSpotifyCredentials().getToken());
        assertTrue(partyRegistry.find(PartyId.of(partyId)).isEmpty());

        PartyEntity reloaded = PartyEntity.findById(partyId);
        assertNotNull(reloaded.endedAt);
    }

    @Test
    @TestTransaction
    void endParty_forYoutubeParty_doesNotTouchSpotifyCredentials() {
        String partyId = UUID.randomUUID().toString();
        Party party = new Party(PartyId.of(partyId), ProviderKind.YOUTUBE, "13131", "91313");
        partyRegistry.register(party);

        PartyEntity entity = new PartyEntity();
        entity.id = partyId;
        entity.providerKind = ProviderKind.YOUTUBE.name();
        entity.createdAt = OffsetDateTime.now();
        entity.pin = "13131";
        entity.hostPin = "91313";
        entity.persist();

        assertDoesNotThrow(() -> partyService.endParty(PartyId.of(partyId)));

        assertTrue(partyRegistry.find(PartyId.of(partyId)).isEmpty());
        PartyEntity reloaded = PartyEntity.findById(partyId);
        assertNotNull(reloaded.endedAt);
    }

    @Test
    @TestTransaction
    void persistSpotifyRefreshToken_writesRefreshTokenOnEntity() {
        String partyId = UUID.randomUUID().toString();
        PartyEntity entity = new PartyEntity();
        entity.id = partyId;
        entity.providerKind = ProviderKind.SPOTIFY.name();
        entity.createdAt = OffsetDateTime.now();
        entity.pin = "15151";
        entity.hostPin = "91515";
        entity.persist();

        partyService.persistSpotifyRefreshToken(PartyId.of(partyId), "refresh-abc");

        PartyEntity reloaded = PartyEntity.findById(partyId);
        assertEquals("refresh-abc", reloaded.spotifyRefreshToken);
    }

    @Test
    @TestTransaction
    void persistSpotifyRefreshToken_ignoresBlankToken() {
        String partyId = UUID.randomUUID().toString();
        PartyEntity entity = new PartyEntity();
        entity.id = partyId;
        entity.providerKind = ProviderKind.SPOTIFY.name();
        entity.createdAt = OffsetDateTime.now();
        entity.pin = "16161";
        entity.hostPin = "91616";
        entity.persist();

        partyService.persistSpotifyRefreshToken(PartyId.of(partyId), "  ");

        PartyEntity reloaded = PartyEntity.findById(partyId);
        assertNull(reloaded.spotifyRefreshToken);
    }

    @Test
    @TestTransaction
    void endParty_whenEntityMissing_stillRemovesFromRegistry() {
        String partyId = UUID.randomUUID().toString();
        Party party = new Party(PartyId.of(partyId), ProviderKind.SPOTIFY, "14141", "91414");
        partyRegistry.register(party);

        assertDoesNotThrow(() -> partyService.endParty(PartyId.of(partyId)));

        assertTrue(partyRegistry.find(PartyId.of(partyId)).isEmpty());
    }
}
