package at.htl.service;

import jakarta.enterprise.context.ApplicationScoped;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.OptionalLong;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limits how many songs one guest can add per rolling minute (guest spec "Guest Add Limit
 * per Minute"), so a single guest cannot flood the queue and push everyone else's wishes down.
 *
 * <p>Guests are identified by their persistent {@code deviceId} within a party. Only songs that
 * were actually added are recorded: {@link #check} runs before the add, {@link #record} only
 * after it succeeded, so a duplicate or blocklisted song does not use up the guest's budget.
 * State lives in memory only; a backend restart simply starts fresh windows.
 */
@ApplicationScoped
public class GuestAddRateLimiter {

    /**
     * Songs a guest may add within {@link #WINDOW}. Raised from 10 to 20 after the live check on
     * 2026-11-24: 10 felt too tight at a real party, 20 still stops a single guest from flooding.
     */
    public static final int MAX_ADDS = 20;

    /** Length of the rolling window. */
    public static final Duration WINDOW = Duration.ofMinutes(1);

    /** Shown verbatim by web and iOS (German, see CLAUDE.md "Language"). */
    public static final String MESSAGE = "Zu viele Anfragen — bitte kurz warten.";

    // partyId + deviceId -> timestamps of successful adds inside the window (oldest first)
    private final Map<String, Deque<Instant>> addsByGuest = new ConcurrentHashMap<>();

    private Clock clock = Clock.systemUTC();

    /** Replaces the clock; used by tests to move time forward without waiting. */
    void setClock(Clock clock) {
        this.clock = clock;
    }

    /**
     * Checks whether the guest may add {@code count} more songs now.
     *
     * @return empty if allowed, otherwise the seconds until enough earlier adds have left the
     *         window (at least 1), for the 429 answer's {@code retryAfterSeconds}
     */
    public OptionalLong check(String partyId, String deviceId, int count) {
        String key = key(partyId, deviceId);
        Instant now = clock.instant();
        Deque<Instant> adds = addsByGuest.get(key);
        if (adds == null) {
            return count > MAX_ADDS ? OptionalLong.of(WINDOW.toSeconds()) : OptionalLong.empty();
        }
        synchronized (adds) {
            prune(adds, now);
            if (adds.size() + count <= MAX_ADDS) {
                return OptionalLong.empty();
            }
            // The guest has to wait until the oldest add leaves the window.
            Instant oldest = adds.peekFirst();
            long seconds = oldest == null
                    ? WINDOW.toSeconds()
                    : (long) Math.ceil(Duration.between(now, oldest.plus(WINDOW)).toMillis() / 1000.0);
            return OptionalLong.of(Math.max(1, seconds));
        }
    }

    /** Records {@code count} successfully added songs for the guest at the current time. */
    public void record(String partyId, String deviceId, int count) {
        Instant now = clock.instant();
        String key = key(partyId, deviceId);
        // compute() is atomic per key, so a concurrent cleanUp cannot drop the entry in between.
        addsByGuest.compute(key, (k, adds) -> {
            Deque<Instant> target = adds == null ? new ArrayDeque<>() : adds;
            synchronized (target) {
                prune(target, now);
                for (int i = 0; i < count; i++) {
                    target.addLast(now);
                }
            }
            return target;
        });
        cleanUp(now, key);
    }

    /** Drops timestamps that are older than the window. */
    private static void prune(Deque<Instant> adds, Instant now) {
        Instant cutoff = now.minus(WINDOW);
        while (!adds.isEmpty() && !adds.peekFirst().isAfter(cutoff)) {
            adds.pollFirst();
        }
    }

    /** Removes guests without adds in the window so the map does not grow over a long party. */
    private void cleanUp(Instant now, String keepKey) {
        for (String key : addsByGuest.keySet()) {
            if (key.equals(keepKey)) {
                continue;
            }
            // Returning null from computeIfPresent removes the entry atomically.
            addsByGuest.computeIfPresent(key, (k, adds) -> {
                synchronized (adds) {
                    prune(adds, now);
                    return adds.isEmpty() ? null : adds;
                }
            });
        }
    }

    /** Number of guests currently tracked; for tests of the clean-up. */
    int trackedGuests() {
        return addsByGuest.size();
    }

    private static String key(String partyId, String deviceId) {
        return partyId + "|" + deviceId;
    }
}
