package at.htl.service;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

/** Plain unit tests: the limiter takes the current time as a parameter, so no sleeping is needed. */
class GuestAddRateLimiterTest {

    private final GuestAddRateLimiter limiter = new GuestAddRateLimiter();
    private final Instant t0 = Instant.parse("2026-10-29T20:00:00Z");

    @Test
    void allowsTenSongsAndRefusesTheEleventh() {
        for (int i = 0; i < 10; i++) {
            assertTrue(limiter.tryAcquire("party", "device", 1, t0.plusSeconds(i)), "add " + (i + 1));
        }
        assertFalse(limiter.tryAcquire("party", "device", 1, t0.plusSeconds(10)));
    }

    @Test
    void limitsEachGuestSeparately() {
        for (int i = 0; i < 10; i++) {
            limiter.tryAcquire("party", "guest-a", 1, t0);
        }
        assertFalse(limiter.tryAcquire("party", "guest-a", 1, t0));
        assertTrue(limiter.tryAcquire("party", "guest-b", 1, t0));
        assertTrue(limiter.tryAcquire("other-party", "guest-a", 1, t0));
    }

    @Test
    void windowRollsOverAfterSixtySeconds() {
        for (int i = 0; i < 10; i++) {
            limiter.tryAcquire("party", "device", 1, t0);
        }
        assertFalse(limiter.tryAcquire("party", "device", 1, t0.plusSeconds(59)));
        assertTrue(limiter.tryAcquire("party", "device", 1, t0.plusSeconds(60)));
    }

    @Test
    void countsEverySongOfAMultiSongRequest() {
        assertTrue(limiter.tryAcquire("party", "device", 8, t0));
        assertFalse(limiter.tryAcquire("party", "device", 3, t0), "8 + 3 exceeds 10");
        assertTrue(limiter.tryAcquire("party", "device", 2, t0), "a refused request records nothing");
    }
}
