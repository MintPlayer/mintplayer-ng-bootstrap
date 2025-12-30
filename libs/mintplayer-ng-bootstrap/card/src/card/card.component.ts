import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'bs-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardComponent {
  @Input() rounded = true;
}
