import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { MvHostMenu } from './mv-host-menu';
import { PartyService } from '../services/party.service';

describe('MvHostMenu', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MvHostMenu],
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient()],
    }).compileComponents();
    TestBed.inject(PartyService).setCurrentPartyId('party-1');
  });

  function create(active = 'dashboard') {
    const fixture = TestBed.createComponent(MvHostMenu);
    fixture.componentRef.setInput('active', active);
    fixture.detectChanges();
    return fixture;
  }

  it('lists Dashboard, Voting, Suchen and Blacklist but not Startseite', () => {
    const fixture = create();
    const labels = Array.from(fixture.nativeElement.querySelectorAll('nav a')).map((a: any) => a.textContent.trim());

    expect(labels).toEqual(['Dashboard', 'Voting', 'Suchen', 'Blacklist']);
  });

  it('links Blacklist to the edit mode of the blacklist page for the current party', () => {
    const fixture = create();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelectorAll('nav a')[3];

    expect(link.getAttribute('href')).toBe('/select-blacklist?partyId=party-1&mode=edit');
  });

  it('marks the active page with aria-current', () => {
    const fixture = create('search');
    const current = fixture.nativeElement.querySelector('[aria-current="page"]');

    expect(current.textContent.trim()).toBe('Suchen');
  });

  it('opens with a labelled burger button and closes on Escape', () => {
    const fixture = create();
    const burger: HTMLButtonElement = fixture.nativeElement.querySelector('button.burger');
    expect(burger.getAttribute('aria-label')).toBe('Menü öffnen');

    burger.click();
    fixture.detectChanges();
    expect(burger.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('.panel.open')).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.panel.open')).toBeNull();
  });

  it('moves focus into the panel on open and back to the burger on Escape (WCAG 2.4.3)', async () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    const burger = root.querySelector('button.burger') as HTMLButtonElement;

    burger.focus();
    burger.click();
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('button.close'));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(root.querySelector('nav')!.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(burger);
  });

  it('returns focus to the burger when closed with the close button', async () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    const burger = root.querySelector('button.burger') as HTMLButtonElement;

    burger.click();
    await fixture.whenStable();
    (root.querySelector('button.close') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(document.activeElement).toBe(burger);
  });
});
