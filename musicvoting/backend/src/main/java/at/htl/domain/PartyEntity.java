package at.htl.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Entity
@Table(name = "party")
public class PartyEntity extends PanacheEntityBase {

    @Id
    public String id;

    @Column(name = "provider_kind", nullable = false)
    public String providerKind;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt;

    @Column(name = "pin", nullable = false)
    public String pin;

    @Column(name = "ended_at")
    public OffsetDateTime endedAt;

    @Column(name = "currently_playing_entry_id")
    public UUID currentlyPlayingEntryId;

    public static Optional<PartyEntity> findByPin(String pin) {
        return find("pin = ?1 and endedAt is null", pin).firstResultOptional();
    }
}
