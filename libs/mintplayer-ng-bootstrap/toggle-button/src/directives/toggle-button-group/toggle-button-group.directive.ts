import { ContentChildren, Directive, Input, QueryList } from '@angular/core';
import { BsToggleButtonComponent } from '../../component/toggle-button.component';

@Directive({
  selector: '[bsToggleButtonGroup]',
  exportAs: 'bsToggleButtonGroup'
})
export class BsToggleButtonGroupDirective {

  constructor() { }

  @ContentChildren(BsToggleButtonComponent, { descendants: true }) toggleButtons!: QueryList<BsToggleButtonComponent>;
}
