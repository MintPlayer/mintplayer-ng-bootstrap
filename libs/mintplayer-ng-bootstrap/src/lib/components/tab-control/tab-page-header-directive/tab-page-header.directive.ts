import { Directive, TemplateRef } from '@angular/core';
import { BsTabPageComponent } from '../tab-page/tab-page.component';

@Directive({
  selector: '[tabPageHeader]'
})
export class TabPageHeaderDirective {

  constructor(tabPage: BsTabPageComponent, templateRef: TemplateRef<any>) {
    tabPage.headerTemplate = templateRef;
  }

}
