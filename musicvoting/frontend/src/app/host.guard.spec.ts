import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { hostGuard } from './host.guard';

describe('hostGuard', () => {
  let router: { navigate: jasmine.Spy };

  beforeEach(() => {
    localStorage.clear();
    router = { navigate: jasmine.createSpy('navigate') };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: Router, useValue: router },
      ],
    });
  });

  afterEach(() => localStorage.clear());

  it('allows activation when a host pin is stored', () => {
    localStorage.setItem('mv_party_host_pin', '12345');

    const result = TestBed.runInInjectionContext(() =>
      hostGuard({} as any, {} as any)
    );

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects to home and denies activation when no host pin is stored', () => {
    const result = TestBed.runInInjectionContext(() =>
      hostGuard({} as any, {} as any)
    );

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
