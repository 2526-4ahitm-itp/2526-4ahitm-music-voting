import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { COVER_PLACEHOLDER, MvCover } from './mv-cover';

describe('MvCover', () => {
  let fixture: ComponentFixture<MvCover>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MvCover],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(MvCover);
  });

  function img(): HTMLImageElement {
    return fixture.nativeElement.querySelector('img');
  }

  it('shows the placeholder when images is missing', () => {
    fixture.componentRef.setInput('images', undefined);
    fixture.detectChanges();
    expect(img().getAttribute('src')).toBe(COVER_PLACEHOLDER);
  });

  it('shows the placeholder when images is empty', () => {
    fixture.componentRef.setInput('images', []);
    fixture.detectChanges();
    expect(img().getAttribute('src')).toBe(COVER_PLACEHOLDER);
  });

  it('picks the largest image for size large and the smallest for size small', () => {
    const images = [{ url: 'big.jpg' }, { url: 'mid.jpg' }, { url: 'small.jpg' }];
    fixture.componentRef.setInput('images', images);
    fixture.componentRef.setInput('size', 'large');
    fixture.detectChanges();
    expect(img().getAttribute('src')).toBe('big.jpg');

    fixture.componentRef.setInput('size', 'small');
    fixture.detectChanges();
    expect(img().getAttribute('src')).toBe('small.jpg');
  });

  it('prefers a direct url over images', () => {
    fixture.componentRef.setInput('url', 'direct.jpg');
    fixture.componentRef.setInput('images', [{ url: 'other.jpg' }]);
    fixture.detectChanges();
    expect(img().getAttribute('src')).toBe('direct.jpg');
  });

  it('switches to the placeholder when the image fails to load', () => {
    fixture.componentRef.setInput('url', 'broken.jpg');
    fixture.detectChanges();

    img().dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(img().getAttribute('src')).toBe(COVER_PLACEHOLDER);
  });

  it('uses the dark brand tile as placeholder, not the old light clip-art PNG', () => {
    expect(COVER_PLACEHOLDER).toBe('assets/img/cover-placeholder.svg');
  });

  it('is decorative (empty alt)', () => {
    fixture.detectChanges();
    expect(img().getAttribute('alt')).toBe('');
  });
});
