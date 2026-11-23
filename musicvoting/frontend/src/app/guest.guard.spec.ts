import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { guestGuard } from './guest.guard';
import { PartyService } from './services/party.service';

describe('guestGuard', () => {
  let partyService: { currentPartyId: string | null };
  let codeTree: UrlTree;
  let router: { createUrlTree: jasmine.Spy };

  beforeEach(() => {
    partyService = { currentPartyId: null };
    codeTree = {} as UrlTree;
    router = { createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue(codeTree) };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PartyService, useValue: partyService },
        { provide: Router, useValue: router },
      ],
    });
  });

  function run() {
    return TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));
  }

  it('allows the guest view when a party is stored', () => {
    partyService.currentPartyId = 'party-1';

    expect(run()).toBe(true);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects to the code entry when no party is stored', () => {
    expect(run()).toBe(codeTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/code']);
  });
});
