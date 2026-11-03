import { TestBed, ComponentFixture } from '@angular/core/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PartyReady } from './party-ready';
import { PartyService } from '../../services/party.service';

/**
 * DOM tests for the go-live step (host spec "Host Setup Ends with a Go-Live
 * Step"). Polling uses jasmine.clock so the device switch is deterministic.
 */
describe('PartyReady', () => {
  let httpMock: HttpTestingController;
  let router: { navigate: jasmine.Spy };
  let partyService: any;
  let routePartyId: string | null;

  const CURRENT = '/api/party/party-x/track/current';

  beforeEach(() => {
    router = { navigate: jasmine.createSpy('navigate') };
    routePartyId = 'party-x';
    partyService = {
      currentPartyId: 'party-x',
      currentPin: '11111',
      setCurrentPartyId: jasmine.createSpy('setCurrentPartyId'),
      getParty: jasmine.createSpy('getParty').and.returnValue(of({ pin: '47291' })),
    };
    TestBed.configureTestingModule({
      imports: [PartyReady],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Router, useValue: router },
        { provide: PartyService, useValue: partyService },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => routePartyId } } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Renders the page and answers the first device check. */
  async function create(deviceActive: boolean): Promise<ComponentFixture<PartyReady>> {
    const fixture = TestBed.createComponent(PartyReady);
    fixture.detectChanges(); // ngOnInit
    await Promise.resolve();
    httpMock.expectOne(CURRENT).flush({ deviceActive });
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function text(fixture: ComponentFixture<PartyReady>): string {
    return fixture.nativeElement.textContent;
  }

  it('shows the heading, the explanation, the player button, the separate-device hint and the Voting-PIN', async () => {
    const fixture = await create(false);

    expect(text(fixture)).toContain('Deine Party ist bereit');
    expect(text(fixture)).toContain('Gerät, das am TV hängt');
    expect(fixture.nativeElement.querySelector('.open-player-btn').textContent).toContain('Player auf dem TV öffnen');
    expect(text(fixture)).toContain(
      'Anderes Gerät am TV? Öffne dort MusicVoting → Gastgeber → Gastgeber-PIN eingeben → Player öffnen.'
    );
    expect(text(fixture)).toContain('Voting-PIN');
    // The PIN refreshed from the backend replaces the stored one.
    expect(fixture.nativeElement.querySelector('.pin-value').textContent.trim()).toBe('47291');
    expect(text(fixture)).not.toContain('Party ist live');
    fixture.destroy();
  });

  it('keeps the stored PIN when loading the party fails', async () => {
    partyService.getParty.and.returnValue(throwError(() => ({ status: 500 })));
    const fixture = await create(false);

    expect(fixture.nativeElement.querySelector('.pin-value').textContent.trim()).toBe('11111');
    fixture.destroy();
  });

  it('shows "Party ist live 🎉" right away when a player is already registered', async () => {
    const fixture = await create(true);

    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Party ist live 🎉');
    // After going live the dashboard is the next step, so it carries the emphasis.
    expect(fixture.nativeElement.querySelector('.dashboard-btn').classList).toContain('primary');
    expect(fixture.nativeElement.querySelector('.open-player-btn').classList).not.toContain('primary');
  });

  it('polls until a player registers, then switches to live and stops polling', async () => {
    jasmine.clock().install();
    try {
      const fixture = await create(false);
      expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Warte auf den Player');

      jasmine.clock().tick(PartyReady.POLL_MS);
      httpMock.expectOne(CURRENT).flush({ deviceActive: false });
      await fixture.whenStable();

      jasmine.clock().tick(PartyReady.POLL_MS);
      httpMock.expectOne(CURRENT).flush({ deviceActive: true });
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Party ist live 🎉');

      // No further requests once live.
      jasmine.clock().tick(PartyReady.POLL_MS * 3);
      httpMock.expectNone(CURRENT);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('stops polling when the page is left', async () => {
    jasmine.clock().install();
    try {
      const fixture = await create(false);
      fixture.destroy();

      jasmine.clock().tick(PartyReady.POLL_MS * 3);
      httpMock.expectNone(CURRENT);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('"Player auf dem TV öffnen" opens the player for this party in a new window', async () => {
    const open = spyOn(window, 'open');
    const fixture = await create(true);

    (fixture.nativeElement.querySelector('.open-player-btn') as HTMLButtonElement).click();

    expect(open).toHaveBeenCalledWith('/startpage?partyId=party-x', '_blank');
  });

  it('"Zum Dashboard" navigates to the host dashboard', async () => {
    const fixture = await create(true);

    (fixture.nativeElement.querySelector('.dashboard-btn') as HTMLButtonElement).click();

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], { queryParams: { partyId: 'party-x' } });
  });

  it('uses the stage look with the theme switch and labelled controls', async () => {
    const fixture = await create(true);
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelector('.host-stage')).not.toBeNull();
    expect(root.querySelector('[role="switch"]')).not.toBeNull();
    expect(root.querySelectorAll('button button, button a, a button').length).toBe(0);
  });

  it('goes back to the start page when no party is known', () => {
    partyService.currentPartyId = null;
    routePartyId = null;
    const fixture = TestBed.createComponent(PartyReady);
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
    httpMock.expectNone(CURRENT);
  });
});
