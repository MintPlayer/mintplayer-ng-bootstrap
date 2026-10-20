import { LitElement, html, type TemplateResult } from 'lit';
import { adoptLightStyles, installLightStyles } from '@mintplayer/web-components/light-dom';
import { props } from '@mintplayer/web-components/machine';
import {
  ACCORDION_SCOPE,
  accordionKeydown,
  accordionScopedStyles,
  accordionSummaryClick,
  connectAccordion,
  connectAccordionTab,
} from '@mintplayer/ui-core/accordion';
import { accordionStyles } from '../styles';

/** Detail of the `mp-accordion-tab-toggle` event. */
export interface AccordionTabToggleDetail {
  /** Zero-based position of the tab that changed. */
  index: number;
  /** Its new state. */
  active: boolean;
  /** The click / keydown / toggle that caused it, or `null` when programmatic. */
  originalEvent: Event | null;
}

interface TabState {
  active: boolean;
  disabled: boolean;
}

/** Ids only need to be unique inside this element's own shadow root. */
const SHADOW_ID = 'acc';

/**
 * `<mp-accordion>` — the Lit front of `@mintplayer/ui-core/accordion` (#437):
 * Bootstrap accordion on native `<details name>`/`<summary>`, rendering the
 * core's markup and scoped sheet inside its shadow root.
 *
 * Light-DOM children are markers, not chrome: each `<mp-accordion-tab>`
 * supplies one tab's body, each `[accordion-header]` element supplies one
 * header, paired by position (i-th header ↔ i-th tab). This element stamps
 * the `slot="hN"` / `slot="cN"` names itself, so consumers never write them.
 * Children that are neither render through the default slot — an accordion
 * with zero tabs is a valid styled container.
 *
 * The UA owns disclosure state: a closed `<details>` removes its content from
 * the tab order and the accessibility tree with no CSS, and `name` gives
 * single-open exclusivity natively (scoped per shadow root). Single-open is
 * ALSO enforced here from state, because engines without `name` support (and
 * jsdom) must behave identically.
 *
 * `toggle` does not bubble (delegated in the CAPTURE phase), is asynchronous,
 * and same-task flips are coalesced into one event carrying the final state —
 * so it is treated purely as a notification and every row's `open` is
 * re-read. Active state lives on the light-DOM markers (`is-active`).
 *
 * Closing a tab closes every accordion nested inside it, at any depth, so a
 * collapsed branch never hides expanded descendants.
 */
export class MpAccordion extends LitElement {
  static override styles = [accordionStyles];

  static override get observedAttributes(): string[] {
    return [...(super.observedAttributes ?? []), 'multi', 'highlight-active-tab'];
  }

