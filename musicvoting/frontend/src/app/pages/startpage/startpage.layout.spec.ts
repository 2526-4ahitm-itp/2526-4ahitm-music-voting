import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { Startpage } from './startpage';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { COVER_PLACEHOLDER } from '../../shared/mv-cover';

/**
 * DOM tests for the TV layout (dashboard spec "Persistent Dashboard
 * Elements", "Dashboard Shows a Guest-Facing Empty State", "Dashboard Cover
 * Images Never Break"). ngOnInit is stubbed because it starts the Spotify SDK
 * and SSE; the playback logic is covered in startpage.spec.ts.
 */
describe('Startpage layout (TV)', () => {
  let fixture: ComponentFixture<Startpage>;
  let comp: Startpage;
  let frame: HTMLDivElement;

  const track = (i: number, likes = 0) => ({
    id: `t${i}`,
    uri: `spotify:track:${i}`,
    name: `Song ${i}`,
    artists: [{ name: `Artist ${i}` }],
    album: { images: [{ url: `big${i}.jpg` }, { url: `small${i}.jpg` }] },
    likeCount: likes,
  });

  beforeEach(async () => {
    spyOn(Startpage.prototype, 'ngOnInit').and.resolveTo();
    const spotify = {
      disconnectPlayer: () => Promise.resolve(),
      getPlayerStatus: () => NEVER,
      getQueueUpdates: () => NEVER,
      getQueue: () => of({ queue: [] }),
    };

    await TestBed.configureTestingModule({
      imports: [Startpage],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SpotifyWebPlayerService, useValue: spotify },
      ],
    }).compileComponents();

    // Fixed full-window frame so the stage is laid out like a fullscreen TV page.
    frame = document.createElement('div');
    frame.style.cssText = 'position:fixed;inset:0;';
    document.body.appendChild(frame);

    fixture = TestBed.createComponent(Startpage);
    frame.appendChild(fixture.nativeElement);
    comp = fixture.componentInstance;
    comp.pin = '47291';
    comp.qrUrl = '/api/party/p1/qr';
  });

  afterEach(() => {
    fixture.destroy();
    frame.remove();
  });

  function q(sel: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(sel);
  }

  it('shows QR code, Voting-PIN, current song, progress and queue at the same time', () => {
    comp.currentTrack = track(0);
    comp.tracks = [track(1, 3), track(2, 1)];
    fixture.detectChanges();

    expect(q('img.qr')?.getAttribute('src')).toBe('/api/party/p1/qr');
    expect(q('.pin-label')?.textContent).toContain('Voting-PIN');
    expect(q('.pin-value')?.textContent?.trim()).toBe('47291');
    expect(q('.now-title')?.textContent?.trim()).toBe('Song 0');
    expect(q('.progress-bar')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.queue-list .row').length).toBe(2);
  });

  it('shows the like count of every queue entry, including 0', () => {
    comp.currentTrack = track(0);
    comp.tracks = [track(1, 4), track(2, 0)];
    fixture.detectChanges();

    const counts = Array.from(fixture.nativeElement.querySelectorAll('.row-likes-count')).map(
      (el: any) => el.textContent.trim(),
    );
    expect(counts).toEqual(['4', '0']);
  });

  it('shows only the top 5 entries and "+ N weitere" for the rest', () => {
    comp.currentTrack = track(0);
    comp.tracks = Array.from({ length: 17 }, (_, i) => track(i + 1));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.queue-list .row').length).toBe(5);
    expect(q('.queue-more')?.textContent?.trim()).toBe('+ 12 weitere');
  });

  // vh-based sizes follow the browser window (Karma's ChromeHeadless is not
  // 1080px high), so sizes are checked relative to the window height: a
  // ratio of 32/1080 means >= 32px on a 1920x1080 TV, as the spec requires.
  const atTv = (px: number) => (px / window.innerHeight) * 1080;

  it('renders queue titles and likes at >= 32px and the title at >= 48px (scaled to 1080p)', () => {
    comp.currentTrack = track(0);
    comp.tracks = [track(1, 2)];
    fixture.detectChanges();

    const px = (sel: string) => parseFloat(getComputedStyle(q(sel)!).fontSize);
    expect(atTv(px('.row-title'))).toBeGreaterThanOrEqual(32);
    expect(atTv(px('.row-likes-count'))).toBeGreaterThanOrEqual(32);
    expect(atTv(px('.now-title'))).toBeGreaterThanOrEqual(48);
  });

  it('shows all 5 queue rows fully and keeps "+ N weitere" on screen', () => {
    comp.currentTrack = track(0);
    comp.tracks = Array.from({ length: 9 }, (_, i) => track(i + 1, 9 - i));
    fixture.detectChanges();

    const list = q('.queue-list')!.getBoundingClientRect();
    const rows = fixture.nativeElement.querySelectorAll('.queue-list .row');
    expect(rows.length).toBe(5);
    expect((rows[4] as HTMLElement).getBoundingClientRect().bottom).toBeLessThanOrEqual(list.bottom + 0.5);
    expect(q('.queue-more')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
  });

  it('keeps the cover >= 40% of the screen height and the QR code >= 25% but smaller than the cover', () => {
    comp.currentTrack = track(0);
    comp.tracks = [track(1)];
    fixture.detectChanges();

    const cover = q('.now-cover')!.getBoundingClientRect();
    const qr = q('img.qr')!.getBoundingClientRect();
    expect(cover.height).toBeGreaterThanOrEqual(window.innerHeight * 0.4 - 1);
    expect(qr.height).toBeGreaterThanOrEqual(window.innerHeight * 0.25);
    expect(qr.height).toBeLessThan(cover.height);
  });

  it('addresses guests, not the host, when nothing is playing and the queue is empty', () => {
    comp.currentTrack = null;
    comp.tracks = [];
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Scan den Code und wünsch dir den ersten Song!');
    expect(text).not.toContain('Dashboard');
    expect(text).not.toContain('Host');
    expect(q('img.qr')).toBeTruthy();
    expect(q('.pin-value')?.textContent?.trim()).toBe('47291');
  });

  it('shows the placeholder when the current track has an empty images array', () => {
    comp.currentTrack = { ...track(0), album: { images: [] } };
    fixture.detectChanges();

    expect(q('.now-cover img')?.getAttribute('src')).toBe(COVER_PLACEHOLDER);
    expect(q('.now-title')?.textContent?.trim()).toBe('Song 0');
  });

  it('uses no gradient-filled text', () => {
    comp.currentTrack = track(0);
    comp.tracks = [track(1)];
    fixture.detectChanges();

    const clipped = Array.from(fixture.nativeElement.querySelectorAll('*')).filter((el: any) => {
      const style = getComputedStyle(el);
      return style.backgroundClip === 'text' || (style as any).webkitBackgroundClip === 'text';
    });
    expect(clipped.length).toBe(0);
  });

  it('shows the HTL credit as a footer line', () => {
    fixture.detectChanges();

    expect(q('mv-credit-footer')?.textContent).toContain('powered by');
  });
});
