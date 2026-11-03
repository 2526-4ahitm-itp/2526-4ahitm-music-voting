package at.htl.domain;

/**
 * The three kinds of party blacklist entries. Stored as the enum name in
 * {@code blacklist_entry.kind}.
 */
public enum BlacklistKind {
    /** A word or phrase, matched as a whole word (case-insensitive) in title and artist names. */
    WORD,
    /** A Spotify artist ID; blocks every song the artist takes part in, including features. */
    ARTIST,
    /** A Spotify track URI; blocks exactly that track. */
    TRACK
}
