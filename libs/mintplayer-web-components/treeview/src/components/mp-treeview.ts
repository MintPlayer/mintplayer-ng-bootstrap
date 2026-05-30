import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { treeviewStyles } from '../styles';
import type { TreeNode } from '../types';

export type TreeviewSelectionMode = 'none' | 'single' | 'multiple';

export type IconResolver = (iconKey: string, node: TreeNode) => string | undefined;

export interface TreeNodeRenderContext {
  level: number;
  expanded: boolean;
  selected: boolean;
  focused: boolean;
  hasChildren: boolean;
}

export type TreeNodeRenderer = (
  node: TreeNode,
  context: TreeNodeRenderContext,
) => Node | DocumentFragment | undefined;

/**
 * Async loader for child nodes on lazy-tree expansion. Invoked the first
 * time a node with `node.lazy: true` (or no `children` and `lazy` unset)
 * is expanded. Resolve with the children, or reject to surface the error
 * via a per-node error indicator.
 */
export type TreeChildrenLoader = (parentId: string) => Promise<TreeNode[]>;

export interface TreeNodeSelectEventDetail {
  node: TreeNode;
  selectedIds: string[];
}

export interface TreeNodeExpandEventDetail {
  node: TreeNode;
  expandedIds: string[];
}

export interface TreeNodeCollapseEventDetail {
  node: TreeNode;
  expandedIds: string[];
}

const CHEVRON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
  '<path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>' +
  '</svg>';

let instanceCounter = 0;

/**
 * `<mp-treeview>` — data-driven recursive tree.
 *
 * Light-DOM properties:
 * - `items: TreeNode[]` (property only)
 * - `expanded-ids` / `expandedIds: string[]`
 * - `selected-ids` / `selectedIds: string[]`
 * - `selection-mode`: `'none' | 'single' | 'multiple'`
 * - `hide-borders`: removes the outer list-group border and per-row separators
 *
 * Events: `tree-node-select`, `tree-node-expand`, `tree-node-collapse`.
 */
