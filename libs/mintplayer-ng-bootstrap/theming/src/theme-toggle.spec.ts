import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { __resetBsThemeStoreForTests, BS_THEME_DEFAULT_MODES, type BsThemeToggleMode } from '@mintplayer/ui-core/theming';
import { installFakeBroadcastChannel } from '@mintplayer/ui-core/theming/src/testing/fake-broadcast-channel';
import { BsThemeToggleComponent } from './generated';
import { BsThemeService } from './lib/service/bs-theme.service';

/**
 * The generated `bs-theme-toggle` (#437): the button renders in the
 * component's own template, follows `modes`, and drives the same store that
 * `BsThemeService` mirrors.
 */

const CUSTOM: readonly BsThemeToggleMode[] = [
  { mode: 'light', label: 'Licht', announcement: 'Licht thema', icon: 'M0 0h16v16H0z' },
  { mode: 'dark', label: 'Donker', announcement: 'Donker thema', icon: 'M0 0h16v16H0z' },
];

// Inputs are driven from signals: a plain-field write on the host notifies
// nothing, so detectChanges() would not re-evaluate the binding.
@Component({
  imports: [BsThemeToggleComponent],
  template: `<bs-theme-toggle [modes]="modes()" id="theme-toggle"></bs-theme-toggle>`,
})
class HostComponent {
  readonly modes = signal<readonly BsThemeToggleMode[] | null>(null);
}

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
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: vi.fn(() => mql as unknown as MediaQueryList) });
}

async function create(): Promise<ComponentFixture<HostComponent>> {
  const f = TestBed.createComponent(HostComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}

const button = (f: ComponentFixture<unknown>) => (f.nativeElement as HTMLElement).querySelector('bs-theme-toggle button') as HTMLButtonElement;

installFakeBroadcastChannel();

describe('BsThemeToggleComponent', () => {
  beforeEach(() => {
    __resetBsThemeStoreForTests();
    stubEnvironment();
  });

  afterEach(() => __resetBsThemeStoreForTests());

  it('renders the default cycle with the id left on its host', async () => {
    const f = await create();
    const host = (f.nativeElement as HTMLElement).querySelector('bs-theme-toggle') as HTMLElement;
    expect(host.id).toBe('theme-toggle');
    expect(host.classList).toContain('theme-toggle');
    expect(button(f).getAttribute('aria-label')).toBe(BS_THEME_DEFAULT_MODES[1].label);
  });

  it('a click moves BsThemeService with it', async () => {
    const f = await create();
    const service = TestBed.inject(BsThemeService);
    button(f).click();
    await f.whenStable();
    expect(service.mode()).toBe('light');
  });

  it('follows a modes input change', async () => {
    const f = await create();
    f.componentInstance.modes.set(CUSTOM);
    f.detectChanges();
    // auto is not in the list: entry 0 (light) is shown, so the button names dark.
    expect(button(f).getAttribute('aria-label')).toBe('Donker');
  });
});
