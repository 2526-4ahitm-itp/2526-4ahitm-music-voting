import { HostDashboard } from './host-dashboard';

/**
 * Verifies the dashboard mirrors the /startpage player's progress bar from a
 * "progress" SSE event. Payload values arrive as strings (the backend
 * LoginEvent payload is Map<String,String>), so parsing + percentage math is
 * the logic under test. Constructed with stubs — no template, HTTP or SSE.
 */
describe('HostDashboard progress mirror', () => {
  let comp: HostDashboard;

  beforeEach(() => {
    const ngZone: any = { run: (fn: () => void) => fn() };
    const cd: any = { detectChanges: () => {} };
    comp = new HostDashboard(
      ngZone,
      null as any, // http
      cd,
      null as any, // partyService
      null as any, // spotifyService
      null as any, // route
      null as any, // router
    );
  });

  const applyProgress = (payload: any) => (comp as any).applyProgress(payload);

  it('mirrors a progress SSE payload (string values) into the bar', () => {
    applyProgress({ position: '60000', duration: '240000', paused: 'false' });

    expect(comp.currentPosition).toBe(60_000);
    expect(comp.currentDuration).toBe(240_000);
    expect(comp.progressPercent).toBe(25);
  });

  it('measures against the duration from the payload, not stale queue metadata', () => {
    comp.currentTrack = { duration_ms: 180_000 };

    applyProgress({ position: '100000', duration: '200000', paused: 'false' });

    expect(comp.progressPercent).toBe(50); // 100k / 200k — not 55.5 from 180k
  });

  it('clamps the mirrored bar at 100%', () => {
    applyProgress({ position: '999999', duration: '100000', paused: 'false' });

    expect(comp.progressPercent).toBe(100);
  });

  it('ignores an empty payload', () => {
    comp.currentPosition = 1234;

    applyProgress(null);

    expect(comp.currentPosition).toBe(1234);
  });
});
