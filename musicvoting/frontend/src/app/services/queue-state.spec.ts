import { of, throwError } from 'rxjs';
import { QueueStateService } from './queue-state';

describe('QueueStateService', () => {
  let spotify: { getQueue: jasmine.Spy };

  function create(): QueueStateService {
    return new QueueStateService(spotify as any);
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
});
