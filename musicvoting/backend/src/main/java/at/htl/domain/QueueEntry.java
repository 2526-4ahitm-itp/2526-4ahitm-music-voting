package at.htl.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "queue_entry")
public class QueueEntry extends PanacheEntityBase {

    @Id
    @GeneratedValue
    public UUID id;

    @Column(name = "party_id", nullable = false)
    public String partyId;

    @Column(name = "track_uri", nullable = false)
    public String trackUri;

    @Column(name = "track_name", nullable = false)
    public String trackName;

    @Column(name = "artist_name", nullable = false)
    public String artistName;

    @Column(name = "album_name")
    public String albumName;

    @Column(name = "image_url")
    public String imageUrl;

    @Column(name = "duration_ms")
    public Integer durationMs;

    @Column(name = "added_at", nullable = false)
    public OffsetDateTime addedAt;
}
