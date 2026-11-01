import { Directive } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapGrid } from '@mintplayer/ui-core/bootstrap';

@Directive({
  selector: '[bsRow]',
  host: {
    '[class.row]': 'true',
  },
})
export class BsGridRowDirective {
  // Bootstrap's grid CSS ships with the directive, not page-wide (#452).
  constructor() {
    useBootstrap(bootstrapGrid);
  }
}
