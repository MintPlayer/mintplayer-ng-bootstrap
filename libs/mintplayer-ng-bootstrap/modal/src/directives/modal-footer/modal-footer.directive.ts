import { Directive } from '@angular/core';

@Directive({
  selector: '[bsModalFooter]',
  host: {
    '[class.modal-footer]': 'true',
  },
})
export class BsModalFooterDirective {
}
