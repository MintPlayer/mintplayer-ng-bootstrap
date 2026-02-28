import { Directive, inject } from '@angular/core';
import { BsCarouselImageDirective } from '../carousel-image/carousel-image.directive';

@Directive({
  selector: 'img',
  standalone: true,
  host: {
    '[attr.fetch-priority]': 'fetchPriority',
  },
})
export class BsCarouselImgDirective {
  private image = inject(BsCarouselImageDirective, { optional: true });

  fetchPriority: 'high' | 'low' | 'auto';

  constructor() {
    this.fetchPriority = (this.image && this.image.isFirst) ? 'high' : 'low';
  }
}
