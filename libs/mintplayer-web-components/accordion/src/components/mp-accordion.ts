import { adoptStyles, LitElement, html, nothing, type TemplateResult } from 'lit';
import { accordionStyles } from '../styles';

let nextGroupId = 0;

interface TabInfo {
  id: string;
  isActive: boolean;
  disabled: boolean;
}

export interface AccordionTabToggleDetail {
  /** The `data-tab-id` of the tab the user toggled. */
  tabId: string;
  /** The new active state. */
  active: boolean;
  /** Original DOM event (click or keydown) that triggered the toggle. */
  originalEvent: Event;
}

/**
 * `<mp-accordion>` — single composite web component.
 *
 * Owns the *entire* accordion structure in a single shadow root. Light-DOM
 * children carry a `data-tab-id` attribute and act as markers for tabs; their
 * header content is slotted via `slot="${tabId}-header"` and their body
 * content via `slot="${tabId}-content"`. The WC iterates markers, renders one
 * row of [input → heading → collapse → content] per tab, and dispatches
 * `mp-accordion-tab-toggle` on user interaction.
 *
 * This avoids the cross-shadow style cascade issues that arise when each tab
 * is its own WC. Bootstrap's accordion CSS now lives in one shadow scope,
 * `.accordion-button` and `.accordion-content` are siblings inside the same
 * shadow root, and consumer overrides via `--bs-accordion-*` custom
 * properties cascade naturally because nothing redeclares them inside the
 * shadow at any intermediate element.
 *
 * Authoring (vanilla):
 *
 *     <mp-accordion>
 *       <span data-tab-id="t1" is-active>
 *         <!-- header + body live in slots, not inside the marker -->
 *       </span>
 *       <span slot="t1-header">Profile</span>
 *       <div slot="t1-content">Profile body content</div>
 *     </mp-accordion>
 *
 * In practice the Angular/React/Vue wrappers handle the slot wiring.
 */
export class MpAccordion extends LitElement {
  static override styles = [accordionStyles];

  static override properties = {
    multi: { type: Boolean, reflect: true },
    isServerSide: { type: Boolean, attribute: 'is-server-side', reflect: true },
    highlightActive: { type: Boolean, attribute: 'highlight-active', reflect: true },
    groupName: { type: String, attribute: 'group-name', reflect: true },
  };

  multi = false;
  isServerSide = false;
  highlightActive = false;
  groupName = `mp-accordion-${++nextGroupId}`;

  private tabs: TabInfo[] = [];
  private mutationObserver: MutationObserver | null = null;

  override connectedCallback(): void {
    // Hydration opt-out for the SSR branch. Snapshot the SSR <input>'s
    // checked state back onto the light-DOM markers so the client render
    // path picks up the same active set. The shadow content is wiped in
    // `createRenderRoot` below — has to happen there (not here) because
    // `@lit-labs/ssr-client/lit-element-hydrate-support` patches
    // `createRenderRoot` to detect an existing shadow root and flip its
    // `_$AG` flag, switching the first `update()` from `render()` to
    // `hydrate()`. Overriding `createRenderRoot` ourselves wins on the
    // prototype chain (subclass beats global patch) and prevents that flag
    // from ever being set.
    if (this.hasAttribute('is-server-side')) {
      this.snapshotSsrCheckedState();
      this.removeAttribute('is-server-side');
      this.isServerSide = false;
    }

    super.connectedCallback();

    this.mutationObserver = new MutationObserver(() => this.refreshTabs());
    this.mutationObserver.observe(this, {
      childList: true,
      // `subtree: true` is needed so we see attribute changes on light-DOM
      // marker children (`<bs-accordion-tab>`'s `is-active` flipping when
      // the user clicks a header). With `subtree: false`, MutationObserver
      // only watches the target element itself.
      subtree: true,
      attributes: true,
      attributeFilter: ['data-tab-id', 'is-active', 'disabled'],
    });
    this.refreshTabs();
  }

  override disconnectedCallback(): void {
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    super.disconnectedCallback();
  }

  override createRenderRoot(): ShadowRoot {
    // Bypass lit-element-hydrate-support. Our SSR shadow content (radio-based
    // CSS state machine) does not match the client `render()` output
    // (button-based JS-driven), so hydration would either bind reactive
    // parts to the wrong nodes or throw "no root part" against an empty
    // shadow. Always start with a clean shadow root and let Lit `render()`
    // populate it fresh. We replicate the standard LitElement behavior
    // (attach shadow + adoptStyles) minus the hydrate-support's `_$AG`
    // bookkeeping.
    const ctor = this.constructor as typeof MpAccordion;
    let root: ShadowRoot;
    if (this.shadowRoot) {
      this.shadowRoot.replaceChildren();
      root = this.shadowRoot;
    } else {
      root = this.attachShadow(((ctor as { shadowRootOptions?: ShadowRootInit }).shadowRootOptions ?? { mode: 'open' }) as ShadowRootInit);
    }
    adoptStyles(root, (ctor as { elementStyles?: CSSStyleSheet[] }).elementStyles ?? []);
    return root;
  }

