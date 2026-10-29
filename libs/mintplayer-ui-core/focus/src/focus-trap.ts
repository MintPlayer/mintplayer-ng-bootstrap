import { deepActiveElement } from './focus-restore';

/**
 * Where focus goes when a trap activates. `'none'` means the caller manages it.
 * The callback form exists because dialog content is usually rendered lazily —
 * a date picker's "selected date cell" does not exist until the popup renders,
 * so a static element reference captured at construction would always be stale.
 * Resolved at activation time; a null return degrades to `'first'`.
 */
export type InitialFocusTarget = HTMLElement | (() => HTMLElement | null) | 'first' | 'self' | 'none';

export interface FocusTrapOptions {
  /** Default `'first'`. */
  initialFocus?: InitialFocusTarget;
  /** Return focus to whatever had it at activation. Default true. */
  returnFocus?: boolean;
  /**
   * Consulted on every Tab. When it returns false the trap lets Tab through
   * untouched — used to gate a nested trap on being the top dismiss frame, so
   * an inner trap does not fight its parent's.
   */
  enabled?: () => boolean;
}

/**
 * Contains Tab and Shift+Tab within a region, moves focus into it on activation
 * and returns focus on deactivation.
 *
 * The web-component layer had no equivalent of Angular's
 * `BsOverlayFocusDirective`, and the consequence was blunt: `grep` for `Tab`
 * across every web component matched only comments, so six popups marked
 * `role="dialog"` opened with focus still on the trigger and Tab walked
 * straight out the far side while the dialog stayed visible.
 *
 * Deliberately not built on `@angular/cdk/a11y`: this layer is
 * framework-agnostic. That costs a tabbable-collection walk, which is the bulk
 * of the file.
 *
 * **Background `inert` / `aria-hidden` is intentionally not handled here.** A
 * trap cannot know whether its region is a modal dialog or a menu, and
 * `aria-modal="true"` on a non-modal popup hides the rest of the page from
 * assistive tech while it stays visible and clickable to everyone else. That
 * decision belongs to the consuming component (a modal hides app-root; a
 * popover does not) — see `inertRegions` for the mechanism.
 */
export class FocusTrap {
  private active = false;
  private restoreTo: HTMLElement | null = null;
  private readonly options: FocusTrapOptions;

  constructor(
    private readonly region: () => HTMLElement | null,
    options: FocusTrapOptions = {},
  ) {
    this.options = options;
  }

  get isActive(): boolean {
    return this.active;
  }

  activate(): void {
    if (this.active) return;
    const region = this.region();
    if (!region) return;

    const active = deepActiveElement();
    this.restoreTo = active instanceof HTMLElement ? active : null;

    this.active = true;
    region.ownerDocument.addEventListener('keydown', this.onKeyDown, true);

    let target = this.options.initialFocus ?? 'first';
    if (typeof target === 'function') target = target() ?? 'first';
    if (target instanceof HTMLElement) {
      target.focus({ preventScroll: true });
    } else if (target === 'self') {
      if (!region.hasAttribute('tabindex')) region.setAttribute('tabindex', '-1');
      region.focus({ preventScroll: true });
    } else if (target === 'first') {
      const first = collectTabbables(region)[0];
      // Falling back to the region itself matters: a dialog whose only content
      // is text must still take focus, or the user is never told it opened.
      if (first) first.focus({ preventScroll: true });
      else {
        if (!region.hasAttribute('tabindex')) region.setAttribute('tabindex', '-1');
        region.focus({ preventScroll: true });
      }
    }
    // 'none' — the caller moves focus itself.
  }

