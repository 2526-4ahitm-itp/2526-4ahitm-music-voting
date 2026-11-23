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
    // Track URIs that started playing in this party (guest adds and auto-fills). Memory only,
    // never shown or persisted (playback spec "No Play History"); the refill uses it so a
    // played guest song does not come back from the default playlist.
    private final Set<String> playedHistory = ConcurrentHashMap.newKeySet();
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

    public void recordAutoFilled(String trackUri) {
        if (trackUri != null && !trackUri.isBlank()) {
            autoFilledHistory.add(trackUri);
        }
    }

    /** Remembers that a track started playing in this party. */
    public void recordPlayed(String trackUri) {
        if (trackUri != null && !trackUri.isBlank()) {
            playedHistory.add(trackUri);
        }
    }

    /**
     * True if the track already played or was auto-filled in this party. The refill only falls
     * back to such tracks when no source has a new one (playback spec "Auto-Refill Prefers
     * Songs Not Yet Played").
     */
    public boolean wasUsedForRefill(String trackUri) {
        return trackUri != null && (playedHistory.contains(trackUri) || autoFilledHistory.contains(trackUri));
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
