import { Directive } from '@angular/core';

@Directive({
  selector: '[bsModalFooter]',
  standalone: false,
  host: {
    '[class.modal-footer]': 'true',
  },
})
export class BsModalFooterDirective {
}
