import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsDropdownDivider]'
})
export class BsDropdownDividerDirective {
  @HostBinding('class.dropdown-divider') dropdownDividerClass = true;
}
