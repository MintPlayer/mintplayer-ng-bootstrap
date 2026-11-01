import { Directive } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapGrid } from '@mintplayer/ui-core/bootstrap';

/**
 * Puts Bootstrap's `.row` on the element. The directive owns that class, so it
 * stamps the element (`data-mps`) and installs the grid part (#452): the
 * scoped part matches only stamped elements.
 */
@Directive({
  selector: '[bsRow]',
  host: {
    '[class.row]': 'true',
    '[attr.data-mps]': '"grid"',
  },
})
export class BsGridRowDirective {
  constructor() {
    useBootstrap(bootstrapGrid);
  }
}
