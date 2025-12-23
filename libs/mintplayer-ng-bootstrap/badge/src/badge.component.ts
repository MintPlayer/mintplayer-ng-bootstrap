import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-badge',
  standalone: true,
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsBadgeComponent {
  colors = Color;

  type = input<Color>(Color.primary);

  colorClass = computed(() => `bg-${this.colors[this.type()]}`);
}
