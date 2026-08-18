/**
 * Vocabulary shared by the dock's pure layout core and the element that
 * renders it. These are data-only: nothing here knows about the DOM.
 */

/**
 * Where a node lives. The docked tree is addressed by the child indices walked
 * from the root; a floating window is addressed by its index in the floating
 * array plus the same walk inside that window's own root.
 */
export type DockPath =
  | { type: 'docked'; segments: number[] }
  | { type: 'floating'; index: number; segments: number[] };

/** Which side of a stack a dropped pane lands on; `center` means "same stack". */
export type DropZone = 'center' | 'left' | 'right' | 'top' | 'bottom';

/**
 * The identity a path takes in the rendered tree's `data-path` attributes.
 *
 * It is the join between the two halves of the dock: a pointer drop reads this
 * string off the hovered element and a keyboard drop carries it in its
 * candidate list, so both must resolve to the same node. Docked paths are
 * `d:` + slash-joined segments, floating ones `f:<index>` plus the same suffix.
 */
export function formatPath(path: DockPath): string {
  if (path.type === 'floating') {
    const suffix =
      path.segments.length > 0 ? `/${path.segments.map((segment) => segment.toString()).join('/')}` : '';
    return `f:${path.index}${suffix}`;
  }
  const suffix = path.segments.join('/');
  return suffix.length > 0 ? `d:${suffix}` : 'd:';
}
