import { adoptStyles, LitElement, html, nothing, type TemplateResult } from 'lit';
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

/**
 * `<mp-accordion>` — Bootstrap accordion owning its whole structure in one
 * shadow root, built on native `<details name>`/`<summary>` (decision D1).
 *
 * Light-DOM children are markers, not chrome: each `<mp-accordion-tab>`
 * supplies one tab's body, each `[accordion-header]` element supplies one
 * header, paired by position (i-th header ↔ i-th tab). This element stamps
 * the `slot="hN"` / `slot="cN"` names itself, so consumers never write them.
 * Children that are neither render through the default slot — an accordion
 * with zero tabs is a valid styled container (the offcanvas nav uses one).
 *
 * ONE template serves both tiers. The UA owns disclosure state: a closed
 * `<details>` removes its content from the tab order and the accessibility
 * tree with no CSS, works with no script at all, and `name` gives single-open
 * exclusivity natively (scoped per shadow root — spike 0.1a). Single-open is
 * ALSO enforced here from state, because engines without `name` support (and
 * jsdom) must behave identically and PRD §11a wants state true at every
 * moment, not only where the UA cooperates.
 *
 * The `toggle` contract (spike 0.1a, all three engines): it does not bubble
 * (delegate in the CAPTURE phase), it is asynchronous, and same-task flips
 * are coalesced into one event carrying the final state — so toggle is
 * treated purely as a notification and `details.open` is re-read from every
 * row. A disabled tab is kept inert by a cancellable KEYDOWN guard;
 * `toggle` itself cannot be cancelled.
 *
 * Active state lives on the light-DOM markers (`is-active`), which makes it
 * declarative for every framework wrapper and survives the SSR handoff — the
 * pre-upgrade `[open]` state is read back onto the markers before the shadow
 * is replaced.
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

  /** Tab count for chrome generation, when no light DOM is present yet. */
  get #declaredTabCount(): number {
    const raw = Number(this.getAttribute('tab-count'));
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  }

  #tabElements: HTMLElement[] = [];
  #tabs: TabState[] = [];
  #mutationObserver: MutationObserver | null = null;

  override connectedCallback(): void {
    // Server-rendered chrome carries the user's pre-upgrade state on its
    // <details>. Read it back onto the markers BEFORE super.connectedCallback,
    // which is where ReactiveElement calls createRenderRoot() and the shadow
    // gets wiped.
    if (this.shadowRoot) {
      this.#adoptSsrOpenState();
    }

    super.connectedCallback();

    // Since D1 no styling hangs off this — both tiers share one template —
    // but it remains the observable "hydrated" signal (e2e readiness
    // predicates key on it; lit-ssr never runs connectedCallback).
    this.setAttribute('data-js', '');

    // Nesting is always light-DOM (a nested accordion is authored inside a
    // tab's body), so an ordinary ancestor walk finds it — no shadow
    // crossing. The stylesheet uses this to collapse the doubled border
    // between a tab and the accordion inside it.
    if (this.parentElement?.closest('mp-accordion')) {
      this.setAttribute('data-nested', '');
    } else {
      this.removeAttribute('data-nested');
    }

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
    // The DSD handoff is always destructive: returning the existing (emptied)
    // shadow root directly bypasses lit-element-hydrate-support's `_$AG`
    // flag, which would otherwise force the first update through `hydrate()`
    // (carousel precedent).
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
    // toggle does not bubble; capture-phase delegation is the one listener
    // that hears every row without per-details bookkeeping (spike 0.1a).
    root.addEventListener('toggle', (event) => this.#onToggle(event), { capture: true });
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
   * Mirror the server-rendered rows' UA-owned open state onto the light-DOM
   * markers, so the client render opens exactly what the user left open.
   */
  #adoptSsrOpenState(): void {
    const rows = this.shadowRoot?.querySelectorAll<HTMLDetailsElement>('details.accordion-item');
    if (!rows?.length) return;
    const tabs = this.#collectTabElements();
    rows.forEach((row, index) => {
      const marker = tabs[index];
      if (!marker) return;
      if (row.open) marker.setAttribute('is-active', '');
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

    const previous = this.#tabs;
    this.#tabElements = tabElements;
    this.#tabs = tabElements.map((tab) => ({
      active: tab.hasAttribute('is-active'),
      disabled: tab.hasAttribute('disabled'),
    }));

    // A framework's two-way binding can close a tab by writing the marker
    // directly, never passing through #setActive — the nested-collapse
    // contract has to hold for those writes too. Only meaningful while the
    // tabs line up; after an add/remove the indexes describe different tabs.
    if (previous.length === this.#tabs.length) {
      this.#tabs.forEach((tab, index) => {
        if (!tab.active && previous[index].active) this.#closeNested(index, null);
      });
    }

    this.requestUpdate();
  }

  /**
   * The single notification channel for UA-driven state changes: user
   * activation, `name` exclusivity closing a sibling, or anything else that
   * flips `open`. Per spike 0.1a the event is async, coalesced and carries no
   * usable delta — so it is treated purely as "something changed" and every
   * row's `open` is re-read and diffed against the state.
   */
  #onToggle(event: Event): void {
    const rows = this.renderRoot?.querySelectorAll<HTMLDetailsElement>('details.accordion-item');
    if (!rows) return;
    rows.forEach((row, index) => {
      const tab = this.#tabs[index];
      if (!tab || row.open === tab.active) return;
      if (tab.disabled) {
        // Safety net for programmatic writes around the keydown guard; the
        // guarded user paths never reach here, so there is no visible flash.
        row.open = tab.active;
        return;
      }
      this.#setActive(index, row.open, event);
    });
  }

  /**
   * The single write path for tab state: updates the marker (the source of
   * truth), enforces single-open, recursively collapses nested accordions on
   * close, and announces every change that actually happened. The render pass
   * reconciles `?open` from the markers, which in engines with `name` support
   * merely confirms what the UA already did.
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

  /**
   * Enter/Space activation is native to `<summary>`. This handler adds the
   * APG accordion extras (Up/Down between headers, Home/End to the ends) and
   * the disabled guard: `toggle` is not cancellable, but keydown IS — cancel
   * it before the UA acts and a disabled tab is inert with no flash.
   */
  #onSummaryKeydown(index: number, event: KeyboardEvent): void {
    if (this.#tabs[index]?.disabled && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      return;
    }

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
    this.shadowRoot?.querySelector<HTMLElement>(`#h${target}`)?.focus();
  }

  /** A disabled summary must also ignore the pointer (pointer-events: none in CSS is the primary guard; this covers synthesized clicks). */
  #onSummaryClick(index: number, event: Event): void {
    if (this.#tabs[index]?.disabled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  override render(): TemplateResult {
    const count = this.#tabs.length || this.#declaredTabCount;
    const rows = Array.from(
      { length: count },
      (_, index): TabState => this.#tabs[index] ?? { active: false, disabled: false },
    );

    return html`
      <div class="accordion-root" part="accordion">
        ${rows.map((row, index) => this.#renderItem(row, index))}
        <slot></slot>
      </div>
    `;
  }

  /**
   * One template for both tiers. `name` is constant: `<details name>` groups
   * per node tree (spike 0.1a), and every accordion owns its own shadow root,
   * so instances can never capture each other's exclusivity. The summary
   * keeps a static `collapsed` class so Bootstrap's own
   * `.accordion-button:not(.collapsed)` rules never fire — the open state is
   * styled from `details[open]` (spike 0.1b).
   */
  #renderItem(row: TabState, index: number): TemplateResult {
    return html`
      <details
        class="accordion-item"
        name=${this.#multi ? nothing : 'acc'}
        ?open=${row.active}
        part="item">
        <summary
          id="h${index}"
          class="accordion-button collapsed"
          aria-controls="c${index}"
          aria-disabled=${row.disabled ? 'true' : nothing}
          tabindex=${row.disabled ? '-1' : nothing}
          part="button"
          @click=${(event: Event) => this.#onSummaryClick(index, event)}
          @keydown=${(event: KeyboardEvent) => this.#onSummaryKeydown(index, event)}>
          <slot name="h${index}"></slot>
        </summary>
        <div class="accordion-content" id="c${index}" role="region" aria-labelledby="h${index}" part="content">
          <slot name="c${index}"></slot>
        </div>
      </details>
    `;
  }
}

if (
  typeof customElements !== 'undefined' &&
  !customElements.get('mp-accordion')
) {
  customElements.define('mp-accordion', MpAccordion);
}
