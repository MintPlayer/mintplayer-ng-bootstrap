import { Directive } from '@angular/core';

@Directive({
  selector: '[bsModalBody]',
  standalone: false,
  host: {
    '[class.modal-body]': 'true',
  },
})
export class BsModalBodyDirective {
}
