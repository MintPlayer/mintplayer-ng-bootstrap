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

/**
 * The inverse of {@link formatPath}: read a `data-path` attribute back into a
 * path.
 *
 * The empty string is a VALID path, not a missing one — the root splitter is
 * tagged `data-path=""`, which is what the raw join of an empty segment array
 * produces. Only `null`/`undefined` means "no path", and conflating the two
 * makes every drop onto the root resolve to nothing.
 *
 * Anything it cannot parse is dropped rather than becoming `NaN`: a segment
 * list containing `NaN` would index into the tree as `undefined` and silently
 * resolve to the wrong node.
 */
export function parsePath(path: string | null | undefined): DockPath | null {
  // The root splitter is tagged with data-path="" (raw segments-join of an
  // empty array) so empty string is a valid path representing root docked.
  // Only null/undefined is "no path".
  if (path == null) {
    return null;
  }

  if (path.startsWith('f:')) {
    const remainder = path.slice(2);
    const [indexPart, ...segmentParts] = remainder.split('/');
    const index = Number.parseInt(indexPart, 10);
    if (!Number.isFinite(index)) {
      return null;
    }
    const segments = segmentParts
      .filter((segment) => segment.length > 0)
      .map((segment) => Number.parseInt(segment, 10))
      .filter((value) => Number.isFinite(value));
    return { type: 'floating', index, segments };
  }

  const normalized = path.startsWith('d:') ? path.slice(2) : path;
  if (normalized.length === 0) {
    return { type: 'docked', segments: [] };
  }

  const segments = normalized
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => Number.parseInt(segment, 10))
    .filter((value) => Number.isFinite(value));

  return { type: 'docked', segments };
}

/** Two paths address the same node. */
export function pathsEqual(a: DockPath, b: DockPath): boolean {
  if (a.type !== b.type) {
    return false;
  }

  if (a.type === 'floating') {
    const other = b as Extract<DockPath, { type: 'floating' }>;
    if (a.index !== other.index) {
      return false;
    }
    if (a.segments.length !== other.segments.length) {
      return false;
    }
    return a.segments.every((value, index) => value === other.segments[index]);
  }

  const other = b as Extract<DockPath, { type: 'docked' }>;
  if (a.segments.length !== other.segments.length) {
    return false;
  }

  return a.segments.every((value, index) => value === other.segments[index]);
}

/** A copy that shares no array with the original, so callers can hold onto it across a mutation. */
export function clonePath(path: DockPath): DockPath {
  if (path.type === 'floating') {
    return { type: 'floating', index: path.index, segments: [...path.segments] };
  }
  return { type: 'docked', segments: [...path.segments] };
}

/**
 * `ancestor` addresses `descendant` or something containing it.
 *
 * Reflexive by design: a path is its own ancestor. The dock uses this to refuse
 * a drop into the subtree being dragged, and dropping a node onto itself has to
 * be refused by the same test as dropping it into its own child.
 *
 * Paths in different layers are never related, even when their segments match —
 * `f:0/[1]` and `f:1/[1]` are different windows, and a docked path is never an
 * ancestor of a floating one.
 */
export function isOrIsAncestorOf(ancestor: DockPath, descendant: DockPath): boolean {
  if (ancestor.type !== descendant.type) {
    return false;
  }

  if (ancestor.type === 'floating') {
    const other = descendant as Extract<DockPath, { type: 'floating' }>;
    if (other.index !== ancestor.index) {
      return false;
    }
  }

  if (ancestor.segments.length > descendant.segments.length) {
    return false;
  }

  return ancestor.segments.every((segment, i) => segment === descendant.segments[i]);
}
