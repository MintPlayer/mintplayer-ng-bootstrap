import { isPlatformServer } from '@angular/common';
import { Directive, inject, PLATFORM_ID } from '@angular/core';

@Directive({
  selector: '[bsNoNoscript]',
  host: {
    '[class.noscript]': 'isNoScript',
  },
})
export class BsNoNoscriptDirective {
  private platformId = inject(PLATFORM_ID);

  constructor() {
    if (isPlatformServer(this.platformId)) {
      this.isNoScript = true;
    }
  }

  isNoScript = false;
}
