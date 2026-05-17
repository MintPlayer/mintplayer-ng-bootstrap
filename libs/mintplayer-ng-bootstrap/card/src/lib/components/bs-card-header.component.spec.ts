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

  it('adds `card-header-tabs` to a slotted <ul> when [navStyle]="tabs"', () => {
    @Component({
      imports: [BsCardHeaderComponent],
      template: `
        <bs-card-header [navStyle]="'tabs'">
          <ul class="nav"><li>Tab 1</li></ul>
        </bs-card-header>
      `,
    })
    class Host {}
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const ul = fixture.nativeElement.querySelector('bs-card-header ul') as HTMLElement;
    expect(ul.classList.contains('card-header-tabs')).toBe(true);
    expect(ul.classList.contains('card-header-pills')).toBe(false);
  });

  it('adds `card-header-pills` when [navStyle]="pills"', () => {
    @Component({
      imports: [BsCardHeaderComponent],
      template: `
        <bs-card-header [navStyle]="'pills'">
          <ul class="nav"><li>Pill 1</li></ul>
        </bs-card-header>
      `,
    })
    class Host {}
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const ul = fixture.nativeElement.querySelector('bs-card-header ul') as HTMLElement;
    expect(ul.classList.contains('card-header-pills')).toBe(true);
    expect(ul.classList.contains('card-header-tabs')).toBe(false);
  });

  it('also targets `<div class="nav">` (Bootstrap accepts a div-based nav)', () => {
    @Component({
      imports: [BsCardHeaderComponent],
      template: `
        <bs-card-header [navStyle]="'tabs'">
          <div class="nav"><a class="nav-link" href="#">A</a></div>
        </bs-card-header>
      `,
    })
    class Host {}
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('bs-card-header > .nav') as HTMLElement;
    expect(nav.classList.contains('card-header-tabs')).toBe(true);
  });

  it('does not touch slotted navs when [navStyle] is unset', () => {
    @Component({
      imports: [BsCardHeaderComponent],
      template: `
        <bs-card-header>
          <ul class="nav"><li>Tab</li></ul>
        </bs-card-header>
      `,
    })
    class Host {}
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const ul = fixture.nativeElement.querySelector('bs-card-header ul') as HTMLElement;
    expect(ul.classList.contains('card-header-tabs')).toBe(false);
    expect(ul.classList.contains('card-header-pills')).toBe(false);
  });
});
