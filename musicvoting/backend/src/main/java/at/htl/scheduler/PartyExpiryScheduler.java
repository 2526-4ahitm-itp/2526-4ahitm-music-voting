package at.htl.scheduler;

import at.htl.domain.PartyEntity;
import at.htl.domain.PartyId;
import at.htl.service.PartyService;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@ApplicationScoped
public class PartyExpiryScheduler {

    @Inject
    PartyService partyService;

    @Scheduled(every = "1h")
    void autoEndStaleParties() {
        OffsetDateTime threshold = OffsetDateTime.now().minusDays(2);
        List<PartyEntity> staleParties = PartyEntity.list("endedAt is null and createdAt < ?1", threshold);
        for (PartyEntity entity : staleParties) {
            partyService.endParty(PartyId.of(entity.id));
        }
    }

    @Scheduled(every = "1h")
    @Transactional
    void deleteOldEndedParties() {
        OffsetDateTime threshold = OffsetDateTime.now().minusMonths(1);
        PartyEntity.delete("endedAt is not null and endedAt < ?1", threshold);
    }
}
