import { Directive } from '@angular/core';

@Directive({
  selector: '[bsModalBody]',
  host: {
    '[class.modal-body]': 'true',
  },
})
export class BsModalBodyDirective {
}
