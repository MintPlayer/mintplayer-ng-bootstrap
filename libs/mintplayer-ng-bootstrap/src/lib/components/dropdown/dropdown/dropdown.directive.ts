import { ContentChild, Directive } from '@angular/core';
import { BsDropdownMenuDirective, BsDropdownToggleDirective } from '@mintplayer/ng-bootstrap';
import { BehaviorSubject } from 'rxjs';

@Directive({
  selector: '[bsDropdown]'
})
export class BsDropdownDirective {

  public isOpen$ = new BehaviorSubject<boolean>(false);

  @ContentChild(BsDropdownMenuDirective, {static: false}) menu!: BsDropdownMenuDirective;
  @ContentChild(BsDropdownToggleDirective, {static: false}) toggle!: BsDropdownToggleDirective;
  
}
