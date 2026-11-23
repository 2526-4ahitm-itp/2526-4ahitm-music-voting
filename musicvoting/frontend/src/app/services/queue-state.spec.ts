import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { QueueStateService } from './queue-state';

describe('QueueStateService', () => {
  let spotify: { getQueue: jasmine.Spy };
  let party: { partyId$: BehaviorSubject<string | null>; readonly currentPartyId: string | null };

  beforeEach(() => {
    const partyId$ = new BehaviorSubject<string | null>('party-1');
    party = { partyId$, get currentPartyId() { return partyId$.getValue(); } };
  });

  function create(): QueueStateService {
    return new QueueStateService(spotify as any, party as any);
  }

  function currentValue(service: QueueStateService): Set<string> {
    let value!: Set<string>;
    service.inQueueUris$.subscribe(v => (value = v));
    return value;
  }

  it('populates inQueueUris with track uris from the queue on construction', () => {
    spotify = {
      getQueue: jasmine.createSpy('getQueue').and.returnValue(
        of({ queue: [{ uri: 'spotify:track:a' }, { uri: 'spotify:track:b' }] })
      ),
    };

    const service = create();

    expect(currentValue(service)).toEqual(new Set(['spotify:track:a', 'spotify:track:b']));
  });

  it('treats a missing or non-array queue as empty', () => {
    spotify = {
      getQueue: jasmine.createSpy('getQueue').and.returnValue(of({})),
    };

    const service = create();

    expect(currentValue(service)).toEqual(new Set());
  });

  it('refresh replaces the previous set with the latest queue contents', () => {
    spotify = {
      getQueue: jasmine.createSpy('getQueue').and.returnValue(
        of({ queue: [{ uri: 'spotify:track:a' }] })
      ),
    };
    const service = create();
    expect(currentValue(service)).toEqual(new Set(['spotify:track:a']));

    spotify.getQueue.and.returnValue(of({ queue: [{ uri: 'spotify:track:c' }] }));
    service.refresh();

    expect(currentValue(service)).toEqual(new Set(['spotify:track:c']));
  });

  it('logs an error and keeps the previous set when the queue request fails', () => {
    spotify = {
      getQueue: jasmine.createSpy('getQueue').and.returnValue(
        of({ queue: [{ uri: 'spotify:track:a' }] })
      ),
    };
    const service = create();
    expect(currentValue(service)).toEqual(new Set(['spotify:track:a']));

    spyOn(console, 'error');
    spotify.getQueue.and.returnValue(throwError(() => new Error('boom')));
    service.refresh();

    expect(console.error).toHaveBeenCalled();
    expect(currentValue(service)).toEqual(new Set(['spotify:track:a']));
  });

  it('clears the old party\'s songs and reloads when the guest joins another party', () => {
    spotify = {
      getQueue: jasmine.createSpy('getQueue').and.returnValue(
        of({ queue: [{ uri: 'spotify:track:old' }] })
      ),
    };
    const service = create();
    expect(currentValue(service)).toEqual(new Set(['spotify:track:old']));

    spotify.getQueue.and.returnValue(of({ queue: [{ uri: 'spotify:track:new' }] }));
    party.partyId$.next('party-2');

    expect(spotify.getQueue).toHaveBeenCalledTimes(2);
    expect(currentValue(service)).toEqual(new Set(['spotify:track:new']));
  });

  it('is empty right after switching party, before the new queue has loaded', () => {
    spotify = {
      getQueue: jasmine.createSpy('getQueue').and.returnValue(
        of({ queue: [{ uri: 'spotify:track:old' }] })
      ),
    };
    const service = create();

    spotify.getQueue.and.returnValue(new Subject());
    party.partyId$.next('party-2');

    expect(currentValue(service)).toEqual(new Set());
  });

  it('ignores a late queue response for a party that was already left', () => {
    const pending = new Subject<any>();
    spotify = { getQueue: jasmine.createSpy('getQueue').and.returnValue(pending) };
    const service = create();

    spotify.getQueue.and.returnValue(of({ queue: [{ uri: 'spotify:track:new' }] }));
    party.partyId$.next('party-2');
    pending.next({ queue: [{ uri: 'spotify:track:old' }] });

    expect(currentValue(service)).toEqual(new Set(['spotify:track:new']));
  });

  it('does not reload when the same party id is emitted again', () => {
    spotify = {
      getQueue: jasmine.createSpy('getQueue').and.returnValue(of({ queue: [] })),
    };
    create();

    party.partyId$.next('party-1');

    expect(spotify.getQueue).toHaveBeenCalledTimes(1);
  });
});
