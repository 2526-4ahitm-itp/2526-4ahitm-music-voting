package at.htl.domain;

import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@ApplicationScoped
public class PartyRegistry {

    private static final PartyId DEFAULT_ID = PartyId.of("default");

    private final ConcurrentHashMap<PartyId, Party> parties = new ConcurrentHashMap<>();

    /**
     * Transitional accessor used while party-lifecycle endpoints (create/end/PIN/QR) do not yet
     * exist. Returns a single implicit party so existing endpoints keep working. To be removed
     * in the {@code add-party-lifecycle-endpoints} change once callers pass a real party-ID.
     */
    @Deprecated
    public Party getOrCreateDefault() {
        return parties.computeIfAbsent(DEFAULT_ID, id -> new Party(id, ProviderKind.SPOTIFY));
    }

    public Optional<Party> find(PartyId id) {
        return Optional.ofNullable(parties.get(id));
    }

    Party register(Party party) {
        Party existing = parties.putIfAbsent(party.id(), party);
        if (existing != null) {
            throw new IllegalStateException("Party with id " + party.id() + " already registered");
        }
        return party;
    }

    Party remove(PartyId id) {
        return parties.remove(id);
    }
}
