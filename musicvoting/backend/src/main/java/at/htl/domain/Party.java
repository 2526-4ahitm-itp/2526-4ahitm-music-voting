package at.htl.domain;

import at.htl.provider.spotify.SpotifyCredentials;

public class Party {

    private final PartyId id;
    private final ProviderKind providerKind;
    private final SpotifyCredentials spotifyCredentials;

    public Party(PartyId id, ProviderKind providerKind) {
        this.id = id;
        this.providerKind = providerKind;
        this.spotifyCredentials = providerKind == ProviderKind.SPOTIFY ? new SpotifyCredentials() : null;
    }

    public PartyId id() {
        return id;
    }

    public ProviderKind providerKind() {
        return providerKind;
    }

    public SpotifyCredentials getSpotifyCredentials() {
        if (providerKind != ProviderKind.SPOTIFY) {
            throw new IllegalStateException("Party " + id + " is not bound to Spotify (providerKind=" + providerKind + ")");
        }
        return spotifyCredentials;
    }
}
