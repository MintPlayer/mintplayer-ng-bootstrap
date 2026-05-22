import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, model, output } from '@angular/core';
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

  private destroyRef = inject(DestroyRef);

  type = input<Color>(Color.primary);
  colors = Color;

  isVisible = model<boolean>(true);

  afterOpenedOrClosed = output<boolean>();

  onAfterOpenedOrClosed(isVisible: boolean) {
    // During SSR prerender, the FadeInOut `done` callback can fire after
    // Angular has torn down the route's application — emitting on a
    // destroyed OutputRef hits NG0953 on every prerendered page.
    if (this.destroyRef.destroyed) return;
    this.afterOpenedOrClosed.emit(isVisible);
  }
}
