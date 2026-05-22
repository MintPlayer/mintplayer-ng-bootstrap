import { Component, ElementRef, model, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertComponent, BsAlertCloseComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
  imports: [FormsModule, BsCodeSnippetComponent, BsFormComponent, BsFormControlDirective, BsAlertComponent, BsAlertCloseComponent, BsInputGroupComponent, BsButtonTypeDirective],
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
    <bs-alert [type]="colors.info" [(isVisible)]="isVisible">
      Heads up — something noteworthy happened.
      <bs-alert-close></bs-alert-close>
    </bs-alert>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsAlertComponent, BsAlertCloseComponent } from '@mintplayer/ng-bootstrap/alert';
    @Component({
      selector: 'my-alert-demo',
      templateUrl: './my-alert-demo.component.html',
      imports: [BsAlertComponent, BsAlertCloseComponent],
    })
    export class MyAlertDemoComponent {
      protected readonly colors = Color;
      protected isVisible = true;
    }
  `;

  protected readonly snippetStaticHtml = dedent`
    <!-- Stack of static, dismissible alerts -->
    <bs-alert [type]="colors.warning" [(isVisible)]="alert1Visible">
      Heads up.
      <bs-alert-close></bs-alert-close>
    </bs-alert>
    <bs-alert [type]="colors.danger" [(isVisible)]="alert2Visible">
      Something went wrong.
      <bs-alert-close></bs-alert-close>
    </bs-alert>
  `;

  protected readonly snippetListHtml = dedent`
    <!-- Dynamic list: remove an entry when its alert finishes closing.
         (afterOpenedOrClosed) emits true on open, false on close. -->
    @for (alertItem of alertsList(); track alertItem.id) {
      <bs-alert [type]="colors.danger"
                (afterOpenedOrClosed)="alertVisibleChange(alertItem, $event)">
        {{ alertItem.text }}
        <bs-alert-close></bs-alert-close>
      </bs-alert>
    }
  `;
}

interface AlertItem {
  id: number;
  text: string;
}