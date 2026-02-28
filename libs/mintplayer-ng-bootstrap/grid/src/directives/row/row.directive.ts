import { Directive } from '@angular/core';

@Directive({
  selector: '[bsRow]',
  standalone: false,
  host: {
    '[class.row]': 'true',
  },
})
export class BsGridRowDirective {
}
