import { ContentChildren, Directive, Input, QueryList } from '@angular/core';
import { BsToggleButtonComponent } from '../../component/toggle-button.component';

@Directive({
  selector: '[bsToggleButtonGroup]',
  standalone: false,
  exportAs: 'bsToggleButtonGroup',
})
export class BsToggleButtonGroupDirective {
  @ContentChildren(BsToggleButtonComponent, { descendants: true }) toggleButtons!: QueryList<BsToggleButtonComponent>;
}
