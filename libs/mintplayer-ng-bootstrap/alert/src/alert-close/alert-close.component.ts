import { Component } from '@angular/core';
import { BsAlertComponent } from '../alert/alert.component';

@Component({
  selector: 'bs-alert-close',
  templateUrl: './alert-close.component.html',
  styleUrls: ['./alert-close.component.scss'],
  standalone: false,
})
export class BsAlertCloseComponent {

  constructor(private alert: BsAlertComponent) {
  }

  closeAlert() {
    this.alert.isVisible.set(false);
    return false;
  }
  
}
