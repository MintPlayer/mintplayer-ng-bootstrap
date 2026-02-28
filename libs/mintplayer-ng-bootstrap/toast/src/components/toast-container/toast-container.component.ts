import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, inject } from '@angular/core';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsAddPropertiesPipe } from '../../pipes/add-properties.pipe';
import { BsToastService } from '../../services/toast/toast.service';

@Component({
  selector: 'bs-toast-container',
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.scss'],
  imports: [NgTemplateOutlet, BsHasOverlayComponent, BsAddPropertiesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.overflow-y]': '"auto"',
  },
})
export class BsToastContainerComponent {
  toastService = inject(BsToastService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    effect(() => {
      this.toastService.toasts();
      this.cdr.markForCheck();
    });
  }
}
