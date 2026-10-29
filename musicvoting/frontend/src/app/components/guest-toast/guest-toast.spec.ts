import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { GuestToast } from './guest-toast';
import { GuestFeedbackService } from '../../services/guest-feedback';

describe('GuestToast', () => {
  let feedback: GuestFeedbackService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GuestToast],
      providers: [provideZonelessChangeDetection()],
    });
    feedback = TestBed.inject(GuestFeedbackService);
  });

  afterEach(() => feedback.clear());

  it('keeps an empty live region when there is no message', async () => {
    const fixture = TestBed.createComponent(GuestToast);
    await fixture.whenStable();
    const region: HTMLElement = fixture.nativeElement.querySelector('[role="status"]');

    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.querySelector('.toast')).toBeNull();
  });

  it('renders the current message and marks errors', async () => {
    const fixture = TestBed.createComponent(GuestToast);
    feedback.show('Song ist schon in der Warteschlange.', 'error');
    await fixture.whenStable();
    const toast: HTMLElement = fixture.nativeElement.querySelector('.toast');

    expect(toast.textContent).toContain('Song ist schon in der Warteschlange.');
    expect(toast.classList).toContain('toast-error');
  });
});
