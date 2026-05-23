import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { BsCardImgComponent } from './bs-card-img.component';

describe('BsCardImgComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders <img class="card-img-top"> by default and applies card-img-top to host', () => {
    @Component({
      imports: [BsCardImgComponent],
      template: `<bs-card-img src="x.jpg" alt="x"></bs-card-img>`,
    })
    class Host {}
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('bs-card-img') as HTMLElement;
    const img = host.querySelector('img') as HTMLImageElement;
    expect(img.classList.contains('card-img-top')).toBe(true);
    expect(img.getAttribute('src')).toBe('x.jpg');
    expect(img.getAttribute('alt')).toBe('x');
    expect(host.classList.contains('card-img-top')).toBe(true);
    // No overlay wrapper in top mode.
    expect(host.querySelector('.card-img-overlay')).toBeNull();
  });

  it('renders <img class="card-img-bottom"> when [position]="bottom"', () => {
    @Component({
      imports: [BsCardImgComponent],
      template: `<bs-card-img [position]="'bottom'" src="b.jpg"></bs-card-img>`,
    })
    class Host {}
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('bs-card-img') as HTMLElement;
    const img = host.querySelector('img') as HTMLImageElement;
    expect(img.classList.contains('card-img-bottom')).toBe(true);
    expect(host.classList.contains('card-img-bottom')).toBe(true);
  });

  it('renders <img class="card-img"> + .card-img-overlay wrapper when [position]="overlay"', () => {
    @Component({
      imports: [BsCardImgComponent],
      template: `
        <bs-card-img [position]="'overlay'" src="o.jpg">
          <span class="overlay-content">on-image</span>
        </bs-card-img>
      `,
    })
    class Host {}
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('bs-card-img') as HTMLElement;
    const img = host.querySelector('img') as HTMLImageElement;
    expect(img.classList.contains('card-img')).toBe(true);
    expect(img.classList.contains('card-img-top')).toBe(false);
    const overlay = host.querySelector('.card-img-overlay') as HTMLElement;
    expect(overlay).not.toBeNull();
    // Projected content lands inside the overlay wrapper.
    expect(overlay.querySelector('.overlay-content')?.textContent?.trim()).toBe('on-image');
    expect(host.classList.contains('card-img')).toBe(true);
  });

  it('drops src/alt attributes when inputs are undefined (no empty src="")', () => {
    @Component({
      imports: [BsCardImgComponent],
      template: `<bs-card-img></bs-card-img>`,
    })
    class Host {}
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('bs-card-img img') as HTMLImageElement;
    expect(img.hasAttribute('src')).toBe(false);
    expect(img.hasAttribute('alt')).toBe(false);
  });
});
