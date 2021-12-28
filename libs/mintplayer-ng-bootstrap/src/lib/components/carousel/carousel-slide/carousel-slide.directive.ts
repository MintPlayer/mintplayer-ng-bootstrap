import { Directive, TemplateRef } from '@angular/core';

@Directive({
  selector: '[bsCarouselSlide]'
})
export class BsCarouselSlideDirective {

  constructor(template: TemplateRef<any>) {
    this._template = template;
  }

  private _template: TemplateRef<any>;
  public get template() {
    return this._template;
  }

}
