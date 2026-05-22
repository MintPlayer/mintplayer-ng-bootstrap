import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BsReducedMotionDirective } from './reduced-motion.directive';

let mediaListeners: Array<(e: MediaQueryListEvent) => void>;

function stubMatchMedia(initialMatches: boolean): void {
  mediaListeners = [];
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('reduce') ? initialMatches : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: (_t: string, l: (e: MediaQueryListEvent) => void) => mediaListeners.push(l),
    removeEventListener: (_t: string, l: (e: MediaQueryListEvent) => void) => {
      const i = mediaListeners.indexOf(l);
      if (i >= 0) mediaListeners.splice(i, 1);
    },
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

@Component({
  selector: 'host-test',
  imports: [BsReducedMotionDirective],
  template: `<div bsReducedMotion #rm="bsReducedMotion" data-testid="probe" [attr.data-matches]="rm.matches()"></div>`,
})
class HostTestComponent {}

describe('BsReducedMotionDirective', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('matches() reflects the initial matchMedia state when reduced-motion is on', async () => {
    stubMatchMedia(true);
    await TestBed.configureTestingModule({ imports: [HostTestComponent] }).compileComponents();
    const fx: ComponentFixture<HostTestComponent> = TestBed.createComponent(HostTestComponent);
    fx.detectChanges();
    const dir = fx.debugElement.query(By.directive(BsReducedMotionDirective)).injector.get(BsReducedMotionDirective);
    expect(dir.matches()).toBe(true);
  });

  it('matches() is false when reduced-motion is off', async () => {
    stubMatchMedia(false);
    await TestBed.configureTestingModule({ imports: [HostTestComponent] }).compileComponents();
    const fx = TestBed.createComponent(HostTestComponent);
    fx.detectChanges();
    const dir = fx.debugElement.query(By.directive(BsReducedMotionDirective)).injector.get(BsReducedMotionDirective);
    expect(dir.matches()).toBe(false);
  });

  it('matches() flips live when the OS preference changes', async () => {
    stubMatchMedia(false);
    await TestBed.configureTestingModule({ imports: [HostTestComponent] }).compileComponents();
    const fx = TestBed.createComponent(HostTestComponent);
    fx.detectChanges();
    const dir = fx.debugElement.query(By.directive(BsReducedMotionDirective)).injector.get(BsReducedMotionDirective);

    expect(dir.matches()).toBe(false);
    mediaListeners.forEach((l) => l({ matches: true } as MediaQueryListEvent));
    expect(dir.matches()).toBe(true);
    mediaListeners.forEach((l) => l({ matches: false } as MediaQueryListEvent));
    expect(dir.matches()).toBe(false);
  });

  it('removes its matchMedia listener on destroy', async () => {
    stubMatchMedia(false);
    await TestBed.configureTestingModule({ imports: [HostTestComponent] }).compileComponents();
    const fx = TestBed.createComponent(HostTestComponent);
    fx.detectChanges();
    expect(mediaListeners.length).toBe(1);
    fx.destroy();
    expect(mediaListeners.length).toBe(0);
  });
});
