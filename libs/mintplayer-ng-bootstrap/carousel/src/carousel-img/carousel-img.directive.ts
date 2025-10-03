import { Directive, HostBinding, inject } from '@angular/core';
import { BsCarouselImageDirective } from '../carousel-image/carousel-image.directive';

@Directive({
  selector: 'img',
  standalone: false,
})
export class BsCarouselImgDirective {
  constructor() {
    this.fetchPriority = (this.image && this.image.isFirst) ? 'high' : 'low';
  }
  
  image = inject(BsCarouselImageDirective);
  @HostBinding('attr.fetch-priority') fetchPriority: 'high' | 'low' | 'auto';
}
