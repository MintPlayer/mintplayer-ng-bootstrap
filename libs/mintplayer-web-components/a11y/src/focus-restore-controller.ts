import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { FocusRestore } from '@mintplayer/ui-core/focus';

/**
 * Lit sugar for hosts whose rebuild happens inside Lit's own update cycle
 * (a `lit-html` re-render rather than a manual `innerHTML` wipe). Captures
 * before Lit commits DOM and restores immediately after, so no
 * `requestAnimationFrame` is involved.
 *
 * Composes with `LiveAnnouncerController` by construction — pass
 * `announce: (m) => this.liveAnnouncer.announce(m)` in the options. Neither
 * class imports the other.
 */
export class FocusRestoreController implements ReactiveController {
  constructor(
    host: ReactiveControllerHost,
    private readonly inner: FocusRestore,
  ) {
    host.addController(this);
  }

  hostUpdate(): void {
    this.inner.capture();
  }

  hostUpdated(): void {
    this.inner.restore();
  }
}
