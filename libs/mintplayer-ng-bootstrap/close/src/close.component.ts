import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'bs-close',
  templateUrl: './close.component.html',
  styleUrls: ['./close.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCloseComponent {
  /** Accessible name for the close button. Override for localisation. */
  ariaLabel = input<string>('Close');

  click = output<void>();

  onClose(ev: MouseEvent) {
    this.click.emit();
    ev.stopImmediatePropagation();
  }
}
