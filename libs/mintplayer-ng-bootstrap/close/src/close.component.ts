import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapClose } from '@mintplayer/ui-core/bootstrap/close';

@Component({
  selector: 'bs-close',
  templateUrl: './close.component.html',
  styleUrls: ['./close.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCloseComponent {
  constructor() {
    // #452: the close partial ships with this component, scoped to the elements it stamps (data-mps="close").
    useBootstrap(bootstrapClose);
  }

  /** Accessible name for the close button. Override for localisation. */
  ariaLabel = input<string>('Close');

  click = output<void>();

  onClose(ev: MouseEvent) {
    this.click.emit();
    ev.stopImmediatePropagation();
  }
}
