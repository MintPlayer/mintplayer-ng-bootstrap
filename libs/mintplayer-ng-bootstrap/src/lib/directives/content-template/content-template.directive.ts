import { Directive, TemplateRef } from '@angular/core';

@Directive({
  selector: '[contentTemplate]'
})
export class BsContentTemplateDirective {

  constructor(private templateRef: TemplateRef<any>) {
    this.contentTemplate = templateRef;
  }

  public contentTemplate: TemplateRef<any>;

}
