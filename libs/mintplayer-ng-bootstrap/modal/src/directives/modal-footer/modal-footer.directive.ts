import { Directive } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapModal } from '@mintplayer/ui-core/bootstrap';

@Directive({
  selector: '[bsModalFooter]',
  host: {
    '[attr.data-mps]': '"modal"',
    '[class.modal-footer]': 'true',
  },
})
export class BsModalFooterDirective {
  constructor() {
    // #452: the modal partial ships with this component, scoped to the elements it stamps (data-mps="modal").
    useBootstrap(bootstrapModal);
  }

}
