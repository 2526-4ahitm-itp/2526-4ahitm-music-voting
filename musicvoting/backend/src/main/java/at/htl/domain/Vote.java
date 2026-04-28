package at.htl.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "vote")
public class Vote extends PanacheEntityBase {

    @Id
    @GeneratedValue
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "queue_entry_id", nullable = false)
    public QueueEntry queueEntry;

    @Column(name = "device_id", nullable = false)
    public String deviceId;

    @Column(name = "voted_at", nullable = false)
    public OffsetDateTime votedAt;
}
