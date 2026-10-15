import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

// `.badge` paints white text, and `bg-{color}` sets only the background: white
// on warning was 1.63:1. Bootstrap's `text-bg-{color}` pairs each theme colour
// with the text colour color-contrast() picks (black on warning, info and light).
// It exists for the eight theme colours only; the other three pair a background
// with a text utility, the way `<bs-card [color]>` colours them.
const pairedColorClasses: Partial<Record<Color, string>> = {
  [Color.body]: 'bg-body text-body',
  [Color.white]: 'bg-white text-black',
  [Color.transparent]: 'bg-transparent text-reset',
};

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

  colorClass = computed(() => pairedColorClasses[this.type()] ?? `text-bg-${this.colors[this.type()]}`);
}
