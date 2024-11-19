import { Directive, HostBinding } from '@angular/core';
import { BsCarouselImageDirective } from '../carousel-image/carousel-image.directive';

@Directive({
  selector: 'img',
  standalone: false,
})
export class BsCarouselImgDirective {
  constructor(image: BsCarouselImageDirective) {
    this.fetchPriority = (image && image.isFirst) ? 'high' : 'low';
  }
  
  @HostBinding('attr.fetch-priority') fetchPriority: 'high' | 'low' | 'auto';
}
