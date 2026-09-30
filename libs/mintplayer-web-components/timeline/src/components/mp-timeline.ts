import { LitElement, html, isServer, nothing, type TemplateResult } from 'lit';
import { HostAriaController } from '@mintplayer/web-components/a11y';
import {
  resolveSides,
  type TimelineAlign,
  type TimelineItem,
  type TimelineItemClickDetail,
  type TimelineOrientation,
  type TimelineSelectable,
  type TimelineSelectionChangeDetail,
  type TimelineSide,
} from '@mintplayer/web-components/timeline-core';
import { timelineStyles } from '../styles';
// Side-effect import so <mp-timeline-item> is registered when items[] mode
// renders rows in the shadow tree.
import './mp-timeline-item';
import type { MpTimelineItem } from './mp-timeline-item';

const VALID_ALIGN: ReadonlySet<string> = new Set([
  'start',
  'end',
  'alternate',
  'alternate-reverse',
]);
const VALID_SELECTABLE: ReadonlySet<string> = new Set(['none', 'single', 'multiple']);

/**
 * `<mp-timeline>` — a sequence of events along a connecting line, vertical or
 * horizontal, with two authoring modes:
 *
 *  - **Data-driven:** set the `items` property; rows render in the shadow tree.
 *  - **Declarative:** author `<mp-timeline-item>` children; they project
 *    through the default slot.
 *
 * Non-empty `items` wins over declarative children. The container owns
 * orientation / align / reverse / selection; layout is CSS-driven so it stays
 * correct without enumerating children on the server.
 *
 * Emits `item-click` always, and `selection-change` when `selectable !== none`.
 */
