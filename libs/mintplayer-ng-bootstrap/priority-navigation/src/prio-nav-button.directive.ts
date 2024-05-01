import { Directive, TemplateRef } from '@angular/core';
import { BsPrioNavComponent } from './component/prio-nav.component';

@Directive({
  selector: '[bsPrioNavButton]',
})
export class BsPrioNavButtonDirective {
  constructor(component: BsPrioNavComponent, template: TemplateRef<any>) {
    component.buttonTemplate = template;
  }
}
