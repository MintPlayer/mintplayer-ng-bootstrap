import { Directive } from '@angular/core';

@Directive({
  selector: '[bsModalHeader]',
  host: {
    '[class.modal-header]': 'true',
  },
})
export class BsModalHeaderDirective {
}
