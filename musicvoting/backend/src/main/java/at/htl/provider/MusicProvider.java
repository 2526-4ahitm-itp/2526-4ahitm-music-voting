package at.htl.provider;

import at.htl.domain.Party;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.Map;

public interface MusicProvider {

    Map<String, Object> searchTracks(Party party, String query);

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
}
