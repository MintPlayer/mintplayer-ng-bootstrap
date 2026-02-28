import { Directive } from '@angular/core';

@Directive({
  selector: '[bsRow]',
  host: {
    '[class.row]': 'true',
  },
})
export class BsGridRowDirective {
}
