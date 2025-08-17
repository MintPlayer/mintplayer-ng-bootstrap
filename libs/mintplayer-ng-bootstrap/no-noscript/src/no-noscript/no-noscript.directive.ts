import { isPlatformServer } from '@angular/common';
import { Directive, HostBinding, inject, Inject, PLATFORM_ID } from '@angular/core';

@Directive({
  selector: '[bsNoNoscript]',
  standalone: true,
})
export class BsNoNoscriptDirective {
  platformId = inject(PLATFORM_ID);
  @HostBinding('class.noscript') isNoScript = isPlatformServer(this.platformId);
}
