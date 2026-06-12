import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, throwError } from 'rxjs';
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

  it('checkCode joins the party and navigates to /guest on success', () => {
    partyService.resolvePin.and.returnValue(of({}));
    const inputs = getInputs();
    inputs.forEach((input, i) => (input.value = String(i + 1)));

    comp.checkCode({ target: inputs[4] });

    expect(partyService.resolvePin).toHaveBeenCalledWith('12345');
    expect(router.navigate).toHaveBeenCalledWith(['/guest']);
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
    expect(router.navigate).toHaveBeenCalledWith(['/guest']);
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
});
