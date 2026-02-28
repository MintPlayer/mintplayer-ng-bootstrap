import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
  animations: [ FadeInOutAnimation ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsAlertComponent {

  type = input<Color>(Color.primary);
  colors = Color;

  isVisible = model<boolean>(true);

  afterOpenedOrClosed = output<boolean>();

  onAfterOpenedOrClosed(isVisible: boolean) {
    this.afterOpenedOrClosed.emit(isVisible);
  }
}