  get #multi(): boolean {
    return this.hasAttribute('multi') && this.getAttribute('multi') !== 'false';
  }

  get #highlightActiveTab(): boolean {
    return this.hasAttribute('highlight-active-tab') && this.getAttribute('highlight-active-tab') !== 'false';
  }

  #tabElements: HTMLElement[] = [];
  #tabs: TabState[] = [];
  #mutationObserver: MutationObserver | null = null;
  #releaseStyles: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#releaseStyles = adoptLightStyles(this.renderRoot as ShadowRoot);

    // Nesting is always light-DOM (a nested accordion is authored inside a
    // tab's body), so an ordinary ancestor walk finds it. The stylesheet uses
    // this to collapse the doubled border between a tab and its accordion.
    this.toggleAttribute('data-nested', !!this.parentElement?.closest('mp-accordion'));

    // Only this element's own child list matters — observing the subtree
    // would re-scan on every mutation a consumer makes inside a tab body.
    this.#mutationObserver = new MutationObserver(() => this.#refreshTabs());
    this.#mutationObserver.observe(this, { childList: true });
    this.#refreshTabs();
  }

  override disconnectedCallback(): void {
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
    this.#releaseStyles?.();
    this.#releaseStyles = null;
    super.disconnectedCallback();
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (oldValue !== newValue) this.requestUpdate();
  }

  // ---------------------------------------------------------------- public

  /** Indexes of the currently open tabs. */
  get activeIndexes(): number[] {
    return this.#tabs.flatMap((tab, index) => (tab.active ? [index] : []));
  }

  /** Open a tab (closing its siblings unless `multi`). */
  open(index: number): void {
    this.#setActive(index, true, null);
  }

  /** Close a tab, and every accordion nested inside it. */
  close(index: number): void {
    this.#setActive(index, false, null);
  }

  toggle(index: number): void {
    this.#setActive(index, !this.#tabs[index]?.active, null);
  }

  /** Close every open tab, and every accordion nested inside them. */
  closeAll(originalEvent: Event | null = null): void {
    this.#tabs.forEach((tab, index) => {
      if (tab.active) this.#setActive(index, false, originalEvent);
    });
  }

  // --------------------------------------------------------------- private

  get #root(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('.accordion');
  }

  /**
   * Tabs and headers are identified by ATTRIBUTE, not tag name, and must be
   * direct children — named slots only accept those. `<mp-accordion-tab>` is
   * only the vanilla convenience element; it tags itself.
   */
  #children(marker: 'accordion-tab' | 'accordion-header'): HTMLElement[] {
    return Array.from(this.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child.hasAttribute(marker),
    );
  }

  /** Re-read the markers, (re-)stamp their slot names, and keep the per-marker observations current. */
  #refreshTabs(): void {
    const tabElements = this.#children('accordion-tab');
    tabElements.forEach((tab, index) => {
      if (tab.getAttribute('slot') !== `c${index}`) tab.setAttribute('slot', `c${index}`);
    });
    this.#children('accordion-header').forEach((header, index) => {
      if (header.getAttribute('slot') !== `h${index}`) header.setAttribute('slot', `h${index}`);
    });

    // Watch EVERY child, not just the recognised markers: `<mp-accordion-tab>`
    // tags itself in its own connectedCallback, which runs AFTER this one.
    Array.from(this.children).forEach((child) =>
      this.#mutationObserver?.observe(child, {
        attributes: true,
        attributeFilter: ['is-active', 'disabled', 'accordion-tab', 'accordion-header'],
      }),
    );

    const previous = this.#tabs;
    this.#tabElements = tabElements;
    this.#tabs = tabElements.map((tab) => ({
      active: tab.hasAttribute('is-active'),
      disabled: tab.hasAttribute('disabled'),
    }));

    // A two-way binding can close a tab by writing the marker directly — the
    // nested-collapse contract has to hold for those writes too. Only while
    // the tabs line up; after an add/remove the indexes describe other tabs.
    if (previous.length === this.#tabs.length) {
      this.#tabs.forEach((tab, index) => {
        if (!tab.active && previous[index].active) this.#closeNested(index, null);
      });
    }

    this.requestUpdate();
  }

  readonly #onToggle = {
    capture: true,
    handleEvent: (event: Event) => {
      const rows = this.renderRoot.querySelectorAll<HTMLDetailsElement>('details.accordion-item');
      rows.forEach((row, index) => {
        const tab = this.#tabs[index];
        if (!tab || row.open === tab.active) return;
        if (tab.disabled) {
          // Safety net for programmatic writes around the keydown guard.
          row.open = tab.active;
          return;
        }
        this.#setActive(index, row.open, event);
      });
    },
  };

  /**
   * The single write path for tab state: updates the marker (the source of
   * truth), enforces single-open, collapses nested accordions on close, and
   * announces every change that actually happened.
   */
  #setActive(index: number, active: boolean, originalEvent: Event | null): void {
    const tab = this.#tabs[index];
    if (!tab || tab.disabled || tab.active === active) return;

    if (active && !this.#multi) {
      this.#tabs.forEach((sibling, siblingIndex) => {
        if (siblingIndex !== index && sibling.active) this.#setActive(siblingIndex, false, originalEvent);
      });
    }

    this.#tabElements[index]?.toggleAttribute('is-active', active);
    tab.active = active;
    if (!active) this.#closeNested(index, originalEvent);

    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<AccordionTabToggleDetail>('mp-accordion-tab-toggle', {
        detail: { index, active, originalEvent },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** Collapse every accordion inside a closing tab's light-DOM body. */
  #closeNested(index: number, originalEvent: Event | null): void {
    this.#tabElements[index]?.querySelectorAll('mp-accordion').forEach((nested) => {
      if (nested instanceof MpAccordion) nested.closeAll(originalEvent);
    });
  }

  override render(): TemplateResult {
    const options = { id: SHADOW_ID, multi: this.#multi, highlightActiveTab: this.#highlightActiveTab };
    return html`
      <div ${props(connectAccordion(options))} @toggle=${this.#onToggle}>
        ${this.#tabs.map((tab, index) => this.#renderItem(options, tab, index))}
        <slot></slot>
      </div>
    `;
  }

  #renderItem(options: { id: string; multi: boolean }, tab: TabState, index: number): TemplateResult {
    const view = connectAccordionTab(options, index, { disabled: tab.disabled });
    return html`
      <details ${props(view.item)} ?open=${tab.active}>
        <summary
          ${props(view.summary)}
          @click=${(event: Event) => accordionSummaryClick(event, tab.disabled)}
          @keydown=${(event: KeyboardEvent) => this.#root && accordionKeydown(this.#root, event, index, tab.disabled)}>
          <slot name="h${index}"></slot>
        </summary>
        <div ${props(view.content)}><slot name="c${index}"></slot></div>
      </details>
    `;
  }
}

if (typeof document !== 'undefined' && document.head) installLightStyles(ACCORDION_SCOPE, accordionScopedStyles);

if (typeof customElements !== 'undefined' && !customElements.get('mp-accordion')) {
  customElements.define('mp-accordion', MpAccordion);
}
