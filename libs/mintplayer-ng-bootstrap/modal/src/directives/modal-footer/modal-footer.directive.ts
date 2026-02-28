import { Directive } from '@angular/core';

@Directive({
  selector: '[bsModalFooter]',
  standalone: true,
  host: {
    '[class.modal-footer]': 'true',
  },
})
export class BsModalFooterDirective {
}
