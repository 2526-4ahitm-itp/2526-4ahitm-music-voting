import { Startpage } from './startpage';

// This project runs zoneless (no zone-testing.js), so fakeAsync is unavailable —
// the timer tests use real setInterval and await one tick.
const oneTick = () => new Promise((r) => setTimeout(r, 1100));

/**
 * Verifies the progress-bar fix: the bar must follow the Spotify Web Playback
 * SDK's real position/duration (via getCurrentState) instead of drifting on a
 * local +1000ms timer, and the percentage must be measured against the SDK
 * duration when available.
 *
 * The component is constructed directly with stubs so the test exercises the
 * progress logic alone — no template, HTTP, SSE or Spotify OAuth required.
 */
describe('Startpage progress bar', () => {
  let spotifyService: { getCurrentState: jasmine.Spy };
  let comp: Startpage;

  beforeEach(() => {
    spotifyService = { getCurrentState: jasmine.createSpy('getCurrentState') };
    const ngZone: any = { run: (fn: () => void) => fn() };
    const cd: any = { detectChanges: () => {} };
    comp = new Startpage(
      spotifyService as any,
      ngZone,
      null as any, // http — unused by progress logic
      cd,
      null as any, // partyService
      null as any, // route
      null as any, // router
    );
  });

  afterEach(() => comp.stopProgressTimer());

  it('measures progress against the SDK duration, not the queue metadata', () => {
    comp.currentDuration = 200_000;            // SDK truth
    comp.currentTrack = { duration_ms: 180_000 }; // stale queue metadata
    comp.currentPosition = 100_000;

    comp.updateProgressPercent();

    expect(comp.progressPercent).toBe(50); // 100k / 200k — not 55.5 from 180k
  });

  it('falls back to queue metadata before the first SDK state arrives', () => {
    comp.currentDuration = 0;
    comp.currentTrack = { duration_ms: 200_000 };
    comp.currentPosition = 50_000;

    comp.updateProgressPercent();

    expect(comp.progressPercent).toBe(25);
  });

  it('clamps the progress bar at 100%', () => {
    comp.currentDuration = 100_000;
    comp.currentPosition = 999_999;

    comp.updateProgressPercent();

    expect(comp.progressPercent).toBe(100);
  });

  it('re-syncs position from the SDK each tick instead of drifting +1000ms', async () => {
    spotifyService.getCurrentState.and.resolveTo({
      position: 42_000,
      duration: 200_000,
      paused: false,
    });
    comp.currentPosition = 0;

    comp.startProgressTimer();
    await oneTick();
    comp.stopProgressTimer();

    expect(spotifyService.getCurrentState).toHaveBeenCalled();
    expect(comp.currentPosition).toBe(42_000); // real SDK position, not 0 + 1000
    expect(comp.currentDuration).toBe(200_000);
    expect(comp.progressPercent).toBe(21);
  });

  it('interpolates locally only when the SDK returns no state', async () => {
    spotifyService.getCurrentState.and.resolveTo(null);
    comp.currentPosition = 5_000;
    comp.currentDuration = 200_000;

    comp.startProgressTimer();
    await oneTick();
    comp.stopProgressTimer();

    expect(comp.currentPosition).toBe(6_000); // fallback +1000ms
  });

  // The reported bug: an auto-filled song ends, the web player stops being the active
  // device, so the SDK emits no end event AND getCurrentState() returns null — the next
  // song just shows up paused. The progress timer must still advance via elapsed time.
  it('advances when the SDK goes silent and elapsed time reaches the duration', async () => {
    const playNext = spyOn(comp, 'playNext').and.resolveTo(undefined);
    // A track was playing and is now ~1s from its end...
    (comp as any).playingUri = 'spotify:track:song2';
    (comp as any).sawPlaybackForUri = true;
    (comp as any).endHandledForUri = false;
    comp.currentDuration = 200_000;
    comp.currentPosition = 199_000;
    // ...and the SDK has gone completely silent (web player no longer the active device).
    spotifyService.getCurrentState.and.resolveTo(null);

    comp.startProgressTimer();
    await oneTick(); // 199_000 -> 200_000, reaches the duration
    comp.stopProgressTimer();

    expect(playNext).toHaveBeenCalledTimes(1);
  });
});
