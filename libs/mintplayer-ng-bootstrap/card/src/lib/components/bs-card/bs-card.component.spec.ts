import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsCardComponent } from './bs-card.component';
function buildHost<T>(hostType: new () => T): { fixture: ReturnType<typeof TestBed.createComponent<T>>; bsCard: HTMLElement } {
  TestBed.configureTestingModule({ imports: [hostType] });
  const fixture = TestBed.createComponent<T>(hostType);
  fixture.detectChanges();
  const bsCard = fixture.nativeElement.querySelector('bs-card') as HTMLElement;
  return { fixture, bsCard };
}

describe('BsCardComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('creates with the `card` class on the host', () => {
    TestBed.configureTestingModule({ imports: [BsCardComponent] });
    const fixture = TestBed.createComponent(BsCardComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.classList.contains('card')).toBe(true);
  });

  it('applies `text-bg-primary` when [color]=Color.primary (filled variant)', () => {
    @Component({
      imports: [BsCardComponent],
      template: `<bs-card [color]="color"></bs-card>`,
    })
    class Host {
      readonly color = Color.primary;
    }
    const { bsCard } = buildHost(Host);
    expect(bsCard.classList.contains('text-bg-primary')).toBe(true);
    expect(bsCard.classList.contains('card')).toBe(true);
    // Outline-only signal: absent.
    expect(bsCard.classList.contains('border')).toBe(false);
    expect(bsCard.classList.contains('bg-transparent')).toBe(false);
  });

  it('applies `border border-danger bg-transparent` when [color] + [outline]', () => {
    @Component({
      imports: [BsCardComponent],
      template: `<bs-card [color]="color" [outline]="true"></bs-card>`,
    })
    class Host {
      readonly color = Color.danger;
    }
    const { bsCard } = buildHost(Host);
    expect(bsCard.classList.contains('border')).toBe(true);
    expect(bsCard.classList.contains('border-danger')).toBe(true);
    expect(bsCard.classList.contains('bg-transparent')).toBe(true);
    // Filled signal: absent.
    expect(bsCard.classList.contains('text-bg-danger')).toBe(false);
  });

  it('applies no colour classes when [color] is unset', () => {
    TestBed.configureTestingModule({ imports: [BsCardComponent] });
    const fixture = TestBed.createComponent(BsCardComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList.contains('card')).toBe(true);
    for (const cls of Array.from(host.classList)) {
      expect(cls.startsWith('text-bg-') || cls.startsWith('border-')).toBe(false);
    }
  });
});
