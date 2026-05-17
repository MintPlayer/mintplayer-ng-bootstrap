import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { BsCardLinkComponent } from './bs-card-link.component';

describe('BsCardLinkComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders an inner <a class="card-link"> with the projected content', () => {
    @Component({
      imports: [BsCardLinkComponent],
      template: `<bs-card-link href="/x">Click</bs-card-link>`,
    })
    class Host {}
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('bs-card-link a') as HTMLAnchorElement;
    expect(a).not.toBeNull();
    expect(a.classList.contains('card-link')).toBe(true);
    expect(a.getAttribute('href')).toBe('/x');
    expect(a.textContent?.trim()).toBe('Click');
  });

  it('drops href attribute when [href] is undefined', () => {
    @Component({
      imports: [BsCardLinkComponent],
      template: `<bs-card-link>Plain</bs-card-link>`,
    })
    class Host {}
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('bs-card-link a') as HTMLAnchorElement;
    expect(a.hasAttribute('href')).toBe(false);
  });
});
