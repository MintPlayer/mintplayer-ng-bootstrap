import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import { OverlayController } from '@mintplayer/ng-bootstrap/web-components/overlay';

export type RibbonGroupSize = 'large' | 'medium' | 'small' | 'popup';
export type RibbonReduceStep = readonly [groupId: string, target: RibbonGroupSize];

interface OverflowEntry {
  label: string;
  icon: string;
  target: HTMLElement;
}

const OVERFLOW_ITEM_SELECTOR =
  'mp-ribbon-button, mp-ribbon-toggle-button, mp-ribbon-checkbox, ' +
  'mp-ribbon-combobox, mp-ribbon-color-picker, mp-ribbon-group-button, ' +
  'mp-ribbon-split-button, mp-ribbon-dropdown-button, mp-ribbon-gallery';

/**
 * mp-ribbon-tab — One tab of a ribbon. Becomes the tabpanel for its content.
 *
 * Hosted inside `<mp-ribbon>` as a light-DOM child. The parent ribbon reads
 * the slotted `<mp-ribbon-tab>` elements to build the tab strip, and sets the
 * `active` attribute on the currently selected tab. Inactive tabs are
 * `display: none`.
 */
export class MpRibbonTab extends LitElement {
  static override styles = css`
    :host {
      display: none;
      width: 100%;
    }
    :host([active]) {
      display: flex;
      flex-wrap: nowrap;
      gap: 8px;
      align-items: stretch;
      min-width: 0;
    }
    ::slotted(*) { flex: 0 0 auto; }

    /* FR-39: Simplified layout. Items overflow horizontally and the user
       can either scroll them into view OR open the trailing-edge chevron
       overlay for a flat list of overflowed items (keyboard / SR access
       path). data-overflow-hidden is still stamped on groups that
       wouldn't fit at the current width — left visible so horizontal
       scroll works, but used to compute the chevron's overlay contents. */
    :host([active][data-ribbon-layout="simplified"]) {
      overflow-x: auto;
      scrollbar-width: thin;
    }

    .overflow-trigger {
      display: none;
      align-self: center;
      flex: 0 0 auto;
      min-width: 28px;
      height: 28px;
      padding: 0 8px;
      background: var(--bs-ribbon-tabpanel-bg, #fff);
      border: 1px solid transparent;
      border-radius: var(--bs-ribbon-item-radius, 3px);
      color: inherit;
      font: inherit;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
    }
    :host([data-ribbon-layout="simplified"][data-has-overflow]) .overflow-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      /* Pin to the right edge of the scrollable viewport so the chevron
         is always reachable even while the user has scrolled items past
         it. inset-inline-end works for both LTR and RTL. */
      position: sticky;
      inset-inline-end: 0;
      margin-inline-start: auto;
      /* Soft fade so items scrolling past the chevron don't smash
         straight into its outline. */
      box-shadow: -8px 0 8px -4px var(--bs-ribbon-tabpanel-bg, #fff);
    }
    .overflow-trigger:hover {
      background: var(--bs-ribbon-item-hover-bg, #e9ecef);
      border-color: var(--bs-ribbon-item-hover-border, #ced4da);
    }
    .overflow-trigger:focus-visible {
      outline: 2px solid var(--bs-ribbon-app-accent, #0d6efd);
      outline-offset: -2px;
    }

    .overflow-panel {
      position: fixed;
      z-index: 1050;
      background: var(--bs-ribbon-tabpanel-bg, #fff);
      color: inherit;
      border: 1px solid var(--bs-ribbon-container-border, #d0d0d0);
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
      padding: 4px 0;
      display: none;
      min-width: 200px;
      max-width: min(360px, calc(100vw - 16px));
    }
    :host([data-menu-open]) .overflow-panel { display: block; }

    .overflow-entry {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 6px 12px;
      background: transparent;
      border: none;
      cursor: pointer;
      color: inherit;
      font: inherit;
      font-size: 13px;
      text-align: left;
      white-space: nowrap;
    }
    .overflow-entry:hover,
    .overflow-entry:focus-visible {
      background: var(--bs-ribbon-item-hover-bg, #e9ecef);
      outline: none;
    }
    @media (pointer: coarse) {
      .overflow-entry { min-height: 44px; }
    }
    .overflow-entry-icon {
      width: 18px;
      flex: 0 0 auto;
      text-align: center;
    }
  `;

