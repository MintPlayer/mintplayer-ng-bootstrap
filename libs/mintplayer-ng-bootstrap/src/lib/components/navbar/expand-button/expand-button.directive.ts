import { Directive, TemplateRef } from '@angular/core';
import { BsNavbarComponent } from '../navbar/navbar.component';

@Directive({
  selector: '[bsExpandButton]'
})
export class BsExpandButtonDirective {

  constructor(navbar: BsNavbarComponent, templateRef: TemplateRef<any>) {
    navbar.expandButtonTemplate = templateRef;
  }

}
