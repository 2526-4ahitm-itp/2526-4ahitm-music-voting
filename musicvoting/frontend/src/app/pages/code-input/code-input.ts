import { Component } from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-code-input',
  imports: [],
  templateUrl: './code-input.html',
  styleUrl: './code-input.css',
})
export class CodeInput {
  private readonly SECRET_CODE = '12345';
  showError = false; // Status für die Fehlermeldung

  constructor(private router: Router) {}

  moveFocus(event: any, nextInput: HTMLInputElement) {
    this.showError = false; // Fehlermeldung ausblenden, sobald getippt wird
    if (event.target.value.length === 1) {
      nextInput.focus();
    }
  }

  checkCode(event: any) {
    const inputs = document.querySelectorAll('.code-container input') as NodeListOf<HTMLInputElement>;
    const enteredCode = Array.from(inputs).map(input => input.value).join('');

    if (enteredCode === this.SECRET_CODE) {
      this.showError = false;
      this.router.navigate(['/voting']);
    } else {
      this.showError = true;
    }
  }
  handleDelete(event: KeyboardEvent, previousInput: HTMLInputElement | null) {
    this.showError = false; // Fehler beim Löschen auch ausblenden

    if (event.key === 'Backspace') {
      const currentInput = event.target as HTMLInputElement;

      // Wenn das aktuelle Feld leer ist und es ein vorheriges Feld gibt
      if (currentInput.value === '' && previousInput) {
        previousInput.focus();
      }
    }
  }
}
