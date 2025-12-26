import { ChangeDetectionStrategy, Component, HostBinding, inject } from '@angular/core';
import { BsToastService } from '../../services/toast/toast.service';

@Component({
  selector: 'bs-toast-container',
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsToastContainerComponent {
  toastService = inject(BsToastService);

  @HostBinding('style.overflow-y') overflowY = 'auto';
}
