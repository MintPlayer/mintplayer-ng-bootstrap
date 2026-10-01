import { isPlatformServer } from '@angular/common';
import { AfterViewInit, DestroyRef, Directive, inject, output, PLATFORM_ID } from '@angular/core';
import { BsUserAgent } from '../interfaces/user-agent';
import { BsOperatingSystem } from '../types/operating-system.type';
import { BsWebbrowser } from '../types/webbrowser.type';

/**
 * The browser a user-agent string names. Order matters: Opera and Edge also claim Chrome,
 * and Chrome also claims Safari.
 */
export function detectBrowser(userAgent: string): BsWebbrowser | undefined {
  if (/opr\//i.test(userAgent)) return 'Opera';
  if (/edg/i.test(userAgent)) return 'Edge';
  if (/chrome|chromium|crios/i.test(userAgent)) return 'Chrome';
  if (/firefox|fxios/i.test(userAgent)) return 'Firefox';
  if (/safari/i.test(userAgent)) return 'Safari';
  return undefined;
}

/** The operating system a user-agent string names, when it is one this directive marks. */
export function detectOperatingSystem(userAgent: string): BsOperatingSystem | undefined {
  if (/Android/i.test(userAgent)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
  if (/Windows/i.test(userAgent)) return 'Windows';
  return undefined;
}

@Directive({
  selector: '[bsUserAgent]',
  host: {
    '[class.os-android]': 'os === "Android"',
    '[class.os-ios]': 'os === "iOS"',
    '[class.os-windows]': 'os === "Windows"',
    '[class]': 'browserClass',
  },
})
export class BsUserAgentDirective implements AfterViewInit {
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);

  /** There is no user agent on the server: nothing is detected, nothing is marked. */
  private get userAgent(): string {
    return this.isServer ? '' : navigator.userAgent;
  }

  get os(): BsOperatingSystem | undefined {
    return detectOperatingSystem(this.userAgent);
  }

  get isAndroid() {
    return this.os === 'Android';
  }

  get isIos() {
    return this.os === 'iOS';
  }

  get isWindows() {
    return this.os === 'Windows';
  }

  get browserClass() {
    const browser = detectBrowser(this.userAgent);
    return browser ? `browser-${browser.toLowerCase()}` : null;
  }

  ngAfterViewInit() {
    // UA detection is meaningless on the server (no `navigator`), and the
    // setTimeout-then-emit pattern races prerender teardown — the macrotask
    // can fire after Angular destroys the application, hitting NG0953 on
    // every prerendered route.
    if (this.isServer) return;

    const handle = setTimeout(() => {
      this.detected.emit({ os: this.os, webbrowser: detectBrowser(this.userAgent) });
    });
    this.destroyRef.onDestroy(() => clearTimeout(handle));
  }

  readonly detected = output<BsUserAgent>();
}
