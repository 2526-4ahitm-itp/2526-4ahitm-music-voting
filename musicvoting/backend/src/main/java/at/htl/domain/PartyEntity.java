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

    @Column(name = "host_pin")
    public String hostPin;

    @Column(name = "ended_at")
    public OffsetDateTime endedAt;

    @Column(name = "currently_playing_entry_id")
    public UUID currentlyPlayingEntryId;

    @Column(name = "playback_started_at")
    public OffsetDateTime playbackStartedAt;

    @Column(name = "paused_position_ms")
    public Long pausedPositionMs;

    public static Optional<PartyEntity> findByPin(String pin) {
        return find("pin = ?1 and endedAt is null", pin).firstResultOptional();
    }

    public static Optional<PartyEntity> findByHostPin(String hostPin) {
        return find("hostPin = ?1 and endedAt is null", hostPin).firstResultOptional();
    }
}
