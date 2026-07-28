import { Component, inject, ChangeDetectionStrategy} from '@angular/core';
import { BsAlertComponent } from '../alert/alert.component';

@Component({
  selector: 'bs-alert-close',
  templateUrl: './alert-close.component.html',
  styleUrls: ['./alert-close.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsAlertCloseComponent {
  private alert = inject(BsAlertComponent);

  closeAlert() {
    // Order matters: the rescue must read focus while the button still exists.
    this.alert.rescueFocus();
    this.alert.isVisible.set(false);
    return false;
  }

}
