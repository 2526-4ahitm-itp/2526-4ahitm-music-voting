import { TestBed } from '@angular/core/testing';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { GUEST_THEME_KEY, THEME_KEY } from './shared/theme.service';
import { App } from './app';

@Component({ standalone: true, template: '' })
class Blank {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          { path: 'voting', component: Blank },
          { path: 'dashboard', component: Blank },
        ]),
      ],
    }).compileComponents();
  });

  it('creates the app component', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders a router outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });

  it('declares German as the document language', () => {
    document.documentElement.lang = 'en';
    TestBed.createComponent(App);

    expect(document.documentElement.lang).toBe('de');
  });

  it('applies the guest choice on guest pages and the host choice elsewhere', async () => {
    localStorage.setItem(THEME_KEY, 'dark');
    localStorage.setItem(GUEST_THEME_KEY, 'light');
    try {
      TestBed.createComponent(App);
      const router = TestBed.inject(Router);

      await router.navigateByUrl('/voting');
      expect(document.documentElement.dataset['theme']).toBe('light');

      await router.navigateByUrl('/dashboard');
      expect(document.documentElement.dataset['theme']).toBe('dark');
    } finally {
      localStorage.removeItem(THEME_KEY);
      localStorage.removeItem(GUEST_THEME_KEY);
      document.documentElement.dataset['theme'] = 'dark';
    }
  });
});
