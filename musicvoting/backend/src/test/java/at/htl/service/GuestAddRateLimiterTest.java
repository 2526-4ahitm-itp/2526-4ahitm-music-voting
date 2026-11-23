package at.htl.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.OptionalLong;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for the per-guest add limit (guest spec "Per-Guest Add Rate Limit").
 * A movable clock replaces real waiting.
 */
class GuestAddRateLimiterTest {

    /** Clock whose time the test sets explicitly. */
    private static final class MovableClock extends Clock {
        private Instant now = Instant.parse("2026-11-23T20:00:00Z");

        void advance(Duration d) {
            now = now.plus(d);
        }

        @Override
        public Instant instant() {
            return now;
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }
    }

    private GuestAddRateLimiter limiter;
    private MovableClock clock;

    @BeforeEach
    void setUp() {
        limiter = new GuestAddRateLimiter();
        clock = new MovableClock();
        limiter.setClock(clock);
    }

    /** Records n single adds one second apart, each one allowed. */
    private void addSongs(String party, String device, int n) {
        for (int i = 0; i < n; i++) {
            assertTrue(limiter.check(party, device, 1).isEmpty(), "add " + (i + 1) + " should be allowed");
            limiter.record(party, device, 1);
            clock.advance(Duration.ofSeconds(1));
        }
    }

    @Test
    void tenAddsAreAllowedAndTheEleventhIsRejected() {
        addSongs("p1", "guest-a", 10);

        assertTrue(limiter.check("p1", "guest-a", 1).isPresent());
    }

    @Test
    void retryAfterIsTheTimeUntilTheOldestAddLeavesTheWindow() {
        addSongs("p1", "guest-a", 10); // first add at t=0, now t=10s

        OptionalLong retryAfter = limiter.check("p1", "guest-a", 1);

        assertEquals(50, retryAfter.getAsLong());
    }

    @Test
    void windowRollsForward() {
        addSongs("p1", "guest-a", 10); // t=0..9s, now t=10s
        clock.advance(Duration.ofMillis(50_500)); // t=60.5s: only the first add (t=0) has left the window

        assertTrue(limiter.check("p1", "guest-a", 1).isEmpty());
        // ...but only one slot is free again.
        limiter.record("p1", "guest-a", 1);
        assertTrue(limiter.check("p1", "guest-a", 1).isPresent());
    }

    @Test
    void checksWithoutRecordDoNotUseUpTheBudget() {
        // Rejected adds (duplicate, blacklist) are checked but never recorded.
        for (int i = 0; i < 20; i++) {
            assertTrue(limiter.check("p1", "guest-a", 1).isEmpty());
        }
    }

    @Test
    void limitIsPerGuestAndPerParty() {
        addSongs("p1", "guest-a", 10);

        assertTrue(limiter.check("p1", "guest-b", 1).isEmpty(), "other guest of the same party");
        assertTrue(limiter.check("p2", "guest-a", 1).isEmpty(), "same device in another party");
    }

    @Test
    void severalSongsInOneRequestCountEach() {
        assertTrue(limiter.check("p1", "guest-a", 10).isEmpty());
        limiter.record("p1", "guest-a", 8);

        assertTrue(limiter.check("p1", "guest-a", 2).isEmpty());
        assertTrue(limiter.check("p1", "guest-a", 3).isPresent());
        assertTrue(new GuestAddRateLimiter().check("p1", "fresh", 11).isPresent(),
                "a single request with more than 10 songs is rejected");
    }

    @Test
    void guestsWithoutAddsInTheWindowAreForgotten() {
        addSongs("p1", "guest-a", 3);
        clock.advance(Duration.ofMinutes(2));

        limiter.record("p1", "guest-b", 1);

        assertEquals(1, limiter.trackedGuests());
    }
}
