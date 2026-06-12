import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, throwError } from 'rxjs';
import { HostOptions } from './host-options';
import { PartyService } from '../../services/party.service';

describe('HostOptions', () => {
  let router: { navigate: jasmine.Spy };
  let partyService: { resolveHostPin: jasmine.Spy };
  let comp: HostOptions;

  beforeEach(() => {
    router = { navigate: jasmine.createSpy('navigate') };
    partyService = { resolveHostPin: jasmine.createSpy('resolveHostPin') };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: Router, useValue: router },
        { provide: PartyService, useValue: partyService },
      ],
    });

    comp = TestBed.runInInjectionContext(() => new HostOptions());
  });

  it('goCreateParty navigates to /create-party', () => {
    comp.goCreateParty();

    expect(router.navigate).toHaveBeenCalledWith(['/create-party']);
  });

  it('showPinEntry resets pin and error and sets the mode', () => {
    comp.error.set('previous error');

    comp.showPinEntry('pin-dashboard');

    expect(comp.pin()).toBe('');
    expect(comp.error()).toBeNull();
    expect(comp.mode()).toBe('pin-dashboard');
  });

  it('backToMenu resets to the menu and clears the error', () => {
    comp.mode.set('pin-startpage');
    comp.error.set('previous error');

    comp.backToMenu();

    expect(comp.mode()).toBe('menu');
    expect(comp.error()).toBeNull();
  });

  it('submitPin does nothing for an empty pin', async () => {
    comp.pin.set('   ');

    await comp.submitPin();

    expect(partyService.resolveHostPin).not.toHaveBeenCalled();
  });

  it('submitPin navigates to /dashboard on success when mode is pin-dashboard', async () => {
    comp.mode.set('pin-dashboard');
    comp.pin.set('12345');
    partyService.resolveHostPin.and.returnValue(of({}));

    await comp.submitPin();

    expect(partyService.resolveHostPin).toHaveBeenCalledWith('12345');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(comp.isLoading()).toBe(false);
  });

  it('submitPin navigates to /startpage on success when mode is pin-startpage', async () => {
    comp.mode.set('pin-startpage');
    comp.pin.set('12345');
    partyService.resolveHostPin.and.returnValue(of({}));

    await comp.submitPin();

    expect(router.navigate).toHaveBeenCalledWith(['/startpage']);
  });

  it('submitPin sets a not-found error on a 404 response', async () => {
    comp.pin.set('12345');
    partyService.resolveHostPin.and.returnValue(throwError(() => ({ status: 404 })));

    await comp.submitPin();

    expect(comp.error()).toBe('Party nicht gefunden. Bitte überprüfe den PIN.');
    expect(comp.isLoading()).toBe(false);
  });

  it('submitPin sets a generic error for other failures', async () => {
    comp.pin.set('12345');
    partyService.resolveHostPin.and.returnValue(throwError(() => ({ status: 500 })));

    await comp.submitPin();

    expect(comp.error()).toBe('Fehler beim Laden der Party. Bitte versuche es erneut.');
  });

  it('goBack navigates to home', () => {
    comp.goBack();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
