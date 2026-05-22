import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsCardFooterComponent } from './bs-card-footer.component';
describe('BsCardFooterComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('creates with the `card-footer` class on the host', () => {
    TestBed.configureTestingModule({ imports: [BsCardFooterComponent] });
    const fixture = TestBed.createComponent(BsCardFooterComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.classList.contains('card-footer')).toBe(true);
  });

  it('applies `text-bg-success` when [color]=Color.success', () => {
    @Component({
      imports: [BsCardFooterComponent],
      template: `<bs-card-footer [color]="color"></bs-card-footer>`,
    })
    class Host {
      readonly color = Color.success;
    }
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('bs-card-footer') as HTMLElement;
    expect(el.classList.contains('text-bg-success')).toBe(true);
    expect(el.classList.contains('card-footer')).toBe(true);
  });
});