export class MpTreeview extends LitElement {
  static override styles = [treeviewStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'selection-mode',
      'hide-borders',
    ];
  }

  private readonly instanceId = `mp-treeview-${++instanceCounter}`;

  private _items: TreeNode[] = [];
  private _expandedIds: Set<string> = new Set();
  private _selectedIds: Set<string> = new Set();
  private _selectionMode: TreeviewSelectionMode = 'single';
  private _hideBorders = false;
  private _iconResolver: IconResolver | undefined;
  private _nodeRenderer: TreeNodeRenderer | undefined;
  private _loadChildren: TreeChildrenLoader | undefined;
  /** Loading state per lazy-node id. */
  private _loadingIds: Set<string> = new Set();
  /** Last load error per node id. */
  private _errorIds: Map<string, string> = new Map();

  // Roving tabindex: which node currently has tabindex=0
  private _focusedId: string | null = null;
  // Visible (flattened) node order for keyboard navigation
  private _visibleOrder: TreeNode[] = [];
  // Precomputed lookup tables — refreshed whenever `items` changes.
  // Without these, `findNode` / `findParent` are O(N) per keystroke and the
  // entire walk degenerates to O(N²) on deep trees (Gemini PR-341 review).
  private _byId: Map<string, TreeNode> = new Map();
  private _parentById: Map<string, TreeNode | null> = new Map();

  get items(): TreeNode[] {
    return this._items;
  }
  set items(value: TreeNode[]) {
    this._items = Array.isArray(value) ? value : [];
    this.rebuildIndex();
    this.syncFocusAfterUpdate();
    this.requestUpdate();
  }

  private rebuildIndex(): void {
    this._byId.clear();
    this._parentById.clear();
    const walk = (nodes: ReadonlyArray<TreeNode>, parent: TreeNode | null) => {
      for (const node of nodes) {
        this._byId.set(node.id, node);
        this._parentById.set(node.id, parent);
        if (node.children && node.children.length > 0) walk(node.children, node);
      }
    };
    walk(this._items, null);
  }

  get expandedIds(): string[] {
    return [...this._expandedIds];
  }
  set expandedIds(value: string[] | ReadonlyArray<string>) {
    this._expandedIds = new Set(value ?? []);
    this.requestUpdate();
  }

  get selectedIds(): string[] {
    return [...this._selectedIds];
  }
  set selectedIds(value: string[] | ReadonlyArray<string>) {
    this._selectedIds = new Set(value ?? []);
    this.requestUpdate();
  }

  get selectionMode(): TreeviewSelectionMode {
    return this._selectionMode;
  }
  set selectionMode(value: TreeviewSelectionMode) {
    this._selectionMode = value;
    if (value === 'none') {
      this._selectedIds.clear();
    } else if (value === 'single' && this._selectedIds.size > 1) {
      const first = this._selectedIds.values().next().value as string | undefined;
      this._selectedIds = new Set(first ? [first] : []);
    }
    this.requestUpdate();
  }

  get hideBorders(): boolean {
    return this._hideBorders;
  }
  set hideBorders(value: boolean) {
    this._hideBorders = !!value;
    this.toggleAttribute('hide-borders', this._hideBorders);
    this.requestUpdate();
  }

  get iconResolver(): IconResolver | undefined {
    return this._iconResolver;
  }
  set iconResolver(value: IconResolver | undefined) {
    this._iconResolver = value;
    this.requestUpdate();
  }

  /**
   * Per-node DOM renderer. When set, the WC calls this for each node's body
   * (chevron stays). The returned Node replaces the default icon+label.
   * Set by Angular wrapper to bridge `*bsTreeviewNode` templates into the
   * shadow DOM via EmbeddedViewRef-managed nodes.
   */
  get nodeRenderer(): TreeNodeRenderer | undefined {
    return this._nodeRenderer;
  }
  set nodeRenderer(value: TreeNodeRenderer | undefined) {
    this._nodeRenderer = value;
    this.requestUpdate();
  }

  /**
   * Async children loader. Invoked once per node when a `lazy` (or
   * children-less) node is first expanded. While the promise is in flight
   * the chevron is replaced by a spinner; on rejection an error indicator
   * is shown and the node can be re-expanded to retry.
   */
  get loadChildren(): TreeChildrenLoader | undefined {
    return this._loadChildren;
  }
  set loadChildren(value: TreeChildrenLoader | undefined) {
    this._loadChildren = value;
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);

    if (name === 'selection-mode') {
      const next = (newValue ?? 'single') as TreeviewSelectionMode;
      if (next === 'none' || next === 'single' || next === 'multiple') {
        this.selectionMode = next;
      }
    } else if (name === 'hide-borders') {
      this._hideBorders = newValue !== null;
      this.requestUpdate();
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'tree');
    }
  }

  override render(): TemplateResult {
    this._visibleOrder = this.computeVisibleOrder(this._items);

    if (this._focusedId === null && this._visibleOrder.length > 0) {
      this._focusedId = this._visibleOrder[0].id;
    }

    return html`
      <div class="treeview-root">
        <ul role="presentation">
          ${this.renderNodes(this._items, 1)}
        </ul>
      </div>
    `;
  }

  private renderNodes(nodes: ReadonlyArray<TreeNode>, level: number): TemplateResult {
    return html`
      ${repeat(
        nodes,
        (node) => node.id,
        (node, index) => this.renderNode(node, level, index, nodes.length),
      )}
    `;
  }

  private renderNode(
    node: TreeNode,
    level: number,
    indexInParent: number,
    siblingCount: number,
  ): TemplateResult {
    const hasChildren = !!(node.children && node.children.length > 0);
    const isLazy = !!node.lazy && !hasChildren;
    const isExpandable = hasChildren || isLazy;
    const isLoading = this._loadingIds.has(node.id);
    const loadError = this._errorIds.get(node.id);
    const expanded = this._expandedIds.has(node.id);
    const selected = this._selectedIds.has(node.id);
    const focused = this._focusedId === node.id;
    const tabIndex = focused ? 0 : -1;
    const iconSvg = node.iconKey && this._iconResolver
      ? this._iconResolver(node.iconKey, node)
      : undefined;

    const indentation = (level - 1) * 20;
    const rowId = `${this.instanceId}-row-${node.id}`;

    const customBody = this._nodeRenderer
      ? this._nodeRenderer(node, {
          level,
          expanded,
          selected,
          focused,
          hasChildren: isExpandable,
        })
      : undefined;

    return html`
      <li role="none">
        <div
          id=${rowId}
          class="treeview-row"
          role="treeitem"
          data-node-id=${node.id}
          data-selected=${selected ? 'true' : 'false'}
          data-loading=${isLoading ? 'true' : 'false'}
          data-error=${loadError ? 'true' : 'false'}
          aria-level=${level}
          aria-setsize=${siblingCount}
          aria-posinset=${indexInParent + 1}
          aria-expanded=${isExpandable ? (expanded ? 'true' : 'false') : nothing}
          aria-busy=${isLoading ? 'true' : nothing}
          aria-selected=${this._selectionMode !== 'none' ? (selected ? 'true' : 'false') : nothing}
          tabindex=${tabIndex}
          style=${`padding-left:${indentation + 12}px`}
          @click=${(ev: MouseEvent) => this.onRowClick(node, ev)}
          @keydown=${(ev: KeyboardEvent) => this.onRowKeydown(node, ev)}
          title=${loadError ?? nothing}
        >
          <span
            class=${`treeview-chevron${isExpandable ? '' : ' invisible'}${isLoading ? ' loading' : ''}`}
            data-expanded=${expanded ? 'true' : 'false'}
            @click=${(ev: MouseEvent) => this.onChevronClick(node, ev)}
            aria-hidden="true"
          >${isLoading
            ? html`<span class="treeview-spinner" aria-hidden="true"></span>`
            : unsafeHTML(CHEVRON_SVG)}</span>
          ${customBody
            ? html`<span class="treeview-body">${customBody}</span>`
            : html`
                ${iconSvg
                  ? html`<span class="treeview-icon" aria-hidden="true">${unsafeHTML(iconSvg)}</span>`
                  : nothing}
                <span class="treeview-label">${node.label}</span>
              `}
        </div>
        ${hasChildren && expanded
          ? html`<ul role="group">${this.renderNodes(node.children!, level + 1)}</ul>`
          : nothing}
      </li>
    `;
  }

  private computeVisibleOrder(nodes: ReadonlyArray<TreeNode>): TreeNode[] {
    const result: TreeNode[] = [];
    const walk = (items: ReadonlyArray<TreeNode>) => {
      for (const node of items) {
        result.push(node);
        if (node.children && node.children.length > 0 && this._expandedIds.has(node.id)) {
          walk(node.children);
        }
      }
    };
    walk(nodes);
    return result;
  }

  private syncFocusAfterUpdate(): void {
    if (this._focusedId !== null && !this._byId.has(this._focusedId)) {
      this._focusedId = null;
    }
  }

  /** O(1) lookup against the precomputed index. */
  private findNode(_unused: ReadonlyArray<TreeNode>, id: string): TreeNode | null {
    return this._byId.get(id) ?? null;
  }

  /** O(1) lookup against the precomputed parent map. */
  private findParent(_unused: ReadonlyArray<TreeNode>, id: string): TreeNode | null {
    return this._parentById.get(id) ?? null;
  }

  private onRowClick(node: TreeNode, ev: MouseEvent): void {
    ev.stopPropagation();
    this.focusNode(node.id);
    this.toggleSelection(node, ev.ctrlKey || ev.metaKey);
    // Click on row (not chevron) for a folder also toggles expansion — matches OS file managers.
    if (node.children && node.children.length > 0) {
      this.toggleExpansion(node);
    }
  }

  private onChevronClick(node: TreeNode, ev: MouseEvent): void {
    // Honor lazy nodes: the chevron is rendered whenever a node is expandable
    // (`hasChildren || lazy`), so a mouse click must trigger the lazy load too —
    // not just keyboard ArrowRight. Without this, async/lazy trees can't be
    // expanded by pointer.
    const expandable = (node.children?.length ?? 0) > 0 || !!node.lazy;
    if (!expandable) return;
    ev.stopPropagation();
    this.focusNode(node.id);
    this.toggleExpansion(node);
  }

  private onRowKeydown(node: TreeNode, ev: KeyboardEvent): void {
    const hasChildren = !!(node.children && node.children.length > 0);
    const expanded = this._expandedIds.has(node.id);

    switch (ev.key) {
      case 'ArrowDown': {
        ev.preventDefault();
        this.focusRelative(node, +1);
        return;
      }
      case 'ArrowUp': {
        ev.preventDefault();
        this.focusRelative(node, -1);
        return;
      }
      case 'ArrowRight': {
        ev.preventDefault();
        if ((hasChildren || node.lazy) && !expanded) {
          this.expand(node);
        } else if (hasChildren && expanded) {
          this.focusNode(node.children![0].id);
        }
        return;
      }
      case 'ArrowLeft': {
        ev.preventDefault();
        if ((hasChildren || node.lazy) && expanded) {
          this.collapse(node);
        } else {
          const parent = this.findParent(this._items, node.id);
          if (parent) this.focusNode(parent.id);
        }
        return;
      }
      case 'Home': {
        ev.preventDefault();
        if (this._visibleOrder.length > 0) this.focusNode(this._visibleOrder[0].id);
        return;
      }
      case 'End': {
        ev.preventDefault();
        if (this._visibleOrder.length > 0) {
          this.focusNode(this._visibleOrder[this._visibleOrder.length - 1].id);
        }
        return;
      }
      case 'Enter': {
        ev.preventDefault();
        this.toggleSelection(node, false);
        if (hasChildren || node.lazy) this.toggleExpansion(node);
        return;
      }
      case ' ': // Space
      case 'Spacebar': {
        ev.preventDefault();
        this.toggleSelection(node, this._selectionMode === 'multiple');
        return;
      }
    }
  }

  private focusRelative(current: TreeNode, delta: number): void {
    const order = this._visibleOrder;
    const idx = order.findIndex((n) => n.id === current.id);
    if (idx === -1) return;
    const nextIdx = Math.max(0, Math.min(order.length - 1, idx + delta));
    if (nextIdx !== idx) {
      this.focusNode(order[nextIdx].id);
    }
  }

  private focusNode(id: string): void {
    this._focusedId = id;
    this.requestUpdate();
    // Defer focus to next frame so the DOM has the new tabindex applied.
    requestAnimationFrame(() => {
      const el = this.shadowRoot?.querySelector<HTMLElement>(`[data-node-id="${cssEscape(id)}"]`);
      el?.focus({ preventScroll: false });
    });
  }

  private toggleSelection(node: TreeNode, additive: boolean): void {
    if (this._selectionMode === 'none') return;

    if (this._selectionMode === 'single') {
      this._selectedIds = new Set([node.id]);
    } else {
      // multiple
      if (additive) {
        const next = new Set(this._selectedIds);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        this._selectedIds = next;
      } else {
        this._selectedIds = new Set([node.id]);
      }
    }

    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<TreeNodeSelectEventDetail>('tree-node-select', {
        detail: { node, selectedIds: [...this._selectedIds] },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private toggleExpansion(node: TreeNode): void {
    const hasChildren = !!(node.children && node.children.length > 0);
    if (!hasChildren && !node.lazy) return;
    if (this._expandedIds.has(node.id)) {
      this.collapse(node);
    } else {
      this.expand(node);
    }
  }

  private expand(node: TreeNode): void {
    const hasChildren = !!(node.children && node.children.length > 0);
    if (!hasChildren && !node.lazy) return;
    if (this._expandedIds.has(node.id)) return;

    // Lazy load: when expanding a node with no children yet and we have a
    // loader, fire the async load before flipping `expandedIds`.
    if (!hasChildren && node.lazy && this._loadChildren && !this._loadingIds.has(node.id)) {
      this._loadingIds.add(node.id);
      this._errorIds.delete(node.id);
      this.requestUpdate();
      void this._loadChildren(node.id).then(
        (children) => {
          this._loadingIds.delete(node.id);
          // Add to expanded only after the consumer pushes children back
          // via the `items` property. We emit the expand event so the
          // consumer can update `items` synchronously in their handler.
          const next = new Set(this._expandedIds);
          next.add(node.id);
          this._expandedIds = next;
          this.requestUpdate();
          this.dispatchEvent(
            new CustomEvent<TreeNodeExpandEventDetail & { loadedChildren?: TreeNode[] }>('tree-node-expand', {
              detail: { node, expandedIds: [...this._expandedIds], loadedChildren: children },
              bubbles: true,
              composed: true,
            }),
          );
        },
        (err) => {
          this._loadingIds.delete(node.id);
          this._errorIds.set(node.id, err instanceof Error ? err.message : String(err));
          this.requestUpdate();
          this.dispatchEvent(
            new CustomEvent('tree-node-load-error', {
              detail: { node, error: err },
              bubbles: true,
              composed: true,
            }),
          );
        },
      );
      return;
    }

    const next = new Set(this._expandedIds);
    next.add(node.id);
    this._expandedIds = next;
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<TreeNodeExpandEventDetail>('tree-node-expand', {
        detail: { node, expandedIds: [...this._expandedIds] },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private collapse(node: TreeNode): void {
    if (!this._expandedIds.has(node.id)) return;
    const next = new Set(this._expandedIds);
    next.delete(node.id);
    this._expandedIds = next;
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<TreeNodeCollapseEventDetail>('tree-node-collapse', {
        detail: { node, expandedIds: [...this._expandedIds] },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, '\\$&');
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-treeview')) {
  customElements.define('mp-treeview', MpTreeview);
}
