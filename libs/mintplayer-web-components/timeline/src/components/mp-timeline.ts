import { LitElement, html, isServer, nothing, type TemplateResult } from 'lit';
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
      'is-server-side',
    ];
  }

  private _items: TimelineItem[] = [];
  private _selectedSet = new Set<string | number>();
  /** True once a consumer assigns `selectedIds` — suppresses declarative seeding. */
  private _selectionExplicit = false;
  private _selectionSeeded = false;
  /** Roving-tabindex active source index; -1 means "first focusable". */
  private _activeIndex = -1;
  /** Anchor for shift-range selection. */
  private _anchorIndex = -1;

  // ----- properties (JS-shaped) -------------------------------------------

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

  // ----- attribute-backed getters -----------------------------------------

  private get orientation(): TimelineOrientation {
    return this.getAttribute('orientation') === 'horizontal' ? 'horizontal' : 'vertical';
  }

  private get align(): TimelineAlign {
    const v = this.getAttribute('align');
    return v && VALID_ALIGN.has(v) ? (v as TimelineAlign) : 'start';
  }

  private get reverse(): boolean {
    return this.hasAttribute('reverse') && this.getAttribute('reverse') !== 'false';
  }

  private get selectable(): TimelineSelectable {
    const v = this.getAttribute('selectable');
    return v && VALID_SELECTABLE.has(v) ? (v as TimelineSelectable) : 'none';
  }

  // ----- lifecycle ---------------------------------------------------------

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (oldValue === newValue) return;
    this.requestUpdate();
  }

  protected override updated(): void {
    // Declarative mode: project state onto slotted items (client only).
    if (!isServer && this._items.length === 0) this.enhanceDeclarativeItems();
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
    const selectable = this.selectable;
    const role = selectable !== 'none' ? 'listbox' : 'list';
    return html`
      <div
        class="timeline"
        role=${role}
        aria-orientation=${this.orientation}
        aria-multiselectable=${selectable === 'multiple' ? 'true' : nothing}
        @click=${this.onClick}
        @keydown=${this.onKeydown}
      >
        ${this._items.length ? this.renderDataItems() : html`<slot @slotchange=${this.onSlotChange}></slot>`}
      </div>
    `;
  }

  private renderDataItems(): TemplateResult {
    const items = this._items;
    const align = this.align;
    const reverse = this.reverse;
    const orientation = this.orientation;
    const selectable = this.selectable;
    const sides: TimelineSide[] = resolveSides(items.length, align, reverse);
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
          role=${selectable !== 'none' ? 'option' : 'listitem'}
          ?selected=${selected}
          aria-selected=${selectable !== 'none' ? (selected ? 'true' : 'false') : nothing}
          tabindex=${selectable !== 'none' ? (i === activeIndex ? '0' : '-1') : nothing}
          data-index=${i}
        ></mp-timeline-item>`;
      })}
    `;
  }

  // ----- declarative enhancement ------------------------------------------

  private onSlotChange = (): void => {
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
    els.forEach((el, i) => {
      if (el.hasAttribute('selected')) this._selectedSet.add(this.idForElement(el, i));
    });
    this._selectionSeeded = true;
  }

  private enhanceDeclarativeItems(): void {
    const els = this.declarativeItems;
    if (!els.length) return;
    const align = this.align;
    const reverse = this.reverse;
    const orientation = this.orientation;
    const selectable = this.selectable;
    const sides = resolveSides(els.length, align, reverse);
    const visualLast = reverse ? 0 : els.length - 1;
    const activeIndex = this.resolvedActiveIndex(els.length, (i) => !els[i].hasAttribute('disabled'));

    els.forEach((el, i) => {
      el.setAttribute('side', sides[i]);
      el.setAttribute('orientation', orientation);
      if (i === visualLast) el.setAttribute('last', '');
      else el.removeAttribute('last');

      if (selectable !== 'none') {
        const selected = this.isSelected(this.idForElement(el, i));
        el.setAttribute('role', 'option');
        if (selected) el.setAttribute('selected', '');
        else el.removeAttribute('selected');
        el.setAttribute('aria-selected', selected ? 'true' : 'false');
        el.setAttribute('tabindex', i === activeIndex ? '0' : '-1');
      } else {
        el.setAttribute('role', 'listitem');
        el.removeAttribute('aria-selected');
        el.removeAttribute('tabindex');
      }
    });
  }

  // ----- interaction -------------------------------------------------------

  private onClick = (ev: Event): void => {
    const { el, index } = this.itemFromEvent(ev);
    if (!el || index < 0) return;
    if (el.hasAttribute('disabled')) return;
    const model = this.modelFor(el, index);
    this.dispatchEvent(
      new CustomEvent<TimelineItemClickDetail>('item-click', {
        detail: { item: model, index, originalEvent: ev },
        bubbles: true,
        composed: true,
      }),
    );
    if (this.selectable !== 'none') {
      const me = ev as MouseEvent;
      this.applySelection(index, { toggle: me.ctrlKey || me.metaKey, range: me.shiftKey });
      this.setActiveIndex(index);
    }
  };

  private onKeydown = (ev: KeyboardEvent): void => {
    if (this.selectable === 'none') return;
    const els = this.itemElements;
    if (!els.length) return;
    const current = this.itemFromEvent(ev).index;
    switch (ev.key) {
      case 'ArrowDown':
      case 'ArrowRight': {
        ev.preventDefault();
        this.moveFocus(current, 1, els);
        return;
      }
      case 'ArrowUp':
      case 'ArrowLeft': {
        ev.preventDefault();
        this.moveFocus(current, -1, els);
        return;
      }
      case 'Home': {
        ev.preventDefault();
        this.moveFocusTo(this.firstFocusable(els), els);
        return;
      }
      case 'End': {
        ev.preventDefault();
        this.moveFocusTo(this.lastFocusable(els), els);
        return;
      }
      case 'Enter':
      case ' ': {
        if (current < 0) return;
        ev.preventDefault();
        this.applySelection(current, { toggle: ev.key === ' ' && this.selectable === 'multiple', range: ev.shiftKey });
        return;
      }
    }
  };

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
    if (!el || el.hasAttribute('disabled')) return;
    const id = this.idForId(index, el);
    const before = new Set(this._selectedSet);

    if (this.selectable === 'single') {
      this._selectedSet = new Set([id]);
    } else if (opts.range && this._anchorIndex >= 0) {
      const [lo, hi] = [Math.min(this._anchorIndex, index), Math.max(this._anchorIndex, index)];
      const next = new Set(this._selectedSet);
      for (let i = lo; i <= hi; i++) {
        const e = els[i];
        if (e && !e.hasAttribute('disabled')) next.add(this.idForId(i, e));
      }
      this._selectedSet = next;
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
    return this._items.length ? this.idForItem(this._items[index], index) : this.idForElement(el, index);
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
    for (let i = 0; i < count; i++) if (enabled(i)) return i;
    return -1;
  }

  private setActiveIndex(index: number): void {
    this._activeIndex = index;
  }

  private moveFocus(from: number, dir: 1 | -1, els: MpTimelineItem[]): void {
    const start = from < 0 ? this.resolvedActiveIndex(els.length, (i) => !els[i].hasAttribute('disabled')) : from;
    let next = start;
    for (let step = 0; step < els.length; step++) {
      next = (next + dir + els.length) % els.length;
      if (!els[next].hasAttribute('disabled')) break;
    }
    this.moveFocusTo(next, els);
  }

  private moveFocusTo(index: number, els: MpTimelineItem[]): void {
    if (index < 0 || index >= els.length) return;
    this.setActiveIndex(index);
    if (this._items.length) this.requestUpdate();
    else this.enhanceDeclarativeItems();
    // Focus after the tabindex is applied.
    requestAnimationFrame(() => this.itemElements[index]?.focus());
  }

  private firstFocusable(els: MpTimelineItem[]): number {
    return els.findIndex((el) => !el.hasAttribute('disabled'));
  }

  private lastFocusable(els: MpTimelineItem[]): number {
    for (let i = els.length - 1; i >= 0; i--) if (!els[i].hasAttribute('disabled')) return i;
    return -1;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-timeline')) {
  customElements.define('mp-timeline', MpTimeline);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-timeline': MpTimeline;
  }
}
