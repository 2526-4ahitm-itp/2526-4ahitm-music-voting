package at.htl.provider;

import at.htl.domain.Party;
import at.htl.domain.PartyId;
import at.htl.domain.ProviderKind;
import at.htl.provider.spotify.SpotifyMusicProvider;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MusicProviderFactoryTest {

    @Test
    void forSpotifyParty_returnsSpotifyMusicProvider() {
        MusicProviderFactory factory = new MusicProviderFactory();
        factory.spotifyMusicProvider = new SpotifyMusicProvider();

        Party party = new Party(PartyId.of("p1"), ProviderKind.SPOTIFY);

        MusicProvider provider = factory.forParty(party);

        assertSame(factory.spotifyMusicProvider, provider);
    }

    @Test
    void forYouTubeParty_throwsUnsupportedOperation() {
        MusicProviderFactory factory = new MusicProviderFactory();
        factory.spotifyMusicProvider = new SpotifyMusicProvider();

        Party party = new Party(PartyId.of("p2"), ProviderKind.YOUTUBE);

        UnsupportedOperationException thrown = assertThrows(
                UnsupportedOperationException.class,
                () -> factory.forParty(party)
        );
        assertTrue(thrown.getMessage().contains("YouTube"));
    }
}
