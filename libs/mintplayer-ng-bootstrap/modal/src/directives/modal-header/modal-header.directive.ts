import { Directive } from '@angular/core';

@Directive({
  selector: '[bsModalHeader]',
  standalone: false,
  host: {
    '[class.modal-header]': 'true',
  },
})
export class BsModalHeaderDirective {
}
