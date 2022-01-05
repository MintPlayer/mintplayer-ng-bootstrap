import { Directive, TemplateRef } from '@angular/core';
import { BsSelect2Component } from '../component/select2.component';

@Directive({
  selector: '[bsItemTemplate]'
})
export class BsItemTemplateDirective {

  constructor(private select2component: BsSelect2Component, templateRef: TemplateRef<any>) {
    this.select2component.itemTemplate = templateRef;
  }

}
