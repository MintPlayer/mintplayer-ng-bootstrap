import { Directive, TemplateRef, HostBinding, QueryList, ContentChildren } from '@angular/core';

@Directive({
  selector: '*[bsCarouselPreviewImage]'
})
export class BsCarouselPreviewImageDirective {

  public itemTemplate: TemplateRef<any>;
  
  constructor(private templateRef: TemplateRef<any>) {
    this.itemTemplate = this.templateRef;
  }

  @HostBinding('class.w-100') width100class = true;
}
