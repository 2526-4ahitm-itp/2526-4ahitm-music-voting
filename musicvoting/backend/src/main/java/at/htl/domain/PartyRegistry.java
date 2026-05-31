package at.htl.domain;

import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@ApplicationScoped
public class PartyRegistry {

    private final ConcurrentHashMap<PartyId, Party> parties = new ConcurrentHashMap<>();

    public Optional<Party> find(PartyId id) {
        return Optional.ofNullable(parties.get(id));
    }

    public Optional<Party> findByPin(String pin) {
        return PartyEntity.findByPin(pin)
                .map(this::findOrReconstruct);
    }

    public Optional<Party> findByHostPin(String hostPin) {
        return PartyEntity.findByHostPin(hostPin)
                .map(this::findOrReconstruct);
    }

    // If the backend restarted, the entity exists in the DB but not in the in-memory map.
    // Reconstruct a Party from the DB row so the host can reconnect without re-creating the party.
    private Party findOrReconstruct(PartyEntity entity) {
        PartyId id = PartyId.of(entity.id);
        Party existing = parties.get(id);
        if (existing != null) return existing;
        Party rebuilt = new Party(id, ProviderKind.valueOf(entity.providerKind), entity.pin, entity.hostPin);
        parties.putIfAbsent(id, rebuilt);
        return parties.get(id);
    }

    public Party register(Party party) {
        Party existing = parties.putIfAbsent(party.id(), party);
        if (existing != null) {
            throw new IllegalStateException("Party with id " + party.id() + " already registered");
        }
        return party;
    }

    public Party remove(PartyId id) {
        return parties.remove(id);
    }
}
