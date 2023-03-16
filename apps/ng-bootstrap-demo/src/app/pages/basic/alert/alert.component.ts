import { Component, ElementRef, ViewChild } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss']
})
export class AlertComponent {
  colors = Color;
  alert1Visible = true;
  alert2Visible = true;
  alert3Visible = true;

  newAlertId = 1;
  newAlertItem = '';
  alertsList: AlertItem[] = [];
  @ViewChild('txtNewAlert') txtNewAlert!: ElementRef<HTMLInputElement>;
  alertVisibleChange(alert: AlertItem, isVisible: boolean) {
    if (!isVisible) {
      this.alertsList.splice(this.alertsList.indexOf(alert), 1);
    }
  }
  addAlertItem() {
    this.alertsList.push({ id: this.newAlertId++, text: this.newAlertItem });
    this.newAlertItem = '';
    this.txtNewAlert.nativeElement.focus();
  }

  trackByAlertItem(index: number, item: AlertItem) {
    return item.id;
  }
}

interface AlertItem {
  id: number;
  text: string;
}