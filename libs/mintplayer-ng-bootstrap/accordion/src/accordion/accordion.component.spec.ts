import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { BsAccordionTabHeaderComponent } from '../accordion-tab-header/accordion-tab-header.component';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';

import { BsAccordionComponent } from './accordion.component';

describe('BsAccordionComponent', () => {
  let component: BsAccordionComponent;
  let fixture: ComponentFixture<BsAccordionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Component to test
        BsAccordionComponent,

        // Testbench
        BsAccordionTestComponent,

        // Mock components
        MockComponent(BsAccordionTabComponent),
        MockComponent(BsAccordionTabHeaderComponent),
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsAccordionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

// The slideUpDown animation on accordion-tab is gated via `[@.disabled]`
// bound to the parent's `animationsDisabled()`. That signal must follow
// `matchMedia('(prefers-reduced-motion: reduce)')` so the open/close
// animation suppresses itself when the user opts out at the OS level.
describe('BsAccordionComponent — prefers-reduced-motion', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let listeners: Array<(e: MediaQueryListEvent) => void>;

  function stubMatchMedia(initialMatches: boolean): void {
    listeners = [];
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('reduce') ? initialMatches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_t: string, l: (e: MediaQueryListEvent) => void) => listeners.push(l),
      removeEventListener: (_t: string, l: (e: MediaQueryListEvent) => void) => {
        const i = listeners.indexOf(l);
        if (i >= 0) listeners.splice(i, 1);
      },
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  }

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('animationsDisabled() is true when reduced-motion is on at construction', async () => {
    stubMatchMedia(true);
    await TestBed.configureTestingModule({ imports: [BsAccordionComponent] }).compileComponents();
    const fx = TestBed.createComponent(BsAccordionComponent);
    expect(fx.componentInstance.animationsDisabled()).toBe(true);
  });

  it('animationsDisabled() is false when reduced-motion is off at construction', async () => {
    stubMatchMedia(false);
    await TestBed.configureTestingModule({ imports: [BsAccordionComponent] }).compileComponents();
    const fx = TestBed.createComponent(BsAccordionComponent);
    expect(fx.componentInstance.animationsDisabled()).toBe(false);
  });

  it('animationsDisabled() flips live when the OS preference changes', async () => {
    stubMatchMedia(false);
    await TestBed.configureTestingModule({ imports: [BsAccordionComponent] }).compileComponents();
    const fx = TestBed.createComponent(BsAccordionComponent);
    expect(fx.componentInstance.animationsDisabled()).toBe(false);
    listeners.forEach((l) => l({ matches: true } as MediaQueryListEvent));
    expect(fx.componentInstance.animationsDisabled()).toBe(true);
  });
});

@Component({
  selector: 'bs-accordion-test',
  template: `
  <bs-accordion>
    <bs-accordion-tab>
      <bs-accordion-tab-header>
      </bs-accordion-tab-header>
    </bs-accordion-tab>
  </bs-accordion>`,
  imports: [
    MockComponent(BsAccordionComponent),
    MockComponent(BsAccordionTabComponent),
    MockComponent(BsAccordionTabHeaderComponent),
  ],
})
class BsAccordionTestComponent {
}
