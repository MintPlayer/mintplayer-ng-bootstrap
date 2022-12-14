import { Directive, Input } from '@angular/core';

@Directive({
  selector: '[bsDropdown]'
})
export class BsDropdownMockDirective {
  @Input() public hasBackdrop = false;
  @Input() public closeOnClickOutside = false;
}
