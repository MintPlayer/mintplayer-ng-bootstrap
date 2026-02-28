import { Directive, inject, input } from '@angular/core';
import { BsToastService } from '../../services/toast/toast.service';
import { BsToastComponent } from '../../components/toast/toast.component';

@Directive({
  selector: 'bs-close',
  host: {
    '(click)': 'onClick()',
  },
})
export class BsToastCloseDirective {
  private toast = inject(BsToastComponent);
  private toastService = inject(BsToastService);

  onClick() {
    if (this.index() !== null) {
      this.toastService.close(this.index()!);
    }
  }

  readonly index = input<number | null>(null);
}
