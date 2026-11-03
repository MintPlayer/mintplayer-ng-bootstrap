import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/**
 * A footer that sits at the bottom of the viewport while the content above it
 * is short, and below the content once it is taller (#458 M5).
 *
 *   <div bsStickyFooterParent class="sticky-footer-parent">   ← the consumer's element
 *     …content…
 *     <div class="sticky-footer"><footer>…</footer></div>
 *   </div>
 *
 * Pure CSS: the parent is a flex column at least `--mp-sticky-footer-min-height`
 * tall (default `100dvh`), and the footer's `margin-top: auto` takes the free
 * space. Nothing is measured, so it is correct without JS (no-JS tier 2) and
 * never touches the `<html>` element. Set the custom property on the parent
 * when something above it (a navbar) already takes part of the viewport.
 */
export interface StickyFooterView {
  readonly root: CoreBag;
  readonly footer: CoreBag;
}

/** `bsStickyFooterParent`: a directive core, its view is the consumer element's bag. */
export const stickyFooterParentCore = defineCore<Record<never, never>, Record<never, never>, CoreBag>({
  view: () => ({ class: 'sticky-footer-parent' }),
});

export const stickyFooterCore = defineCore<Record<never, never>, Record<never, never>, { view: StickyFooterView }>({
  view: () => ({ view: { root: { class: 'sticky-footer' }, footer: {} } }),
});
