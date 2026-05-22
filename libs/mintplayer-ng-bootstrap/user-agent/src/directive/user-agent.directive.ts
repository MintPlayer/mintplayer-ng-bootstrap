import { isPlatformServer } from '@angular/common';
import { AfterViewInit, DestroyRef, Directive, inject, output, PLATFORM_ID } from '@angular/core';
import { BsUserAgent } from '../interfaces/user-agent';
import { BsOperatingSystem } from '../types/operating-system.type';
import { BsWebbrowser } from '../types/webbrowser.type';
@Directive({
  selector: '[bsUserAgent]',
  host: {
    '[class.os-android]': 'isAndroid',
    '[class.os-ios]': 'isIos',
    '[class.os-windows]': 'isWindows',
    '[class]': 'browserClass',
  },
})
export class BsUserAgentDirective implements AfterViewInit {
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  get isAndroid() {
    return !isPlatformServer(this.platformId) && !!navigator && !!navigator.userAgent.match(/Android/i);
  }

  get isIos() {
    return !isPlatformServer(this.platformId) && !!navigator && !!navigator.userAgent.match(/iPhone|iPad|iPod/i);
  }

  get isWindows() {
    return !isPlatformServer(this.platformId) && !!navigator && !!navigator.userAgent.match(/Windows/i);
  }

  get browserClass() {
    const browser = this.getBrowser();
    if (!browser) {
      return null;
    } else {
      return `browser-${browser.toLowerCase()}`;
    }
  }

  private getBrowser(): BsWebbrowser | undefined {
    if (!isPlatformServer(this.platformId) && !!navigator) {
      const userAgent = navigator.userAgent;
      if(userAgent.match(/opr\//i)) {
        return 'Opera';
      } else if(userAgent.match(/edg/i)) {
        return 'Edge';
      } else if (userAgent.match(/chrome|chromium|crios/i)) {
        return 'Chrome';
      } else if(userAgent.match(/firefox|fxios/i)) {
        return 'Firefox';
      } else if(userAgent.match(/safari/i)) {
        return 'Safari';
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  ngAfterViewInit() {
    // UA detection is meaningless on the server (no `navigator`), and the
    // setTimeout-then-emit pattern races prerender teardown — the macrotask
    // can fire after Angular destroys the application, hitting NG0953 on
    // every prerendered route.
    if (isPlatformServer(this.platformId)) return;

    const handle = setTimeout(() => {
      let os: BsOperatingSystem | undefined;
      let webbrowser = this.getBrowser();

      if (this.isAndroid) {
        os = 'Android';
      } else if (this.isIos) {
        os = 'iOS';
      } else if (this.isWindows) {
        os = 'Windows';
      } else {
        os = undefined;
      }

      this.detected.emit({ os, webbrowser });
    });
    this.destroyRef.onDestroy(() => clearTimeout(handle));
  }

  readonly detected = output<BsUserAgent>();
}
