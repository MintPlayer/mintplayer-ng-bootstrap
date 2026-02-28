import { Component, input, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'bs-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardComponent {
  readonly rounded = input(true);
}
