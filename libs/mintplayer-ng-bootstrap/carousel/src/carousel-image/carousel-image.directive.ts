import { Directive, TemplateRef } from '@angular/core';

@Directive({
  selector: '*[bsCarouselImage]'
})
export class BsCarouselImageDirective {

  public itemTemplate: TemplateRef<any>;
  
  constructor(private templateRef: TemplateRef<any>) {
    this.itemTemplate = this.templateRef;
  }
}
