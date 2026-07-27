import { adoptStyles, LitElement, html, nothing, type TemplateResult } from 'lit';
import { accordionStyles } from '../styles';

/** Detail of the `mp-accordion-tab-toggle` event. */
export interface AccordionTabToggleDetail {
  /** Zero-based position of the tab that changed. */
  index: number;
  /** Its new state. */
  active: boolean;
  /** The click / keydown / change that caused it, or `null` when programmatic. */
  originalEvent: Event | null;
}

interface TabState {
  active: boolean;
  disabled: boolean;
}

/**
 * `<mp-accordion>` — Bootstrap accordion owning its whole structure in one
 * shadow root.
 *
 * Light-DOM children are markers, not chrome: each `<mp-accordion-tab>`
 * supplies one tab's body, each `[accordion-header]` element supplies one
 * header, paired by position (i-th header ↔ i-th tab). This element stamps
 * the `slot="hN"` / `slot="cN"` names itself, so consumers never write them.
 * Children that are neither render through the default slot — an accordion
 * with zero tabs is a valid styled container (the offcanvas nav uses one).
 *
 * Two interaction tiers, one template, branched on `data-js`:
 *  - JS on: `<button aria-expanded>` headers; this element owns the
 *    click/keyboard → state loop and animates via `grid-template-rows`.
 *  - JS off (server-rendered DSD): a visually-hidden `<input>` per tab —
 *    radio when single-open, checkbox under `multi` — plus a `<label>`
 *    header. `:checked` opens the collapse, rotates the chevron and paints
 *    the active state, so the accordion is fully interactive, and keyboard
 *    operable, with no script at all. Radio exclusivity is why one shadow
 *    root owns every tab: a group only forms within a single node tree.
 *
 * Active state lives on the light-DOM markers (`is-active`), which makes it
 * declarative for every framework wrapper and survives the SSR handoff — the
 * pre-upgrade `:checked` inputs are read back onto the markers before the
 * shadow is replaced.
 *
 * Closing a tab closes every accordion nested inside it, at any depth, so a
 * collapsed branch never hides expanded descendants.
 */
