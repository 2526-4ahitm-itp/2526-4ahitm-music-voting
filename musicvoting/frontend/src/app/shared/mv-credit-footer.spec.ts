import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MvCreditFooter } from './mv-credit-footer';

describe('MvCreditFooter', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MvCreditFooter],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  it('shows "powered by" with the HTL Leonding logo', () => {
    const fixture = TestBed.createComponent(MvCreditFooter);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('powered by');
    expect(fixture.nativeElement.querySelector('img').getAttribute('alt')).toBe('HTL Leonding');
  });

  it('switches to the dark tone for the TV stage', () => {
    const fixture = TestBed.createComponent(MvCreditFooter);
    fixture.componentRef.setInput('tone', 'dark');
    fixture.detectChanges();

    expect(fixture.nativeElement.classList).toContain('on-dark');
  });
});