  deactivate(): void {
    if (!this.active) return;
    this.active = false;

    const region = this.region();
    (region?.ownerDocument ?? document).removeEventListener('keydown', this.onKeyDown, true);

    if ((this.options.returnFocus ?? true) && this.restoreTo?.isConnected) {
      // preventScroll: closing an overlay must never yank the page back to the
      // trigger's scroll position — where the user is looking is their choice.
      this.restoreTo.focus({ preventScroll: true });
    }
    this.restoreTo = null;
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab' || !this.active) return;
    if (this.options.enabled && !this.options.enabled()) return;

    const region = this.region();
    // A trap whose region has been detached is stale and must not consume keys.
    // Without this a component torn down without `deactivate()` keeps a
    // document-level listener that swallows every Tab on the page.
    if (!region || !region.isConnected) return;

    const tabbables = collectTabbables(region);
    if (tabbables.length === 0) {
      // Nothing to cycle between, but Tab must still not escape the region.
      event.preventDefault();
      return;
    }

    const first = tabbables[0];
    const last = tabbables[tabbables.length - 1];
    const active = deepActiveElement();
    const inside = active !== null && (region === active || containsComposed(region, active));

    if (!inside) {
      // Focus is somewhere else entirely (a stray programmatic blur). Pull it
      // back to the appropriate edge rather than letting Tab wander.
      event.preventDefault();
      (event.shiftKey ? last : first).focus({ preventScroll: true });
      return;
    }

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  };
}

/** True when `descendant` is inside `root`, crossing shadow and slot boundaries. */
export function containsComposed(root: Element, descendant: Node): boolean {
  let node: Node | null = descendant;
  while (node) {
    if (node === root) return true;
    if (node instanceof Element && node.assignedSlot) {
      node = node.assignedSlot;
      continue;
    }
    const parent: Node | null = node.parentNode;
    node = parent instanceof ShadowRoot ? parent.host : parent;
  }
  return false;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

/**
 * Tabbable elements inside `root`, in tab order, descending into shadow roots
 * and following slots to the light-DOM content actually rendered there.
 *
 * A plain `querySelectorAll` inside one root misses slotted consumer content
 * entirely, which for this library is the common case — a dialog's contents are
 * almost always projected in.
 *
 * Visibility is deliberately **not** checked via layout (`getClientRects`),
 * because jsdom does not lay elements out and every element would be rejected
 * under test. `display: none` / `visibility: hidden` subtrees are excluded by
 * inline style and by the `hidden` attribute, which covers the cases this
 * library actually produces; real browsers agree for anything visible.
 */
export function collectTabbables(root: Element | ShadowRoot): HTMLElement[] {
  const found: HTMLElement[] = [];
  walk(root, found);
  return found;
}

function walk(node: Element | ShadowRoot | DocumentFragment, out: HTMLElement[]): void {
  for (const child of Array.from(node.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (isHiddenSubtree(child)) continue;

    if (child instanceof HTMLSlotElement) {
      // Follow the slot to what is actually rendered in it, not to its
      // fallback content — unless nothing is assigned, in which case the
      // fallback is what the user sees.
      const assigned = child.assignedElements({ flatten: true });
      const targets = assigned.length > 0 ? assigned : Array.from(child.children);
      for (const target of targets) {
        if (!(target instanceof HTMLElement) || isHiddenSubtree(target)) continue;
        if (isTabbable(target)) out.push(target);
        walk(target, out);
      }
      continue;
    }

    if (isTabbable(child)) out.push(child);
    if (child.shadowRoot) walk(child.shadowRoot, out);
    walk(child, out);
  }
}

function isTabbable(el: HTMLElement): boolean {
  if (el.tabIndex < 0) return false;
  if (el.hasAttribute('inert') || el.closest('[inert]')) return false;
  // `:disabled` covers both the element's own attribute and the inherited form
  // from an ancestor `<fieldset disabled>`.
  if (el.matches(':disabled')) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  return el.matches(FOCUSABLE_SELECTOR);
}

function isHiddenSubtree(el: HTMLElement): boolean {
  if (el.hidden) return true;
  const display = el.style.display;
  const visibility = el.style.visibility;
  return display === 'none' || visibility === 'hidden';
}
