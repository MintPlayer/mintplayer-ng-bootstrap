import { DOCUMENT, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { installLightStyles, writeScopedStyleTag } from '@mintplayer/ui-core/scoped-styles';

/**
 * Install a core's scoped stylesheet from an Angular front. In the browser it
 * goes through the shared registry (`installLightStyles`: once per key,
 * cross-bundle safe). On the server the registry cannot run, so the marker
 * `<style data-mp-light-styles="<key>">` is written straight into the
 * request's `DOCUMENT` head — the client registry then treats it as already
 * installed. No string post-processing of the response is involved.
 *
 * Call from the component's constructor (an injection context).
 */
export function useScopedStyles(key: string, cssText: string): void {
  if (isPlatformServer(inject(PLATFORM_ID))) {
    writeScopedStyleTag(inject(DOCUMENT), key, cssText);
  } else {
    installLightStyles(key, cssText);
  }
}
