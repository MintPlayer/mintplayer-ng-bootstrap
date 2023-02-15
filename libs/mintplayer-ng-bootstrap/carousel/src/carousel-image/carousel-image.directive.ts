import { Directive, TemplateRef, HostBinding } from '@angular/core';

@Directive({
  selector: '*[bsCarouselImage]'
})
export class BsCarouselImageDirective {

  public itemTemplate: TemplateRef<any>;
  
  constructor(private templateRef: TemplateRef<any>) {
    this.itemTemplate = this.templateRef;
  }

  @HostBinding('class.w-100') width100class = true;
}
