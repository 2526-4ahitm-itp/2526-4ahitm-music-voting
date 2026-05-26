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
                .flatMap(entity -> find(PartyId.of(entity.id)));
    }

    public Optional<Party> findByHostPin(String hostPin) {
        return PartyEntity.findByHostPin(hostPin)
                .flatMap(entity -> find(PartyId.of(entity.id)));
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
