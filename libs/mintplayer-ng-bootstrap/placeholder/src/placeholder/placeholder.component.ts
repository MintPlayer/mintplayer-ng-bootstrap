import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

@Component({
  selector: 'bs-placeholder',
  templateUrl: './placeholder.component.html',
  styleUrls: ['./placeholder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-busy]': 'isLoading() ? "true" : null',
    '[attr.aria-live]': 'isLoading() ? "polite" : null',
  },
})
export class BsPlaceholderComponent {
  isLoading = model<boolean>(false);
}
