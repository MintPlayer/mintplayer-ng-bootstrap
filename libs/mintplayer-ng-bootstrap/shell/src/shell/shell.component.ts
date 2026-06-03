import { afterNextRender, ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, input, output, viewChild } from '@angular/core';
import { Breakpoint } from '@mintplayer/ng-bootstrap';
import type { MpShell, ShellStateChangeEventDetail } from '@mintplayer/web-components/shell';
import { BsShellState } from '../shell-state';

/**
 * `<bs-shell>` — Angular wrapper around the `<mp-shell>` web component.
 *
 * Layout, the responsive `auto` behaviour and the no-JS toggle all live in the
 * WC (single source of truth). This wrapper only bridges inputs to attributes
 * and projects content into the WC's slots:
 *  - mark the sidebar element with `bsShellSidebar` (→ `slot="sidebar"`);
 *  - everything else becomes the main content.
 *
 * The WC is registered **client-side only** (`afterNextRender`); on the server
 * Angular emits a bare `<mp-shell>` tag and the SSR layer injects its
 * Declarative Shadow DOM (see `injectMpShellDsd`), so it renders with JS off.
 */
@Component({
  selector: 'bs-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BsShellComponent {
  readonly state = input<BsShellState>('auto');
  readonly breakpoint = input<Breakpoint>('md');
  /** Auto-close the overlay drawer when a sidebar link is clicked (narrow mode only). */
  readonly dismissOnNavigate = input(false);

  /** Fires when the sidebar toggle flips (re-emits the WC's `statechange`). */
  readonly statechange = output<ShellStateChangeEventDetail>();

  private readonly shellRef = viewChild.required<ElementRef<MpShell>>('wc');

  protected onStatechange(event: Event) {
    // The WC's `statechange` is a general-purpose DOM event (bubbles + composed).
    // In Angular the public API is this typed `output()`, so consume the raw
    // event here. Without `stopPropagation` it keeps bubbling to the consumer's
    // `<bs-shell>` host, where their `(statechange)` binding fires a SECOND time
    // with the raw `CustomEvent` (Angular doesn't unwrap `.detail`), clobbering
    // whatever the typed emit just set.
    event.stopPropagation();
    this.statechange.emit((event as CustomEvent<ShellStateChangeEventDetail>).detail);
  }

  constructor() {
    afterNextRender(() => {
      // Side-effect import registers <mp-shell>; client-only so SSR stays a
      // bare tag for DSD injection.
      import('@mintplayer/web-components/shell');
    });
  }

  /** Set the expanded sidebar width (any CSS length, e.g. `'20rem'`). */
  setSize(size: string) {
    this.shellRef().nativeElement.setAttribute('size', size);
  }

  /** Programmatically open/close the sidebar (no-op until the WC has upgraded). */
  toggle(force?: boolean) {
    this.shellRef().nativeElement.toggle?.(force);
  }
}
