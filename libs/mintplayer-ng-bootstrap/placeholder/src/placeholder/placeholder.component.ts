import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

@Component({
  selector: 'bs-placeholder',
  templateUrl: './placeholder.component.html',
  styleUrls: ['./placeholder.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsPlaceholderComponent {
  isLoading = model<boolean>(false);
}
