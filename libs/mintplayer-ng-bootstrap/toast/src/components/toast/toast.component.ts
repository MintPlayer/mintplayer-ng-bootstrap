import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input } from '@angular/core';
import { BsLiveAnnouncerService } from '@mintplayer/ng-bootstrap/a11y';

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

  private readonly announcer = inject(BsLiveAnnouncerService);
  private readonly host = inject(ElementRef) as ElementRef<HTMLElement>;

  constructor() {
    // The old channel was role/aria-live ON the toast div — but the toast and
    // its text mount in one task (ngTemplateOutlet), which most SRs never
    // announce. The shared announcer region pre-exists, so routing the text
    // through it on the show transition is reliably spoken.
    effect(() => {
      if (!this.isVisible()) return;
      const politeness = this.politeness();
      queueMicrotask(() => {
        const text = this.host.nativeElement.textContent?.trim();
        if (text) void this.announcer.announce(text, politeness);
      });
    });
  }
}
