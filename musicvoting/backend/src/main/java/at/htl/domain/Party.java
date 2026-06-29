package at.htl.domain;

import at.htl.provider.spotify.SpotifyCredentials;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class Party {

    private final PartyId id;
    private final ProviderKind providerKind;
    private final String pin;
    private final String hostPin;
    private final SpotifyCredentials spotifyCredentials;
    private volatile String defaultPlaylistId;
    // Track URIs this party has already auto-filled, so the one-at-a-time refill walks
    // forward through the playlist instead of re-adding songs that were already played.
    private final Set<String> autoFilledHistory = ConcurrentHashMap.newKeySet();
    // Spotify artist ids of every song added/played this party — the "similar songs" auto-fill
    // rotates randomly across these so it varies across the artists the crowd has shown interest in.
    private final Set<String> seenArtistIds = ConcurrentHashMap.newKeySet();

    public Party(PartyId id, ProviderKind providerKind, String pin, String hostPin) {
        this.id = id;
        this.providerKind = providerKind;
        this.pin = pin;
        this.hostPin = hostPin;
        this.spotifyCredentials = providerKind == ProviderKind.SPOTIFY ? new SpotifyCredentials() : null;
    }

    public PartyId id() {
        return id;
    }

    public ProviderKind providerKind() {
        return providerKind;
    }

    public String pin() {
        return pin;
    }

    public String hostPin() {
        return hostPin;
    }

    public String defaultPlaylistId() {
        return defaultPlaylistId;
    }

    public void setDefaultPlaylistId(String defaultPlaylistId) {
        this.defaultPlaylistId = defaultPlaylistId;
    }

    public boolean wasAutoFilled(String trackUri) {
        return trackUri != null && autoFilledHistory.contains(trackUri);
    }

    public void recordAutoFilled(String trackUri) {
        if (trackUri != null && !trackUri.isBlank()) {
            autoFilledHistory.add(trackUri);
        }
    }

    public void recordSeenArtist(String artistId) {
        if (artistId != null && !artistId.isBlank()) {
            seenArtistIds.add(artistId);
        }
    }

    public Set<String> seenArtistIds() {
        return Set.copyOf(seenArtistIds);
    }

    public SpotifyCredentials getSpotifyCredentials() {
        if (providerKind != ProviderKind.SPOTIFY) {
            throw new IllegalStateException("Party " + id + " is not bound to Spotify (providerKind=" + providerKind + ")");
        }
        return spotifyCredentials;
    }
}
