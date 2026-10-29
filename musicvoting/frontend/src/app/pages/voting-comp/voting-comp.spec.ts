import { of, throwError, Subject } from 'rxjs';
import { VotingComp } from './voting-comp';

describe('VotingComp', () => {
  let spotifyService: { getQueue: jasmine.Spy; toggleVote: jasmine.Spy };
  let feedback: { show: jasmine.Spy };
  let ngZone: { run: jasmine.Spy };
  let router: { navigate: jasmine.Spy };
  let partyService: { currentPartyId: string | null };
  let comp: VotingComp;

  beforeEach(() => {
    spotifyService = { getQueue: jasmine.createSpy('getQueue'), toggleVote: jasmine.createSpy('toggleVote') };
    feedback = { show: jasmine.createSpy('show') };
    ngZone = { run: jasmine.createSpy('run').and.callFake((fn: () => void) => fn()) };
    router = { navigate: jasmine.createSpy('navigate') };
    partyService = { currentPartyId: 'party-1' };
    comp = new VotingComp(spotifyService as any, ngZone as any, null as any, router as any, partyService as any, feedback as any);
  });

  afterEach(() => comp.ngOnDestroy());

  it('filteredTracks returns all tracks when the search query is empty', () => {
    comp.tracks.set([
      { name: 'Song A', artists: [{ name: 'Artist A' }] },
      { name: 'Song B', artists: [{ name: 'Artist B' }] },
    ]);

    expect(comp.filteredTracks().length).toBe(2);
  });

  it('filteredTracks filters by track name or artist name', () => {
    comp.tracks.set([
      { name: 'Song A', artists: [{ name: 'Artist A' }] },
      { name: 'Song B', artists: [{ name: 'Artist B' }] },
    ]);
    comp.searchQuery.set('artist b');

    expect(comp.filteredTracks()).toEqual([{ name: 'Song B', artists: [{ name: 'Artist B' }] }]);
  });

  it('loadPlaylist sets tracks from the queue response', async () => {
    spotifyService.getQueue.and.returnValue(of({ queue: [{ name: 'Song A', artists: [] }] }));

    await comp.loadPlaylist();

    expect(comp.tracks()).toEqual([{ name: 'Song A', artists: [] }]);
  });

  it('loadPlaylist sets an empty array when the response has no queue', async () => {
    spotifyService.getQueue.and.returnValue(of({}));

    await comp.loadPlaylist();

    expect(comp.tracks()).toEqual([]);
  });

  it('loadPlaylist logs an error when the request fails', async () => {
    spyOn(console, 'error');
    spotifyService.getQueue.and.returnValue(throwError(() => new Error('boom')));

    await comp.loadPlaylist();

    expect(console.error).toHaveBeenCalled();
  });

  it('onSearch sets the search query from the input value', async () => {
    const event = { target: { value: 'song a' } } as unknown as Event;

    await comp.onSearch(event);

    expect(comp.searchQuery()).toBe('song a');
  });

  describe('toggleVote', () => {
    const song = () => comp.tracks().find(t => t.uri === 'uri-x');

    beforeEach(() => {
      comp.tracks.set([{ uri: 'uri-x', name: 'X', artists: [], likeCount: 2, hasVoted: false }]);
    });

    it('fills the heart and counts up before the server answers', () => {
      const reply = new Subject<any>();
      spotifyService.toggleVote.and.returnValue(reply);

      comp.toggleVote(song());

      expect(song().hasVoted).toBe(true);
      expect(song().likeCount).toBe(3);
      expect(comp.bumpedUris().has('uri-x')).toBe(true);
    });

    it('lets a liked song be un-liked optimistically', () => {
      comp.tracks.set([{ uri: 'uri-x', name: 'X', artists: [], likeCount: 3, hasVoted: true }]);
      spotifyService.toggleVote.and.returnValue(new Subject<any>());

      comp.toggleVote(song());

      expect(song().hasVoted).toBe(false);
      expect(song().likeCount).toBe(2);
    });

    it('takes the server reply as the final state', async () => {
      spotifyService.toggleVote.and.returnValue(of({ liked: true, likeCount: 5 }));

      await comp.toggleVote(song());

      expect(song().hasVoted).toBe(true);
      expect(song().likeCount).toBe(5);
    });

    it('reverts and shows a message when the vote fails', async () => {
      spyOn(console, 'error');
      spotifyService.toggleVote.and.returnValue(throwError(() => new Error('boom')));

      await comp.toggleVote(song());

      expect(song().hasVoted).toBe(false);
      expect(song().likeCount).toBe(2);
      expect(feedback.show).toHaveBeenCalledWith('Das Liken hat nicht geklappt. Versuch es nochmal.', 'error');
    });

    it('ignores a second tap while the first request is pending', () => {
      spotifyService.toggleVote.and.returnValue(new Subject<any>());

      comp.toggleVote(song());
      comp.toggleVote(song());

      expect(spotifyService.toggleVote).toHaveBeenCalledTimes(1);
      expect(song().hasVoted).toBe(true);
      expect(song().likeCount).toBe(3);
    });

    it('keeps the optimistic state when a live reload arrives during the request', async () => {
      spotifyService.toggleVote.and.returnValue(new Subject<any>());
      spotifyService.getQueue.and.returnValue(of({ queue: [{ uri: 'uri-x', name: 'X', artists: [], likeCount: 2, hasVoted: false }] }));

      comp.toggleVote(song());
      await comp.loadPlaylist();

      expect(song().hasVoted).toBe(true);
      expect(song().likeCount).toBe(3);
    });
  });

  it('ngOnInit opens an EventSource for live updates including the party id', async () => {
    spotifyService.getQueue.and.returnValue(of({ queue: [] }));

    comp.ngOnInit();

    expect((comp as any).eventSource).toBeInstanceOf(EventSource);
    expect((comp as any).eventSource.url).toContain('/api/spotify/events?source=web&partyId=party-1');
  });

  it('navigates home when a party-ended event is received', async () => {
    spotifyService.getQueue.and.returnValue(of({ queue: [] }));
    comp.ngOnInit();

    (comp as any).eventSource.onmessage({ data: JSON.stringify({ type: 'party-ended' }) });

    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('reloads the playlist when a queue-updated event is received', async () => {
    spotifyService.getQueue.and.returnValue(of({ queue: [{ name: 'New Song', artists: [] }] }));
    comp.ngOnInit();
    spotifyService.getQueue.calls.reset();

    (comp as any).eventSource.onmessage({ data: JSON.stringify({ type: 'queue-updated' }) });

    expect(spotifyService.getQueue).toHaveBeenCalled();
  });

  it('ignores malformed event data', async () => {
    spotifyService.getQueue.and.returnValue(of({ queue: [] }));
    comp.ngOnInit();

    expect(() => (comp as any).eventSource.onmessage({ data: 'not-json' })).not.toThrow();
  });

  it('ngOnDestroy closes the event source', async () => {
    spotifyService.getQueue.and.returnValue(of({ queue: [] }));
    comp.ngOnInit();
    const eventSource = (comp as any).eventSource;
    spyOn(eventSource, 'close');

    comp.ngOnDestroy();

    expect(eventSource.close).toHaveBeenCalled();
  });
});
