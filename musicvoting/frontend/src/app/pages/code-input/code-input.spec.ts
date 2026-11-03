import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { CodeInput } from './code-input';
import { PartyService } from '../../services/party.service';

describe('CodeInput', () => {
  let fixture: ComponentFixture<CodeInput>;
  let comp: CodeInput;
  let router: { navigate: jasmine.Spy };
  let partyService: { resolvePin: jasmine.Spy };

  beforeEach(async () => {
    router = { navigate: jasmine.createSpy('navigate') };
    partyService = { resolvePin: jasmine.createSpy('resolvePin') };

    await TestBed.configureTestingModule({
      imports: [CodeInput],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {}, params: {} } } },
        { provide: PartyService, useValue: partyService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CodeInput);
    comp = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.nativeElement.remove();
  });

  function getInputs(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.code-container input'));
  }

  it('does not redirect when no pin is present in the route', () => {
    expect(router.navigate).not.toHaveBeenCalled();
    expect(partyService.resolvePin).not.toHaveBeenCalled();
  });

  it('moveFocus rejects non-numeric input and shows an error', () => {
    const inputs = getInputs();
    const event = { target: { value: 'a' } };

    comp.moveFocus(event, inputs[1]);

    expect(event.target.value).toBe('');
    expect(comp.showError).toBe(true);
    expect(comp.errorMessage).toBe('Nur Zahlen erlaubt!');
  });

  it('moveFocus moves focus to the next input on a single digit', () => {
    const inputs = getInputs();
    spyOn(inputs[1], 'focus');
    const event = { target: { value: '5' } };

    comp.moveFocus(event, inputs[1]);

    expect(inputs[1].focus).toHaveBeenCalled();
    expect(comp.showError).toBe(false);
  });

  it('handleDelete moves focus to the previous input on backspace when empty', () => {
    const inputs = getInputs();
    spyOn(inputs[0], 'focus');
    const event = { key: 'Backspace', target: inputs[1] } as unknown as KeyboardEvent;
    (inputs[1] as HTMLInputElement).value = '';

    comp.handleDelete(event, inputs[0]);

    expect(inputs[0].focus).toHaveBeenCalled();
  });

  it('checkCode joins the party and navigates to /voting on success', () => {
    partyService.resolvePin.and.returnValue(of({}));
    const inputs = getInputs();
    inputs.forEach((input, i) => (input.value = String(i + 1)));

    comp.checkCode({ target: inputs[4] });

    expect(partyService.resolvePin).toHaveBeenCalledWith('12345');
    expect(router.navigate).toHaveBeenCalledWith(['/voting']);
  });

  it('checkCode shows an error when the party is not found', () => {
    partyService.resolvePin.and.returnValue(throwError(() => new Error('not found')));
    const inputs = getInputs();
    inputs.forEach((input, i) => (input.value = String(i + 1)));

    comp.checkCode({ target: inputs[4] });

    expect(comp.showError).toBe(true);
    expect(comp.errorMessage).toBe('Party nicht gefunden.');
  });

  it('handlePaste distributes a valid pasted code and joins the party', () => {
    partyService.resolvePin.and.returnValue(of({}));
    const inputs = getInputs();
    const event = {
      preventDefault: () => {},
      clipboardData: { getData: () => '54321' },
    } as unknown as ClipboardEvent;

    comp.handlePaste(event);

    expect(inputs.map((i) => i.value)).toEqual(['5', '4', '3', '2', '1']);
    expect(partyService.resolvePin).toHaveBeenCalledWith('54321');
    expect(router.navigate).toHaveBeenCalledWith(['/voting']);
  });

  it('handlePaste rejects a non-numeric pasted code', () => {
    const event = {
      preventDefault: () => {},
      clipboardData: { getData: () => 'abcde' },
    } as unknown as ClipboardEvent;

    comp.handlePaste(event);

    expect(comp.showError).toBe(true);
    expect(comp.errorMessage).toBe('Nur Zahlen können eingegeben bzw. eingefügt werden!');
  });

  it('goBack navigates to home', () => {
    comp.goBack();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  describe('feedback and accessibility (guest spec "Join via QR Code", web-ui spec)', () => {
    function enterCode(code = '12345') {
      const inputs = getInputs();
      inputs.forEach((input, i) => (input.value = code[i]));
      comp.checkCode({ target: inputs[4] });
      fixture.detectChanges();
    }

    it('shows "Party wird gesucht …" in a live region while the PIN is resolved', () => {
      const pending = new Subject<any>();
      partyService.resolvePin.and.returnValue(pending.asObservable());

      enterCode();

      const status: HTMLElement = fixture.nativeElement.querySelector('[aria-live="polite"]');
      expect(status.textContent).toContain('Party wird gesucht …');
    });

    it('shows the not-found error with the TV hint in an alert region', () => {
      partyService.resolvePin.and.returnValue(throwError(() => new Error('404')));

      enterCode();

      const alert: HTMLElement = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alert.textContent).toContain('Party nicht gefunden.');
      expect(alert.textContent).toContain('Prüfe den Code auf dem TV-Bildschirm.');
      expect(fixture.nativeElement.querySelector('[aria-live="polite"]').textContent).not.toContain('Party wird gesucht');
    });

    it('lets the guest retry with another code without reloading', () => {
      partyService.resolvePin.and.returnValue(throwError(() => new Error('404')));
      enterCode('11111');
      expect(getInputs().every((i) => !i.disabled)).toBe(true);

      partyService.resolvePin.and.returnValue(of({}));
      enterCode('47291');

      expect(partyService.resolvePin).toHaveBeenCalledWith('47291');
      expect(router.navigate).toHaveBeenCalledWith(['/voting']);
    });

    it('uses "du" and explains that the code is on the TV', () => {
      const text = fixture.nativeElement.textContent as string;

      expect(text).toContain('Gib den 5-stelligen Code vom TV-Bildschirm ein');
      expect(text).not.toMatch(/\bSie\b/);
    });

    it('groups the boxes as "Party-Code" and labels each digit', () => {
      const group = fixture.nativeElement.querySelector('.code-container');

      expect(group.getAttribute('role')).toBe('group');
      expect(group.getAttribute('aria-label')).toBe('Party-Code');
      expect(getInputs().map((i) => i.getAttribute('aria-label'))).toEqual([
        'Ziffer 1', 'Ziffer 2', 'Ziffer 3', 'Ziffer 4', 'Ziffer 5',
      ]);
    });

    it('has a real, labelled back button that works with the keyboard', () => {
      const back: HTMLButtonElement = fixture.nativeElement.querySelector('button.back-to-home');

      expect(back.tagName).toBe('BUTTON');
      expect(back.getAttribute('aria-label')).toBe('Zurück');
      back.click();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });
  });
});
