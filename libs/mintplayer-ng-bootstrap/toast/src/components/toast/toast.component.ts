import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'bs-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsToastComponent {
  isVisible = input(false);
}
