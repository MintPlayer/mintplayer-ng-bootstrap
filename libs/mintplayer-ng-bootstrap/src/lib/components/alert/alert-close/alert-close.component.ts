import { Component } from '@angular/core';
import { BsAlertComponent } from '../alert/alert.component';

@Component({
  selector: 'bs-alert-close',
  templateUrl: './alert-close.component.html',
  styleUrls: ['./alert-close.component.scss']
})
export class BsAlertCloseComponent {

  constructor(private alert: BsAlertComponent) {
  }

  closeAlert() {
    this.alert.isVisible = false;
    return false;
  }
  
}
