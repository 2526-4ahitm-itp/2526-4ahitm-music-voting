import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { VotingComp } from './voting-comp';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { PartyService } from '../../services/party.service';
import { ToastService } from '../../shared/toast.service';

/**
 * DOM tests for the vote button (voting spec "Optimistic Vote UI", "Likes
 * Are Togglable", "Voted State Is Highlighted, Not Disabled").
 */
describe('VotingComp voting (DOM)', () => {
  let fixture: ComponentFixture<VotingComp>;
  let comp: VotingComp;
  let voteResponse: Subject<any>;
  let spotify: { getQueue: jasmine.Spy; toggleVote: jasmine.Spy };

  const song = (uri: string, likeCount: number, hasVoted = false) => ({
    id: uri,
    uri,
    name: `Song ${uri}`,
    artists: [{ name: 'Artist' }],
    album: { images: [] },
    likeCount,
    hasVoted,
  });

  beforeEach(async () => {
    localStorage.removeItem('mv-welcome-party-1');
    voteResponse = new Subject<any>();
    spotify = {
      getQueue: jasmine.createSpy('getQueue').and.returnValue(of({ queue: [] })),
      toggleVote: jasmine.createSpy('toggleVote').and.callFake(() => voteResponse.asObservable()),
    };

    await TestBed.configureTestingModule({
      imports: [VotingComp],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: SpotifyWebPlayerService, useValue: spotify },
        { provide: PartyService, useValue: { currentPartyId: 'party-1', deviceId: 'device-1' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VotingComp);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  function show(...tracks: any[]) {
    comp.tracks.set(tracks);
    fixture.detectChanges();
  }

  function card(i = 0): HTMLElement {
    return fixture.nativeElement.querySelectorAll('.track-card')[i];
  }

  function button(i = 0): HTMLButtonElement {
    return card(i).querySelector('.vote-button') as HTMLButtonElement;
  }

  function count(i = 0): string {
    return (card(i).querySelector('.like-count')!.firstChild!.textContent ?? '').trim();
  }

  it('updates heart and count before the server answers', () => {
    show(song('a', 2));

    button().click();
    fixture.detectChanges();

    expect(count()).toBe('3');
    expect(button().getAttribute('aria-pressed')).toBe('true');
    expect(spotify.toggleVote).toHaveBeenCalledWith('a', 'device-1');
  });

  it('reverts to the previous state and shows an error when the request fails', async () => {
    show(song('a', 2));
    const toast = TestBed.inject(ToastService);

    button().click();
    voteResponse.error(new Error('500'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(count()).toBe('2');
    expect(button().getAttribute('aria-pressed')).toBe('false');
    expect(toast.current()?.kind).toBe('error');
  });

  it('keeps a liked card tappable and removes the like on the next tap', async () => {
    show(song('a', 3, true));

    button().click();
    fixture.detectChanges();

    expect(count()).toBe('2');
    expect(button().getAttribute('aria-pressed')).toBe('false');
    expect(getComputedStyle(card()).pointerEvents).not.toBe('none');
  });

  it('highlights a liked card instead of greying it out', () => {
    show(song('a', 1, true), song('b', 1, false));

    const liked = getComputedStyle(card(0));
    expect(card(0).classList).toContain('voted');
    expect(liked.filter).toBe('none');
    expect(liked.opacity).toBe('1');
    expect(liked.backgroundColor).not.toBe(getComputedStyle(card(1)).backgroundColor);
  });

  it('shows the count on every card, including 0', () => {
    show(song('a', 0));

    expect(count()).toBe('0');
  });

  it('labels the vote button by state for screen readers', () => {
    show(song('a', 1, true), song('b', 0, false));

    expect(button(0).getAttribute('aria-label')).toBe('Like entfernen');
    expect(button(0).getAttribute('aria-pressed')).toBe('true');
    expect(button(1).getAttribute('aria-label')).toBe('Song liken');
    expect(button(1).getAttribute('aria-pressed')).toBe('false');
  });

  it('ignores a second tap while the first vote is still in flight', () => {
    show(song('a', 2));

    button().click();
    fixture.detectChanges();
    button().click();

    expect(spotify.toggleVote).toHaveBeenCalledTimes(1);
  });

  it('keeps the optimistic state when a queue reload arrives before the server answers', async () => {
    show(song('a', 2));
    button().click();
    spotify.getQueue.and.returnValue(of({ queue: [song('a', 2, false)] }));

    await comp.loadPlaylist();
    fixture.detectChanges();

    expect(count()).toBe('3');
    expect(button().getAttribute('aria-pressed')).toBe('true');
  });

  it('uses the server numbers once the vote succeeds', async () => {
    show(song('a', 2));

    button().click();
    voteResponse.next({ likeCount: 5, liked: true });
    voteResponse.complete();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(count()).toBe('5');
  });

  it('shows the welcome once and not again after a reload', () => {
    expect(fixture.nativeElement.querySelector('.welcome-sheet')?.textContent).toContain('Du bist dabei!');

    (fixture.nativeElement.querySelector('.welcome-ok') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.welcome-sheet')).toBeNull();

    // A fresh component simulates a reload of /voting.
    const reloaded = TestBed.createComponent(VotingComp);
    reloaded.detectChanges();
    expect(reloaded.nativeElement.querySelector('.welcome-sheet')).toBeNull();
    reloaded.destroy();
  });

  it('shows the goodbye screen when the party ends', () => {
    comp.partyEnded.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mv-party-ended')?.textContent).toContain('Danke fürs Mitfeiern!');
  });
});
