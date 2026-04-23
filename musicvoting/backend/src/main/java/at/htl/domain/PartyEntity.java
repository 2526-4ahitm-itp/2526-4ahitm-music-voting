package at.htl.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

import java.time.OffsetDateTime;
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

    @Column(name = "currently_playing_entry_id")
    public UUID currentlyPlayingEntryId;

    public static PartyEntity findOrCreate(String id, String providerKind) {
        PartyEntity existing = findById(id);
        if (existing != null) return existing;
        PartyEntity entity = new PartyEntity();
        entity.id = id;
        entity.providerKind = providerKind;
        entity.createdAt = OffsetDateTime.now();
        entity.persist();
        return entity;
    }
}
