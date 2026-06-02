import { afterNextRender, ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, input, viewChild } from '@angular/core';
import { Breakpoint } from '@mintplayer/ng-bootstrap';
import type { MpShell } from '@mintplayer/web-components/shell';
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

  private readonly shellRef = viewChild.required<ElementRef<MpShell>>('wc');

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
