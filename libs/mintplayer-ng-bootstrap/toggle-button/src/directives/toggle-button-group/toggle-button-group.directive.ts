import { contentChildren, Directive } from '@angular/core';
import { BsToggleButtonComponent } from '../../component/toggle-button.component';

@Directive({
  selector: '[bsToggleButtonGroup]',
  exportAs: 'bsToggleButtonGroup',
})
export class BsToggleButtonGroupDirective {
  readonly toggleButtons = contentChildren(BsToggleButtonComponent, { descendants: true });
}
