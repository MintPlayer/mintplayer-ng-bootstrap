import { DOCUMENT, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import type { BootstrapPart } from '@mintplayer/ui-core/bootstrap';
import { installLightStyles, writeScopedStyleTag, type InstallOptions } from '@mintplayer/ui-core/scoped-styles';

/**
 * Install a core's scoped stylesheet from an Angular front. In the browser it
 * goes through the shared registry (`installLightStyles`: once per key,
 * cross-bundle safe). On the server the registry cannot run, so the marker
 * `<style data-mp-light-styles="<key>">` is written straight into the
 * request's `DOCUMENT` head — the client registry then treats it as already
 * installed. No string post-processing of the response is involved.
 *
 * In the browser it also repairs the event-replay body shift (below) — every
 * front calls this first thing, so the repair runs before any front's
 * projected children are hydrated.
 *
 * Call from the component's constructor (an injection context).
 */
export function useScopedStyles(key: string, cssText: string, options: InstallOptions = {}): void {
  if (isPlatformServer(inject(PLATFORM_ID))) {
    writeScopedStyleTag(inject(DOCUMENT), key, cssText, options);
  } else {
    repairEventReplayBodyPaths(inject(DOCUMENT));
    installLightStyles(key, cssText, options);
  }
}

/**
 * Install Bootstrap parts (`@mintplayer/ui-core/bootstrap`, #452) from an
 * Angular front, the same way as {@link useScopedStyles}: once per page, and
 * written into the server `DOCUMENT` during SSR. A component passes the scoped
 * parts its markup uses; a page that renders raw Bootstrap markup passes the
 * `…Page` variants, which replace a scoped copy under the same key. Call from
 * the constructor (an injection context).
 */
export function useBootstrap(...parts: readonly BootstrapPart[]): void {
  parts.forEach((part) => useScopedStyles(part.key, part.css, { replace: part.page }));
}

/**
 * Angular SSR defect (platform-server 22): `_annotateForHydration` records the
 * hydration paths, and only THEN `insertEventRecordScript` adds the replay
 * `<script>` right after `#ng-event-dispatch-contract` in `<body>`. A node
 * whose path is body-relative — any projected node a front renders outside
 * its own host (an accordion tab's body inside the accordion's `<details>`, a
 * tab page's body inside the tab control's panel) — is then looked up one
 * sibling off, and hydration throws "Cannot read properties of null
 * (reading 'nextSibling')". The replay script has already run by the time any
 * component is constructed, so removing its element restores the body the
 * paths were computed against. Idempotent; a no-op without event replay.
 */
export function repairEventReplayBodyPaths(doc: Document): void {
  const replay = doc.getElementById('ng-event-dispatch-contract')?.nextSibling;
  if (replay instanceof HTMLScriptElement && replay.textContent?.startsWith('window.__jsaction_bootstrap(')) replay.remove();
}
