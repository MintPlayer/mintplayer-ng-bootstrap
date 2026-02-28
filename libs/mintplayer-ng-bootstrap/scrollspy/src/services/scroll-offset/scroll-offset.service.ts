import { inject, Injectable } from '@angular/core';
import { ExtraOptions, ROUTER_CONFIGURATION } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class BsScrollOffsetService {

  private routerConfig = inject<ExtraOptions>(ROUTER_CONFIGURATION);

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
