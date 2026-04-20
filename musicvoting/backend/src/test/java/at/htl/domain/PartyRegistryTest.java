package at.htl.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PartyRegistryTest {

    @Test
    void getOrCreateDefault_returnsSameInstanceAcrossCalls() {
        PartyRegistry registry = new PartyRegistry();

        Party first = registry.getOrCreateDefault();
        Party second = registry.getOrCreateDefault();

        assertSame(first, second, "default party must be a stable singleton");
        assertEquals(ProviderKind.SPOTIFY, first.providerKind());
        assertNotNull(first.getSpotifyCredentials());
    }

    @Test
    void credentialsAreIsolatedBetweenParties() {
        PartyRegistry registry = new PartyRegistry();
        Party defaultParty = registry.getOrCreateDefault();

        Party other = new Party(PartyId.of("other"), ProviderKind.SPOTIFY);

        defaultParty.getSpotifyCredentials().setToken("token-A");
        other.getSpotifyCredentials().setToken("token-B");

        assertEquals("token-A", defaultParty.getSpotifyCredentials().getToken());
        assertEquals("token-B", other.getSpotifyCredentials().getToken());
    }

    @Test
    void youtubePartyRejectsSpotifyCredentialsAccess() {
        Party ytParty = new Party(PartyId.of("yt"), ProviderKind.YOUTUBE);

        assertThrows(IllegalStateException.class, ytParty::getSpotifyCredentials);
    }
}
