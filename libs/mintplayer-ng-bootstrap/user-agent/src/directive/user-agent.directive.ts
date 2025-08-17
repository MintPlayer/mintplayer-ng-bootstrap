import { isPlatformServer } from '@angular/common';
import { AfterViewInit, Directive, EventEmitter, HostBinding, inject, Output, PLATFORM_ID } from '@angular/core';
import { BsUserAgent } from '../interfaces/user-agent';
import { BsOperatingSystem } from '../types/operating-system.type';
import { BsWebbrowser } from '../types/webbrowser.type';

@Directive({
  selector: '[bsUserAgent]',
  standalone: true,
})
export class BsUserAgentDirective implements AfterViewInit {
  platformId = inject(PLATFORM_ID);

  @HostBinding('class.os-android') get isAndroid() {
    return !isPlatformServer(this.platformId) && !!navigator && !!navigator.userAgent.match(/Android/i);
  }

  @HostBinding('class.os-ios') get isIos() {
    return !isPlatformServer(this.platformId) && !!navigator && !!navigator.userAgent.match(/iPhone|iPad|iPod/i);
  }

  @HostBinding('class.os-windows') get isWindows() {
    return !isPlatformServer(this.platformId) && !!navigator && !!navigator.userAgent.match(/Windows/i);
  }

  @HostBinding('class') get browserClass() {  
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
    setTimeout(() => {
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
  }

  @Output() detected = new EventEmitter<BsUserAgent>();
}
