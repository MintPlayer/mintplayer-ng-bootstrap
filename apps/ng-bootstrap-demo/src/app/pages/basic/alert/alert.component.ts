import { Component, ElementRef, model, signal, viewChild, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
  imports: [FormsModule, BsCodeSnippetComponent, BsFormComponent, BsFormControlDirective, BsAlertComponent, BsInputGroupComponent, BsButtonTypeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertComponent {
  colors = Color;
  alert1Visible = model(true);
  alert2Visible = model(true);
  alert3Visible = model(true);

  newAlertId = signal(1);
  newAlertItem = model('');
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

  protected readonly snippetBasicHtml = dedent`
    <bs-alert color="info" [(visible)]="isVisible" dismissible>
      Heads up — something noteworthy happened.
    </bs-alert>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';

    @Component({
      selector: 'my-alert-demo',
      templateUrl: './my-alert-demo.component.html',
      imports: [BsAlertComponent],
    })
    export class MyAlertDemoComponent {
      protected readonly colors = Color;
      protected isVisible = true;
    }
  `;

  protected readonly snippetStaticHtml = dedent`
    <!-- Stack of static, dismissible alerts -->
    <bs-alert color="warning" [(visible)]="alert1Visible" dismissible>
      Heads up.
    </bs-alert>
    <bs-alert color="danger" [(visible)]="alert2Visible" dismissible>
      Something went wrong.
    </bs-alert>
  `;

  protected readonly snippetListHtml = dedent`
    <!-- Dynamic list: remove an entry when the user dismisses its alert.
         (visibleChange) emits false on dismiss. -->
    @for (alertItem of alertsList(); track alertItem.id) {
      <bs-alert color="danger"
                (visibleChange)="alertVisibleChange(alertItem, $event)" dismissible>
        {{ alertItem.text }}
      </bs-alert>
    }
  `;
}

interface AlertItem {
  id: number;
  text: string;
}