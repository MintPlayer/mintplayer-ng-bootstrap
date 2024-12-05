import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsDropdownDivider]',
  standalone: true,
})
export class BsDropdownDividerDirective {
  @HostBinding('class.dropdown-divider') dropdownDividerClass = true;
}
