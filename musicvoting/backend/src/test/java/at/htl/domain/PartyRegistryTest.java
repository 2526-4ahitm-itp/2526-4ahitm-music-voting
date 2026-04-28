package at.htl.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PartyRegistryTest {

    @Test
    void register_and_find_returnsSameInstance() {
        PartyRegistry registry = new PartyRegistry();
        PartyId id = PartyId.of("test-party");
        Party party = new Party(id, ProviderKind.SPOTIFY, "12345");
        registry.register(party);

        Party found = registry.find(id).orElseThrow();
        assertSame(party, found);
        assertEquals(ProviderKind.SPOTIFY, found.providerKind());
        assertNotNull(found.getSpotifyCredentials());
    }

    @Test
    void credentialsAreIsolatedBetweenParties() {
        Party partyA = new Party(PartyId.of("a"), ProviderKind.SPOTIFY, "11111");
        Party partyB = new Party(PartyId.of("b"), ProviderKind.SPOTIFY, "22222");

        partyA.getSpotifyCredentials().setToken("token-A");
        partyB.getSpotifyCredentials().setToken("token-B");

        assertEquals("token-A", partyA.getSpotifyCredentials().getToken());
        assertEquals("token-B", partyB.getSpotifyCredentials().getToken());
    }

    @Test
    void youtubePartyRejectsSpotifyCredentialsAccess() {
        Party ytParty = new Party(PartyId.of("yt"), ProviderKind.YOUTUBE, "33333");

        assertThrows(IllegalStateException.class, ytParty::getSpotifyCredentials);
    }
}
