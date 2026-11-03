package at.htl.service;

import at.htl.domain.*;
import at.htl.endpoints.LoginEvent;
import at.htl.endpoints.LoginEventBus;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;

@ApplicationScoped
public class PartyService {

    @Inject
    PartyRegistry partyRegistry;

    @Inject
    LoginEventBus loginEventBus;

    @Inject
    BlacklistService blacklistService;

    /** Persists the party's Spotify refresh token so the host's session survives a restart. */
    @Transactional
    public void persistSpotifyRefreshToken(PartyId partyId, String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        PartyEntity entity = PartyEntity.findById(partyId.value());
        if (entity != null) {
            entity.spotifyRefreshToken = refreshToken;
        }
    }

    @Transactional
    public void endParty(PartyId partyId) {
        QueueEntry.delete("partyId", partyId.value());
        // The party row is only soft-deleted (ended_at), so ON DELETE CASCADE does not fire —
        // delete the blacklist explicitly so it never carries over.
        blacklistService.deleteAll(partyId.value());

        Optional<Party> party = partyRegistry.find(partyId);
        if (party.isPresent() && party.get().providerKind() == ProviderKind.SPOTIFY) {
            party.get().getSpotifyCredentials().setToken(null);
        }

        PartyEntity entity = PartyEntity.findById(partyId.value());
        if (entity != null) {
            entity.endedAt = OffsetDateTime.now();
            entity.persist();
        }

        partyRegistry.remove(partyId);

        loginEventBus.emit(new LoginEvent("party-ended", Instant.now(), Map.of("partyId", partyId.value())));
    }
}
