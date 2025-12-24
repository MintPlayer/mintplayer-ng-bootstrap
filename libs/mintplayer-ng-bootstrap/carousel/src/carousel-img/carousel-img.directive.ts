import { Directive, HostBinding, inject } from '@angular/core';
import { BsCarouselImageDirective } from '../carousel-image/carousel-image.directive';

@Directive({
  selector: 'img',
  standalone: true,
})
export class BsCarouselImgDirective {
  private image = inject(BsCarouselImageDirective, { optional: true });

  @HostBinding('attr.fetch-priority') fetchPriority: 'high' | 'low' | 'auto';

  constructor() {
    this.fetchPriority = (this.image && this.image.isFirst) ? 'high' : 'low';
  }
}
