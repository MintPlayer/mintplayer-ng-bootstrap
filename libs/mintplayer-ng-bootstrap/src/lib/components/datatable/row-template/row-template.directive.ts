import { Directive, TemplateRef } from '@angular/core';
import { BsDatatableComponent } from '../datatable/datatable.component';

@Directive({
  selector: '[bsRowTemplate]'
})
export class BsRowTemplateDirective {

  constructor(private datatableComponent: BsDatatableComponent, templateRef: TemplateRef<any>) {
    this.datatableComponent.rowTemplate = templateRef;
  }

}
