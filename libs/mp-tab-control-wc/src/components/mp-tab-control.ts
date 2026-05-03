import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { tabControlStyles } from '../styles';
import type { TabsPosition } from '../types';

export interface TabActivateEventDetail {
  /** The `tab-id` of the tab the user activated. */
  tabId: string;
  /** The original DOM event (click or keydown) that triggered the activation. */
  originalEvent: Event;
}

interface TabInfo {
  tabId: string;
  disabled: boolean;
}

/**
 * <mp-tab-control>
 *
 * Bootstrap-styled tab strip. Pages live in named `${id}-content` slots and
 * headers in `${id}-header` slots. The shadow DOM dynamically projects only
 * the currently-active page via `<slot name="${activeId}-content">`, so
 * inactive panels never enter the rendered tree.
 *
 * Authoring (vanilla):
 *
 *     <mp-tab-control active-tab="overview">
 *       <span slot="overview-header">Overview</span>
 *       <div slot="overview-content">Hello</div>
 *       <span slot="details-header">Details</span>
 *       <div slot="details-content">Details body</div>
 *     </mp-tab-control>
 *
 * To mark a tab disabled, set `data-disabled` on the `*-content` element.
 *
 * Active state is **controlled by the host** — the host sets `active-tab` and
 * listens for `tab-activate` events. The Angular wrapper (`bs-tab-control`)
 * drives this via signals.
 */
export class MpTabControl extends LitElement {
  static override styles = [tabControlStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'tabs-position',
      'border',
      'active-tab',
      'select-first-tab',
    ];
  }

  private tabs: TabInfo[] = [];
  private mutationObserver: MutationObserver | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'tablist');
    this.mutationObserver = new MutationObserver(() => this.refreshTabs());
    this.mutationObserver.observe(this, {
      childList: true,
      subtree: false,
      attributes: true,
      attributeFilter: ['slot', 'data-disabled'],
    });
  }

  override disconnectedCallback(): void {
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    super.disconnectedCallback();
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

  protected override firstUpdated(): void {
    this.refreshTabs();
  }

  private get tabsPosition(): TabsPosition {
    const v = this.getAttribute('tabs-position');
    return v === 'bottom' ? 'bottom' : 'top';
  }

  private get border(): boolean {
    return this.hasAttribute('border')
      ? this.getAttribute('border') !== 'false'
      : true;
  }

  private get selectFirstTab(): boolean {
    return this.hasAttribute('select-first-tab')
      ? this.getAttribute('select-first-tab') !== 'false'
      : true;
  }

  private get activeTabId(): string | null {
    return this.getAttribute('active-tab');
  }

  private refreshTabs(): void {
    const found = new Map<string, TabInfo>();
    for (const child of Array.from(this.children)) {
      const slot = child.getAttribute('slot');
      if (!slot) continue;
      const m = slot.match(/^(.+)-content$/);
      if (!m) continue;
      const tabId = m[1];
      const disabled = child.hasAttribute('data-disabled') &&
        child.getAttribute('data-disabled') !== 'false';
      // First occurrence wins on duplicate slot names.
      if (!found.has(tabId)) {
        found.set(tabId, { tabId, disabled });
      }
    }
    this.tabs = Array.from(found.values());
    this.requestUpdate();
  }

  private resolvedActiveTabId(): string | null {
    const explicit = this.activeTabId;
    if (
      explicit !== null &&
      this.tabs.some((t) => t.tabId === explicit && !t.disabled)
    ) {
      return explicit;
    }
    if (!this.selectFirstTab) return null;
    const firstEnabled = this.tabs.find((t) => !t.disabled);
    return firstEnabled?.tabId ?? null;
  }

  override render(): TemplateResult {
    const activeId = this.resolvedActiveTabId();
    const strip = html`
      <div class="tsc${this.tabsPosition === 'bottom' ? ' bottom-tabs' : ''}">
        <ul
          class="nav nav-tabs flex-nowrap overflow-x-auto overflow-y-hidden"
          role="tablist"
        >
          ${this.tabs.map((tab) => this.renderTabHeader(tab, activeId))}
        </ul>
      </div>
    `;
    const content = html`
      <div
        class="tab-content flex-grow-1 overflow-auto${this.border
          ? activeId
            ? ' border'
            : ' border-top'
          : ''}"
      >
        <slot name=${activeId ? `${activeId}-content` : '__none__'}></slot>
      </div>
    `;
    return html`
      ${this.tabsPosition === 'top' ? strip : nothing}
      ${content}
      ${this.tabsPosition === 'bottom' ? strip : nothing}
    `;
  }

  private renderTabHeader(
    tab: TabInfo,
    activeId: string | null,
  ): TemplateResult {
    const isActive = tab.tabId === activeId;
    return html`
      <li class="nav-item" role="presentation">
        <button
          type="button"
          class="nav-link text-nowrap${isActive ? ' active' : ''}${tab.disabled
            ? ' disabled'
            : ''}"
          role="tab"
          id=${`${tab.tabId}-header-button`}
          aria-controls=${`${tab.tabId}-panel`}
          aria-selected=${isActive ? 'true' : 'false'}
          ?disabled=${tab.disabled}
          tabindex=${tab.disabled ? -1 : isActive ? 0 : -1}
          @click=${(ev: Event) => this.activate(tab, ev)}
          @keydown=${(ev: KeyboardEvent) => this.handleKeydown(tab, ev)}
        >
          <slot name=${`${tab.tabId}-header`}></slot>
        </button>
      </li>
    `;
  }

  private activate(tab: TabInfo, ev: Event): void {
    if (tab.disabled) return;
    ev.preventDefault();
    this.dispatchEvent(
      new CustomEvent<TabActivateEventDetail>('tab-activate', {
        detail: { tabId: tab.tabId, originalEvent: ev },
        bubbles: true,
        composed: true,
      }),
    );
    this.setAttribute('active-tab', tab.tabId);
  }

  private handleKeydown(tab: TabInfo, ev: KeyboardEvent): void {
    switch (ev.key) {
      case 'Enter':
      case ' ':
        this.activate(tab, ev);
        return;
      case 'ArrowLeft':
      case 'ArrowRight': {
        ev.preventDefault();
        const dir = ev.key === 'ArrowRight' ? 1 : -1;
        const enabled = this.tabs.filter((t) => !t.disabled);
        if (enabled.length === 0) return;
        const currentIdx = enabled.findIndex((t) => t.tabId === tab.tabId);
        const nextIdx =
          (currentIdx + dir + enabled.length) % enabled.length;
        const nextTab = enabled[nextIdx];
        this.setAttribute('active-tab', nextTab.tabId);
        const newButton = this.shadowRoot?.querySelector<HTMLButtonElement>(
          `button[id="${nextTab.tabId}-header-button"]`,
        );
        newButton?.focus();
        this.dispatchEvent(
          new CustomEvent<TabActivateEventDetail>('tab-activate', {
            detail: { tabId: nextTab.tabId, originalEvent: ev },
            bubbles: true,
            composed: true,
          }),
        );
        return;
      }
    }
  }
}

if (
  typeof customElements !== 'undefined' &&
  !customElements.get('mp-tab-control')
) {
  customElements.define('mp-tab-control', MpTabControl);
}
