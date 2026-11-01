import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import type { BootstrapPart } from './parts';

/**
 * Install Bootstrap parts at document level through the scoped-style registry
 * (#452): once per page and key, cross-bundle safe, recorded for the server
 * head during SSR. A `…Page` (verbatim) part replaces a scoped copy already
 * installed under its key; a scoped part never downgrades a verbatim one.
 * Order does not matter: every part sits in its own `mp.bootstrap.<partial>`
 * sublayer, in stock Bootstrap order.
 *
 * React, Vue and Lit fronts call this; Angular fronts use `useBootstrap`
 * (`@mintplayer/ng-bootstrap/machine`), which also writes the server `DOCUMENT`.
 */
export function installBootstrap(...parts: readonly BootstrapPart[]): void {
  parts.forEach((part) => installLightStyles(part.key, part.css, { replace: part.page }));
}
