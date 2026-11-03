import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MvIcon } from './mv-icon';

describe('MvIcon', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MvIcon],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  it('renders an SVG with the icon paths at the requested size', () => {
    const fixture = TestBed.createComponent(MvIcon);
    fixture.componentRef.setInput('name', 'heart');
    fixture.componentRef.setInput('size', 32);
    fixture.detectChanges();

    const svg: SVGElement = fixture.nativeElement.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('is hidden from assistive technology', () => {
    const fixture = TestBed.createComponent(MvIcon);
    fixture.componentRef.setInput('name', 'plus');
    fixture.detectChanges();

    expect(fixture.nativeElement.getAttribute('aria-hidden')).toBe('true');
  });

  it('fills the shape when filled is set and re-renders on change', () => {
    const fixture = TestBed.createComponent(MvIcon);
    fixture.componentRef.setInput('name', 'heart');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('svg').getAttribute('fill')).toBe('none');

    fixture.componentRef.setInput('filled', true);
    fixture.detectChanges();
    const svgs = fixture.nativeElement.querySelectorAll('svg');
    expect(svgs.length).toBe(1);
    expect(svgs[0].getAttribute('fill')).toBe('currentColor');
  });
});
