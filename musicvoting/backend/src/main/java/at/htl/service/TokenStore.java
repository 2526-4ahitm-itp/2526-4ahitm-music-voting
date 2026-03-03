package at.htl.service;

import jakarta.enterprise.context.ApplicationScoped;
import java.util.concurrent.atomic.AtomicReference;

@ApplicationScoped
public class TokenStore {

    private AtomicReference<String> token = new AtomicReference<>("");
    private AtomicReference<String> refreshToken = new AtomicReference<>("");
    private AtomicReference<String> deviceId = new AtomicReference<>("");

    private AtomicReference<String> playlistId = new AtomicReference<>("");
    private AtomicReference<String> spotifyUserId = new AtomicReference<>("");

    public String getToken() {
        return token.get();
    }

    public void setToken(String newToken) {
        token.set(newToken);
    }

    public String getDeviceId() {
        return deviceId.get();
    }

    public void setDeviceId(String deviceId) {
        this.deviceId.set(deviceId);
    }

    public String getPlaylistId() {
        return playlistId.get();
    }

    public void setPlaylistId(String playlistId) {
        this.playlistId.set(playlistId);
    }

    public String getSpotifyUserId() {
        return spotifyUserId.get();
    }

    public void setSpotifyUserId(String spotifyUserId) {
        this.spotifyUserId.set(spotifyUserId);
    }
}