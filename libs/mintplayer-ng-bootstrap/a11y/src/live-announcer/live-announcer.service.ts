import { LiveAnnouncer, AriaLivePoliteness } from '@angular/cdk/a11y';
import { inject, Injectable } from '@angular/core';

/**
 * Thin wrapper over CDK's LiveAnnouncer that dedupes consecutive identical
 * messages — typeahead-style "5 results" announcements often re-fire with the
 * same content and screen readers re-read them, which is noise.
 */
@Injectable({ providedIn: 'root' })
export class BsLiveAnnouncerService {
  private cdk = inject(LiveAnnouncer);
  private last: { message: string; politeness: AriaLivePoliteness } | null = null;

  announce(message: string, politeness: AriaLivePoliteness = 'polite', durationMs?: number): Promise<void> {
    if (this.last && this.last.message === message && this.last.politeness === politeness) {
      return Promise.resolve();
    }
    this.last = { message, politeness };
    return this.cdk.announce(message, politeness, durationMs);
  }

  clear(): void {
    this.last = null;
    this.cdk.clear();
  }
}
