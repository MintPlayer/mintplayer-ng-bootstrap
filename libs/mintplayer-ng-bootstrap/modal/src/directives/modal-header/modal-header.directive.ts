import { Directive } from '@angular/core';

@Directive({
  selector: '[bsModalHeader]',
  standalone: true,
  host: {
    '[class.modal-header]': 'true',
  },
})
export class BsModalHeaderDirective {
}
