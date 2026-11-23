import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MvToast } from './mv-toast';
import { ToastService } from './toast.service';

describe('MvToast / ToastService', () => {
  let service: ToastService;

  beforeEach(async () => {
    jasmine.clock().install();
    await TestBed.configureTestingModule({
      imports: [MvToast],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    service = TestBed.inject(ToastService);
  });

  afterEach(() => jasmine.clock().uninstall());

  it('renders an info toast in the polite live region and hides it after the duration', () => {
    const fixture = TestBed.createComponent(MvToast);
    fixture.detectChanges();

    service.show('Song hinzugefügt', { durationMs: 2000 });
    fixture.detectChanges();
    const polite: HTMLElement = fixture.nativeElement.querySelector('[aria-live="polite"]');
    expect(polite.textContent).toContain('Song hinzugefügt');

    jasmine.clock().tick(2001);
    fixture.detectChanges();
    expect(polite.textContent?.trim()).toBe('');
  });

  it('renders errors in the alert region', () => {
    const fixture = TestBed.createComponent(MvToast);
    fixture.detectChanges();

    service.error('Song ist schon in der Warteschlange.');
    fixture.detectChanges();

    const alert: HTMLElement = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert.textContent).toContain('Song ist schon in der Warteschlange.');
  });

  it('runs the action and skips the expiry callback', () => {
    const fixture = TestBed.createComponent(MvToast);
    fixture.detectChanges();
    const onAction = jasmine.createSpy('onAction');
    const onExpire = jasmine.createSpy('onExpire');

    service.show('Song entfernt', { actionLabel: 'Rückgängig', onAction, onExpire, durationMs: 5000 });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button.action') as HTMLButtonElement).click();
    jasmine.clock().tick(6000);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onExpire).not.toHaveBeenCalled();
    expect(service.current()).toBeNull();
  });

  it('calls onExpire when the toast times out', () => {
    const onExpire = jasmine.createSpy('onExpire');
    service.show('Song entfernt', { onExpire, durationMs: 5000 });

    jasmine.clock().tick(5001);

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  // Guest spec "Guest Confirmations Stand Out".
  it('shows confirmations as a filled brand-colour card with an icon and bold text', () => {
    const fixture = TestBed.createComponent(MvToast);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();

    service.show('Geliked – jetzt auf Platz 2', { durationMs: 1500, icon: 'heart' });
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.toast') as HTMLElement;
    const style = getComputedStyle(card);

    expect(card.querySelector('.badge svg')).not.toBeNull();
    expect(style.backgroundColor).toBe('rgb(132, 3, 166)');
    expect(parseFloat(style.fontWeight)).toBeGreaterThanOrEqual(700);
    expect(parseFloat(style.fontSize)).toBeGreaterThanOrEqual(17);
    fixture.nativeElement.remove();
  });

  it('has no icon when none is given', () => {
    const fixture = TestBed.createComponent(MvToast);
    fixture.detectChanges();

    service.show('Song hinzugefügt', { durationMs: 2000 });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.badge')).toBeNull();
  });
});
