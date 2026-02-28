import { Directive } from '@angular/core';

@Directive({
  selector: '[bsRow]',
  standalone: true,
  host: {
    '[class.row]': 'true',
  },
})
export class BsGridRowDirective {
}
