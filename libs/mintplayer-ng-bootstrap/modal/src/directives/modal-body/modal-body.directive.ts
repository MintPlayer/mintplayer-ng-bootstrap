import { Directive } from '@angular/core';

@Directive({
  selector: '[bsModalBody]',
  standalone: true,
  host: {
    '[class.modal-body]': 'true',
  },
})
export class BsModalBodyDirective {
}
