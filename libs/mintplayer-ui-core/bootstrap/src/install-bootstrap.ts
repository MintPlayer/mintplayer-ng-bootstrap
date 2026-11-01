import { installLightStyles, type InstallOptions } from '@mintplayer/ui-core/scoped-styles';
import type { BootstrapPart } from './parts';

/**
 * Install Bootstrap parts at document level through the scoped-style registry
 * (#452): once per page and key, cross-bundle safe, recorded for the server
 * head during SSR. A `…Page` (verbatim) part replaces a scoped copy already
 * installed under its key; a scoped part never downgrades a verbatim one.
 * Install order does not matter: every part sits in the shared
 * `mp.bootstrap.components` sublayer, and the registry keeps the part sheets in
 * stock Bootstrap order (`part.order`).
 *
 * React, Vue and Lit fronts call this; Angular fronts use `useBootstrap`
 * (`@mintplayer/ng-bootstrap/machine`), which also writes the server `DOCUMENT`.
 */
export function installBootstrap(...parts: readonly BootstrapPart[]): void {
  parts.forEach((part) => installLightStyles(part.key, part.css, bootstrapInstallOptions(part)));
}

/** The registry options of a part: verbatim replaces scoped, and stock order is kept. */
export function bootstrapInstallOptions(part: BootstrapPart): InstallOptions {
  return { replace: part.page, order: part.order };
}
