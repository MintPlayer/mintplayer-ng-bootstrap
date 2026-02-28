import { Component, ElementRef, signal, viewChild, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertComponent, BsAlertCloseComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';

@Component({
  selector: 'demo-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
  imports: [FormsModule, BsFormComponent, BsFormControlDirective, BsAlertComponent, BsAlertCloseComponent, BsInputGroupComponent, BsButtonTypeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertComponent {
  colors = Color;
  alert1Visible = signal(true);
  alert2Visible = signal(true);
  alert3Visible = signal(true);

  newAlertId = signal(1);
  newAlertItem = signal('');
  alertsList = signal<AlertItem[]>([]);
  readonly txtNewAlert = viewChild.required<ElementRef<HTMLInputElement>>('txtNewAlert');
  alertVisibleChange(alert: AlertItem, isVisible: boolean) {
    if (!isVisible) {
      this.alertsList.update(list => list.filter(a => a !== alert));
    }
  }
  addAlertItem() {
    this.alertsList.update(list => [...list, { id: this.newAlertId(), text: this.newAlertItem() }]);
    this.newAlertId.update(id => id + 1);
    this.newAlertItem.set('');
    this.txtNewAlert().nativeElement.focus();
  }
}

interface AlertItem {
  id: number;
  text: string;
}