import { ChangeDetectionStrategy, Component, effect, inject, input, model } from '@angular/core';
import { BsLiveAnnouncerService } from '@mintplayer/ng-bootstrap/a11y';

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
  private announcer = inject(BsLiveAnnouncerService);

  isLoading = model<boolean>(false);
  loadingCompleteText = input<string>('Loading complete');

  private wasLoading = false;

  constructor() {
    effect(() => {
      const isLoading = this.isLoading();
      if (this.wasLoading && !isLoading) {
        this.announcer.announce(this.loadingCompleteText());
      }
      this.wasLoading = isLoading;
    });
  }
}
