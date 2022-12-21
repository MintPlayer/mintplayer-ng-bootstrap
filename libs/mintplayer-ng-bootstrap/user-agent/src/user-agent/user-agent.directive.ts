import { AfterViewInit, Directive, EventEmitter, HostBinding, Output } from '@angular/core';
import { BsUserAgent } from '../user-agent.type';

@Directive({
  selector: '[bsUserAgent]'
})
export class BsUserAgentDirective implements AfterViewInit {

  @HostBinding('class.os-android') get isAndroid() {
    return !!navigator.userAgent.match(/Android/i);
  }

  @HostBinding('class.os-ios') get isIos() {
    return !!navigator.userAgent.match(/iPhone|iPad|iPod/i);
  }

  @HostBinding('class.os-windows') get isWindows() {
    return !!navigator.userAgent.match(/Windows/i);
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
