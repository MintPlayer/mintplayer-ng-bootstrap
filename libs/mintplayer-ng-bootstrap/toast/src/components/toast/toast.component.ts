import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
export type BsToastPoliteness = 'polite' | 'assertive';

@Component({
  selector: 'bs-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsToastComponent {
  isVisible = input(false);
  /** SR announcement urgency. 'assertive' for time-critical (errors), 'polite' for everything else. */
  politeness = input<BsToastPoliteness>('assertive');

  readonly toastRole = computed(() => this.politeness() === 'assertive' ? 'alert' : 'status');
}
