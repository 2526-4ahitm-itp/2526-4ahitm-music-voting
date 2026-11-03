import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { MvPartyEnded } from './mv-party-ended';

describe('MvPartyEnded', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MvPartyEnded],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();
  });

  it('thanks the guest and announces the end', () => {
    const fixture = TestBed.createComponent(MvPartyEnded);
    fixture.detectChanges();

    expect(fixture.nativeElement.getAttribute('role')).toBe('alert');
    expect(fixture.nativeElement.textContent).toContain('Die Party ist beendet.');
    expect(fixture.nativeElement.textContent).toContain('Danke fürs Mitfeiern!');
  });

  it('navigates to the start page on "Zur Startseite"', () => {
    const fixture = TestBed.createComponent(MvPartyEnded);
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button.home') as HTMLButtonElement).click();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
