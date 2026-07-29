import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-badge',
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsBadgeComponent {
  colors = Color;

  type = input<Color>(Color.primary);
  /**
   * What the number counts ('unread messages'): a bare '3' badge is
   * meaningless out of visual context. Appended visually hidden.
   */
  unit = input<string | null>(null);
  /** Purely decorative badges leave the accessibility tree entirely. */
  decorative = input(false);

  colorClass = computed(() => `bg-${this.colors[this.type()]}`);
}
