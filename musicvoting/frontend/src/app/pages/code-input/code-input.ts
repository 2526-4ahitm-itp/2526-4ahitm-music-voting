import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-code-input',
  standalone: true,
  templateUrl: './code-input.html',
  styleUrl: './code-input.css',
})
export class CodeInput implements OnInit {
  private readonly SECRET_CODE = '12345';
  showError = false;

  // Greift auf alle 5 Inputs im Template zu
  @ViewChildren('input1, input2, input3, input4, input5') inputs!: QueryList<ElementRef>;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    // Deep Link Check: Liest ?code=12345 aus der URL
    const urlCode = this.route.snapshot.queryParamMap.get('code');

    if (urlCode && urlCode.length === 5) {
      // Kleiner Timeout, damit die ViewChildren initialisiert sind
      setTimeout(() => this.fillCodeFromUrl(urlCode), 100);
    }
  }

  fillCodeFromUrl(code: string) {
    const codeArray = code.split('');
    const inputRefs = this.inputs.toArray();

    codeArray.forEach((char, index) => {
      if (inputRefs[index]) {
        inputRefs[index].nativeElement.value = char;
      }
    });

    this.checkCode();
  }

  moveFocus(event: any, nextInput: HTMLInputElement) {
    this.showError = false;
    // Automatisch zum nächsten Feld springen
    if (event.target.value.length === 1) {
      nextInput.focus();
    }
  }

  handleDelete(event: KeyboardEvent, previousInput: HTMLInputElement | null) {
    this.showError = false;
    // Wenn Backspace gedrückt wird und das Feld leer ist -> zurückspringen
    if (event.key === 'Backspace') {
      const currentInput = event.target as HTMLInputElement;
      if (currentInput.value === '' && previousInput) {
        previousInput.focus();
      }
    }
  }

  onLastInput(event: any) {
    this.showError = false;
    this.checkCode();
  }

  checkCode() {
    // Alle Werte sammeln und zusammenfügen
    const inputRefs = this.inputs.toArray();
    const enteredCode = inputRefs.map(ref => ref.nativeElement.value).join('');

    if (enteredCode.length === 5) {
      if (enteredCode === this.SECRET_CODE) {
        this.router.navigate(['/voting']);
      } else {
        this.showError = true;
      }
    }
  }
}
