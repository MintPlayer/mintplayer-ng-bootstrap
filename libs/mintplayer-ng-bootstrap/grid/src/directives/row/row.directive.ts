import { Directive, HostBinding } from '@angular/core';

@Directive({
  selector: '[bsRow]',
  standalone: false,
})
export class BsGridRowDirective {
  @HostBinding('class.row') rowClass = true;
}
