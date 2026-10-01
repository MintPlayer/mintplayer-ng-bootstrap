/**
 * Accessible names of the resize glyphs, keyed by the PHYSICAL edge or corner the glyph sits
 * on (a `start` glyph is on the right in a right-to-left document, and is named from this
 * table's right-hand entries). Pass a partial table to `bs-resizable`'s `[labels]` to
 * translate them.
 */
export interface BsResizableLabels {
  top: string;
  bottom: string;
  left: string;
  right: string;
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
}

export const DEFAULT_RESIZABLE_LABELS: BsResizableLabels = {
  top: 'Resize from top edge',
  bottom: 'Resize from bottom edge',
  left: 'Resize from left edge',
  right: 'Resize from right edge',
  topLeft: 'Resize from top-left corner',
  topRight: 'Resize from top-right corner',
  bottomLeft: 'Resize from bottom-left corner',
  bottomRight: 'Resize from bottom-right corner',
};
