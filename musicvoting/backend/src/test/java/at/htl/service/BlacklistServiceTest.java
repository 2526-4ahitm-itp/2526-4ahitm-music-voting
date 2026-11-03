package at.htl.service;

import at.htl.domain.BlacklistEntry;
import at.htl.domain.BlacklistKind;
import at.htl.domain.PartyEntity;
import at.htl.domain.ProviderKind;
import at.htl.service.BlacklistService.Blacklist;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class BlacklistServiceTest {

    @Inject
    BlacklistService blacklistService;

    private String newParty() {
        PartyEntity entity = new PartyEntity();
        entity.id = UUID.randomUUID().toString();
        entity.providerKind = ProviderKind.SPOTIFY.name();
        entity.createdAt = OffsetDateTime.now();
        // Active parties need unique PINs (party_pin_active_idx), so pick a random one.
        entity.pin = String.format("%05d", new java.util.Random().nextInt(100_000));
        entity.persist();
        return entity.id;
    }

    private static Blacklist words(String... words) {
        List<BlacklistEntry> entries = new java.util.ArrayList<>();
        for (String w : words) {
            BlacklistEntry e = new BlacklistEntry();
            e.kind = BlacklistKind.WORD;
            e.value = BlacklistService.normalize(BlacklistKind.WORD, w);
            entries.add(e);
        }
        return Blacklist.of(entries);
    }

    private static boolean titleBlocked(Blacklist bl, String title) {
        return bl.isBlocked("spotify:track:any", title, List.of(), List.of());
    }

    // --- word matching (pure, no DB) ---

    @Test
    void word_matchesWholeWordCaseInsensitive() {
        Blacklist bl = words("live");
        assertTrue(titleBlocked(bl, "Song X (Live)"));
        assertTrue(titleBlocked(bl, "LIVE at Wembley"));
        assertTrue(titleBlocked(bl, "Song - live"));
    }

    @Test
    void word_doesNotMatchInsideAnotherWord() {
        Blacklist bl = words("live");
        assertFalse(titleBlocked(bl, "Oliver"));
        assertFalse(titleBlocked(bl, "Delivery"));
        assertFalse(titleBlocked(bl, "Lively"));
    }

    @Test
    void word_matchesArtistNames() {
        Blacklist bl = words("live");
        assertTrue(bl.isBlocked("spotify:track:a", "Clean Title", List.of("id1"), List.of("Live Band")));
        assertFalse(bl.isBlocked("spotify:track:a", "Clean Title", List.of("id1"), List.of("Oliver Tree")));
    }

    @Test
    void word_treatsUmlautsAsLetters() {
        Blacklist bl = words("grün");
        assertTrue(titleBlocked(bl, "Alles GRÜN"));
        assertFalse(titleBlocked(bl, "Grünwald"));
    }

    @Test
    void word_phraseMatchesAsWholeWords() {
        Blacklist bl = words("Radio  Edit");
        assertTrue(titleBlocked(bl, "Song (Radio Edit)"));
        assertFalse(titleBlocked(bl, "Radio Editor"));
    }

    @Test
    void word_regexCharactersAreLiteral() {
        Blacklist bl = words("a.b");
        assertTrue(titleBlocked(bl, "x a.b y"));
        assertFalse(titleBlocked(bl, "x axb y"));
    }

    @Test
    void emptyBlacklist_blocksNothing() {
        Blacklist bl = Blacklist.of(List.of());
        assertTrue(bl.isEmpty());
        assertFalse(bl.isBlocked("spotify:track:a", "Live", List.of("x"), List.of("Live")));
    }

    // --- banned-artist check for the guest search (pure, no DB) ---

    private static Blacklist artist(String id, String label) {
        BlacklistEntry e = new BlacklistEntry();
        e.kind = BlacklistKind.ARTIST;
        e.value = id;
        e.label = label;
        return Blacklist.of(List.of(e));
    }

    @Test
    void isArtistBlocked_matchesAnyOfTheIds() {
        Blacklist bl = artist("artistA", "Artist A");
        assertTrue(bl.isArtistBlocked(List.of("artistB", "artistA")));
        assertFalse(bl.isArtistBlocked(List.of("artistB")));
        assertFalse(bl.isArtistBlocked(null));
    }

    @Test
    void isArtistBlocked_ignoresWordEntries() {
        // A word matching an artist name greys the song out, but it is not a banned artist.
        Blacklist bl = words("drake");
        assertFalse(bl.isArtistBlocked(List.of("drakeId")));
    }

    @Test
    void isBannedArtistName_isCaseInsensitiveAndTrimmed() {
        Blacklist bl = artist("drakeId", "Drake");
        assertTrue(bl.isBannedArtistName("drake"));
        assertTrue(bl.isBannedArtistName("  DRAKE "));
    }

    @Test
    void isBannedArtistName_needsTheWholeName() {
        Blacklist bl = artist("drakeId", "Drake");
        assertFalse(bl.isBannedArtistName("drake remix"));
        assertFalse(bl.isBannedArtistName("dra"));
        assertFalse(bl.isBannedArtistName(""));
        assertFalse(bl.isBannedArtistName(null));
    }

    @Test
    void emptyBlacklist_hasNoBannedArtists() {
        Blacklist bl = Blacklist.of(List.of());
        assertFalse(bl.isArtistBlocked(List.of("x")));
        assertFalse(bl.isBannedArtistName("x"));
    }

    // --- DB-backed: add / list / remove / load ---

    @Test
    @TestTransaction
    void artistEntry_blocksSongWithThatArtistAsFeature() {
        String partyId = newParty();
        blacklistService.add(partyId, BlacklistKind.ARTIST, "artistA", "Artist A", null);

        Blacklist bl = blacklistService.load(partyId);

        assertTrue(bl.isBlocked("spotify:track:1", "Duet", List.of("artistB", "artistA"), List.of("B", "A")));
        assertFalse(bl.isBlocked("spotify:track:2", "Solo", List.of("artistB"), List.of("B")));
    }

    @Test
    @TestTransaction
    void trackEntry_blocksExactlyThatTrack() {
        String partyId = newParty();
        blacklistService.add(partyId, BlacklistKind.TRACK, "spotify:track:X", "Song X – A", null);

        Blacklist bl = blacklistService.load(partyId);

        assertTrue(bl.isTrackBlocked("spotify:track:X"));
        assertTrue(bl.isBlocked("spotify:track:X", "Song X", List.of("a"), List.of("A")));
        assertFalse(bl.isBlocked("spotify:track:Y", "Song Y", List.of("a"), List.of("A")));
    }

    @Test
    @TestTransaction
    void add_sameWordTwice_keepsOneEntry() {
        String partyId = newParty();

        BlacklistService.AddResult first = blacklistService.add(partyId, BlacklistKind.WORD, "live", null, null);
        BlacklistService.AddResult second = blacklistService.add(partyId, BlacklistKind.WORD, "  Live ", null, null);

        assertTrue(first.created());
        assertFalse(second.created());
        assertEquals(first.entry().id, second.entry().id);
        assertEquals(1, blacklistService.list(partyId).size());
        assertEquals("live", blacklistService.list(partyId).get(0).value);
        assertEquals("live", blacklistService.list(partyId).get(0).label);
    }

    @Test
    @TestTransaction
    void add_blankValueOrMissingKind_isRejected() {
        String partyId = newParty();

        assertThrows(IllegalArgumentException.class,
                () -> blacklistService.add(partyId, BlacklistKind.WORD, "   ", null, null));
        assertThrows(IllegalArgumentException.class,
                () -> blacklistService.add(partyId, BlacklistKind.ARTIST, null, null, null));
        assertThrows(IllegalArgumentException.class,
                () -> blacklistService.add(partyId, null, "live", null, null));
        assertEquals(0, blacklistService.list(partyId).size());
    }

    @Test
    @TestTransaction
    void entriesOfOnePartyDoNotAffectAnother() {
        String partyA = newParty();
        String partyB = newParty();
        blacklistService.add(partyA, BlacklistKind.WORD, "live", null, null);

        assertTrue(titleBlocked(blacklistService.load(partyA), "Live"));
        assertFalse(titleBlocked(blacklistService.load(partyB), "Live"));
    }

    @Test
    @TestTransaction
    void remove_deletesOnlyOwnPartysEntry() {
        String partyA = newParty();
        String partyB = newParty();
        BlacklistEntry entry = blacklistService.add(partyA, BlacklistKind.WORD, "live", null, null).entry();

        assertFalse(blacklistService.remove(partyB, entry.id));
        assertEquals(1, blacklistService.list(partyA).size());

        assertTrue(blacklistService.remove(partyA, entry.id));
        assertEquals(0, blacklistService.list(partyA).size());
    }
}
