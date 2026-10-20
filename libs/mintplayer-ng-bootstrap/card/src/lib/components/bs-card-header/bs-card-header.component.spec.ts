import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsCardHeaderComponent } from './bs-card-header.component';

describe('BsCardHeaderComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('creates with the `card-header` class on the host', () => {
    TestBed.configureTestingModule({ imports: [BsCardHeaderComponent] });
    const fixture = TestBed.createComponent(BsCardHeaderComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.classList.contains('card-header')).toBe(true);
  });

  it('applies `text-bg-dark` when [color]=Color.dark', () => {
    @Component({
      imports: [BsCardHeaderComponent],
      template: `<bs-card-header [color]="color"></bs-card-header>`,
    })
    class Host {
      readonly color = Color.dark;
    }
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('bs-card-header') as HTMLElement;
    expect(el.classList.contains('text-bg-dark')).toBe(true);
    expect(el.classList.contains('card-header')).toBe(true);
  });
});
