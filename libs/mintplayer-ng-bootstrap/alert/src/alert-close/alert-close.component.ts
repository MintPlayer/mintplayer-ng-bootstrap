import { Component, inject } from '@angular/core';
import { BsAlertComponent } from '../alert/alert.component';

@Component({
  selector: 'bs-alert-close',
  templateUrl: './alert-close.component.html',
  styleUrls: ['./alert-close.component.scss'],
  standalone: false,
})
export class BsAlertCloseComponent {

  alert = inject(BsAlertComponent);

  closeAlert() {
    this.alert.isVisible = false;
    return false;
  }
  
}
