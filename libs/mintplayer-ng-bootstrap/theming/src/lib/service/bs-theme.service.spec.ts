import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationRef, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BsThemeService } from './bs-theme.service';
import { BS_THEME_STORAGE_KEY } from './bs-theme-mode';
let mediaListeners: Array<(e: MediaQueryListEvent) => void>;

function stubMatchMedia(prefersDark: boolean): void {
  mediaListeners = [];
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('dark') ? prefersDark : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: (_t: string, l: (e: MediaQueryListEvent) => void) =>
      mediaListeners.push(l),
    removeEventListener: (_t: string, l: (e: MediaQueryListEvent) => void) => {
      const i = mediaListeners.indexOf(l);
      if (i >= 0) mediaListeners.splice(i, 1);
    },
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function flushEffects(): void {
  TestBed.inject(ApplicationRef).tick();
}

describe('BsThemeService', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    localStorage.clear();
    document.documentElement.removeAttribute('data-bs-theme');
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    localStorage.clear();
    document.documentElement.removeAttribute('data-bs-theme');
  });

  describe('initial mode', () => {
    it('defaults to "auto" when localStorage is empty', () => {
      stubMatchMedia(false);
      const svc = TestBed.inject(BsThemeService);
      expect(svc.mode()).toBe('auto');
    });

    it('reads the stored mode from localStorage', () => {
      stubMatchMedia(false);
      localStorage.setItem(BS_THEME_STORAGE_KEY, 'dark');
      const svc = TestBed.inject(BsThemeService);
      expect(svc.mode()).toBe('dark');
    });

    it('reads a custom variant string from localStorage', () => {
      stubMatchMedia(false);
      localStorage.setItem(BS_THEME_STORAGE_KEY, 'sepia');
      const svc = TestBed.inject(BsThemeService);
      expect(svc.mode()).toBe('sepia');
    });
  });

  describe('setMode', () => {
    it('updates the mode signal', () => {
      stubMatchMedia(false);
      const svc = TestBed.inject(BsThemeService);
      svc.setMode('dark');
      expect(svc.mode()).toBe('dark');
    });

    it('persists to localStorage', () => {
      stubMatchMedia(false);
      const svc = TestBed.inject(BsThemeService);
      svc.setMode('light');
      expect(localStorage.getItem(BS_THEME_STORAGE_KEY)).toBe('light');
    });

    it('accepts custom variant strings without TypeScript widening', () => {
      stubMatchMedia(false);
      const svc = TestBed.inject(BsThemeService);
      svc.setMode('sepia');
      expect(svc.mode()).toBe('sepia');
      expect(localStorage.getItem(BS_THEME_STORAGE_KEY)).toBe('sepia');
    });
  });

  describe('effectiveMode', () => {
    it('resolves "auto" to "light" when prefers-color-scheme is light', () => {
      stubMatchMedia(false);
      const svc = TestBed.inject(BsThemeService);
      expect(svc.mode()).toBe('auto');
      expect(svc.effectiveMode()).toBe('light');
    });

    it('resolves "auto" to "dark" when prefers-color-scheme is dark', () => {
      stubMatchMedia(true);
      const svc = TestBed.inject(BsThemeService);
      expect(svc.mode()).toBe('auto');
      expect(svc.effectiveMode()).toBe('dark');
    });

    it('returns the literal mode for explicit "light"', () => {
      stubMatchMedia(true); // even if system is dark
      const svc = TestBed.inject(BsThemeService);
      svc.setMode('light');
      expect(svc.effectiveMode()).toBe('light');
    });

    it('returns the literal mode for explicit "dark"', () => {
      stubMatchMedia(false); // even if system is light
      const svc = TestBed.inject(BsThemeService);
      svc.setMode('dark');
      expect(svc.effectiveMode()).toBe('dark');
    });

    it('returns the custom variant string unchanged', () => {
      stubMatchMedia(true);
      const svc = TestBed.inject(BsThemeService);
      svc.setMode('sepia');
      expect(svc.effectiveMode()).toBe('sepia');
    });
  });

  describe('matchMedia change listener', () => {
    it('flips effectiveMode live when in auto mode and OS preference changes', () => {
      stubMatchMedia(false);
      const svc = TestBed.inject(BsThemeService);
      expect(svc.effectiveMode()).toBe('light');

      mediaListeners.forEach((l) => l({ matches: true } as MediaQueryListEvent));
      expect(svc.effectiveMode()).toBe('dark');

      mediaListeners.forEach((l) => l({ matches: false } as MediaQueryListEvent));
      expect(svc.effectiveMode()).toBe('light');
    });

    it('does NOT change effectiveMode when in explicit mode', () => {
      stubMatchMedia(false);
      const svc = TestBed.inject(BsThemeService);
      svc.setMode('light');
      expect(svc.effectiveMode()).toBe('light');

      mediaListeners.forEach((l) => l({ matches: true } as MediaQueryListEvent));
      expect(svc.effectiveMode()).toBe('light');
    });
  });

  describe('DOM attribute reflection', () => {
    it('writes data-bs-theme on construction (auto → resolves)', () => {
      stubMatchMedia(true);
      TestBed.inject(BsThemeService);
      flushEffects();
      expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
    });

    it('updates data-bs-theme when setMode is called', () => {
      stubMatchMedia(false);
      const svc = TestBed.inject(BsThemeService);
      flushEffects();
      expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');

      svc.setMode('dark');
      flushEffects();
      expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
    });

    it('updates data-bs-theme when matchMedia change fires while in auto', () => {
      stubMatchMedia(false);
      TestBed.inject(BsThemeService);
      flushEffects();
      expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');

      mediaListeners.forEach((l) => l({ matches: true } as MediaQueryListEvent));
      flushEffects();
      expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
    });

    it('writes custom variant values verbatim', () => {
      stubMatchMedia(false);
      const svc = TestBed.inject(BsThemeService);
      svc.setMode('sepia');
      flushEffects();
      expect(document.documentElement.getAttribute('data-bs-theme')).toBe('sepia');
    });
  });

  describe('SSR (server platform)', () => {
    it('does not read from localStorage', async () => {
      stubMatchMedia(false);
      localStorage.setItem(BS_THEME_STORAGE_KEY, 'dark');
      const getSpy = vi.spyOn(Storage.prototype, 'getItem');
      getSpy.mockClear();

      await TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      }).compileComponents();
      const svc = TestBed.inject(BsThemeService);

      expect(getSpy).not.toHaveBeenCalledWith(BS_THEME_STORAGE_KEY);
      expect(svc.mode()).toBe('auto'); // stays default — storage not read
      getSpy.mockRestore();
    });

    it('does not call matchMedia', async () => {
      stubMatchMedia(false); // ensures matchMedia is a function we can spy on
      const mmSpy = vi.spyOn(window, 'matchMedia');
      mmSpy.mockClear();

      await TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      }).compileComponents();
      TestBed.inject(BsThemeService);

      expect(mmSpy).not.toHaveBeenCalled();
      mmSpy.mockRestore();
    });

    it('does not write data-bs-theme to the document', async () => {
      await TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      }).compileComponents();
      TestBed.inject(BsThemeService);
      flushEffects();
      expect(document.documentElement.hasAttribute('data-bs-theme')).toBe(false);
    });
  });
});