  @property({ type: String, attribute: 'tab-id', reflect: true })
  tabId: string = '';

  @property({ type: String, reflect: true })
  label: string = '';

  @property({ type: Boolean, reflect: true })
  active: boolean = false;

  /**
   * Per-group starting size for this tab. Map keyed by `groupId`. When a
   * groupId isn't listed, it starts at `large`. Consumed by `mp-ribbon`'s
   * reflow before reduceOrder is walked. (FR-6.)
   */
  @property({ attribute: false })
  idealSizes: Record<string, RibbonGroupSize> = {};

  /**
   * Ordered list of `[groupId, targetSize]` reduction steps walked
   * top-to-bottom on shrink, bottom-to-top on grow. Each step must be a
   * non-increase relative to that group's previous step (large > medium >
   * small > popup). Invalid entries (unknown groupIds, monotonicity
   * violations, sizes outside the four-value enum) log a `console.warn`
   * and are skipped. When omitted, the ribbon generates a default order
   * from group `[priority]` (FR-23). (FR-6.)
   */
  @property({ attribute: false })
  reduceOrder: readonly RibbonReduceStep[] = [];

  /** Items pulled into the Simplified overflow chevron's dropdown (FR-39). */
  @state()
  private overflowEntries: OverflowEntry[] = [];

  @query('.overflow-trigger')
  private overflowTriggerEl?: HTMLElement;

  @query('.overflow-panel')
  private overflowPanelEl?: HTMLElement;

  private readonly overflowOverlay = new OverlayController(this, {
    trigger: () => this.overflowTriggerEl ?? null,
    panel: () => this.overflowPanelEl ?? null,
  });

