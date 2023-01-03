import { isPlatformServer } from '@angular/common';
import { AfterViewInit, Directive, EventEmitter, HostBinding, Inject, Output, PLATFORM_ID } from '@angular/core';
import { BsUserAgent } from '../user-agent.type';

@Directive({
  selector: '[bsUserAgent]'
})
export class BsUserAgentDirective implements AfterViewInit {

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  @HostBinding('class.os-android') get isAndroid() {
    return !!(!isPlatformServer(this.platformId) && navigator.userAgent.match(/Android/i));
  }

  @HostBinding('class.os-ios') get isIos() {
    return !!(!isPlatformServer(this.platformId) && navigator.userAgent.match(/iPhone|iPad|iPod/i));
  }

  @HostBinding('class.os-windows') get isWindows() {
    return !!(!isPlatformServer(this.platformId) && navigator.userAgent.match(/Windows/i));
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.isAndroid) {
        this.detected.emit('Android');
      } else if (this.isIos) {
        this.detected.emit('iOS');
      } else if (this.isWindows) {
        this.detected.emit('Windows');
      } else {
        this.detected.emit(undefined);
      }
    });
  }

  @Output() detected = new EventEmitter<BsUserAgent | undefined>();

}
