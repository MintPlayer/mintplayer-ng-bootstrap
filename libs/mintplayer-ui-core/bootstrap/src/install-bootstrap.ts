import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import type { BootstrapPart } from './parts';

/**
 * Install Bootstrap parts at document level through the scoped-style registry:
 * once per page, cross-bundle safe, recorded for the server head during SSR.
 * Pass them in Bootstrap's own order (forms before dropdown before nav…), so
 * same-specificity rules between parts cascade as they do in stock Bootstrap.
 * React, Vue and Lit fronts call this; Angular fronts use `useBootstrap`, which
 * also writes the server `DOCUMENT`.
 */
export function installBootstrap(...parts: readonly BootstrapPart[]): void {
  for (const part of parts) installLightStyles(part.key, part.css);
}