export class MpAccordion extends LitElement {
  static override styles = [accordionStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'multi',
      'highlight-active-tab',
      'tab-count',
    ];
  }

  /**
   * Config is attribute-only on purpose — a public accessor of the same name
   * makes `@lit/react` treat it as a property and drop it from the
   * server-rendered HTML, which would silently change the SSR chrome
   * (carousel lesson, docs/prd/carousel-wc.md §8).
   */
  get #multi(): boolean {
    return this.hasAttribute('multi') && this.getAttribute('multi') !== 'false';
  }

  get #highlightActiveTab(): boolean {
    return this.hasAttribute('highlight-active-tab');
  }

  /** Tab count for chrome generation, when no light DOM is present yet. */
  get #declaredTabCount(): number {
    const raw = Number(this.getAttribute('tab-count'));
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  }

  #tabElements: HTMLElement[] = [];
  #tabs: TabState[] = [];
  #mutationObserver: MutationObserver | null = null;

  override connectedCallback(): void {
    // Server-rendered chrome carries the user's pre-upgrade state in its
    // <input>s. Read it back onto the markers BEFORE super.connectedCallback,
    // which is where ReactiveElement calls createRenderRoot() and the shadow
    // gets wiped.
    if (this.shadowRoot) {
      this.#adoptSsrCheckedState();
    }

    super.connectedCallback();

    // Disengage the no-JS CSS state machine; from here JS owns the visuals.
    this.setAttribute('data-js', '');

    // Only this element's own child list matters — observing the subtree
    // would re-scan on every mutation a consumer makes inside a tab body.
    // Marker attributes are watched per marker instead, re-registered by
    // #refreshTabs as the child list changes.
    this.#mutationObserver = new MutationObserver(() => this.#refreshTabs());
    this.#mutationObserver.observe(this, { childList: true });
    this.#refreshTabs();
  }

  override disconnectedCallback(): void {
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
    super.disconnectedCallback();
  }

  override createRenderRoot(): ShadowRoot {
    // The DSD handoff is always destructive. The server chrome is the
    // input-driven no-JS tier and the client render is the button-driven JS
    // tier, so hydration would bind parts to the wrong nodes. Returning the
    // existing (emptied) shadow root directly also bypasses
    // lit-element-hydrate-support's `_$AG` flag, which would otherwise force
    // the first update through `hydrate()` (carousel precedent).
    const ctor = this.constructor as typeof MpAccordion & {
      shadowRootOptions?: ShadowRootInit;
      elementStyles?: CSSStyleSheet[];
    };
    let root: ShadowRoot;
    if (this.shadowRoot) {
      this.shadowRoot.replaceChildren();
      root = this.shadowRoot;
    } else {
      root = this.attachShadow(ctor.shadowRootOptions ?? { mode: 'open' });
    }
    adoptStyles(root, ctor.elementStyles ?? []);
    return root;
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (oldValue === newValue) return;
    this.requestUpdate();
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

  /**
   * Close every open tab. Nested accordions are closed too, so this
   * collapses an entire branch in one call.
   */
  closeAll(originalEvent: Event | null = null): void {
    this.#tabs.forEach((tab, index) => {
      if (tab.active) this.#setActive(index, false, originalEvent);
    });
  }

  // --------------------------------------------------------------- private

  /**
   * Mirror the server-rendered inputs' checked state onto the light-DOM
   * markers, so the client render opens exactly what the user left open.
   */
  #adoptSsrCheckedState(): void {
    const inputs = this.shadowRoot?.querySelectorAll<HTMLInputElement>('.acc-input');
    if (!inputs?.length) return;
    const tabs = this.#collectTabElements();
    inputs.forEach((input, index) => {
      const marker = tabs[index];
      if (!marker) return;
      if (input.checked) marker.setAttribute('is-active', '');
      else marker.removeAttribute('is-active');
    });
  }

  /**
   * Tabs and headers are identified by ATTRIBUTE, not tag name, and must be
   * direct children — named slots only accept those. A framework wrapper
   * always renders its own host element around the tab it contributes
   * (`<bs-accordion-tab>`), so requiring a specific tag would put the marker
   * one level too deep to ever be slotted. `<mp-accordion-tab>` is only the
   * vanilla convenience element; it tags itself.
   */
  #collectTabElements(): HTMLElement[] {
    return Array.from(this.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.hasAttribute('accordion-tab'),
    );
  }

  #collectHeaderElements(): HTMLElement[] {
    return Array.from(this.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.hasAttribute('accordion-header'),
    );
  }

  /**
   * Re-read the markers, (re-)stamp their slot names, and keep the per-marker
   * attribute observations current. Stamping is idempotent, and framework
   * wrappers stamp the same names server-side — where no script runs to do
   * it — so the two never disagree.
   */
  #refreshTabs(): void {
    const tabElements = this.#collectTabElements();
    const headerElements = this.#collectHeaderElements();

    tabElements.forEach((tab, index) => {
      const slot = `c${index}`;
      if (tab.getAttribute('slot') !== slot) tab.setAttribute('slot', slot);
    });
    headerElements.forEach((header, index) => {
      const slot = `h${index}`;
      if (header.getAttribute('slot') !== slot) header.setAttribute('slot', slot);
    });

    // Watch EVERY child, not just the recognised markers: `<mp-accordion-tab>`
    // tags itself in its own connectedCallback, which the DOM runs AFTER this
    // element's (parents connect first) — so a child that is not a marker yet
    // may become one a tick later. Re-observing an already-observed target
    // just replaces its options.
    Array.from(this.children).forEach((child) =>
      this.#mutationObserver?.observe(child, {
        attributes: true,
        attributeFilter: ['is-active', 'disabled', 'accordion-tab', 'accordion-header'],
      }),
    );

    this.#tabElements = tabElements;
    this.#tabs = tabElements.map((tab) => ({
      active: tab.hasAttribute('is-active'),
      disabled: tab.hasAttribute('disabled'),
    }));
    this.requestUpdate();
  }

  /**
   * The single write path for tab state: updates the marker (the source of
   * truth), enforces single-open, recursively collapses nested accordions on
   * close, and announces every change that actually happened.
   */
  #setActive(index: number, active: boolean, originalEvent: Event | null): void {
    const tab = this.#tabs[index];
    if (!tab || tab.disabled || tab.active === active) return;

    if (active && !this.#multi) {
      this.#tabs.forEach((sibling, siblingIndex) => {
        if (siblingIndex !== index && sibling.active) {
          this.#setActive(siblingIndex, false, originalEvent);
        }
      });
    }

    this.#writeMarker(index, active);
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

  #writeMarker(index: number, active: boolean): void {
    const marker = this.#tabElements[index];
    if (!marker) return;
    if (active) marker.setAttribute('is-active', '');
    else marker.removeAttribute('is-active');
  }

  /**
   * Collapse every accordion inside a closing tab. `querySelectorAll` reaches
   * ALL depths of the tab's light-DOM subtree in one pass, and each nested
   * `closeAll()` collapses its own descendants in turn — so a branch can
   * never be left with hidden-but-open tabs.
   */
  #closeNested(index: number, originalEvent: Event | null): void {
    const tab = this.#tabElements[index];
    if (!tab) return;
    tab.querySelectorAll('mp-accordion').forEach((nested) => {
      if (nested instanceof MpAccordion) nested.closeAll(originalEvent);
    });
  }

  #onHeaderClick(index: number, event: Event): void {
    this.#setActive(index, !this.#tabs[index]?.active, event);
  }

  /** APG accordion keyboard: Up/Down between headers, Home/End to the ends. */
  #onHeaderKeydown(index: number, event: KeyboardEvent): void {
    const last = this.#tabs.length - 1;
    let target: number | null = null;
    switch (event.key) {
      case 'ArrowDown': target = index === last ? 0 : index + 1; break;
      case 'ArrowUp': target = index === 0 ? last : index - 1; break;
      case 'Home': target = 0; break;
      case 'End': target = last; break;
      default: return;
    }
    event.preventDefault();
    this.shadowRoot?.querySelector<HTMLButtonElement>(`#b${target}`)?.focus();
  }

  override render(): TemplateResult {
    // data-js is set by connectedCallback, which lit-ssr never calls — so the
    // generated chrome is always the no-JS tier.
    const isBrowser = this.hasAttribute('data-js');
    const count = this.#tabs.length || this.#declaredTabCount;
    const rows = Array.from(
      { length: count },
      (_, index): TabState => this.#tabs[index] ?? { active: false, disabled: false },
    );

    return html`
      <div class="accordion-root" part="accordion">
        ${rows.map((row, index) =>
          isBrowser ? this.#renderJsItem(row, index) : this.#renderNoJsItem(row, index),
        )}
        <slot></slot>
      </div>
    `;
  }

  #renderJsItem(row: TabState, index: number): TemplateResult {
    return html`
      <div class="accordion-item ${row.active ? 'open' : ''}">
        <div class="accordion-header" role="heading" aria-level="2" id="h${index}" part="header">
          <button
            type="button"
            id="b${index}"
            class="accordion-button ${row.active ? '' : 'collapsed'}"
            aria-expanded=${row.active ? 'true' : 'false'}
            aria-controls="c${index}"
            ?disabled=${row.disabled}
            part="button"
            @click=${(event: Event) => this.#onHeaderClick(index, event)}
            @keydown=${(event: KeyboardEvent) => this.#onHeaderKeydown(index, event)}>
            <slot name="h${index}"></slot>
          </button>
        </div>
        ${this.#renderCollapse(index)}
      </div>
    `;
  }

  #renderNoJsItem(row: TabState, index: number): TemplateResult {
    // The input is the control (focusable, keyboard-operable, natively
    // toggled by its label) and the CSS state machine's only state. It is
    // clipped rather than `display: none` so it stays reachable by Tab.
    return html`
      <div class="accordion-item">
        <input
          class="acc-input"
          type=${this.#multi ? 'checkbox' : 'radio'}
          name=${this.#multi ? nothing : 'acc'}
          id="t${index}"
          aria-controls="c${index}"
          ?checked=${row.active}
          ?disabled=${row.disabled} />
        <div class="accordion-header" role="heading" aria-level="2" id="h${index}" part="header">
          <label class="accordion-button collapsed" for="t${index}" part="button">
            <slot name="h${index}"></slot>
          </label>
        </div>
        ${this.#renderCollapse(index)}
      </div>
    `;
  }

  #renderCollapse(index: number): TemplateResult {
    return html`
      <div class="accordion-collapse" id="c${index}" role="region" aria-labelledby="h${index}">
        <div class="accordion-content" part="content">
          <slot name="c${index}"></slot>
        </div>
      </div>
    `;
  }
}

if (
  typeof customElements !== 'undefined' &&
  !customElements.get('mp-accordion')
) {
  customElements.define('mp-accordion', MpAccordion);
}
