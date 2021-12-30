import { ContentChild, Directive, Input } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BsDropdownMenuDirective } from '../dropdown-menu/dropdown-menu.directive';
import { BsDropdownToggleDirective } from '../dropdown-toggle/dropdown-toggle.directive';

@Directive({
  selector: '[bsDropdown]'
})
export class BsDropdownDirective {

  public isOpen$ = new BehaviorSubject<boolean>(false);

  @ContentChild(BsDropdownMenuDirective, {static: false}) menu!: BsDropdownMenuDirective;
  @ContentChild(BsDropdownToggleDirective, {static: false}) toggle!: BsDropdownToggleDirective;
  
  @Input() public hasBackdrop = false;
  @Input() public closeOnClickOutside = false;
}
