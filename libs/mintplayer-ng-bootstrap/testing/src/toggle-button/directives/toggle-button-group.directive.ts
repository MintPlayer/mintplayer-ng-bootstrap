import { ContentChildren, Directive, QueryList } from '@angular/core';
import { BsToggleButtonComponent, BsToggleButtonGroupDirective } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsToggleButtonMockComponent } from '../toggle-button/toggle-button.component';

@Directive({
  selector: '[bsToggleButtonGroup]',
  providers: [
    { provide: BsToggleButtonGroupDirective, useExisting: BsToggleButtonGroupMockDirective }
  ],
  exportAs: 'bsToggleButtonGroup'
})
export class BsToggleButtonGroupMockDirective {
  @ContentChildren(BsToggleButtonComponent, { descendants: true }) toggleButtons!: QueryList<BsToggleButtonMockComponent>;
}
