import { inject, Inject, Injectable } from '@angular/core';
import { ExtraOptions, ROUTER_CONFIGURATION } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class BsScrollOffsetService {
  routerConfig = inject(ROUTER_CONFIGURATION);

  getScrollOffset(): [number, number] {
    if (!this.routerConfig.scrollOffset) {
      return [0, 0];
    } else if (Array.isArray(this.routerConfig.scrollOffset)) {
      return this.routerConfig.scrollOffset
    } else {
      return this.routerConfig.scrollOffset();
    }
  }
}
