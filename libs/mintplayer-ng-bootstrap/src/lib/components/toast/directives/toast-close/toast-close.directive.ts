import { Directive, HostListener, Input } from '@angular/core';
import { BsToastService } from '../../services/toast/toast.service';
import { BsToastComponent } from '../../components/toast/toast.component';

@Directive({
  selector: 'bs-close'
})
export class BsToastCloseDirective {

  constructor(private toast: BsToastComponent, private toastService: BsToastService) {
  }

  @HostListener('click') onClick() {
    if (this.index !== null) {
      this.toastService.close(this.index);
    }
  }

  @Input() index: number | null = null;
}
