import { HttpErrorResponse } from '@angular/common/http';
import { GuestFeedbackService, GUEST_FEEDBACK_DURATION_MS, addErrorMessage } from './guest-feedback';

describe('addErrorMessage', () => {
  it('maps 409 to the duplicate message', () => {
    expect(addErrorMessage(new HttpErrorResponse({ status: 409 }))).toBe('Song ist schon in der Warteschlange.');
  });

  it('maps 429 to the rate-limit message', () => {
    expect(addErrorMessage(new HttpErrorResponse({ status: 429 }))).toBe('Zu viele Anfragen — bitte kurz warten.');
  });

  it('maps other failures to a generic retry message', () => {
    expect(addErrorMessage(new HttpErrorResponse({ status: 500 }))).toBe('Das hat nicht geklappt. Versuch es nochmal.');
    expect(addErrorMessage(new Error('offline'))).toBe('Das hat nicht geklappt. Versuch es nochmal.');
  });
});

describe('GuestFeedbackService', () => {
  let service: GuestFeedbackService;

  beforeEach(() => {
    jasmine.clock().install();
    service = new GuestFeedbackService();
  });

  afterEach(() => jasmine.clock().uninstall());

  it('starts without a message', () => {
    expect(service.message()).toBeNull();
  });

  it('shows a message and hides it after the display duration', () => {
    service.show('Hallo', 'error');

    expect(service.message()).toEqual({ text: 'Hallo', kind: 'error' });

    jasmine.clock().tick(GUEST_FEEDBACK_DURATION_MS);

    expect(service.message()).toBeNull();
  });

  it('restarts the display duration when a new message arrives', () => {
    service.show('Erste');
    jasmine.clock().tick(GUEST_FEEDBACK_DURATION_MS - 100);
    service.show('Zweite');
    jasmine.clock().tick(200);

    expect(service.message()).toEqual({ text: 'Zweite', kind: 'info' });
  });

  it('clear hides the message immediately', () => {
    service.show('Weg damit');
    service.clear();

    expect(service.message()).toBeNull();
  });
});
