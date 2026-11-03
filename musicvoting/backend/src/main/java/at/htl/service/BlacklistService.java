package at.htl.service;

import at.htl.domain.BlacklistEntry;
import at.htl.domain.BlacklistKind;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Manages a party's blacklist and owns the one and only matching rule. The add path,
 * the auto-refill and the search all go through {@link Blacklist#isBlocked}, so the
 * three can never disagree about whether a song is allowed.
 */
@ApplicationScoped
public class BlacklistService {

    /** Result of {@link #add}: the stored entry and whether it was newly created. */
    public record AddResult(BlacklistEntry entry, boolean created) {
    }

    /** All entries of a party, oldest first (the order the host added them). */
    public List<BlacklistEntry> list(String partyId) {
        return BlacklistEntry.list("partyId = ?1 ORDER BY createdAt", partyId);
    }

    /**
     * Adds an entry, or returns the existing one if the same kind+value is already
     * blacklisted (idempotent, mirrors the DB's UNIQUE constraint).
     *
     * @throws IllegalArgumentException if kind or value is missing/blank. Validation happens
     *         before anything is written, so it must not roll back a caller's transaction.
     */
    @Transactional(dontRollbackOn = IllegalArgumentException.class)
    public AddResult add(String partyId, BlacklistKind kind, String value, String label, String imageUrl) {
        if (kind == null) {
            throw new IllegalArgumentException("kind is required");
        }
        String normalized = normalize(kind, value);
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("value is required");
        }

        BlacklistEntry existing = BlacklistEntry.find("partyId = ?1 AND kind = ?2 AND value = ?3",
                partyId, kind, normalized).firstResult();
        if (existing != null) {
            return new AddResult(existing, false);
        }

        BlacklistEntry entry = new BlacklistEntry();
        entry.partyId = partyId;
        entry.kind = kind;
        entry.value = normalized;
        // A word is its own display name; for artists/songs the client sends a readable name.
        entry.label = kind == BlacklistKind.WORD || label == null || label.isBlank() ? normalized : label.trim();
        entry.imageUrl = imageUrl == null || imageUrl.isBlank() ? null : imageUrl;
        entry.createdAt = OffsetDateTime.now();
        entry.persist();
        return new AddResult(entry, true);
    }

    /** Removes one entry of this party. Returns false if it does not exist or belongs to another party. */
    @Transactional
    public boolean remove(String partyId, UUID entryId) {
        return BlacklistEntry.delete("id = ?1 AND partyId = ?2", entryId, partyId) > 0;
    }

    /** Deletes the whole blacklist of a party (used when the party ends). */
    @Transactional
    public void deleteAll(String partyId) {
        BlacklistEntry.delete("partyId", partyId);
    }

    /**
     * Loads the party's blacklist once into an immutable snapshot. Callers that check many
     * songs (search results, refill candidates) use one snapshot instead of one query per song.
     */
    public Blacklist load(String partyId) {
        return Blacklist.of(list(partyId));
    }

    /**
     * Words are compared case-insensitively and with collapsed whitespace, so "Live" and
     * " live " end up as the same entry. IDs and URIs are only trimmed — they are case-sensitive.
     */
    static String normalize(BlacklistKind kind, String value) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        if (kind == BlacklistKind.WORD) {
            return trimmed.replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
        }
        return trimmed;
    }

    /** Immutable view of one party's blacklist with the matching rule. */
    public static final class Blacklist {

        private static final Blacklist EMPTY = new Blacklist(Set.of(), Set.of(), Set.of(), List.of());

        private final Set<String> trackUris;
        private final Set<String> artistIds;
        /**
         * Lower-cased display names of the banned artists. Only used to tell a guest
         * "Dieser Artist ist nicht zulässig." when they search for exactly that name —
         * never for deciding whether a song is blocked (that goes by artist ID).
         */
        private final Set<String> artistNames;
        private final List<Pattern> wordPatterns;

        private Blacklist(Set<String> trackUris, Set<String> artistIds, Set<String> artistNames,
                          List<Pattern> wordPatterns) {
            this.trackUris = trackUris;
            this.artistIds = artistIds;
            this.artistNames = artistNames;
            this.wordPatterns = wordPatterns;
        }

        /** Builds a snapshot from stored entries. */
        public static Blacklist of(Collection<BlacklistEntry> entries) {
            if (entries == null || entries.isEmpty()) {
                return EMPTY;
            }
            Set<String> tracks = new HashSet<>();
            Set<String> artists = new HashSet<>();
            Set<String> artistNames = new HashSet<>();
            List<Pattern> words = new ArrayList<>();
            for (BlacklistEntry e : entries) {
                switch (e.kind) {
                    case TRACK -> tracks.add(e.value);
                    case ARTIST -> {
                        artists.add(e.value);
                        String name = normalizeName(e.label);
                        if (!name.isEmpty()) {
                            artistNames.add(name);
                        }
                    }
                    case WORD -> words.add(wordPattern(e.value));
                }
            }
            return new Blacklist(Set.copyOf(tracks), Set.copyOf(artists), Set.copyOf(artistNames), List.copyOf(words));
        }

        /**
         * Whole-word pattern: the word must not be preceded or followed by a letter or digit.
         * We use explicit {@code \p{L}\p{N}} lookarounds instead of {@code \b}, because Java's
         * {@code \b} treats umlauts as non-word characters and would split "Grün" into "Gr" + "n".
         */
        static Pattern wordPattern(String word) {
            return Pattern.compile("(?<![\\p{L}\\p{N}])" + Pattern.quote(word) + "(?![\\p{L}\\p{N}])",
                    Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
        }

        public boolean isEmpty() {
            return trackUris.isEmpty() && artistIds.isEmpty() && wordPatterns.isEmpty();
        }

        /**
         * Artist names are compared trimmed, with collapsed whitespace and lower-cased, so
         * "  drake " matches the entry labelled "Drake".
         */
        public static String normalizeName(String name) {
            return name == null ? "" : name.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
        }

        /**
         * True if any of the given artist IDs is banned. The guest search hides such songs
         * completely, while songs blocked only by a word or track entry stay greyed out —
         * so this check is separate from {@link #isBlocked}.
         */
        public boolean isArtistBlocked(Collection<String> artistIds) {
            if (artistIds == null || this.artistIds.isEmpty()) {
                return false;
            }
            for (String id : artistIds) {
                if (id != null && this.artistIds.contains(id)) {
                    return true;
                }
            }
            return false;
        }

        /**
         * True if {@code name} is exactly (case-insensitive, whitespace-normalized) the stored
         * name of a banned artist. Whole-name match on purpose: "drake remix" is not a search
         * for the artist, so the guest gets the general hint instead.
         */
        public boolean isBannedArtistName(String name) {
            String normalized = normalizeName(name);
            return !normalized.isEmpty() && artistNames.contains(normalized);
        }

        /** True if the track URI itself is blacklisted — cheap, needs no metadata. */
        public boolean isTrackBlocked(String trackUri) {
            return trackUri != null && trackUris.contains(trackUri);
        }

        /**
         * True if the song matches any entry: the track itself, any of its artists, or a
         * blacklisted word in the title or in any artist name.
         */
        public boolean isBlocked(String trackUri, String title, Collection<String> artistIds, Collection<String> artistNames) {
            if (isEmpty()) {
                return false;
            }
            if (isTrackBlocked(trackUri)) {
                return true;
            }
            if (artistIds != null) {
                for (String id : artistIds) {
                    if (id != null && this.artistIds.contains(id)) {
                        return true;
                    }
                }
            }
            for (Pattern p : wordPatterns) {
                if (title != null && p.matcher(title).find()) {
                    return true;
                }
                if (artistNames != null) {
                    for (String name : artistNames) {
                        if (name != null && p.matcher(name).find()) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }
    }
}
