import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MvSpinner } from './mv-spinner';

describe('MvSpinner', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MvSpinner],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  it('exposes role status with the default label', () => {
    const fixture = TestBed.createComponent(MvSpinner);
    fixture.detectChanges();

    expect(fixture.nativeElement.getAttribute('role')).toBe('status');
    expect(fixture.nativeElement.textContent.trim()).toBe('Lädt …');
  });

  it('uses a custom label', () => {
    const fixture = TestBed.createComponent(MvSpinner);
    fixture.componentRef.setInput('label', 'Party wird gesucht …');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('Party wird gesucht …');
  });
});
