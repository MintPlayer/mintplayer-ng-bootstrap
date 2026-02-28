import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BsToastService } from '../../services/toast/toast.service';

@Component({
  selector: 'bs-toast-container',
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.overflow-y]': '"auto"',
  },
})
export class BsToastContainerComponent {
  toastService = inject(BsToastService);
}
