package at.htl.service;

import jakarta.enterprise.context.ApplicationScoped;

import java.util.concurrent.atomic.AtomicReference;

@ApplicationScoped
public class TokenStore {

    private AtomicReference<String> token = new AtomicReference<>("");
    private AtomicReference<String> refreshToken = new AtomicReference<>("");

    public String getToken() {
        return token.get();
    }

    public void setToken(String newToken) {
        token.set(newToken);
    }


    public AtomicReference<String> getRefreshToken() {
        return refreshToken;
    }

    public void setRefreshToken(AtomicReference<String> refreshToken) {
        this.refreshToken = refreshToken;
    }
}
