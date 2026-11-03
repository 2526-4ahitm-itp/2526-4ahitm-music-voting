import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MvGuestTabs } from './mv-guest-tabs';

describe('MvGuestTabs', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MvGuestTabs],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();
  });

  it('has exactly "Voten" and "Hinzufügen" linking to /voting and /guest', () => {
    const fixture = TestBed.createComponent(MvGuestTabs);
    fixture.componentRef.setInput('active', 'voting');
    fixture.detectChanges();
    const links: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('a'));

    expect(links.map((a) => a.textContent?.trim())).toEqual(['Voten', 'Hinzufügen']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/voting', '/guest']);
  });

  it('marks the current tab', () => {
    const fixture = TestBed.createComponent(MvGuestTabs);
    fixture.componentRef.setInput('active', 'add');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-current="page"]').textContent.trim()).toBe('Hinzufügen');
  });
});
