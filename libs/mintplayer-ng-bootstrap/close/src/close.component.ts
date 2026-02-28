import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  selector: 'bs-close',
  templateUrl: './close.component.html',
  styleUrls: ['./close.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCloseComponent {
  click = output<void>();

  onClose(ev: MouseEvent) {
    this.click.emit();
    ev.stopImmediatePropagation();
  }
}
