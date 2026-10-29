package at.htl.service;

import jakarta.enterprise.context.ApplicationScoped;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-guest limit for adding songs (guest spec "Per-Guest Add Rate Limit"): at most
 * {@value #MAX_SONGS_PER_WINDOW} songs per party and device within a rolling minute.
 * <p>
 * State lives in memory on purpose: the backend runs as a single pod and the window is only one
 * minute long, so losing it on a restart is harmless. Guests are identified by their anonymous
 * deviceId because they have no account; requests without one (host, older clients) are not limited
 * by the caller.
 */
@ApplicationScoped
public class GuestAddRateLimiter {

    public static final int MAX_SONGS_PER_WINDOW = 10;
    public static final Duration WINDOW = Duration.ofSeconds(60);

    /** Timestamps of accepted songs per "partyId|deviceId", oldest first. */
    private final Map<String, Deque<Instant>> addsByGuest = new ConcurrentHashMap<>();

    /** Same as {@link #tryAcquire(String, String, int, Instant)} with the current time. */
    public boolean tryAcquire(String partyId, String deviceId, int songs) {
        return tryAcquire(partyId, deviceId, songs, Instant.now());
    }

    /**
     * Records {@code songs} adds for the guest if they fit into the window and returns whether they
     * were accepted. A refused request records nothing, so waiting is enough to be allowed again.
     * {@code now} is a parameter so tests can move the clock without sleeping.
     */
    public boolean tryAcquire(String partyId, String deviceId, int songs, Instant now) {
        String key = partyId + "|" + deviceId;
        boolean[] accepted = {false};
        // compute() runs atomically per key, so parallel taps of the same guest can't overshoot.
        addsByGuest.compute(key, (k, adds) -> {
            Deque<Instant> window = adds == null ? new ArrayDeque<>() : adds;
            Instant cutoff = now.minus(WINDOW);
            while (!window.isEmpty() && !window.peekFirst().isAfter(cutoff)) {
                window.pollFirst();
            }
            if (window.size() + songs <= MAX_SONGS_PER_WINDOW) {
                for (int i = 0; i < songs; i++) {
                    window.addLast(now);
                }
                accepted[0] = true;
            }
            // Returning null removes idle guests, which keeps the map from growing over a long party.
            return window.isEmpty() ? null : window;
        });
        return accepted[0];
    }
}
