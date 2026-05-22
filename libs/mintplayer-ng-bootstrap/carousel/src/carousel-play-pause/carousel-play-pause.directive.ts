import { Directive, inject, TemplateRef } from '@angular/core';
import { BsCarouselComponent } from '../carousel/carousel.component';
/**
 * Context exposed to a `*bsCarouselPlayPause` template — the consumer reads
 * `paused` to render the right glyph/label and calls `toggle` on click.
 *
 * Per PRD aria-accessibility-audit §13.2 (and the WAI-ARIA Authoring
 * Practices Carousel pattern): when a carousel auto-advances, it MUST
 * expose a visible, keyboard-operable play/pause control. The carousel
 * itself doesn't impose a button style — the consumer projects whatever
 * UI fits their app and reads the `paused` flag from this context.
 */
export interface BsCarouselPlayPauseContext {
  /** Whether the carousel is currently paused. Same value as `paused`. */
  $implicit: boolean;
  /** Whether the carousel is currently paused. */
  paused: boolean;
  /** Toggle the paused state. Mirrors the carousel's two-way `[(paused)]`. */
  toggle: () => void;
}

@Directive({
  selector: '[bsCarouselPlayPause]',
})
export class BsCarouselPlayPauseDirective {
  private templateRef = inject(TemplateRef<BsCarouselPlayPauseContext>);
  private carousel = inject(BsCarouselComponent);

  static ngTemplateContextGuard(
    _dir: BsCarouselPlayPauseDirective,
    ctx: unknown,
  ): ctx is BsCarouselPlayPauseContext {
    return true;
  }

  constructor() {
    this.carousel.playPauseTemplate.set(this.templateRef);
  }
}
