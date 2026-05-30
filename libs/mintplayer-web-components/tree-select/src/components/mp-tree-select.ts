import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { OverlayController } from '@mintplayer/web-components/overlay';
import '@mintplayer/web-components/treeview';
import type {
  MpTreeview,
  TreeNodeRenderer,
  TreeNodeSelectEventDetail,
  TreeviewSelectionMode,
} from '@mintplayer/web-components/treeview';
import { treeSelectStyles } from '../styles';
import type {
  NodePage,
  TreeNode,
  TreeSelectChangeEventDetail,
  TreeSelectMode,
  TreeSelectProvider,
  TreeSelectVariant,
} from '../types';

const CARET_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" width="100%" height="100%">' +
  '<path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>';

/** A render-callback the wrappers bridge to their native templating. */
export type NodeTemplate = (node: TreeNode, query: string) => Node;
export type ValueTemplate = (value: TreeNode | TreeNode[] | null) => Node;
export type PanelTemplate = () => Node;

/**
 * `<mp-tree-select>` — a hierarchical, async, searchable select.
 *
 * Replaces the legacy select2 / searchbox / multiselect controls. Data is
 * async-only via a {@link TreeSelectProvider}; selection is held as full
 * `TreeNode` objects. See the issue #342 PRD for the full contract.
 */