  private overflowResizeObserver?: ResizeObserver;
  private overflowReflowFrame = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'tabpanel');
    if (typeof ResizeObserver !== 'undefined') {
      this.overflowResizeObserver = new ResizeObserver(() =>
        this.scheduleOverflowReflow()
      );
      this.overflowResizeObserver.observe(this);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.overflowResizeObserver?.disconnect();
    this.overflowResizeObserver = undefined;
    if (this.overflowReflowFrame) cancelAnimationFrame(this.overflowReflowFrame);
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('tabId') && this.tabId) {
      this.id = `ribbon-panel-${this.tabId}`;
      this.setAttribute('aria-labelledby', `ribbon-tab-${this.tabId}`);
    }
    if (changed.has('reduceOrder') || changed.has('idealSizes')) {
      this.validateReduceOrder();
    }
    if (changed.has('active') && this.active) {
      this.scheduleOverflowReflow();
    }
  }

  /**
   * Validates the author-declared reduceOrder against the FR-6 rules:
   * - Every target size must be one of `large | medium | small | popup`.
   * - For each group, successive steps must be monotonically non-increasing.
   * - Group IDs must reference real `<mp-ribbon-group>` children (warned but
   *   not blocked — Angular renders children async so a transient false
   *   negative is acceptable).
   * Violations log a `console.warn` and the step is skipped at reflow time
   * (handled in `mp-ribbon`).
   */
  private validateReduceOrder(): void {
    if (this.reduceOrder.length === 0) return;
    const sizeRank: Record<RibbonGroupSize, number> = {
      large: 3,
      medium: 2,
      small: 1,
      popup: 0,
    };
    const startOf = (groupId: string): RibbonGroupSize =>
      this.idealSizes[groupId] ?? 'large';
    const currentSize = new Map<string, RibbonGroupSize>();
    for (let i = 0; i < this.reduceOrder.length; i++) {
      const step = this.reduceOrder[i];
      const [groupId, target] = step;
      if (!(target in sizeRank)) {
        console.warn(
          `[mp-ribbon-tab "${this.tabId}"] reduceOrder[${i}] has invalid size "${target}". Expected large | medium | small | popup.`
        );
        continue;
      }
      const prev = currentSize.get(groupId) ?? startOf(groupId);
      if (sizeRank[target] >= sizeRank[prev]) {
        console.warn(
          `[mp-ribbon-tab "${this.tabId}"] reduceOrder[${i}] for "${groupId}" goes ${prev} → ${target}, which is not a reduction. Steps must monotonically decrease size per group.`
        );
        continue;
      }
      currentSize.set(groupId, target);
    }
  }

  override render(): TemplateResult {
    return html`
      <slot @slotchange="${this.scheduleOverflowReflow}"></slot>
      <button
        class="overflow-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded="${this.overflowOverlay.isOpen}"
        aria-label="More commands"
        title="More commands"
        @click="${this.onOverflowTriggerClick}"
      >…</button>
      <div
        class="overflow-panel"
        role="menu"
        aria-label="Overflow commands"
      >
        ${this.overflowEntries.map(
          (entry) => html`
            <button
              class="overflow-entry"
              role="menuitem"
              type="button"
              @click="${() => this.activateOverflowEntry(entry)}"
            >
              ${entry.icon
                ? html`<span class="overflow-entry-icon">${entry.icon}</span>`
                : nothing}
              <span>${entry.label || '(unnamed)'}</span>
            </button>
          `
        )}
      </div>
    `;
  }

  /**
   * FR-39 reflow. Only runs in Simplified layout. Walks slotted groups
   * left-to-right, summing widths against the available tab width minus
   * a reservation for the chevron itself. Once cumulative width exceeds
   * the budget, the group + all subsequent groups receive
   * `data-overflow-hidden` (hidden via the ::slotted rule above) and
   * their items get pooled into `overflowEntries` for the dropdown.
   *
   * In Classic the function clears any leftover hidden markers from a
   * prior Simplified session and exits — the per-group popup-chunk
   * collapse on `mp-ribbon` owns Classic overflow.
   */
  private scheduleOverflowReflow = (): void => {
    if (this.overflowReflowFrame) return;
    this.overflowReflowFrame = requestAnimationFrame(() => {
      this.overflowReflowFrame = 0;
      this.reflowSimplifiedOverflow();
    });
  };

  private reflowSimplifiedOverflow(): void {
    const isSimplified = this.getAttribute('data-ribbon-layout') === 'simplified';
    const groups = Array.from(
      this.querySelectorAll<HTMLElement>('mp-ribbon-group')
    );

    if (!isSimplified) {
      for (const g of groups) g.removeAttribute('data-overflow-hidden');
      this.overflowEntries = [];
      this.removeAttribute('data-has-overflow');
      if (this.overflowOverlay.isOpen) this.overflowOverlay.close(false);
      return;
    }

    // Reset hidden markers so measurement uses natural sizes.
    for (const g of groups) g.removeAttribute('data-overflow-hidden');

    const available = this.clientWidth;
    if (available <= 0 || groups.length === 0) {
      this.overflowEntries = [];
      this.removeAttribute('data-has-overflow');
      return;
    }
    const chevronReservation = 40;
    const gap = 8;
    let cum = 0;
    const hidden: HTMLElement[] = [];
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      cum += g.offsetWidth + (i > 0 ? gap : 0);
      if (cum > available - chevronReservation) {
        hidden.push(g);
      }
    }

    for (const g of hidden) g.setAttribute('data-overflow-hidden', '');

    const entries: OverflowEntry[] = [];
    for (const g of hidden) {
      const groupItems = g.querySelectorAll<HTMLElement>(OVERFLOW_ITEM_SELECTOR);
      for (const item of Array.from(groupItems)) {
        if (item.hasAttribute('disabled')) continue;
        entries.push({
          label: item.getAttribute('label') ?? '',
          icon: item.getAttribute('icon') ?? '',
          target: item,
        });
      }
    }
    this.overflowEntries = entries;

    if (entries.length > 0) {
      this.setAttribute('data-has-overflow', '');
    } else {
      this.removeAttribute('data-has-overflow');
      if (this.overflowOverlay.isOpen) this.overflowOverlay.close(false);
    }
  }

  private onOverflowTriggerClick = async (event: MouseEvent): Promise<void> => {
    event.stopPropagation();
    await this.overflowOverlay.toggle();
  };

  /** Activate an overflow item by forwarding `.click()` to the original element. */
  private activateOverflowEntry(entry: OverflowEntry): void {
    this.overflowOverlay.close();
    entry.target.click();
  }
}

customElements.define('mp-ribbon-tab', MpRibbonTab);
