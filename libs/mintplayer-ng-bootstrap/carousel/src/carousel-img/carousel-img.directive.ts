import { Directive, HostBinding, inject } from '@angular/core';
import { BsCarouselImageDirective } from '../carousel-image/carousel-image.directive';

@Directive({
  selector: 'img',
  standalone: false,
})
export class BsCarouselImgDirective {
  image = inject(BsCarouselImageDirective);
  @HostBinding('attr.fetch-priority') fetchPriority: 'high' | 'low' | 'auto' = (this.image && this.image.isFirst) ? 'high' : 'low';
}
