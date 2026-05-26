import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { PartyService } from '../../services/party.service';

@Component({
  selector: 'app-code-input',
  standalone: true,
  imports: [],
  templateUrl: './code-input.html',
  styleUrl: './code-input.css',
})
export class CodeInput implements OnInit {
  showError = false;
  errorMessage = 'Falscher Code';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private partyService: PartyService
  ) {}

  ngOnInit(): void {
    const queryCode = this.route.snapshot.queryParams['code'];
    const pathPin = this.route.snapshot.params['pin'];
    const finalPin = queryCode || pathPin;

    if (finalPin) {
      const backend = `${window.location.hostname}:8080`;
      window.location.href = `musicvotingapp://join/${finalPin}?backend=${backend}`;
      setTimeout(() => {
        if (!document.hidden) {
          this.resolveAndJoin(finalPin);
        }
      }, 1500);
    }
  }

  moveFocus(event: any, nextInput: HTMLInputElement) {
    this.showError = false;
    const value = event.target.value;

    if (value && !/^\d+$/.test(value)) {
      event.target.value = '';
      this.showError = true;
      this.errorMessage = 'Nur Zahlen erlaubt!';
      return;
    }

    if (value.length === 1) {
      nextInput.focus();
    }
  }

  checkCode(event: any) {
    const value = event.target.value;
    if (value && !/^\d+$/.test(value)) {
      event.target.value = '';
      this.showError = true;
      this.errorMessage = 'Nur Zahlen erlaubt!';
      return;
    }

    const inputs = this.getInputs();
    const enteredCode = Array.from(inputs).map(input => input.value).join('');

    if (enteredCode.length === 5) {
      this.resolveAndJoin(enteredCode);
    }
  }

  handleDelete(event: KeyboardEvent, previousInput: HTMLInputElement | null) {
    this.showError = false;
    if (event.key === 'Backspace') {
      const currentInput = event.target as HTMLInputElement;
      if (currentInput.value === '' && previousInput) {
        previousInput.focus();
      }
    }
  }

  handlePaste(event: ClipboardEvent) {
    event.preventDefault();
    const data = event.clipboardData?.getData('text');
    if (data) {
      this.validateAndDistribute(data);
    }
  }

  async pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      this.validateAndDistribute(text);
    } catch (err) {
      console.error('Clipboard-Fehler', err);
    }
  }

  /**
   * Zentrale Methode zum Validieren, Befüllen der Felder und Absenden
   */
  private validateAndDistribute(code: string) {
    this.showError = false;
    const cleanCode = code.trim();

    if (!/^\d+$/.test(cleanCode)) {
      this.showError = true;
      this.errorMessage = 'Nur Zahlen können eingegeben bzw. eingefügt werden!';
      return;
    }

    const pinArray = cleanCode.substring(0, 5).split('');
    const inputs = this.getInputs();

    pinArray.forEach((char, index) => {
      if (inputs[index]) {
        inputs[index].value = char;
      }
    });

    if (pinArray.length === 5) {
      this.resolveAndJoin(cleanCode.substring(0, 5));
    } else if (inputs[pinArray.length]) {
      inputs[pinArray.length].focus();
    }
  }

  private getInputs(): NodeListOf<HTMLInputElement> {
    return document.querySelectorAll('.code-container input') as NodeListOf<HTMLInputElement>;
  }

  private resolveAndJoin(pin: string): void {
    this.partyService.resolvePin(pin).subscribe({
      next: () => this.router.navigate(['/guest']),
      error: () => {
        this.showError = true;
        this.errorMessage = 'Party nicht gefunden.';
      }
    });
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
