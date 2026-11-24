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
 * Unit tests for the per-guest add limit (guest spec "Guest Add Limit per Minute").
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

    /** The limit under test; tests use the constant so a new limit only changes one place. */
    private static final int MAX = GuestAddRateLimiter.MAX_ADDS;

    @Test
    void limitIsTwentySongs() {
        assertEquals(20, MAX);
    }

    @Test
    void maxAddsAreAllowedAndTheNextOneIsRejected() {
        addSongs("p1", "guest-a", MAX);

        assertTrue(limiter.check("p1", "guest-a", 1).isPresent());
    }

    @Test
    void retryAfterIsTheTimeUntilTheOldestAddLeavesTheWindow() {
        addSongs("p1", "guest-a", MAX); // first add at t=0, now t=MAX seconds

        OptionalLong retryAfter = limiter.check("p1", "guest-a", 1);

        assertEquals(60 - MAX, retryAfter.getAsLong());
    }

    @Test
    void windowRollsForward() {
        addSongs("p1", "guest-a", MAX); // t=0..MAX-1 s, now t=MAX s
        clock.advance(Duration.ofMillis((60 - MAX) * 1000L + 500)); // t=60.5s: only the first add (t=0) has left the window

        assertTrue(limiter.check("p1", "guest-a", 1).isEmpty());
        // ...but only one slot is free again.
        limiter.record("p1", "guest-a", 1);
        assertTrue(limiter.check("p1", "guest-a", 1).isPresent());
    }

    @Test
    void checksWithoutRecordDoNotUseUpTheBudget() {
        // Rejected adds (duplicate, blocklist) are checked but never recorded.
        for (int i = 0; i < MAX * 2; i++) {
            assertTrue(limiter.check("p1", "guest-a", 1).isEmpty());
        }
    }

    @Test
    void limitIsPerGuestAndPerParty() {
        addSongs("p1", "guest-a", MAX);

        assertTrue(limiter.check("p1", "guest-b", 1).isEmpty(), "other guest of the same party");
        assertTrue(limiter.check("p2", "guest-a", 1).isEmpty(), "same device in another party");
    }

    @Test
    void severalSongsInOneRequestCountEach() {
        assertTrue(limiter.check("p1", "guest-a", MAX).isEmpty());
        limiter.record("p1", "guest-a", MAX - 2);

        assertTrue(limiter.check("p1", "guest-a", 2).isEmpty());
        assertTrue(limiter.check("p1", "guest-a", 3).isPresent());
        assertTrue(new GuestAddRateLimiter().check("p1", "fresh", MAX + 1).isPresent(),
                "a single request with more than MAX songs is rejected");
    }

    @Test
    void guestsWithoutAddsInTheWindowAreForgotten() {
        addSongs("p1", "guest-a", 3);
        clock.advance(Duration.ofMinutes(2));

        limiter.record("p1", "guest-b", 1);

        assertEquals(1, limiter.trackedGuests());
    }
}
