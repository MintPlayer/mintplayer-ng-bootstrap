import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsCardComponent } from './bs-card.component';

describe('BsCardComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders an inner <mp-card> and keeps no `card` class on the host', () => {
    TestBed.configureTestingModule({ imports: [BsCardComponent] });
    const fixture = TestBed.createComponent(BsCardComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList.contains('card')).toBe(false);
    expect(host.querySelector('mp-card')).toBeTruthy();
  });

  it('maps [color]=Color.primary to the mp-card `color` attribute (no outline)', () => {
    @Component({
      imports: [BsCardComponent],
      template: `<bs-card [color]="color"></bs-card>`,
    })
    class Host {
      readonly color = Color.primary;
    }
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const mpCard = fixture.nativeElement.querySelector('mp-card') as HTMLElement;
    expect(mpCard.getAttribute('color')).toBe('primary');
    expect(mpCard.hasAttribute('outline')).toBe(false);
  });

  it('sets the `outline` attribute when [outline]=true', () => {
    @Component({
      imports: [BsCardComponent],
      template: `<bs-card [color]="color" [outline]="true"></bs-card>`,
    })
    class Host {
      readonly color = Color.danger;
    }
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const mpCard = fixture.nativeElement.querySelector('mp-card') as HTMLElement;
    expect(mpCard.getAttribute('color')).toBe('danger');
    expect(mpCard.getAttribute('outline')).toBe('');
  });

  it('sets no `color` attribute when [color] is unset', () => {
    TestBed.configureTestingModule({ imports: [BsCardComponent] });
    const fixture = TestBed.createComponent(BsCardComponent);
    fixture.detectChanges();
    const mpCard = fixture.nativeElement.querySelector('mp-card') as HTMLElement;
    expect(mpCard.getAttribute('color')).toBeNull();
  });
});
