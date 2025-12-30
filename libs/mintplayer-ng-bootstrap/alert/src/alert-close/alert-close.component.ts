import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BsAlertComponent } from '../alert/alert.component';

@Component({
  selector: 'bs-alert-close',
  templateUrl: './alert-close.component.html',
  styleUrls: ['./alert-close.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsAlertCloseComponent {
  private alert = inject(BsAlertComponent);

  closeAlert() {
    this.alert.isVisible.set(false);
    return false;
  }

}
