import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MvThemeToggle } from './mv-theme-toggle';
import { THEME_KEY, ThemeService } from './theme.service';

describe('MvThemeToggle', () => {
  beforeEach(async () => {
    localStorage.removeItem(THEME_KEY);
    await TestBed.configureTestingModule({
      imports: [MvThemeToggle],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem(THEME_KEY);
    document.documentElement.dataset['theme'] = 'dark';
  });

  it('is a labelled switch that turns light mode on and off', () => {
    const fixture = TestBed.createComponent(MvThemeToggle);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(button.getAttribute('role')).toBe('switch');
    expect(button.getAttribute('aria-label')).toBe('Heller Modus');
    expect(button.getAttribute('aria-checked')).toBe('false');

    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(TestBed.inject(ThemeService).theme()).toBe('light');

    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('false');
  });

  it('shows only an icon and a tooltip naming the mode it switches to', () => {
    const fixture = TestBed.createComponent(MvThemeToggle);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    // No visible text at any width: the label only exists as aria-label.
    expect(button.textContent?.trim()).toBe('');
    expect(button.querySelector('svg')).not.toBeNull();
    expect(button.title).toBe('Hellen Modus einschalten');

    button.click();
    fixture.detectChanges();
    expect(button.textContent?.trim()).toBe('');
    expect(button.title).toBe('Dunklen Modus einschalten');
  });

  it('is a 44 px touch target', () => {
    const fixture = TestBed.createComponent(MvThemeToggle);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    const rect = (fixture.nativeElement.querySelector('button') as HTMLElement).getBoundingClientRect();
    expect(rect.width).toBe(44);
    expect(rect.height).toBe(44);
    fixture.nativeElement.remove();
  });
});