export class MpTimeline extends LitElement {
  static override styles = [timelineStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'orientation',
      'align',
      'reverse',
      'selectable',
      // Opt-in: click-only consumers (no selection) whose items must still be
      // keyboard-reachable. The WC cannot introspect whether anyone listens to
      // item-click, so this cannot default on without adding dead tab stops.
      'activatable',
      'is-server-side',
      // Naming: copied onto the role-bearing .timeline node (list/listbox).
      // Host aria-label wins over input-label, as everywhere.
      'aria-label',
      'input-label',
      'aria-labelledby',
      'aria-describedby',
    ];
  }

  private _items: TimelineItem[] = [];
  private _selectedSet = new Set<string | number>();
  private _orientation: TimelineOrientation = 'vertical';
  private _align: TimelineAlign = 'start';
  private _reverse = false;
  private _selectable: TimelineSelectable = 'none';
  private _activatable = false;
  private _isServerSide = false;
  private _inputLabel: string | null = null;

  /** Tier-2 naming: references resolve in the host's tree, land on the list node. */
  private readonly hostAria = new HostAriaController(this, {
    referenceTarget: () => this.renderRoot?.querySelector('.timeline') ?? null,
  });

  /**
   * Optional accessible name for the timeline list. A timeline has no intrinsic
   * text of its own, so the name is the consumer's to give (optional — degrades
   * to an unnamed list rather than an invented name).
   */
  get inputLabel(): string | null {
    return this._inputLabel;
  }
  set inputLabel(value: string | null) {
    const next = value ?? null;
    if (this._inputLabel === next) return;
    this._inputLabel = next;
    this.requestUpdate();
  }

  /** True once a consumer assigns `selectedIds` — suppresses declarative seeding. */
  private _selectionExplicit = false;
  private _selectionSeeded = false;
  /** Roving-tabindex active source index; -1 means "first focusable". */
  private _activeIndex = -1;
  /** Anchor for shift-range selection. */
  private _anchorIndex = -1;
  /** Declarative-mode observer for runtime child add/remove/attr changes. */
  private _observer: MutationObserver | null = null;

  // ----- properties --------------------------------------------------------

  get items(): TimelineItem[] {
    return this._items;
  }
  set items(value: TimelineItem[] | null | undefined) {
    this._items = Array.isArray(value) ? value : [];
    this.requestUpdate();
  }

  get selectedIds(): (string | number)[] {
    return Array.from(this._selectedSet);
  }
  set selectedIds(value: (string | number)[] | null | undefined) {
    this._selectionExplicit = true;
    this._selectedSet = new Set(value ?? []);
    this.requestUpdate();
  }

  get orientation(): TimelineOrientation {
    return this._orientation;
  }
  set orientation(value: TimelineOrientation) {
    const next: TimelineOrientation = value === 'horizontal' ? 'horizontal' : 'vertical';
    if (this._orientation === next) return;
    this._orientation = next;
    this.reflectString('orientation', next);
    this.requestUpdate();
  }

  get align(): TimelineAlign {
    return this._align;
  }
  set align(value: TimelineAlign) {
    const next = VALID_ALIGN.has(value) ? value : 'start';
    if (this._align === next) return;
    this._align = next;
    this.reflectString('align', next);
    this.requestUpdate();
  }

  get reverse(): boolean {
    return this._reverse;
  }
  set reverse(value: boolean) {
    const next = !!value;
    if (this._reverse === next) return;
    this._reverse = next;
    this.reflectBoolean('reverse', next);
    this.requestUpdate();
  }

  get selectable(): TimelineSelectable {
    return this._selectable;
  }
  set selectable(value: TimelineSelectable) {
    const next = VALID_SELECTABLE.has(value) ? value : 'none';
    if (this._selectable === next) return;
    this._selectable = next;
    this.reflectString('selectable', next);
    this.requestUpdate();
  }

  /**
   * Opt-in keyboard reachability for click-only consumers (no selection): rows
   * become buttons in a group with a roving tab stop, and Enter/Space emit
   * `item-click`.
   */
  get activatable(): boolean {
    return this._activatable;
  }
  set activatable(value: boolean) {
    const next = !!value;
    if (this._activatable === next) return;
    this._activatable = next;
    this.reflectBoolean('activatable', next);
    this.requestUpdate();
  }

  get isServerSide(): boolean {
    return this._isServerSide;
  }
  set isServerSide(value: boolean) {
    const next = !!value;
    if (this._isServerSide === next) return;
    this._isServerSide = next;
    this.reflectBoolean('is-server-side', next);
  }

  // ----- lifecycle ---------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    // Declarative mode: slotchange only fires when children are added/removed,
    // not when an existing child's attributes change. Observe the light DOM so
    // a runtime toggle of `disabled` / `item-id` (or a child add/remove) re-
    // derives sides, roving-tabindex and selection. Gated behind `isServer`
    // (no light DOM on the server). The attributeFilter is scoped to the item
    // inputs the parent reads but never writes — the parent's own enhancement
    // writes (side/selected/tabindex/…) are excluded, so this can't feed back
    // into a loop. Handler is idempotent and also runs via updated()/slotchange.
    if (!isServer && !this._observer) {
      this._observer = new MutationObserver(this.syncDeclarative);
      this._observer.observe(this, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'item-id'],
      });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._observer?.disconnect();
    this._observer = null;
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (oldValue === newValue) return;
    switch (name) {
      case 'orientation':
        this._orientation = newValue === 'horizontal' ? 'horizontal' : 'vertical';
        break;
      case 'align':
        this._align = newValue && VALID_ALIGN.has(newValue) ? (newValue as TimelineAlign) : 'start';
        break;
      case 'reverse':
        this._reverse = newValue !== null && newValue !== 'false';
        break;
      case 'selectable':
        this._selectable =
          newValue && VALID_SELECTABLE.has(newValue) ? (newValue as TimelineSelectable) : 'none';
        break;
      case 'is-server-side':
        this._isServerSide = newValue !== null && newValue !== 'false';
        break;
      case 'activatable':
        this._activatable = newValue !== null && newValue !== 'false';
        break;
      case 'input-label':
        this._inputLabel = newValue;
        break;
      case 'aria-labelledby':
      case 'aria-describedby':
        this.hostAria.syncReferences();
        break;
      // aria-label falls through to the unconditional requestUpdate below.
    }
    this.requestUpdate();
  }

  protected override updated(): void {
    // Declarative mode: project state onto slotted items (client only). The
    // seed comes first: the first render's updated() runs before slotchange,
    // and enhancing alone would strip the authored `selected` attributes the
    // seed reads.
    if (!isServer && this._items.length === 0) this.syncDeclarative();
    // References point at a specific node; re-land them after every render.
    this.hostAria.syncReferences();
  }

  private reflectString(name: string, value: string): void {
    if (this.getAttribute(name) !== value) this.setAttribute(name, value);
  }

  private reflectBoolean(name: string, value: boolean): void {
    if (value) {
      if (!this.hasAttribute(name)) this.setAttribute(name, '');
    } else if (this.hasAttribute(name)) {
      this.removeAttribute(name);
    }
  }

  // ----- identity ----------------------------------------------------------

  private idForItem(item: TimelineItem, index: number): string | number {
    return item.id ?? index;
  }

  private idForElement(el: Element, index: number): string | number {
    return el.getAttribute('item-id') ?? index;
  }

  private isSelected(id: string | number): boolean {
    return this._selectedSet.has(id);
  }

  // ----- render ------------------------------------------------------------

  override render(): TemplateResult {
    // activatable-without-selection = buttons in a group: a `listitem` may not
    // be interactive, so the list semantics honestly give way to what the items
    // actually are in that mode.
    const role = this._selectable !== 'none' ? 'listbox' : this._activatable ? 'group' : 'list';
    return html`
      <div
        class="timeline"
        role=${role}
        aria-label=${this.getAttribute('aria-label') ?? this._inputLabel ?? nothing}
        aria-orientation=${
          // Only widgets take aria-orientation — on role=list/group it is an
          // invalid pairing (axe aria-allowed-attr, critical).
          role === 'listbox' ? this._orientation : nothing
        }
        aria-multiselectable=${this._selectable === 'multiple' ? 'true' : nothing}
        @click=${this.onClick}
        @keydown=${this.onKeydown}
      >
        ${this._items.length
          ? this.renderDataItems()
          : html`<slot @slotchange=${this.syncDeclarative}></slot>`}
      </div>
    `;
  }

  private renderDataItems(): TemplateResult {
    const items = this._items;
    const orientation = this._orientation;
    const selectable = this._selectable;
    const reverse = this._reverse;
    const sides: TimelineSide[] = resolveSides(items.length, this._align, reverse);
    const activeIndex = this.resolvedActiveIndex(items.length, (i) => !items[i].disabled);

    return html`
      ${items.map((item, i) => {
        const id = this.idForItem(item, i);
        const isLast = reverse ? i === 0 : i === items.length - 1;
        const selected = selectable !== 'none' && this.isSelected(id);
        const time = item.time instanceof Date ? item.time.toLocaleDateString() : item.time;
        return html`<mp-timeline-item
          item-id=${item.id ?? nothing}
          title=${item.title ?? nothing}
          description=${item.description ?? nothing}
          time=${time ?? nothing}
          icon=${item.icon ?? nothing}
          color=${item.color ?? nothing}
          item-class=${item.cssClass ?? nothing}
          ?disabled=${!!item.disabled}
          side=${sides[i]}
          orientation=${orientation}
          ?last=${isLast}
          role=${this.itemRole}
          ?selected=${selected}
          aria-selected=${selectable !== 'none' ? (selected ? 'true' : 'false') : nothing}
          tabindex=${this.roving ? (i === activeIndex ? '0' : '-1') : nothing}
          data-index=${i}
        ></mp-timeline-item>`;
      })}
    `;
  }

  // ----- declarative enhancement ------------------------------------------

  /**
   * Declarative-mode sync, shared by slotchange, the MutationObserver and
   * updated(): seed the authored selection once, then project state.
   */
  private syncDeclarative = (): void => {
    this.seedDeclarativeSelection();
    this.enhanceDeclarativeItems();
  };

  private get declarativeItems(): MpTimelineItem[] {
    const slot = this.renderRoot.querySelector('slot');
    if (!slot) return [];
    return slot
      .assignedElements({ flatten: true })
      .filter((el): el is MpTimelineItem => el.tagName === 'MP-TIMELINE-ITEM');
  }

  private get itemElements(): MpTimelineItem[] {
    if (this._items.length) {
      return Array.from(this.renderRoot.querySelectorAll('mp-timeline-item'));
    }
    return this.declarativeItems;
  }

  private seedDeclarativeSelection(): void {
    if (this._selectionExplicit || this._selectionSeeded) return;
    const els = this.declarativeItems;
    if (!els.length) return;
    const authored = els.flatMap((el, i) =>
      el.hasAttribute('selected') ? [this.idForElement(el, i)] : [],
    );
    this._selectedSet = new Set([...this._selectedSet, ...authored]);
    this._selectionSeeded = true;
  }

  /**
   * Projects the container state onto slotted items — the same role, selection
   * and roving-tabindex contract `renderDataItems` renders in data mode.
   */
  private enhanceDeclarativeItems(): void {
    const els = this.declarativeItems;
    if (!els.length) return;
    const orientation = this._orientation;
    const selecting = this._selectable !== 'none';
    const roving = this.roving;
    const role = this.itemRole;
    const sides = resolveSides(els.length, this._align, this._reverse);
    const visualLast = this._reverse ? 0 : els.length - 1;
    const activeIndex = this.resolvedActiveIndex(els.length, (i) => isEnabled(els[i]));

    els.map((el, i) => {
      el.setAttribute('side', sides[i]);
      el.setAttribute('orientation', orientation);
      el.toggleAttribute('last', i === visualLast);
      el.setAttribute('role', role);
      if (selecting) {
        const selected = this.isSelected(this.idForElement(el, i));
        el.toggleAttribute('selected', selected);
        el.setAttribute('aria-selected', selected ? 'true' : 'false');
      } else {
        el.removeAttribute('aria-selected');
      }
      if (roving) el.setAttribute('tabindex', i === activeIndex ? '0' : '-1');
      else el.removeAttribute('tabindex');
      return el;
    });
  }

  /** Re-applies roving tabindex / selection state after an interaction. */
  private refreshItems(): void {
    if (this._items.length) this.requestUpdate();
    else this.enhanceDeclarativeItems();
  }

  // ----- interaction -------------------------------------------------------

  /** Items are keyboard-reachable when selectable, or opted in via `activatable`. */
  private get roving(): boolean {
    return this._selectable !== 'none' || this._activatable;
  }

  /**
   * activatable-without-selection = buttons in a group: a `listitem` may not be
   * interactive, so the item role follows what the items actually are.
   */
  private get itemRole(): string {
    if (this._selectable !== 'none') return 'option';
    return this._activatable ? 'button' : 'listitem';
  }

  private onClick = (ev: Event): void => {
    const { index } = this.itemFromEvent(ev);
    if (!this.emitItemClick(index, ev)) return;
    if (!this.roving) return;
    // The clicked item becomes the tab stop BEFORE the selection re-projects
    // state, so both land in the same enhancement pass.
    this.setActiveIndex(index);
    if (this._selectable !== 'none') {
      const me = ev as MouseEvent;
      this.applySelection(index, { toggle: me.ctrlKey || me.metaKey, range: me.shiftKey });
    } else {
      this.refreshItems();
    }
  };

  /**
   * The item-click emission shared by pointer and keyboard activation.
   * Returns false when there is no enabled item at `index`.
   */
  private emitItemClick(index: number, originalEvent: Event): boolean {
    const el = this.itemElements[index];
    if (!el || !isEnabled(el)) return false;
    this.dispatchEvent(
      new CustomEvent<TimelineItemClickDetail>('item-click', {
        detail: { item: this.modelFor(el, index), index, originalEvent },
        bubbles: true,
        composed: true,
      }),
    );
    return true;
  }

  /**
   * Arrows rove, Home/End jump; Enter/Space select when selectable, and emit
   * item-click when merely activatable (activation without selection).
   */
  private onKeydown = (ev: KeyboardEvent): void => {
    if (!this.roving) return;
    const els = this.itemElements;
    if (!els.length) return;
    const current = this.itemFromEvent(ev).index;
    const target = this.navigationTarget(ev.key, current, els);
    if (target !== undefined) {
      ev.preventDefault();
      this.moveFocusTo(target, els);
      return;
    }
    if ((ev.key !== 'Enter' && ev.key !== ' ') || current < 0) return;
    ev.preventDefault();
    if (this._selectable === 'none') {
      this.emitItemClick(current, ev);
      return;
    }
    this.applySelection(current, {
      toggle: ev.key === ' ' && this._selectable === 'multiple',
      range: ev.shiftKey,
    });
  };

  /** The index a navigation key moves to, or undefined for a non-navigation key. */
  private navigationTarget(key: string, current: number, els: MpTimelineItem[]): number | undefined {
    switch (key) {
      case 'ArrowDown':
      case 'ArrowRight':
        return this.stepFrom(current, 1, els);
      case 'ArrowUp':
      case 'ArrowLeft':
        return this.stepFrom(current, -1, els);
      case 'Home':
        return els.findIndex(isEnabled);
      case 'End':
        return els.reduce((last, el, i) => (isEnabled(el) ? i : last), -1);
      default:
        return undefined;
    }
  }

  private itemFromEvent(ev: Event): { el: MpTimelineItem | null; index: number } {
    const path = ev.composedPath();
    const el = path.find(
      (n): n is MpTimelineItem => n instanceof HTMLElement && n.tagName === 'MP-TIMELINE-ITEM',
    );
    if (!el) return { el: null, index: -1 };
    const index = this.itemElements.indexOf(el);
    return { el, index };
  }

  private modelFor(el: MpTimelineItem, index: number): TimelineItem {
    if (this._items.length) return this._items[index];
    return {
      id: el.getAttribute('item-id') ?? undefined,
      title: el.getAttribute('title') ?? undefined,
      description: el.getAttribute('description') ?? undefined,
      time: el.getAttribute('time') ?? undefined,
      icon: el.getAttribute('icon') ?? undefined,
      color: el.getAttribute('color') ?? undefined,
      disabled: el.hasAttribute('disabled'),
    };
  }

  // ----- selection ---------------------------------------------------------

  private applySelection(index: number, opts: { toggle: boolean; range: boolean }): void {
    const els = this.itemElements;
    const el = els[index];
    if (!el || !isEnabled(el)) return;
    const id = this.idForId(index, el);
    const before = new Set(this._selectedSet);

    if (this._selectable === 'single') {
      this._selectedSet = new Set([id]);
    } else if (opts.range && this._anchorIndex >= 0) {
      const lo = Math.min(this._anchorIndex, index);
      const hi = Math.max(this._anchorIndex, index);
      const rangeIds = els
        .slice(lo, hi + 1)
        .flatMap((e, k) => (isEnabled(e) ? [this.idForId(lo + k, e)] : []));
      this._selectedSet = new Set([...this._selectedSet, ...rangeIds]);
    } else if (opts.toggle) {
      const next = new Set(this._selectedSet);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      this._selectedSet = next;
      this._anchorIndex = index;
    } else {
      this._selectedSet = new Set([id]);
      this._anchorIndex = index;
    }

    this.emitSelectionChange(before);
    this.requestUpdate();
    if (this._items.length === 0) this.enhanceDeclarativeItems();
  }

  private idForId(index: number, el: MpTimelineItem): string | number {
    return this._items.length
      ? this.idForItem(this._items[index], index)
      : this.idForElement(el, index);
  }

  private emitSelectionChange(before: Set<string | number>): void {
    const after = this._selectedSet;
    const added = [...after].filter((id) => !before.has(id));
    const removed = [...before].filter((id) => !after.has(id));
    if (!added.length && !removed.length) return;
    const toModels = (ids: (string | number)[]): TimelineItem[] =>
      ids.map((id) => this.modelById(id)).filter((m): m is TimelineItem => m !== null);
    this.dispatchEvent(
      new CustomEvent<TimelineSelectionChangeDetail>('selection-change', {
        detail: {
          selected: toModels([...after]),
          added: toModels(added),
          removed: toModels(removed),
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private modelById(id: string | number): TimelineItem | null {
    if (this._items.length) {
      const i = this._items.findIndex((it, idx) => this.idForItem(it, idx) === id);
      return i >= 0 ? this._items[i] : null;
    }
    const els = this.declarativeItems;
    const i = els.findIndex((el, idx) => this.idForElement(el, idx) === id);
    return i >= 0 ? this.modelFor(els[i], i) : null;
  }

  // ----- roving tabindex ---------------------------------------------------

  private resolvedActiveIndex(count: number, enabled: (i: number) => boolean): number {
    if (this._activeIndex >= 0 && this._activeIndex < count && enabled(this._activeIndex)) {
      return this._activeIndex;
    }
    return Array.from({ length: count }, (_, i) => i).find(enabled) ?? -1;
  }

  private setActiveIndex(index: number): void {
    this._activeIndex = index;
  }

  /**
   * The next enabled item from `from` in direction `dir`, wrapping; -1 when no
   * item is enabled. A `from` of -1 (focus not on an item) starts at the
   * current tab stop.
   */
  private stepFrom(from: number, dir: 1 | -1, els: MpTimelineItem[]): number {
    const n = els.length;
    const start = from < 0 ? this.resolvedActiveIndex(n, (i) => isEnabled(els[i])) : from;
    return (
      Array.from({ length: n }, (_, k) => (((start + dir * (k + 1)) % n) + n) % n).find((i) =>
        isEnabled(els[i]),
      ) ?? -1
    );
  }

  private moveFocusTo(index: number, els: MpTimelineItem[]): void {
    if (index < 0 || index >= els.length) return;
    this.setActiveIndex(index);
    this.refreshItems();
    // Focus after the tabindex is applied.
    requestAnimationFrame(() => this.itemElements[index]?.focus());
  }
}

function isEnabled(el: Element): boolean {
  return !el.hasAttribute('disabled');
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-timeline')) {
  customElements.define('mp-timeline', MpTimeline);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-timeline': MpTimeline;
  }
}
