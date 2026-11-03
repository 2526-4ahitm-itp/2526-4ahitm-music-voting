package at.htl.provider;

import at.htl.domain.Party;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.Map;

public interface MusicProvider {

    /**
     * Searches tracks for a party.
     *
     * @param guest true for the web guest search: songs by a banned artist are removed and a
     *              {@code hiddenHint} is added (see search spec "Blacklisted Search Results
     *              Cannot Be Added"). False keeps every result, blocked ones only flagged.
     */
    Map<String, Object> searchTracks(Party party, String query, boolean guest);

    Response getTrack(Party party, String id);

    Response play(Party party, String uri);

    Response overwritePlaylist(Party party, List<String> uris);

    List<Map<String, Object>> getQueue(Party party);

    Response addTracksToPlaylist(Party party, List<String> uris);

    Response removeTrack(Party party, String uri);

    Response playNextAndRemove(Party party);

    Response pausePlayback(Party party);

    Response resumePlayback(Party party);

    Response startFirstSongWithoutRemoving(Party party);

    Response getCurrentPlayback(Party party);

    Response toggleVote(Party party, String trackUri, String deviceId);

    /**
     * If the queue would otherwise empty out while a song is playing, top it up with one song
     * (default playlist / recommendations). No-op for providers without auto-refill support.
     */
    default void refillQueue(Party party) { }

    /**
     * Artist search for the host's blacklist setup page. Each result is
     * {@code {id, name, imageUrl}}. Empty for providers without artist search.
     */
    default List<Map<String, Object>> searchArtists(Party party, String query) {
        return List.of();
    }

    default List<Map<String, Object>> getQueueForDevice(Party party, String deviceId) {
        return getQueue(party).stream().map(entry -> {
            java.util.Map<String, Object> copy = new java.util.HashMap<>(entry);
            copy.put("hasVoted", false);
            return copy;
        }).toList();
    }
}
