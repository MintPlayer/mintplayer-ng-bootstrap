import { Directive, TemplateRef, ElementRef, HostBinding, inject, forwardRef } from '@angular/core';
import { BsCarouselComponent } from '../carousel/carousel.component';

@Directive({
  selector: '*[bsCarouselImage]',
  standalone: false,
})
export class BsCarouselImageDirective {

  public itemTemplate = inject(TemplateRef<any>);
  element = inject(ElementRef<HTMLElement>);
  carousel = inject(forwardRef(() => BsCarouselComponent));
  id = this.carousel.imageCounter++;
  isFirst = false;
}
