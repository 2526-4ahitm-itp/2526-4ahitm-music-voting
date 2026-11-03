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
});
