package at.htl.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * One entry of a party's blacklist (table {@code blacklist_entry}). The {@link #value}
 * is what gets matched; {@link #label} and {@link #imageUrl} exist only so the host's
 * setup page can show a readable name and picture for artist and song entries.
 */
@Entity
@Table(name = "blacklist_entry")
public class BlacklistEntry extends PanacheEntityBase {

    @Id
    @GeneratedValue
    public UUID id;

    @Column(name = "party_id", nullable = false)
    public String partyId;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false)
    public BlacklistKind kind;

    /** WORD: normalized lower-case word; ARTIST: Spotify artist ID; TRACK: spotify:track:… URI. */
    @Column(name = "value", nullable = false)
    public String value;

    @Column(name = "label")
    public String label;

    @Column(name = "image_url")
    public String imageUrl;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt;
}
