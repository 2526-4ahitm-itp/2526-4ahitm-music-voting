package at.htl.provider.spotify;

import at.htl.domain.*;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class SpotifyMusicProviderTest {

    @Inject
    SpotifyMusicProvider provider;

    private Party newParty() {
        return new Party(PartyId.newRandom(), ProviderKind.SPOTIFY, "00001", "90001");
    }

    private PartyEntity persistPartyEntity(Party party) {
        PartyEntity entity = new PartyEntity();
        entity.id = party.id().value();
        entity.providerKind = ProviderKind.SPOTIFY.name();
        entity.createdAt = OffsetDateTime.now();
        entity.pin = party.pin();
        entity.hostPin = party.hostPin();
        entity.persist();
        return entity;
    }

    private QueueEntry persistQueueEntry(String partyId, String trackUri, String trackName, OffsetDateTime addedAt) {
        QueueEntry entry = new QueueEntry();
        entry.partyId = partyId;
        entry.trackUri = trackUri;
        entry.trackName = trackName;
        entry.artistName = "Some Artist";
        entry.addedAt = addedAt;
        entry.persist();
        return entry;
    }

    @Test
    @TestTransaction
    void getQueue_withNoEntries_returnsEmptyList() {
        Party party = newParty();

        List<Map<String, Object>> queue = provider.getQueue(party);

        assertTrue(queue.isEmpty());
    }

    @Test
    @TestTransaction
    void getQueue_ordersByLikeCountDescendingThenAddedAtAscending() {
        Party party = newParty();
        String partyId = party.id().value();
        persistPartyEntity(party);

        OffsetDateTime now = OffsetDateTime.now();
        QueueEntry first = persistQueueEntry(partyId, "spotify:track:first", "First", now);
        QueueEntry second = persistQueueEntry(partyId, "spotify:track:second", "Second", now.plusSeconds(1));

        Vote vote = new Vote();
        vote.queueEntry = second;
        vote.deviceId = "device-1";
        vote.votedAt = now;
        vote.persist();

        List<Map<String, Object>> queue = provider.getQueue(party);

        assertEquals(2, queue.size());
        assertEquals("spotify:track:second", queue.get(0).get("uri"));
        assertEquals(1L, queue.get(0).get("likeCount"));
        assertEquals("spotify:track:first", queue.get(1).get("uri"));
        assertEquals(0L, queue.get(1).get("likeCount"));
    }

    @Test
    @TestTransaction
    void toggleVote_forUnknownTrack_returnsNotFound() {
        Party party = newParty();

        Response response = provider.toggleVote(party, "spotify:track:missing", "device-1");

        assertEquals(404, response.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getEntity();
        assertEquals("Song nicht in der Warteschlange.", body.get("error"));
    }

    @Test
    @TestTransaction
    void toggleVote_addsThenRemovesVoteAndUpdatesLikeCount() {
        Party party = newParty();
        String partyId = party.id().value();
        persistPartyEntity(party);
        persistQueueEntry(partyId, "spotify:track:vote-me", "Vote Me", OffsetDateTime.now());

        Response liked = provider.toggleVote(party, "spotify:track:vote-me", "device-1");
        assertEquals(200, liked.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> likedBody = (Map<String, Object>) liked.getEntity();
        assertEquals(true, likedBody.get("liked"));
        assertEquals(1L, likedBody.get("likeCount"));

        Response unliked = provider.toggleVote(party, "spotify:track:vote-me", "device-1");
        assertEquals(200, unliked.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> unlikedBody = (Map<String, Object>) unliked.getEntity();
        assertEquals(false, unlikedBody.get("liked"));
        assertEquals(0L, unlikedBody.get("likeCount"));
    }

    @Test
    @TestTransaction
    void getQueueForDevice_hasVotedFalseWhenNoVotesExist() {
        Party party = newParty();
        String partyId = party.id().value();
        persistPartyEntity(party);
        persistQueueEntry(partyId, "spotify:track:a", "Track A", OffsetDateTime.now());

        List<Map<String, Object>> queue = provider.getQueueForDevice(party, "device-1");

        assertEquals(1, queue.size());
        assertEquals(false, queue.get(0).get("hasVoted"));
        assertEquals(0L, queue.get(0).get("likeCount"));
    }

    @Test
    @TestTransaction
    void getQueueForDevice_returnsHasVotedTrueForVotingDevice() {
        Party party = newParty();
        String partyId = party.id().value();
        persistPartyEntity(party);
        OffsetDateTime now = OffsetDateTime.now();
        QueueEntry entry = persistQueueEntry(partyId, "spotify:track:a", "Track A", now);

        Vote vote = new Vote();
        vote.queueEntry = entry;
        vote.deviceId = "device-1";
        vote.votedAt = now;
        vote.persist();

        List<Map<String, Object>> queue = provider.getQueueForDevice(party, "device-1");

        assertEquals(1, queue.size());
        assertEquals(true, queue.get(0).get("hasVoted"));
        assertEquals(1L, queue.get(0).get("likeCount"));
    }

    @Test
    @TestTransaction
    void getQueueForDevice_returnsHasVotedFalseForOtherDevice() {
        Party party = newParty();
        String partyId = party.id().value();
        persistPartyEntity(party);
        OffsetDateTime now = OffsetDateTime.now();
        QueueEntry entry = persistQueueEntry(partyId, "spotify:track:a", "Track A", now);

        Vote vote = new Vote();
        vote.queueEntry = entry;
        vote.deviceId = "device-1";
        vote.votedAt = now;
        vote.persist();

        List<Map<String, Object>> queue = provider.getQueueForDevice(party, "device-2");

        assertEquals(1, queue.size());
        assertEquals(false, queue.get(0).get("hasVoted"));
        assertEquals(1L, queue.get(0).get("likeCount"));
    }

    @Test
    @TestTransaction
    void removeTrack_forUnknownTrack_returnsNotFound() {
        Party party = newParty();

        Response response = provider.removeTrack(party, "spotify:track:missing");

        assertEquals(404, response.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getEntity();
        assertEquals("Song nicht in der Warteschlange.", body.get("error"));
    }

    @Test
    @TestTransaction
    void removeTrack_forExistingTrack_removesEntryAndReturnsOk() {
        Party party = newParty();
        String partyId = party.id().value();
        persistPartyEntity(party);
        persistQueueEntry(partyId, "spotify:track:remove-me", "Remove Me", OffsetDateTime.now());

        Response response = provider.removeTrack(party, "spotify:track:remove-me");

        assertEquals(200, response.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getEntity();
        assertEquals("removed", body.get("status"));
        assertEquals(0, QueueEntry.count("partyId = ?1 AND trackUri = ?2", partyId, "spotify:track:remove-me"));
    }

    @Test
    @TestTransaction
    void addTracksToPlaylist_whenTrackAlreadyQueued_returnsConflictWithoutCallingSpotify() {
        Party party = newParty();
        String partyId = party.id().value();
        persistPartyEntity(party);
        persistQueueEntry(partyId, "spotify:track:duplicate", "Duplicate", OffsetDateTime.now());

        Response response = provider.addTracksToPlaylist(party, List.of("spotify:track:duplicate"));

        assertEquals(409, response.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getEntity();
        assertEquals("Song ist schon in der Warteschlange.", body.get("error"));
    }

    @Test
    @TestTransaction
    void getCurrentPlayback_withoutPartyEntity_returnsNotPlayingDefaults() {
        Party party = newParty();

        Response response = provider.getCurrentPlayback(party);

        assertEquals(200, response.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getEntity();
        assertEquals(false, body.get("isPlaying"));
        assertEquals(0, body.get("progressMs"));
    }

    @Test
    @TestTransaction
    void getCurrentPlayback_withPartyEntityButNoCurrentTrack_returnsNotPlayingDefaults() {
        Party party = newParty();
        persistPartyEntity(party);

        Response response = provider.getCurrentPlayback(party);

        assertEquals(200, response.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getEntity();
        assertEquals(false, body.get("isPlaying"));
        assertEquals(0, body.get("progressMs"));
    }

    @Test
    @TestTransaction
    void playNextAndRemove_withoutPartyEntity_returnsNotFound() {
        Party party = newParty();

        Response response = provider.playNextAndRemove(party);

        assertEquals(404, response.getStatus());
    }

    @Test
    @TestTransaction
    void playNextAndRemove_withEmptyQueue_returnsEmptyStatus() {
        Party party = newParty();
        persistPartyEntity(party);

        Response response = provider.playNextAndRemove(party);

        assertEquals(200, response.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getEntity();
        assertEquals("empty", body.get("status"));
        assertEquals("Warteschlange ist leer", body.get("message"));
    }

    @Test
    @TestTransaction
    void startFirstSongWithoutRemoving_withEmptyQueue_returnsEmptyStatus() {
        Party party = newParty();

        Response response = provider.startFirstSongWithoutRemoving(party);

        assertEquals(200, response.getStatus());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getEntity();
        assertEquals("empty", body.get("status"));
        assertEquals("Warteschlange ist leer", body.get("message"));
    }

    @Test
    @TestTransaction
    void getQueue_autofilledEntriesSortBelowGuestEntries() {
        Party party = newParty();
        String partyId = party.id().value();
        persistPartyEntity(party);

        OffsetDateTime now = OffsetDateTime.now();
        // Auto-filled entry added earlier AND with a like — it must still sort below the
        // guest entry, proving the autofilled flag outranks both recency and vote count.
        QueueEntry autofilled = persistQueueEntry(partyId, "spotify:track:auto", "Auto", now);
        autofilled.autofilled = true;
        autofilled.persist();

        Vote vote = new Vote();
        vote.queueEntry = autofilled;
        vote.deviceId = "device-1";
        vote.votedAt = now;
        vote.persist();

        persistQueueEntry(partyId, "spotify:track:guest", "Guest", now.plusSeconds(5));

        List<Map<String, Object>> queue = provider.getQueue(party);

        assertEquals(2, queue.size());
        assertEquals("spotify:track:guest", queue.get(0).get("uri"));
        assertEquals("spotify:track:auto", queue.get(1).get("uri"));
    }

    @Test
    void buildResumeBody_withCurrentUri_carriesThatUriAndPosition() throws Exception {
        String body = provider.buildResumeBody("spotify:track:B", 12345L);

        // Resume must re-assert the current track's uri, not issue a bare resume.
        assertTrue(body.contains("spotify:track:B"), "body must name the current uri");
        assertTrue(body.contains("uris"), "body must carry a uris array");
        assertTrue(body.contains("12345"), "body must carry the paused position");
    }

    @Test
    void buildResumeBody_withoutCurrentUri_fallsBackToBareResume() throws Exception {
        // No known current track and no paused position → bare resume (null body).
        assertNull(provider.buildResumeBody(null, null));

        // No current track but a paused position → position-only resume, no uris.
        String posOnly = provider.buildResumeBody(null, 5000L);
        assertNotNull(posOnly);
        assertTrue(posOnly.contains("5000"));
        assertFalse(posOnly.contains("uris"), "bare resume must not name a uri");
    }

    @Test
    @TestTransaction
    void playbackTransitionLogging_whenDeviceSnapshotUnavailable_doesNotThrowOrAlterState() {
        Party party = newParty();
        String partyId = party.id().value();
        PartyEntity pe = persistPartyEntity(party);

        OffsetDateTime now = OffsetDateTime.now();
        QueueEntry current = persistQueueEntry(partyId, "spotify:track:current", "Current", now);
        persistQueueEntry(partyId, "spotify:track:next", "Next", now.plusSeconds(1));
        pe.currentlyPlayingEntryId = current.id;
        pe.persist();

        // pausePlayback logs a playback transition first — rendering queue/current/next and making a
        // best-effort device snapshot call that fails in test (no Spotify token). The logging must
        // neither throw nor change any persisted state; the operation returns its usual error.
        Response response = provider.pausePlayback(party);

        assertTrue(response.getStatus() >= 400, "device resolution fails without a token");

        // Logging left the queue and current-track state untouched.
        assertEquals(2, QueueEntry.count("partyId", partyId));
        PartyEntity after = PartyEntity.findById(partyId);
        assertEquals(current.id, after.currentlyPlayingEntryId);
        assertNull(after.pausedPositionMs);
    }

    @Test
    void formatDevicesSnapshot_withNullOrEmpty_returnsNoneMarker() {
        assertEquals("<none>", SpotifyMusicProvider.formatDevicesSnapshot(null));
        assertEquals("<none>", SpotifyMusicProvider.formatDevicesSnapshot(List.of()));
    }

    @Test
    void formatDevicesSnapshot_rendersIdIsActiveAndNamePerDevice() {
        List<Map<String, Object>> devices = List.of(
                Map.of("id", "dev-A", "is_active", true, "name", "Web Player"),
                Map.of("id", "dev-B", "is_active", false, "name", "Phone"));

        String rendered = SpotifyMusicProvider.formatDevicesSnapshot(devices);

        // The diagnostic must expose each device's id, is_active and name so the
        // "SDK device absent/inactive at advance" hypothesis is checkable from the logs.
        assertTrue(rendered.contains("id=dev-A"));
        assertTrue(rendered.contains("is_active=true"));
        assertTrue(rendered.contains("name=Web Player"));
        assertTrue(rendered.contains("id=dev-B"));
        assertTrue(rendered.contains("is_active=false"));
        assertTrue(rendered.contains("name=Phone"));
        assertTrue(rendered.contains(" ;; "), "multiple devices are separated");
    }

    @Test
    void formatDevicesSnapshot_missingIsActiveTreatedAsFalse() {
        // A device Spotify returns without an explicit is_active must not render as active.
        List<Map<String, Object>> devices = new java.util.ArrayList<>();
        java.util.HashMap<String, Object> d = new java.util.HashMap<>();
        d.put("id", "dev-C");
        d.put("name", "No Flag");
        devices.add(d);

        String rendered = SpotifyMusicProvider.formatDevicesSnapshot(devices);

        assertTrue(rendered.contains("is_active=false"));
    }

    @Test
    void buildResumeBody_asReassert_carriesUriAndSettlePosition() throws Exception {
        // The advance re-assert reuses buildResumeBody to re-issue the exact next uri with a
        // settle position_ms — so it can only ever (re)play the correct song, never a stale one
        // (per fix-autoplay-transition-stall). uri is always known here, so the body is never bare.
        String body = provider.buildResumeBody("spotify:track:next", 700L);

        assertTrue(body.contains("spotify:track:next"), "re-assert must name the next uri");
        assertTrue(body.contains("uris"), "re-assert must carry a uris array");
        assertTrue(body.contains("700"), "re-assert must carry the settle position");
    }

    @Test
    @TestTransaction
    void refillQueue_whenNothingPlaying_addsNothing() {
        Party party = newParty();
        persistPartyEntity(party); // currentlyPlayingEntryId stays null

        provider.refillQueue(party);

        assertEquals(0, QueueEntry.count("partyId", party.id().value()));
    }

    @Test
    @TestTransaction
    void refillQueue_whenOtherSongsStillQueued_addsNothing() {
        Party party = newParty();
        String partyId = party.id().value();
        PartyEntity pe = persistPartyEntity(party);

        OffsetDateTime now = OffsetDateTime.now();
        QueueEntry current = persistQueueEntry(partyId, "spotify:track:current", "Current", now);
        persistQueueEntry(partyId, "spotify:track:next", "Next", now.plusSeconds(1));

        pe.currentlyPlayingEntryId = current.id;
        pe.persist();

        provider.refillQueue(party);

        assertEquals(2, QueueEntry.count("partyId", party.id().value()));
    }
}
