import { isPlatformServer } from '@angular/common';
import { Directive, HostBinding, Inject, PLATFORM_ID } from '@angular/core';

@Directive({
  selector: '[bsNoNoscript]',
  
})
export class BsNoNoscriptDirective {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformServer(platformId)) {
      this.isNoScript = true;
    }
  }

  @HostBinding('class.noscript') isNoScript = false;
}
