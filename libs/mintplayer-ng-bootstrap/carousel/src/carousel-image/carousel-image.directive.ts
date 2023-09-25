import { Directive, TemplateRef, ElementRef, HostBinding } from '@angular/core';
import { BsCarouselComponent } from '../carousel/carousel.component';

@Directive({
  selector: '*[bsCarouselImage]'
})
export class BsCarouselImageDirective {

  public itemTemplate: TemplateRef<any>;
  
  constructor(private templateRef: TemplateRef<any>, carousel: BsCarouselComponent, private element: ElementRef<HTMLElement>) {
    this.itemTemplate = this.templateRef;
    this.id = carousel.imageCounter++;
  }
  
  id: number;
  isFirst = false;
}