  /**
   * Read each SSR-rendered <input>'s `checked` and reflect it back onto the
   * corresponding light-DOM marker's `is-active` attribute. Lets consumer
   * frameworks observe the post-hydration state via normal attribute reads.
   */
  private snapshotSsrCheckedState(): void {
    const inputs = this.shadowRoot?.querySelectorAll<HTMLInputElement>(
      'input[type="radio"], input[type="checkbox"]',
    );
    inputs?.forEach((input) => {
      const id = input.id;
      const marker = this.querySelector(`[data-tab-id="${id}"]`);
      if (!marker) return;
      if (input.checked && !marker.hasAttribute('is-active')) {
        marker.setAttribute('is-active', '');
      } else if (!input.checked && marker.hasAttribute('is-active')) {
        marker.removeAttribute('is-active');
      }
    });
  }

  private refreshTabs(): void {
    const found = new Map<string, TabInfo>();
    for (const child of Array.from(this.children)) {
      const id = child.getAttribute('data-tab-id');
      if (!id) continue;
      if (!found.has(id)) {
        found.set(id, {
          id,
          isActive: child.hasAttribute('is-active'),
          disabled: child.hasAttribute('disabled'),
        });
      }
    }
    this.tabs = Array.from(found.values());
    this.requestUpdate();
  }

  override render(): TemplateResult {
    return this.isServerSide ? this.renderSsr() : this.renderClient();
  }

  private renderSsr(): TemplateResult {
    const inputType = this.multi ? 'checkbox' : 'radio';
    return html`
      <div class="accordion">
        ${this.tabs.map((tab) => html`
          <div class="accordion-item" data-for-tab=${tab.id}>
            <input
              type=${inputType}
              name=${this.multi ? nothing : (this.groupName || nothing)}
              id=${tab.id}
              class="d-none"
              ?checked=${tab.isActive}
              ?disabled=${tab.disabled}
            />
            <div role="heading" aria-level="2" class="accordion-header" id=${tab.id + '-header'} part="header">
              <label
                for=${tab.id}
                role="button"
                tabindex=${tab.disabled ? -1 : 0}
                class=${`accordion-button${tab.isActive ? '' : ' collapsed'}`}
                aria-controls=${tab.id + '-content'}
                aria-expanded=${tab.isActive ? 'true' : 'false'}
                part="button"
              >
                <slot name=${tab.id + '-header'}></slot>
              </label>
            </div>
            <div
              id=${tab.id + '-content'}
              class="accordion-collapse"
              role="region"
              aria-labelledby=${tab.id + '-header'}
            >
              <div class="accordion-content" part="content">
                <slot name=${tab.id + '-content'}></slot>
              </div>
            </div>
          </div>
        `)}
      </div>
    `;
  }

  private renderClient(): TemplateResult {
    return html`
      <div class="accordion">
        ${this.tabs.map((tab) => html`
          <div class="accordion-item" data-for-tab=${tab.id}>
            <div role="heading" aria-level="2" class="accordion-header" id=${tab.id + '-header'} part="header">
              <button
                type="button"
                class=${`accordion-button${tab.isActive ? '' : ' collapsed'}`}
                aria-controls=${tab.id + '-content'}
                aria-expanded=${tab.isActive ? 'true' : 'false'}
                ?disabled=${tab.disabled}
                @click=${(ev: Event) => this.handleActivate(tab, ev)}
                @keydown=${(ev: KeyboardEvent) => this.handleKeydown(tab, ev)}
                part="button"
              >
                <slot name=${tab.id + '-header'}></slot>
              </button>
            </div>
            <div
              id=${tab.id + '-content'}
              class="accordion-collapse"
              role="region"
              aria-labelledby=${tab.id + '-header'}
            >
              <div class="accordion-content" part="content">
                <slot name=${tab.id + '-content'}></slot>
              </div>
            </div>
          </div>
        `)}
      </div>
    `;
  }

  private handleActivate(tab: TabInfo, ev: Event): void {
    if (tab.disabled) return;
    this.toggleTab(tab.id, !tab.isActive, ev);
  }

  private handleKeydown(tab: TabInfo, ev: KeyboardEvent): void {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.handleActivate(tab, ev);
    }
  }

  private toggleTab(tabId: string, active: boolean, originalEvent: Event): void {
    // Update the light-DOM marker — the MutationObserver picks this up and
    // triggers a re-render with the new active set.
    const marker = this.querySelector(`[data-tab-id="${tabId}"]`);
    if (marker) {
      if (active) marker.setAttribute('is-active', '');
      else marker.removeAttribute('is-active');
    }

    // Single-mode sibling close. Update sibling markers; their owning Angular
    // components will react via `mp-accordion-tab-toggle` events (one per
    // marker we change).
    if (active && !this.multi) {
      for (const other of Array.from(this.children)) {
        const otherId = other.getAttribute('data-tab-id');
        if (otherId && otherId !== tabId && other.hasAttribute('is-active')) {
          other.removeAttribute('is-active');
          this.dispatchEvent(
            new CustomEvent<AccordionTabToggleDetail>('mp-accordion-tab-toggle', {
              detail: { tabId: otherId, active: false, originalEvent },
              bubbles: true,
              composed: true,
            }),
          );
        }
      }
    }

    this.dispatchEvent(
      new CustomEvent<AccordionTabToggleDetail>('mp-accordion-tab-toggle', {
        detail: { tabId, active, originalEvent },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

if (
  typeof customElements !== 'undefined' &&
  !customElements.get('mp-accordion')
) {
  customElements.define('mp-accordion', MpAccordion);
}
