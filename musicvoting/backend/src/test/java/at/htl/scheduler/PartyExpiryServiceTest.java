package at.htl.scheduler;

import at.htl.domain.*;
import at.htl.service.PartyService;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class PartyExpiryServiceTest {

    @Inject
    PartyService partyService;

    @Inject
    PartyRegistry partyRegistry;

    @Inject
    PartyExpiryScheduler scheduler;

    @Test
    @TestTransaction
    void staleParty_isAutoEndedWithFullEffects() {
        String partyId = UUID.randomUUID().toString();
        Party party = new Party(PartyId.of(partyId), ProviderKind.SPOTIFY, "11111", "91111");
        party.getSpotifyCredentials().setToken("some-token");
        partyRegistry.register(party);

        PartyEntity entity = new PartyEntity();
        entity.id = partyId;
        entity.providerKind = ProviderKind.SPOTIFY.name();
        entity.createdAt = OffsetDateTime.now().minusDays(3);
        entity.pin = "11111";
        entity.hostPin = "91111";
        entity.persist();

        QueueEntry queueEntry = new QueueEntry();
        queueEntry.partyId = partyId;
        queueEntry.trackUri = "spotify:track:abc";
        queueEntry.trackName = "Some Track";
        queueEntry.artistName = "Some Artist";
        queueEntry.addedAt = OffsetDateTime.now();
        queueEntry.persist();

        scheduler.autoEndStaleParties();

        assertEquals(0, QueueEntry.count("partyId", partyId));
        assertEquals("", party.getSpotifyCredentials().getToken());
        assertTrue(partyRegistry.find(PartyId.of(partyId)).isEmpty());

        PartyEntity reloaded = PartyEntity.findById(partyId);
        assertNotNull(reloaded.endedAt);
    }

    @Test
    @TestTransaction
    void recentParty_isNotAutoEnded() {
        String partyId = UUID.randomUUID().toString();
        PartyEntity entity = new PartyEntity();
        entity.id = partyId;
        entity.providerKind = ProviderKind.SPOTIFY.name();
        entity.createdAt = OffsetDateTime.now().minusHours(1);
        entity.pin = "22222";
        entity.hostPin = "92222";
        entity.persist();

        scheduler.autoEndStaleParties();

        PartyEntity reloaded = PartyEntity.findById(partyId);
        assertNull(reloaded.endedAt);
    }

    @Test
    @TestTransaction
    void oldEndedParty_isPurgedWithCascadingRows() {
        String partyId = UUID.randomUUID().toString();
        PartyEntity entity = new PartyEntity();
        entity.id = partyId;
        entity.providerKind = ProviderKind.SPOTIFY.name();
        entity.createdAt = OffsetDateTime.now().minusMonths(2);
        entity.pin = "33333";
        entity.hostPin = "93333";
        entity.endedAt = OffsetDateTime.now().minusMonths(1).minusDays(1);
        entity.persist();

        QueueEntry queueEntry = new QueueEntry();
        queueEntry.partyId = partyId;
        queueEntry.trackUri = "spotify:track:def";
        queueEntry.trackName = "Old Track";
        queueEntry.artistName = "Old Artist";
        queueEntry.addedAt = OffsetDateTime.now();
        queueEntry.persist();

        scheduler.deleteOldEndedParties();

        assertEquals(0, PartyEntity.count("id", partyId));
        assertEquals(0, QueueEntry.count("partyId", partyId));
    }

    @Test
    @TestTransaction
    void recentlyEndedParty_isRetained() {
        String partyId = UUID.randomUUID().toString();
        PartyEntity entity = new PartyEntity();
        entity.id = partyId;
        entity.providerKind = ProviderKind.SPOTIFY.name();
        entity.createdAt = OffsetDateTime.now().minusDays(5);
        entity.pin = "44444";
        entity.hostPin = "94444";
        entity.endedAt = OffsetDateTime.now().minusDays(1);
        entity.persist();

        scheduler.deleteOldEndedParties();

        assertNotNull(PartyEntity.findById(partyId));
    }
}
