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
    const pin = this.route.snapshot.params['pin'];
    if (pin) {
      this.resolveAndJoin(pin);
    }
  }

  moveFocus(event: any, nextInput: HTMLInputElement) {
    this.showError = false;
    if (event.target.value.length === 1) {
      nextInput.focus();
    }
  }

  checkCode(event: any) {
    const inputs = document.querySelectorAll('.code-container input') as NodeListOf<HTMLInputElement>;
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

  private resolveAndJoin(pin: string): void {
    this.partyService.resolvePin(pin).subscribe({
      next: () => this.router.navigate(['/guest']),
      error: () => {
        this.showError = true;
        this.errorMessage = 'Party nicht gefunden.';
      }
    });
  }
}
