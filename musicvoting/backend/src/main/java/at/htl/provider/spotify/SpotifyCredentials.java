package at.htl.provider.spotify;

import java.util.concurrent.atomic.AtomicReference;

public class SpotifyCredentials {

    private final AtomicReference<String> token = new AtomicReference<>("");
    private final AtomicReference<String> refreshToken = new AtomicReference<>("");
    private final AtomicReference<String> deviceId = new AtomicReference<>("");
    private final AtomicReference<String> playlistId = new AtomicReference<>("");
    private final AtomicReference<String> spotifyUserId = new AtomicReference<>("");
    private final AtomicReference<String> iosInstallationId = new AtomicReference<>("");
    private final AtomicReference<String> lastPlaybackUri = new AtomicReference<>("");
    private final AtomicReference<Boolean> lastPlaybackActive = new AtomicReference<>(false);

    public String getToken() {
        return token.get();
    }

    public void setToken(String newToken) {
        token.set(newToken == null ? "" : newToken);
    }

    public String getRefreshToken() {
        return refreshToken.get();
    }

    public void setRefreshToken(String newRefreshToken) {
        refreshToken.set(newRefreshToken == null ? "" : newRefreshToken);
    }

    public String getDeviceId() {
        return deviceId.get();
    }

    public void setDeviceId(String newDeviceId) {
        deviceId.set(newDeviceId == null ? "" : newDeviceId);
    }

    public String getPlaylistId() {
        return playlistId.get();
    }

    public void setPlaylistId(String newPlaylistId) {
        playlistId.set(newPlaylistId == null ? "" : newPlaylistId);
    }

    public String getSpotifyUserId() {
        return spotifyUserId.get();
    }

    public void setSpotifyUserId(String newSpotifyUserId) {
        spotifyUserId.set(newSpotifyUserId == null ? "" : newSpotifyUserId);
    }

    public String getIosInstallationId() {
        return iosInstallationId.get();
    }

    public void setIosInstallationId(String newIosInstallationId) {
        iosInstallationId.set(newIosInstallationId == null ? "" : newIosInstallationId);
    }

    public String getLastPlaybackUri() {
        return lastPlaybackUri.get();
    }

    public void setLastPlaybackUri(String newLastPlaybackUri) {
        lastPlaybackUri.set(newLastPlaybackUri == null ? "" : newLastPlaybackUri);
    }

    public Boolean getLastPlaybackActive() {
        return lastPlaybackActive.get();
    }

    public void setLastPlaybackActive(Boolean newLastPlaybackActive) {
        lastPlaybackActive.set(Boolean.TRUE.equals(newLastPlaybackActive));
    }
}
