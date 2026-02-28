import { Directive, inject } from '@angular/core';
import { BsModalHostComponent } from '../../components/modal-host/modal-host.component';

@Directive({
  selector: '[bsModalClose]',
  standalone: false,
  host: {
    '[attr.aria-label]': '"Close"',
    '(click)': 'onClick()',
  },
})
export class BsModalCloseDirective {
  private host = inject(BsModalHostComponent);

  onClick() {
    this.host.isOpen.set(false);
  }
}
