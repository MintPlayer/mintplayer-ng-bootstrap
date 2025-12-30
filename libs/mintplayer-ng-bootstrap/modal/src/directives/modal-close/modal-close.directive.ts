import { Directive, HostBinding, HostListener, inject } from '@angular/core';
import { BsModalHostComponent } from '../../components/modal-host/modal-host.component';

@Directive({
  selector: '[bsModalClose]',
  standalone: false,
})
export class BsModalCloseDirective {
  private host = inject(BsModalHostComponent);

  @HostBinding('attr.aria-label') ariaLabel = 'Close';

  @HostListener('click') onClick() {
    this.host.isOpen.set(false);
  }
}
