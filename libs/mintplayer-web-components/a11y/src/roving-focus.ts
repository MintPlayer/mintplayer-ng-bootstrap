export type RovingFocusOrientation = 'vertical' | 'horizontal' | 'both';

export interface RovingFocusOptions {
  /**
   * The navigable items, in tab order, recomputed on every interaction.
   *
   * A callback rather than a static list because these components rebuild their
   * DOM constantly, and because items may live in the shadow root **or** be
   * slotted light DOM — so no single query can be baked in.
   */
  items: () => HTMLElement[];
  /** Which arrow keys navigate. Default `'vertical'`. */
  orientation?: RovingFocusOrientation;
  /**
   * Wrap past the ends. Default **false** — clamping is the APG default for
   * grids and trees, and the audit found existing hand-rolled implementations
   * split roughly evenly between the two, which is exactly the inconsistency
   * this primitive exists to remove. Opt in per component where the pattern
   * calls for it (menus wrap).
   */
  wrap?: boolean;
  /** Treated as skippable. Default: `[aria-disabled="true"]` or `:disabled`. */
  isDisabled?: (el: HTMLElement) => boolean;
  /**
   * Invert Left/Right under RTL. Default true — reading direction is read from
   * the item's computed `direction`, so a mirrored layout navigates the way it
   * looks.
   */
  rtlAware?: boolean;
  /** Called after the active item changes, for `aria-activedescendant` mirroring or announcements. */
  onActiveChange?: (item: HTMLElement, index: number) => void;
}

/**
 * APG roving-tabindex container: exactly one item is tabbable, arrow keys move
 * both DOM focus and the tab stop.
 *
 * Fourteen components hand-rolled this, and they drifted — some wrap at the
 * ends, some clamp; some activate on focus, some on Enter — so a user who
 * learns one composite widget's keyboard model cannot transfer it to the next.
 * The point of this primitive is less any individual fix than that the next
 * component does not add a fifteenth variant.
 *
 * `aria-activedescendant` is **not** offered as a mode, unlike the Angular
 * directive it is ported from. Inside a shadow root that attribute is a trap:
 * it is an IDREF, so it resolves only within the holder's own tree, and the
 * audit found the one component that tried it (`mp-time-list`) had a
 * permanently dangling reference — the host held the attribute while the option
 * ids lived in its shadow root, so arrow keys announced nothing at all. Moving
 * real DOM focus crosses shadow boundaries where IDREFs cannot, so
 * roving-tabindex is the only mechanism that works here.
 */
export class RovingFocus {
  private activeIndex = 0;

  constructor(private readonly options: RovingFocusOptions) {}

  /**
   * Apply `tabindex` across the items so exactly one is tabbable.
   *
   * Call from the host's `updated()`. Vital for a rebuilt DOM: if the active
   * item disappears, something must still be tabbable or the whole widget drops
   * out of the tab order and can never be entered again — the failure the audit
   * found in `mp-treeview` (collapse the focused node's ancestor and the tree
   * becomes unreachable) and in `bs-rating` (no value set, so no star is
   * tabbable).
   */
  sync(): void {
    const items = this.options.items();
    if (items.length === 0) return;

    if (this.activeIndex >= items.length || this.isDisabled(items[this.activeIndex])) {
      this.activeIndex = this.firstEnabledIndex(items);
    }

    items.forEach((item, index) => {
      item.tabIndex = index === this.activeIndex ? 0 : -1;
    });
  }

  /** Index of the current tab stop. */
  get index(): number {
    return this.activeIndex;
  }

  get activeItem(): HTMLElement | null {
    return this.options.items()[this.activeIndex] ?? null;
  }

  /**
   * Handle a keydown. Returns true when the key was consumed, so the caller can
   * `preventDefault()` and stop there.
   *
   * Only acts when the event originated on one of the items — a key typed into
   * an input nested inside an item must reach the input, not be reinterpreted
   * as navigation. That guard is the bug the audit found in `mp-treeview`,
   * where a consumer's node template could not be typed into at all.
   */
  onKeydown(event: KeyboardEvent): boolean {
    const items = this.options.items();
    if (items.length === 0) return false;

    // composedPath() is the precise answer inside a shadow root, but it is only
    // populated *during* dispatch — it returns [] once dispatch has finished, so
    // fall back to `target` for callers that defer their handling.
    const path = event.composedPath();
    const target = path.length > 0 ? path[0] : event.target;
    if (!(target instanceof HTMLElement) || !items.includes(target)) return false;

    const horizontal = this.options.orientation !== 'vertical';
    const vertical = this.options.orientation !== 'horizontal';
    const forwardKey = this.rtl(target) ? 'ArrowLeft' : 'ArrowRight';
    const backKey = this.rtl(target) ? 'ArrowRight' : 'ArrowLeft';

    switch (event.key) {
      case 'ArrowDown':
        if (!vertical) return false;
        return this.step(+1);
      case 'ArrowUp':
        if (!vertical) return false;
        return this.step(-1);
      case forwardKey:
        if (!horizontal) return false;
        return this.step(+1);
      case backKey:
        if (!horizontal) return false;
        return this.step(-1);
      case 'Home':
        return this.moveTo(this.firstEnabledIndex(items));
      case 'End':
        return this.moveTo(this.lastEnabledIndex(items));
      default:
        return false;
    }
  }

  /** Move the tab stop to `index` and focus it. Returns false if it could not move. */
  moveTo(index: number): boolean {
    const items = this.options.items();
    const item = items[index];
    if (!item || this.isDisabled(item)) return false;

    this.activeIndex = index;
    items.forEach((candidate, i) => {
      candidate.tabIndex = i === index ? 0 : -1;
    });
    // Focus after the tabindex write, so the element is already tabbable when
    // it receives focus.
    item.focus({ preventScroll: false });
    this.options.onActiveChange?.(item, index);
    return true;
  }

  /** Point the tab stop at a specific element, without focusing it. */
  setActiveItem(item: HTMLElement): void {
    const index = this.options.items().indexOf(item);
    if (index < 0) return;
    this.activeIndex = index;
    this.sync();
  }

  private step(delta: number): boolean {
    const items = this.options.items();
    const wrap = this.options.wrap ?? false;
    const count = items.length;

    let next = this.activeIndex;
    for (let attempt = 0; attempt < count; attempt++) {
      next += delta;
      if (next < 0 || next >= count) {
        if (!wrap) return false;
        next = next < 0 ? count - 1 : 0;
      }
      if (!this.isDisabled(items[next])) return this.moveTo(next);
    }
    return false;
  }

  private firstEnabledIndex(items: HTMLElement[]): number {
    const index = items.findIndex((item) => !this.isDisabled(item));
    return index < 0 ? 0 : index;
  }

  private lastEnabledIndex(items: HTMLElement[]): number {
    for (let i = items.length - 1; i >= 0; i--) {
      if (!this.isDisabled(items[i])) return i;
    }
    return 0;
  }

  private isDisabled(el: HTMLElement): boolean {
    if (this.options.isDisabled) return this.options.isDisabled(el);
    return el.getAttribute('aria-disabled') === 'true' || el.matches(':disabled');
  }

  private rtl(el: HTMLElement): boolean {
    if (this.options.rtlAware === false) return false;
    if (typeof getComputedStyle !== 'function') return false;
    return getComputedStyle(el).direction === 'rtl';
  }
}
