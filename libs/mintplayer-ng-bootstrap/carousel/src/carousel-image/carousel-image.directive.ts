import { Directive, TemplateRef, HostBinding } from '@angular/core';
import { BsCarouselComponent } from '../carousel/carousel.component';

@Directive({
  selector: '*[bsCarouselImage]'
})
export class BsCarouselImageDirective {

  public itemTemplate: TemplateRef<any>;
  
  constructor(private templateRef: TemplateRef<any>, carousel: BsCarouselComponent) {
    this.itemTemplate = this.templateRef;
    this.id = carousel.imageCounter++;
  }

  id: number;
  @HostBinding('class.w-100') width100class = true;
}
