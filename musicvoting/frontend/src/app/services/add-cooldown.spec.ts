import { AddCooldownService } from './add-cooldown';

/** Countdown after a 429 (guest spec "Web Guest Sees When Adding Is Possible Again"). */
describe('AddCooldownService', () => {
  let service: AddCooldownService;

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-11-24T20:00:00Z'));
    service = new AddCooldownService();
  });

  afterEach(() => {
    service.ngOnDestroy();
    jasmine.clock().uninstall();
  });

  it('is inactive before any rejection', () => {
    expect(service.secondsLeft()).toBe(0);
    expect(service.active()).toBeFalse();
  });

  it('starts at retryAfterSeconds and counts down every second', () => {
    service.start(30);
    expect(service.secondsLeft()).toBe(30);
    expect(service.active()).toBeTrue();

    jasmine.clock().tick(1000);
    expect(service.secondsLeft()).toBe(29);

    jasmine.clock().tick(9000);
    expect(service.secondsLeft()).toBe(20);
  });

  it('ends at 0 and is inactive again', () => {
    service.start(2);

    jasmine.clock().tick(2000);

    expect(service.secondsLeft()).toBe(0);
    expect(service.active()).toBeFalse();
  });

  it('a new rejection restarts the countdown with the new wait time', () => {
    service.start(10);
    jasmine.clock().tick(5000);

    service.start(30);

    expect(service.secondsLeft()).toBe(30);
    jasmine.clock().tick(30_000);
    expect(service.active()).toBeFalse();
  });

  it('falls back to 60 seconds without a usable wait time', () => {
    service.start(undefined);
    expect(service.secondsLeft()).toBe(AddCooldownService.FALLBACK_SECONDS);

    service.start(-5);
    expect(service.secondsLeft()).toBe(60);
  });

  it('rounds fractional seconds up', () => {
    service.start(4.2);
    expect(service.secondsLeft()).toBe(5);
  });
});
