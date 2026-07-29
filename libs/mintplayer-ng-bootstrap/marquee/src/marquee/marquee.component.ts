import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';

@Component({
  selector: 'bs-marquee',
  templateUrl: './marquee.component.html',
  styleUrls: ['./marquee.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsMarqueeComponent {
  readonly ariaLabel = input<string | null>(null);
  /** WCAG 2.2.2: moving content needs a pause affordance. */
  readonly paused = signal(false);

  togglePaused(): void {
    this.paused.update((paused) => !paused);
  }
}
