import { Directive } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapDropdown } from '@mintplayer/ui-core/bootstrap';

@Directive({
  selector: '[bsDropdownDivider]',
  host: {
    '[attr.data-mps]': '"dropdown"',
    '[class.dropdown-divider]': 'true',
  },
})
export class BsDropdownDividerDirective {
  constructor() {
    // #452: the dropdown partial ships with this component, scoped to the elements it stamps (data-mps="dropdown").
    useBootstrap(bootstrapDropdown);
  }

}
