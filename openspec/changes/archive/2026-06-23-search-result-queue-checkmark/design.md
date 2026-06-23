# Design: Search Result Checkmark for Queued Songs

## Identifier

The join key is the Spotify track URI (`spotify:track:<id>`):
- Search results: `track.uri` (raw Spotify Search API passthrough from `TrackResource.search`).
- Queue entries: `QueueEntry.trackUri`, returned as `uri` by `GET /api/party/{id}/track/queue`.

A search result is "in queue" iff `track.uri` is a member of the set of `uri` values from the current queue.

## Web: shared queue-state service

New file `musicvoting/frontend/src/app/services/queue-state.ts`:

```ts
@Injectable({ providedIn: 'root' })
export class QueueStateService {
  private inQueueUris = new BehaviorSubject<Set<string>>(new Set());
  readonly inQueueUris$ = this.inQueueUris.asObservable();

  constructor(private spotify: SpotifyWebPlayerService) {
    this.refresh();
  }

  refresh(): void {
    this.spotify.getQueue().subscribe(tracks => {
      this.inQueueUris.next(new Set((tracks ?? []).map((t: any) => t.uri)));
    });
  }
}
```

`refresh()` is called once on construction and again whenever a `queue-updated` SSE event is received. Both `guest.ts` and `search-host.ts`:

1. Inject `QueueStateService`.
2. Open (or reuse) the existing party SSE stream (`/api/spotify/events?source=web&...`) and call `queueState.refresh()` on `data.type === 'queue-updated'`.
3. Subscribe to `inQueueUris$` and store the latest `Set<string>` in a component field `inQueueUris: Set<string>`.

`guest.html` / `search-host.html` button template becomes:

```html
<button class="add-button"
        (click)="addToPlaylist(track)"
        [disabled]="addingTrackId === track.id || inQueueUris.has(track.uri)">
  @if (inQueueUris.has(track.uri) || addingTrackId === track.id) {
    <!-- checkmark svg -->
  } @else {
    <!-- + svg -->
  }
</button>
```

`addToPlaylist()` calls `queueState.refresh()` after a successful add (in addition to the existing `queueUpdatedSubject.next()`), so the local view updates immediately without waiting for the SSE round trip.

`search-host.ts` currently has no SSE subscription (`ngOnInit(): void {}`); it gains one mirroring the pattern in `voting-comp.ts`.

## iOS: SongAddViewModel queue state

`SongAddViewModel` gains:

```swift
@Published var queuedTrackUris: Set<String> = []

func loadQueue() async {
    // GET track/queue, decode [QueueTrack], collect non-nil .uri into queuedTrackUris
}
```

- Called once when `SongAddView` appears.
- The view opens an SSE listener on the party stream (same `PartySession.sseEventsURL` used by `AdminDashboard`/admin dashboard) filtered to `queue-updated`; on receipt, calls `await loadQueue()`.
- `addToPlaylist(track)` calls `loadQueue()` again on success (in addition to existing local `addedTrackIds` bookkeeping) so the UI doesn't depend solely on the SSE round trip.

`SongAddView` button state becomes:

```swift
let isQueued = viewModel.queuedTrackUris.contains(track.uri ?? "") || viewModel.addedTrackIds.contains(track.id)
...
Image(systemName: isQueued ? "checkmark" : "plus")
...
.disabled(isAdding || isQueued)
```

## Live update on removal

`queue-updated` already fires on both add and remove (`TrackResource.removeFromPlaylist`). Since `refresh()`/`loadQueue()` re-derive the full set from `/track/queue` each time, a song removed from the queue (e.g. it played and finished, or the host deleted it) automatically reverts its search-result button back to "+" the next time the SSE event fires while that result is still on screen.

## No backend changes

`/api/party/{id}/track/queue` already returns enough data (`uri` per entry); no new endpoint or field is needed.
