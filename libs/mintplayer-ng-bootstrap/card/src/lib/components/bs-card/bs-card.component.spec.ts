import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsCardComponent } from './bs-card.component';

describe('BsCardComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('is the .card itself and renders no custom element', () => {
    TestBed.configureTestingModule({ imports: [BsCardComponent] });
    const fixture = TestBed.createComponent(BsCardComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList.contains('card')).toBe(true);
    expect(host.querySelector('mp-card')).toBeNull();
  });

  it('maps [color] and [outline] onto Bootstrap classes, keeping a consumer class', () => {
    @Component({
      imports: [BsCardComponent],
      template: `<bs-card class="h-100" [color]="color()" [outline]="outline()"></bs-card>`,
    })
    class Host {
      readonly color = signal<Color>(Color.primary);
      readonly outline = signal(false);
    }
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('bs-card') as HTMLElement;
    expect([...card.classList].sort()).toEqual(['border-primary', 'card', 'h-100', 'text-bg-primary']);

    fixture.componentInstance.color.set(Color.danger);
    fixture.componentInstance.outline.set(true);
    fixture.detectChanges();
    expect([...card.classList].sort()).toEqual(['bg-transparent', 'border-danger', 'card', 'h-100']);
  });
});