export class MpTreeSelect extends LitElement {
  static override styles = [treeSelectStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'mode',
      'variant',
      'cascade-select',
      'placeholder',
      'show-clear',
      'scroll-height',
      'disabled',
      'search-debounce-ms',
    ];
  }

  // ---- attribute-backed configuration -----------------------------------
  private _mode: TreeSelectMode = 'single';
  private _variant: TreeSelectVariant = 'textbox';
  private _cascadeSelect = false;
  private _placeholder = '';
  private _showClear = false;
  private _scrollHeight = '300px';
  private _disabled = false;
  private _searchDebounceMs = 200;

  // ---- render callbacks (property-only) ----------------------------------
  itemTemplate?: NodeTemplate;
  suggestionTemplate?: NodeTemplate;
  buttonTemplate?: ValueTemplate;
  headerTemplate?: PanelTemplate;
  footerTemplate?: PanelTemplate;
  noResultsTemplate?: PanelTemplate;
  enterSearchTermTemplate?: PanelTemplate;

  // ---- data state --------------------------------------------------------
  private _provider?: TreeSelectProvider;
  private _nodes: TreeNode[] = [];
  private _searchResults: TreeNode[] | null = null;
  private _query = '';
  private _loading = false;
  private _rootsLoaded = false;
  private _rootsHasMore = false;
  private _searchHasMore = false;
  private readonly _byId = new Map<string, TreeNode>();
  private readonly _parentById = new Map<string, TreeNode | null>();

  // ---- selection ---------------------------------------------------------
  private _selected = new Map<string, TreeNode>();
  private readonly _indeterminate = new Set<string>();

  // ---- infrastructure ----------------------------------------------------
  private _abort?: AbortController;
  private _debounceTimer = 0;
  private readonly overlay = new OverlayController(this, {
    anchor: () => this.renderRoot.querySelector<HTMLElement>('.ts-anchor'),
    panel: () => this.renderRoot.querySelector<HTMLElement>('.ts-panel'),
    panelWidth: 'anchor-min',
    scrollStrategy: 'reposition',
    onClose: () => this.onPanelClosed(),
  });

  // ---- public reactive properties ----------------------------------------
  get provider(): TreeSelectProvider | undefined {
    return this._provider;
  }
  set provider(value: TreeSelectProvider | undefined) {
    this._provider = value;
    this._rootsLoaded = false;
    this._nodes = [];
    this._byId.clear();
    this._parentById.clear();
    if (this.overlay.isOpen) void this.ensureRoots();
    this.requestUpdate();
  }

  get value(): TreeNode | TreeNode[] | null {
    if (this._mode === 'single') {
      return this._selected.size ? (this._selected.values().next().value as TreeNode) : null;
    }
    return [...this._selected.values()];
  }
  set value(value: TreeNode | TreeNode[] | null) {
    this._selected = new Map();
    const list = Array.isArray(value) ? value : value ? [value] : [];
    for (const node of list) {
      if (!node) continue;
      this._selected.set(node.id, node);
      this._byId.set(node.id, node);
    }
    this.recomputeIndeterminate();
    this.syncTreeviewSelection();
    this.requestUpdate();
  }

  get mode(): TreeSelectMode {
    return this._mode;
  }
  set mode(value: TreeSelectMode) {
    this._mode = value;
    if (value === 'single' && this._selected.size > 1) {
      const first = this._selected.values().next().value as TreeNode;
      this._selected = new Map([[first.id, first]]);
    }
    this.requestUpdate();
  }

  get variant(): TreeSelectVariant {
    return this._variant;
  }
  set variant(value: TreeSelectVariant) {
    this._variant = value;
    this.requestUpdate();
  }

  get cascadeSelect(): boolean {
    return this._cascadeSelect;
  }
  set cascadeSelect(value: boolean) {
    this._cascadeSelect = !!value;
    this.requestUpdate();
  }

  get placeholder(): string {
    return this._placeholder;
  }
  set placeholder(value: string) {
    this._placeholder = value ?? '';
    this.requestUpdate();
  }

  get showClear(): boolean {
    return this._showClear;
  }
  set showClear(value: boolean) {
    this._showClear = !!value;
    this.requestUpdate();
  }

  // NB: cannot be named `scrollHeight` — that's a readonly DOM property on HTMLElement.
  get panelScrollHeight(): string {
    return this._scrollHeight;
  }
  set panelScrollHeight(value: string) {
    this._scrollHeight = value || '300px';
    this.requestUpdate();
  }

  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: boolean) {
    this._disabled = !!value;
    this.toggleAttribute('disabled', this._disabled);
    if (this._disabled) this.overlay.close(false);
    this.requestUpdate();
  }

  get searchDebounceMs(): number {
    return this._searchDebounceMs;
  }
  set searchDebounceMs(value: number) {
    this._searchDebounceMs = Math.max(0, Number(value) || 0);
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    switch (name) {
      case 'mode':
        this.mode = (newValue as TreeSelectMode) ?? 'single';
        break;
      case 'variant':
        this.variant = (newValue as TreeSelectVariant) ?? 'textbox';
        break;
      case 'cascade-select':
        this.cascadeSelect = newValue !== null;
        break;
      case 'placeholder':
        this.placeholder = newValue ?? '';
        break;
      case 'show-clear':
        this.showClear = newValue !== null;
        break;
      case 'scroll-height':
        this.panelScrollHeight = newValue ?? '300px';
        break;
      case 'disabled':
        this.disabled = newValue !== null;
        break;
      case 'search-debounce-ms':
        this.searchDebounceMs = Number(newValue);
        break;
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._abort?.abort();
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
  }

  // ---- index helpers -----------------------------------------------------
  private indexNodes(nodes: ReadonlyArray<TreeNode>, parent: TreeNode | null): void {
    for (const node of nodes) {
      this._byId.set(node.id, node);
      this._parentById.set(node.id, parent);
      if (node.children?.length) this.indexNodes(node.children, node);
    }
  }

  /**
   * Rebuild the id/parent index from the *currently displayed* tree
   * (search results when searching, else the browse tree). Providers hand
   * back fresh shallow node copies per call, so search must not pollute the
   * browse index — re-indexing the active set keeps cascade + lazy-expand
   * pointing at the objects actually rendered, and restores the browse index
   * when a search is cleared.
   */
  private reindexActive(): void {
    this._byId.clear();
    this._parentById.clear();
    this.indexNodes(this._searchResults ?? this._nodes, null);
  }

  // ---- data loading ------------------------------------------------------
  private async ensureRoots(): Promise<void> {
    if (this._rootsLoaded || !this._provider) return;
    await this.loadRoots(false);
  }

  private async loadRoots(append: boolean): Promise<void> {
    if (!this._provider) return;
    const offset = append ? this._nodes.length : 0;
    const page = await this.runRequest((signal) => this._provider!.loadRoots({ offset, signal }));
    if (!page) return;
    this._nodes = append ? [...this._nodes, ...page.nodes] : page.nodes;
    this._rootsHasMore = !!page.hasMore;
    this._rootsLoaded = true;
    this.reindexActive();
    this.requestUpdate();
  }

  private async runSearch(append: boolean): Promise<void> {
    if (!this._provider) return;
    const query = this._query;
    const offset = append ? (this._searchResults?.length ?? 0) : 0;
    const page = await this.runRequest((signal) => this._provider!.search(query, { offset, signal }));
    if (!page) return;
    this._searchResults = append ? [...(this._searchResults ?? []), ...page.nodes] : page.nodes;
    this._searchHasMore = !!page.hasMore;
    this.reindexActive();
    this.requestUpdate();
  }

  /** Run a provider call with abort + loading bookkeeping. Returns null on abort/error. */
  private async runRequest(call: (signal: AbortSignal) => Promise<NodePage>): Promise<NodePage | null> {
    this._abort?.abort();
    const controller = new AbortController();
    this._abort = controller;
    this._loading = true;
    this.requestUpdate();
    try {
      const page = await call(controller.signal);
      if (controller.signal.aborted) return null;
      this._loading = false;
      this.requestUpdate();
      return page;
    } catch (err) {
      if (controller.signal.aborted || (err as Error)?.name === 'AbortError') return null;
      this._loading = false;
      this.dispatchEvent(
        new CustomEvent('load-error', { detail: { error: err }, bubbles: true, composed: true }),
      );
      this.requestUpdate();
      return null;
    }
  }

  /** Lazy children loader wired into the embedded `mp-treeview`. */
  private readonly treeviewLoadChildren = async (parentId: string): Promise<TreeNode[]> => {
    if (!this._provider) return [];
    const controller = new AbortController();
    const page = await this._provider.loadChildren(parentId, { offset: 0, signal: controller.signal });
    const parent = this._byId.get(parentId);
    if (parent) {
      parent.children = page.nodes;
      // New ref so the treeview rebuilds its index and re-renders.
      if (this._searchResults) this._searchResults = [...this._searchResults];
      else this._nodes = [...this._nodes];
      this.reindexActive();
    }
    // If a cascaded parent is selected, extend the cascade to freshly-loaded kids.
    if (this._mode === 'checkbox' && this._cascadeSelect && parent && this._selected.has(parentId)) {
      for (const child of page.nodes) this.applyDown(child, true);
      this.recomputeIndeterminate();
    }
    this.requestUpdate();
    return page.nodes;
  };

  private onLoadMore(): void {
    if (this._query) void this.runSearch(true);
    else void this.loadRoots(true);
  }

  // ---- search input ------------------------------------------------------
  private onSearchInput(ev: Event): void {
    this._query = (ev.target as HTMLInputElement).value;
    if (!this.overlay.isOpen) void this.open();
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    const run = () => {
      if (this._query.trim()) {
        void this.runSearch(false);
      } else {
        this._abort?.abort();
        this._searchResults = null;
        this._loading = false;
        // Restore the browse-tree index (search may have overwritten it).
        this.reindexActive();
        this.requestUpdate();
      }
      this.dispatchEvent(
        new CustomEvent('search', { detail: { query: this._query }, bubbles: true, composed: true }),
      );
    };
    if (this._searchDebounceMs > 0) this._debounceTimer = window.setTimeout(run, this._searchDebounceMs);
    else run();
  }

  // ---- open / close ------------------------------------------------------
  async open(): Promise<void> {
    if (this._disabled || !this._provider) return;
    await this.ensureRoots();
    await this.overlay.open();
    this.dispatchEvent(new CustomEvent('open', { bubbles: true, composed: true }));
  }

  close(): void {
    this.overlay.close();
  }

  private onPanelClosed(): void {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private onTriggerClick(): void {
    if (this.overlay.isOpen) this.overlay.close();
    else void this.open();
  }

  private focusSearchAndOpen(): void {
    void this.open();
    requestAnimationFrame(() => {
      this.renderRoot.querySelector<HTMLInputElement>('.ts-search')?.focus();
    });
  }

  // ---- selection ---------------------------------------------------------
  private onTreeSelect(ev: Event): void {
    if (this._mode !== 'single') return;
    const detail = (ev as CustomEvent<TreeNodeSelectEventDetail>).detail;
    this._selected = new Map([[detail.node.id, detail.node]]);
    this._byId.set(detail.node.id, detail.node);
    this.emitChange(detail.node, undefined);
    this.requestUpdate();
    this.overlay.close();
  }

  private onCheckboxToggle(node: TreeNode, checked: boolean): void {
    const cascade = this._mode === 'checkbox' && this._cascadeSelect;
    if (cascade) {
      this.applyDown(node, checked);
      this.applyUp(node);
      this.recomputeIndeterminate();
    } else if (checked) {
      this._selected.set(node.id, node);
    } else {
      this._selected.delete(node.id);
    }
    this.emitChange(checked ? node : undefined, checked ? undefined : node);
    this.syncTreeviewSelection();
    this.requestUpdate();
  }

  private removeNode(node: TreeNode): void {
    if (this._mode === 'checkbox' && this._cascadeSelect) {
      this.applyDown(node, false);
      this.applyUp(node);
      this.recomputeIndeterminate();
    } else {
      this._selected.delete(node.id);
    }
    this.emitChange(undefined, node);
    this.syncTreeviewSelection();
    this.requestUpdate();
  }

  private clearAll(ev?: Event): void {
    ev?.stopPropagation();
    this._selected = new Map();
    this._indeterminate.clear();
    this.dispatchEvent(new CustomEvent('clear', { bubbles: true, composed: true }));
    this.emitChange(undefined, undefined);
    this.syncTreeviewSelection();
    this.requestUpdate();
  }

  /** Cascade membership down over LOADED descendants only. */
  private applyDown(node: TreeNode, checked: boolean): void {
    if (checked) this._selected.set(node.id, node);
    else this._selected.delete(node.id);
    for (const child of node.children ?? []) this.applyDown(child, checked);
  }

  /** Roll membership up: an ancestor is selected iff all its LOADED children are. */
  private applyUp(node: TreeNode): void {
    let parent = this._parentById.get(node.id) ?? null;
    while (parent) {
      const children = parent.children ?? [];
      const allSelected = children.length > 0 && children.every((c) => this._selected.has(c.id));
      if (allSelected) this._selected.set(parent.id, parent);
      else this._selected.delete(parent.id);
      parent = this._parentById.get(parent.id) ?? null;
    }
  }

  /** Indeterminate = not selected, but ≥1 loaded descendant selected. */
  private recomputeIndeterminate(): void {
    this._indeterminate.clear();
    const visit = (node: TreeNode): boolean => {
      let anyChildSelected = false;
      for (const child of node.children ?? []) {
        if (visit(child)) anyChildSelected = true;
      }
      const selfSelected = this._selected.has(node.id);
      if (!selfSelected && anyChildSelected) this._indeterminate.add(node.id);
      return selfSelected || anyChildSelected;
    };
    const roots = this._searchResults ?? this._nodes;
    for (const root of roots) visit(root);
  }

  private emitChange(added?: TreeNode, removed?: TreeNode): void {
    this.dispatchEvent(
      new CustomEvent<TreeSelectChangeEventDetail>('value-change', {
        detail: { value: this.value, added, removed },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private syncTreeviewSelection(): void {
    const tv = this.renderRoot.querySelector<MpTreeview>('mp-treeview');
    if (tv) tv.selectedIds = [...this._selected.keys()];
  }

  // ---- treeview node renderer (checkbox / custom row) --------------------
  // Memoized so the embedded treeview doesn't see a new function (and re-render
  // every row, recreating checkbox listeners) on each unrelated update. The
  // closure reads selection/indeterminate/query live at call time, so only the
  // shape-determining inputs (mode, presence of suggestionTemplate) key it.
  private _nodeRendererFn: TreeNodeRenderer | undefined;
  private _nodeRendererKey = '';
  private get nodeRenderer(): TreeNodeRenderer | undefined {
    const showCheckbox = this._mode === 'multiple' || this._mode === 'checkbox';
    const key = `${this._mode}|${this.suggestionTemplate ? '1' : '0'}`;
    if (key === this._nodeRendererKey) return this._nodeRendererFn;
    this._nodeRendererKey = key;
    this._nodeRendererFn = !showCheckbox && !this.suggestionTemplate ? undefined : (node) => {
      const wrap = document.createElement('span');
      wrap.className = 'ts-node';
      if (showCheckbox) {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'ts-node-check';
        cb.checked = this._selected.has(node.id);
        cb.indeterminate = this._indeterminate.has(node.id);
        cb.addEventListener('click', (e) => e.stopPropagation());
        cb.addEventListener('change', (e) => {
          e.stopPropagation();
          this.onCheckboxToggle(node, (e.target as HTMLInputElement).checked);
        });
        wrap.appendChild(cb);
      }
      const label = document.createElement('span');
      label.className = 'treeview-label';
      const custom = this.suggestionTemplate?.(node, this._query);
      if (custom) label.appendChild(custom);
      else label.textContent = node.label;
      wrap.appendChild(label);
      return wrap;
    };
    return this._nodeRendererFn;
  }

  // ---- render ------------------------------------------------------------
  override render(): TemplateResult {
    return html`${this.renderTrigger()}${this.renderPanel()}`;
  }

  private get hasSelection(): boolean {
    return this._selected.size > 0;
  }

  private renderTrigger(): TemplateResult {
    return this._variant === 'button' ? this.renderButtonTrigger() : this.renderTextboxTrigger();
  }

  private renderButtonTrigger(): TemplateResult {
    return html`
      <button
        class="ts-button ts-anchor"
        type="button"
        ?disabled=${this._disabled}
        aria-haspopup="tree"
        aria-expanded=${this.overlay.isOpen ? 'true' : 'false'}
        @click=${() => this.onTriggerClick()}
      >
        <span class="ts-button-body">${this.renderTriggerBody()}</span>
        ${this.renderClear()}
        <span class="ts-caret">${this.renderCaret()}</span>
      </button>
    `;
  }

  private renderTextboxTrigger(): TemplateResult {
    const showSingleValue = this._mode === 'single' && this.hasSelection && !this._query;
    return html`
      <div class="ts-control ts-anchor" @click=${() => this.focusSearchAndOpen()}>
        ${this.renderChips()}
        ${showSingleValue
          ? html`<span class="ts-single-value">${this.renderSelectedLabel()}</span>`
          : nothing}
        <input
          class="ts-search"
          type="text"
          .value=${this._query}
          ?disabled=${this._disabled}
          placeholder=${!this.hasSelection ? this._placeholder : ''}
          aria-label=${this._placeholder || 'Search'}
          @input=${(e: Event) => this.onSearchInput(e)}
          @focus=${() => this.open()}
        />
        ${this.renderClear()}
        <span class="ts-caret">${this.renderCaret()}</span>
      </div>
    `;
  }

  private renderTriggerBody(): unknown {
    if (this.buttonTemplate) return this.buttonTemplate(this.value);
    if (!this.hasSelection) return html`<span class="ts-placeholder">${this._placeholder}</span>`;
    if (this._mode === 'single') return this.renderSelectedLabel();
    return this.renderChips();
  }

  private renderSelectedLabel(): unknown {
    const node = this._selected.values().next().value as TreeNode | undefined;
    if (!node) return nothing;
    if (this.itemTemplate) return this.itemTemplate(node, this._query);
    return node.label;
  }

  private renderChips(): unknown {
    if (this._mode === 'single' || !this.hasSelection) return nothing;
    return repeat(
      [...this._selected.values()],
      (node) => node.id,
      (node) => html`
        <span class="ts-chip">
          <span class="ts-chip-label"
            >${this.itemTemplate ? this.itemTemplate(node, this._query) : node.label}</span
          >
          <button
            class="ts-chip-remove"
            type="button"
            aria-label="Remove"
            @click=${(e: Event) => {
              e.stopPropagation();
              this.removeNode(node);
            }}
          >
            ×
          </button>
        </span>
      `,
    );
  }

  private renderClear(): unknown {
    if (!this._showClear || !this.hasSelection) return nothing;
    return html`<button
      class="ts-clear"
      type="button"
      aria-label="Clear"
      @click=${(e: Event) => this.clearAll(e)}
    >
      ×
    </button>`;
  }

  private renderCaret(): unknown {
    const span = document.createElement('span');
    span.style.display = 'inline-flex';
    span.style.width = '100%';
    span.style.height = '100%';
    span.innerHTML = CARET_SVG;
    return span;
  }

  private renderPanel(): TemplateResult {
    return html`
      <div class="ts-panel" role="dialog">
        ${this.headerTemplate ? html`<div class="ts-panel-header">${this.headerTemplate()}</div>` : nothing}
        ${this._variant === 'button'
          ? html`<div class="ts-panel-header">
              <input
                class="ts-search panel-search"
                type="text"
                .value=${this._query}
                placeholder=${this._placeholder || 'Search'}
                aria-label="Search"
                @input=${(e: Event) => this.onSearchInput(e)}
              />
            </div>`
          : nothing}
        <div class="ts-panel-body" style=${`max-height:${this._scrollHeight}`}>${this.renderBody()}</div>
        ${this.renderLoadMore()}
        ${this.footerTemplate ? html`<div class="ts-panel-footer">${this.footerTemplate()}</div>` : nothing}
      </div>
    `;
  }

  private renderBody(): unknown {
    if (!this._provider) return html`<div class="ts-state">No data provider</div>`;

    const searching = !!this._query.trim();
    if (this._loading && (searching ? this._searchResults === null : !this._rootsLoaded)) {
      return html`<div class="ts-state"><span class="ts-spinner"></span></div>`;
    }

    if (searching) {
      if (!this._searchResults?.length) {
        return html`<div class="ts-state">${
          this.noResultsTemplate ? this.noResultsTemplate() : 'No results'
        }</div>`;
      }
      return this.renderTreeview(this._searchResults);
    }

    if (!this._nodes.length) {
      return html`<div class="ts-state">${
        this.enterSearchTermTemplate ? this.enterSearchTermTemplate() : 'No items'
      }</div>`;
    }
    return this.renderTreeview(this._nodes);
  }

  private renderTreeview(items: TreeNode[]): TemplateResult {
    const tvMode: TreeviewSelectionMode = this._mode === 'single' ? 'single' : 'none';
    return html`
      <mp-treeview
        hide-borders
        .items=${items}
        .selectionMode=${tvMode}
        .selectedIds=${[...this._selected.keys()]}
        .loadChildren=${this.treeviewLoadChildren}
        .nodeRenderer=${this.nodeRenderer}
        @tree-node-select=${(e: Event) => this.onTreeSelect(e)}
      ></mp-treeview>
    `;
  }

  private renderLoadMore(): unknown {
    const hasMore = this._query ? this._searchHasMore : this._rootsHasMore;
    if (!hasMore) return nothing;
    return html`<button class="ts-load-more" type="button" @click=${() => this.onLoadMore()}>
      ${this._loading ? html`<span class="ts-spinner"></span>` : 'Load more'}
    </button>`;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-tree-select')) {
  customElements.define('mp-tree-select', MpTreeSelect);
}
