import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';

@Component({
  selector: 'demo-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
  standalone: true,
  imports: [FormsModule, BsFormModule, BsAlertModule, BsInputGroupComponent, BsButtonTypeDirective]
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
}

interface AlertItem {
  id: number;
  text: string;
}