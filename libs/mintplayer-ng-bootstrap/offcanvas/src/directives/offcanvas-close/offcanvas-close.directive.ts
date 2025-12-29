import { Directive, HostBinding, HostListener, inject } from '@angular/core';
import { BsOffcanvasHostComponent } from '../../components/offcanvas-host/offcanvas-host.component';

@Directive({
  selector: '[bsOffcanvasClose]',
  standalone: false,
})
export class BsOffcanvasCloseDirective {
  private offcanvas = inject(BsOffcanvasHostComponent);

  @HostBinding('attr.aria-label') ariaLabel = 'Close';

  @HostListener('click') onClick() {
    this.offcanvas.isVisible.set(false);
  }
}
