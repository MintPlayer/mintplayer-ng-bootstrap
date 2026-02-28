import { isPlatformServer } from '@angular/common';
import { Directive, Inject, PLATFORM_ID } from '@angular/core';

@Directive({
  selector: '[bsNoNoscript]',
  standalone: true,
  host: {
    '[class.noscript]': 'isNoScript',
  },
})
export class BsNoNoscriptDirective {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformServer(platformId)) {
      this.isNoScript = true;
    }
  }

  isNoScript = false;
}
