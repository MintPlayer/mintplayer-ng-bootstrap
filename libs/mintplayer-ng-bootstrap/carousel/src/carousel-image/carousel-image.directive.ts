import { Directive, TemplateRef, ElementRef, HostBinding, inject } from '@angular/core';
import { BsCarouselComponent } from '../carousel/carousel.component';

@Directive({
  selector: '*[bsCarouselImage]',
  standalone: false,
})
export class BsCarouselImageDirective {
  element = inject(ElementRef<HTMLElement>);
  carousel = inject(BsCarouselComponent);
  itemTemplate = inject(TemplateRef<any>);
  id = this.carousel.imageCounter++;
  isFirst = false;
}
