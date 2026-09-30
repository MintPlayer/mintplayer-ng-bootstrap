import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  __resetBsThemeStoreForTests,
  BS_THEME_DEFAULT_MODES,
  type BsThemeToggleMode,
  type MpThemeToggle,
} from '@mintplayer/web-components/theming';
import { BsThemeToggleComponent } from './theme-toggle.component';

const CUSTOM: readonly BsThemeToggleMode[] = [
  { mode: 'light', label: 'Licht', announcement: 'Licht thema', icon: 'M0 0h16v16H0z' },
  { mode: 'dark', label: 'Donker', announcement: 'Donker thema', icon: 'M0 0h16v16H0z' },
];

// Inputs are driven from signals: a plain-field write on the host notifies
// nothing, so detectChanges() would not re-evaluate the binding.
@Component({
  imports: [BsThemeToggleComponent],
  template: `<bs-theme-toggle [modes]="modes()" aria-controls="page" id="theme-toggle" tabindex="0"></bs-theme-toggle>`,
})
class ModesHostComponent {
  readonly modes = signal<readonly BsThemeToggleMode[]>(BS_THEME_DEFAULT_MODES);
}

@Component({
  imports: [BsThemeToggleComponent],
  template: `<bs-theme-toggle></bs-theme-toggle>`,
})
class DefaultHostComponent {}

function stubEnvironment(): void {
  let jar = '';
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => jar,
    set: (value: string) => {
      jar = value.split(';')[0];
    },
  });
  const mql = { matches: false, addEventListener: () => undefined, removeEventListener: () => undefined };
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn(() => mql as unknown as MediaQueryList),
  });
}

describe('BsThemeToggleComponent', () => {
  beforeEach(() => {
    __resetBsThemeStoreForTests();
    stubEnvironment();
  });

  afterEach(() => {
    __resetBsThemeStoreForTests();
  });

  it('assigns the default modes to the element property', () => {
    const fixture = TestBed.createComponent(DefaultHostComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement.querySelector('mp-theme-toggle') as MpThemeToggle;
    expect(element.modes).toEqual(BS_THEME_DEFAULT_MODES);
  });

  it('forwards a modes input change to the element property', () => {
    const fixture = TestBed.createComponent(ModesHostComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement.querySelector('mp-theme-toggle') as MpThemeToggle;

    fixture.componentInstance.modes.set(CUSTOM);
    fixture.detectChanges();
    expect(element.modes).toEqual(CUSTOM);
  });

  it('moves id and tabindex, and copies aria-*, onto <mp-theme-toggle>', async () => {
    const fixture = TestBed.createComponent(ModesHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const wrapper = fixture.nativeElement.querySelector('bs-theme-toggle') as HTMLElement;
    const element = fixture.nativeElement.querySelector('mp-theme-toggle') as HTMLElement;
    expect(element.getAttribute('aria-controls')).toBe('page');
    expect(element.getAttribute('id')).toBe('theme-toggle');
    expect(element.getAttribute('tabindex')).toBe('0');
    expect(wrapper.hasAttribute('id')).toBe(false);
    expect(wrapper.hasAttribute('tabindex')).toBe(false);
  });
});
