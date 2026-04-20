package at.htl.provider;

import at.htl.domain.Party;
import at.htl.provider.spotify.SpotifyMusicProvider;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class MusicProviderFactory {

    @Inject
    SpotifyMusicProvider spotifyMusicProvider;

    public MusicProvider forParty(Party party) {
        return switch (party.providerKind()) {
            case SPOTIFY -> spotifyMusicProvider;
            case YOUTUBE -> throw new UnsupportedOperationException(
                    "YouTube provider is not yet implemented — see the 'add-youtube-provider' change proposal"
            );
        };
    }
}
