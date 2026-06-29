package at.htl.domain;

import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class PartyRegistryReconstructTest {

    @Inject
    PartyRegistry partyRegistry;

    private void persistPartyEntity(String partyId, String pin, String hostPin, OffsetDateTime endedAt) {
        PartyEntity entity = new PartyEntity();
        entity.id = partyId;
        entity.providerKind = ProviderKind.SPOTIFY.name();
        entity.createdAt = OffsetDateTime.now();
        entity.pin = pin;
        entity.hostPin = hostPin;
        entity.endedAt = endedAt;
        entity.persist();
    }

    @Test
    @TestTransaction
    void findByPin_whenNotInMemory_reconstructsPartyFromEntity() {
        String partyId = UUID.randomUUID().toString();
        persistPartyEntity(partyId, "60001", "70001", null);

        Party found = partyRegistry.findByPin("60001").orElseThrow();

        assertEquals(partyId, found.id().value());
        assertEquals(ProviderKind.SPOTIFY, found.providerKind());
        assertEquals("60001", found.pin());
        assertEquals("70001", found.hostPin());
        assertTrue(partyRegistry.find(PartyId.of(partyId)).isPresent());
    }

    @Test
    @TestTransaction
    void findByHostPin_whenNotInMemory_reconstructsPartyFromEntity() {
        String partyId = UUID.randomUUID().toString();
        persistPartyEntity(partyId, "60002", "70002", null);

        Party found = partyRegistry.findByHostPin("70002").orElseThrow();

        assertEquals(partyId, found.id().value());
        assertEquals("60002", found.pin());
    }

    @Test
    @TestTransaction
    void findById_whenNotInMemory_restoresRefreshTokenIntoCredentials() {
        String partyId = UUID.randomUUID().toString();
        PartyEntity entity = new PartyEntity();
        entity.id = partyId;
        entity.providerKind = ProviderKind.SPOTIFY.name();
        entity.createdAt = OffsetDateTime.now();
        entity.pin = "60006";
        entity.hostPin = "70006";
        entity.spotifyRefreshToken = "refresh-xyz";
        entity.persist();

        Party found = partyRegistry.findById(partyId).orElseThrow();

        assertEquals("refresh-xyz", found.getSpotifyCredentials().getRefreshToken());
    }

    @Test
    @TestTransaction
    void findByPin_whenAlreadyRegistered_returnsExistingInstance() {
        String partyId = UUID.randomUUID().toString();
        persistPartyEntity(partyId, "60003", "70003", null);
        Party registered = new Party(PartyId.of(partyId), ProviderKind.SPOTIFY, "60003", "70003");
        partyRegistry.register(registered);

        Party found = partyRegistry.findByPin("60003").orElseThrow();

        assertSame(registered, found);
    }

    @Test
    @TestTransaction
    void findByPin_forEndedParty_returnsEmpty() {
        String partyId = UUID.randomUUID().toString();
        persistPartyEntity(partyId, "60004", "70004", OffsetDateTime.now());

        assertTrue(partyRegistry.findByPin("60004").isEmpty());
    }

    @Test
    void remove_removesPartyFromRegistry() {
        PartyId id = PartyId.of(UUID.randomUUID().toString());
        Party party = new Party(id, ProviderKind.SPOTIFY, "60005", "70005");
        partyRegistry.register(party);

        Party removed = partyRegistry.remove(id);

        assertSame(party, removed);
        assertTrue(partyRegistry.find(id).isEmpty());
    }
}
