import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsRow]'
})
export class BsGridRowDirective {
  @HostBinding('class.row') rowClass = true;
}
