import { ContentChildren, Directive, QueryList } from '@angular/core';
import { BsToggleButtonMockComponent } from '../toggle-button/toggle-button.component';

@Directive({
  selector: '[bsToggleButtonGroup]'
})
export class BsToggleButtonGroupMockDirective {
  @ContentChildren(BsToggleButtonMockComponent, { descendants: true }) toggleButtons!: QueryList<BsToggleButtonMockComponent>;
}
