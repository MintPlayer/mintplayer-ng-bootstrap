import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { ContextConsumer, ContextProvider } from '@lit/context';
import type { Expression, Group, Operator } from './model/expression';
import type { SortDescriptor } from './model/sort';
import type { EntitySchema, FieldDef } from './model/field-def';
import type { EditorRegistry } from './model/editor';
import { DEFAULT_MESSAGES, type QueryBuilderMessages } from './model/messages';
import type { SavedQuery } from './model/saved-query';
import {
  addEmptyConditionTo,
  addEmptyGroupTo,
  addEmptySubqueryTo,
  changeConditionField,
  changeConditionOperator,
  collectDescendantIds,
  findNodeById,
  findParentGroup,
  moveNode,
  removeNode,
  setGroupLogic,
  updateCondition,
} from './model/tree-ops';
import { DragController, type DropTarget } from './dnd/drag-controller';
import { renderExpression } from './preview/render-expression';
import {
  disabledContext,
  editorRegistryContext,
  maxDepthContext,
  messagesContext,
} from './context';
import { MpQueryGroupElement } from './mp-query-group.element';
import { styles } from './mp-query-builder.element.template';

// Side-effect-registers <mp-select> and <mp-checkbox>. The toolbar uses
// the former for the entity picker / sort-by rows and the latter for the
// per-column projection toggles.
import '@mintplayer/web-components/select';
import '@mintplayer/web-components/checkbox';

void MpQueryGroupElement;

const DEFAULT_MAX_DEPTH = 32;

export class MpQueryBuilderElement extends LitElement {
  static override styles = [styles];

  static override properties = {
    query: { attribute: false },
    schema: { attribute: false },
    rootEntity: { attribute: 'root-entity', type: String, reflect: true },
    multiEntityPickerEnabled: { attribute: 'multi-entity-picker-enabled', type: Boolean, reflect: true },
    selectedFields: { attribute: false },
    sortBy: { attribute: false },
    disabled: { attribute: 'disabled', type: Boolean, reflect: true },
    editorRegistry: { attribute: false },
    messages: { attribute: false },
    maxDepth: { attribute: 'max-depth', type: Number, reflect: true },
    showPreview: { attribute: 'show-preview', type: Boolean, reflect: true },
    showSavedQueries: { attribute: 'show-saved-queries', type: Boolean, reflect: true },
    savedQueries: { attribute: false },
    depth: { attribute: false },
    _isDragging: { state: true },
    _saveDraftName: { state: true },
  };

  query: Expression | null = null;
  schema: EntitySchema[] = [];
  rootEntity = '';
  // Opt-in: render the top toolbar (entity picker + future field projection
  // / sort-by widgets). Off by default; the toolbar only appears when
  // `schema.length > 1` so single-entity consumers see no UI change.
  multiEntityPickerEnabled = false;
  // Field-projection state. Plain string[] of field names from the current
  // rootEntity. Presentation-only — consumer reads via `selected-fields-change`
  // and maps to whichever sibling UI needs to render those columns.
  selectedFields: string[] = [];
  // Sort-by state. Same shape as the QueryRequest.sort[] wire-format field.
  // Order = priority order; the consumer POSTs this verbatim.
  sortBy: SortDescriptor[] = [];
  disabled = false;
  editorRegistry: EditorRegistry | undefined = undefined;
  messages: Partial<QueryBuilderMessages> | undefined = undefined;
  maxDepth = DEFAULT_MAX_DEPTH;
  showPreview = false;
  showSavedQueries = false;
  savedQueries: SavedQuery[] = [];
  private _saveDraftName = '';

  // `depth` is set by parent <mp-query-subquery> when this WC renders a nested
  // sub-query body. The outermost root keeps depth=0.
  depth = 0;

  // Stable id used to tag drop slots so cross-tree DnD can match.
  private _qbRootId = `qb-${Math.random().toString(36).slice(2, 10)}`;

  // True while a drag is in progress within this root (depth==0 only).
  private _isDragging = false;
  private _drag = new DragController();
  private _pointerMoveHandler: ((e: PointerEvent) => void) | null = null;
  private _pointerUpHandler: ((e: PointerEvent) => void) | null = null;
  private _pointerCancelHandler: ((e: PointerEvent) => void) | null = null;

  private _registryConsumer = new ContextConsumer(this, {
    context: editorRegistryContext,
    subscribe: true,
  });
  private _registryProvider = new ContextProvider(this, {
    context: editorRegistryContext,
    initialValue: undefined,
  });

  private _disabledConsumer = new ContextConsumer(this, {
    context: disabledContext,
    subscribe: true,
  });
  private _disabledProvider = new ContextProvider(this, {
    context: disabledContext,
    initialValue: undefined,
  });

  private _messagesConsumer = new ContextConsumer(this, {
    context: messagesContext,
    subscribe: true,
  });
  private _messagesProvider = new ContextProvider(this, {
    context: messagesContext,
    initialValue: undefined,
  });

  private _maxDepthConsumer = new ContextConsumer(this, {
    context: maxDepthContext,
    subscribe: true,
  });
  private _maxDepthProvider = new ContextProvider(this, {
    context: maxDepthContext,
    initialValue: undefined,
  });

  // Cached inputs to the messages-merge so willUpdate can skip rebuilding the
  // effMessages object (and notifying every descendant via messagesContext)
  // on ticks where neither source changed. Identity-only check — that's the
  // contract for the Partial<QueryBuilderMessages> input.
  private _lastMessagesOwn: Partial<QueryBuilderMessages> | undefined = undefined;
  private _lastMessagesConsumed: Partial<QueryBuilderMessages> | undefined = undefined;
  private _lastEffMessages: Partial<QueryBuilderMessages> | undefined = undefined;

  protected override willUpdate(_changed: PropertyValues): void {
    // editorRegistry — override semantics (this wins if set; else inherit).
    const effRegistry = this.editorRegistry ?? this._registryConsumer.value;
    this._registryProvider.setValue(effRegistry);

    // disabled — OR semantics (outer disable cannot be re-enabled inside).
    const effDisabled =
      (this._disabledConsumer.value ?? false) || (this.disabled ?? false);
    this._disabledProvider.setValue(effDisabled);

    // messages — merge semantics (per-key override; outer keys preserved unless replaced).
    // Memoize by identity of the two sources so we don't rebuild + re-notify the
    // messagesContext on every tick (query changes, drag state flips, etc).
    const ownMsg = this.messages;
    const consumedMsg = this._messagesConsumer.value;
    let effMessages: Partial<QueryBuilderMessages>;
    if (this._lastEffMessages !== undefined
        && this._lastMessagesOwn === ownMsg
        && this._lastMessagesConsumed === consumedMsg) {
      effMessages = this._lastEffMessages;
    } else {
      effMessages = { ...(consumedMsg ?? {}), ...(ownMsg ?? {}) };
      this._lastMessagesOwn = ownMsg;
      this._lastMessagesConsumed = consumedMsg;
      this._lastEffMessages = effMessages;
    }
    this._messagesProvider.setValue(effMessages);

    // maxDepth — override semantics (this wins if explicitly set, else inherit).
    const inheritedMax = this._maxDepthConsumer.value;
    const effMaxDepth = inheritedMax ?? this.maxDepth;
    this._maxDepthProvider.setValue(effMaxDepth);
  }

  protected override updated(_changed: PropertyValues): void {
    if (this._pendingRefocusId === null) return;
    const id = this._pendingRefocusId;
    this._pendingRefocusId = null;
    // Pierce through shadow roots to find the row that owns the moved node.
    queueMicrotask(() => this._focusRowById(id));
  }

  private _focusRowById(id: string): void {
    const visit = (root: ShadowRoot | Element): HTMLElement | null => {
      const direct = root.querySelector(`[data-row-id="${id}"]`) as HTMLElement | null;
      if (direct) {
        // For subqueries, focus the header (the tabbable inner element) rather than the wrapper.
        const header = direct.querySelector('.qb-subquery-header') as HTMLElement | null;
        return header ?? direct;
      }
      for (const el of Array.from(root.querySelectorAll('*'))) {
        if ((el as Element).shadowRoot) {
          const hit = visit((el as Element).shadowRoot as ShadowRoot);
          if (hit) return hit;
        }
      }
      return null;
    };
    const target = this.shadowRoot ? visit(this.shadowRoot) : null;
    target?.focus();
  }

  /**
   * Effective max-depth used for the render check. The OUTER builder's
   * configured maxDepth flows in via context; if absent, we fall back to
   * this WC's own `maxDepth` property (which defaults to 32).
   */
  private effectiveMaxDepth(): number {
    return this._maxDepthConsumer.value ?? this.maxDepth;
  }

  private _entitySchemaForCurrentRoot(): EntitySchema | null {
    return this.schema.find((s) => s.name === this.rootEntity) ?? null;
  }

  // Walk the entire tree (incl. sub-query bodies) to find the entity context
  // that contains a given node id. Falls back to rootEntity.
  private _resolveEntityForNode(nodeId: string): EntitySchema | null {
    const root = this._entitySchemaForCurrentRoot();
    if (!root) return null;
    const tree = this.query;
    if (!tree) return root;
    const found = { entity: root };
    const walk = (n: Expression, entity: EntitySchema): boolean => {
      if (n.id === nodeId) {
        found.entity = entity;
        return true;
      }
      if (n.kind === 'group') {
        for (const c of n.children) {
          if (walk(c, entity)) return true;
        }
      } else if (n.kind === 'subquery') {
        // The sub-query body is rooted on its targetEntity.
        const fieldDef = entity.fields.find((f) => f.name === n.field);
        const target = fieldDef?.targetEntity
          ? this.schema.find((s) => s.name === fieldDef.targetEntity) ?? entity
          : entity;
        if (walk(n.subQuery, target)) return true;
      }
      return false;
    };
    walk(tree, root);
    return found.entity;
  }

  private _mutate(next: Expression): void {
    this.query = next;
    this.dispatchEvent(new CustomEvent('query-change', {
      detail: { tree: next },
      // M7 will consolidate and re-dispatch externally; for now expose
      // to outside listeners on the root builder only.
      bubbles: false, composed: false,
    }));
  }

  // Inner sub-query builders (depth > 0) skip their handlers so events bubble
  // up to the outermost root, which owns the canonical tree.
  private _handlesEvents(): boolean { return this.depth === 0; }

  private _onConditionFieldChange = (e: Event): void => {
    if (!this._handlesEvents()) return;
    e.stopPropagation();
    const { id, field } = (e as CustomEvent).detail as { id: string; field: string };
    const tree = this.query;
    if (!tree) return;
    const entity = this._resolveEntityForNode(id);
    const fieldDef = entity?.fields.find((f) => f.name === field);
    if (!fieldDef) return;
    this._mutate(changeConditionField(tree, id, fieldDef));
  };

  private _onConditionOperatorChange = (e: Event): void => {
    if (!this._handlesEvents()) return;
    e.stopPropagation();
    const { id, operator } = (e as CustomEvent).detail as { id: string; operator: Operator };
    const tree = this.query;
    if (!tree) return;
    this._mutate(changeConditionOperator(tree, id, operator));
  };

  private _onConditionValueChange = (e: Event): void => {
    if (!this._handlesEvents()) return;
    e.stopPropagation();
    const { id, value } = (e as CustomEvent).detail as { id: string; value: unknown };
    const tree = this.query;
    if (!tree) return;
    this._mutate(updateCondition(tree, id, { value }));
  };

  private _onGroupLogicChange = (e: Event): void => {
    if (!this._handlesEvents()) return;
    e.stopPropagation();
    const { id, logic } = (e as CustomEvent).detail as { id: string; logic: 'and' | 'or' };
    const tree = this.query;
    if (!tree) return;
    this._mutate(setGroupLogic(tree, id, logic));
  };

  private _onAddCondition = (e: Event): void => {
    if (!this._handlesEvents()) return;
    e.stopPropagation();
    const { groupId } = (e as CustomEvent).detail as { groupId: string };
    const tree = this.query;
    if (!tree) return;
    const entity = this._resolveEntityForNode(groupId);
    if (!entity) return;
    this._mutate(addEmptyConditionTo(tree, groupId, entity));
  };

  private _onAddGroup = (e: Event): void => {
    if (!this._handlesEvents()) return;
    e.stopPropagation();
    const { groupId } = (e as CustomEvent).detail as { groupId: string };
    const tree = this.query;
    if (!tree) return;
    this._mutate(addEmptyGroupTo(tree, groupId, 'and'));
  };

  private _onAddSubquery = (e: Event): void => {
    if (!this._handlesEvents()) return;
    e.stopPropagation();
    const { groupId } = (e as CustomEvent).detail as { groupId: string };
    const tree = this.query;
    if (!tree) return;
    const entity = this._resolveEntityForNode(groupId);
    if (!entity) return;
    this._mutate(addEmptySubqueryTo(tree, groupId, entity));
  };

  private _onNodeRemove = (e: Event): void => {
    if (!this._handlesEvents()) return;
    e.stopPropagation();
    const { id } = (e as CustomEvent).detail as { id: string };
    const tree = this.query;
    if (!tree) return;
    // Protect the root: removing the root group is a no-op.
    if (tree.id === id) return;
    this._mutate(removeNode(tree, id));
  };

  private _pendingRefocusId: string | null = null;

  private _onKeyboardMove = (e: Event): void => {
    if (!this._handlesEvents()) return;
    e.stopPropagation();
    const { id, direction } = (e as CustomEvent).detail as { id: string; direction: 'up' | 'down' };
    const tree = this.query;
    if (!tree) return;
    const located = findParentGroup(tree, id);
    if (!located) return;
    const newIndex = direction === 'up' ? located.index - 1 : located.index + 1;
    if (newIndex < 0 || newIndex >= located.parent.children.length) return;
    this._pendingRefocusId = id;
    this._mutate(moveNode(tree, id, located.parent.id, newIndex));
  };

  private _onDragStart = (e: Event): void => {
    if (!this._handlesEvents()) return;
    e.stopPropagation();
    const detail = (e as CustomEvent).detail as {
      id: string; pointerId: number; clientX: number; clientY: number; rowElement: HTMLElement;
    };
    const tree = this.query;
    if (!tree) return;
    const source = findNodeById(tree, detail.id);
    if (!source) return;
    const descendantIds = collectDescendantIds(source);

    this._drag.start(
      {
        id: detail.id,
        descendantIds,
        qbRoot: this._qbRootId,
        rowElement: detail.rowElement,
      },
      new PointerEvent('pointerdown', { pointerId: detail.pointerId, clientX: detail.clientX, clientY: detail.clientY }),
    );
    this._isDragging = true;

    if (typeof window !== 'undefined') {
      this._pointerMoveHandler = (ev) => this._drag.move(ev);
      this._pointerUpHandler = (ev) => this._finishDrag(ev);
      this._pointerCancelHandler = () => this._cancelDrag();
      window.addEventListener('pointermove', this._pointerMoveHandler);
      window.addEventListener('pointerup', this._pointerUpHandler);
      window.addEventListener('pointercancel', this._pointerCancelHandler);
    }
  };

  private _finishDrag(event: PointerEvent): void {
    const target = this._drag.end(event);
    this._teardownDragListeners();
    this._isDragging = false;
    if (!target) return;
    this._applyDrop(target);
  }

  private _cancelDrag(): void {
    this._drag.cancel();
    this._teardownDragListeners();
    this._isDragging = false;
  }

  private _teardownDragListeners(): void {
    if (typeof window === 'undefined') return;
    if (this._pointerMoveHandler) window.removeEventListener('pointermove', this._pointerMoveHandler);
    if (this._pointerUpHandler) window.removeEventListener('pointerup', this._pointerUpHandler);
    if (this._pointerCancelHandler) window.removeEventListener('pointercancel', this._pointerCancelHandler);
    this._pointerMoveHandler = null;
    this._pointerUpHandler = null;
    this._pointerCancelHandler = null;
  }

  private _applyDrop(target: DropTarget): void {
    const tree = this.query;
    const source = this._drag.source();
    if (!tree || !source) return;
    // Resolve target schema if cross-tree (different qbRoot).
    const targetSchema = target.qbRoot !== source.qbRoot
      ? this._schemaForGroup(target.parentId)
      : undefined;
    const next = moveNode(tree, source.id, target.parentId, target.index, targetSchema);
    this._mutate(next);
  }

  private _schemaForGroup(groupId: string): EntitySchema | undefined {
    const tree = this.query;
    if (!tree) return undefined;
    const root = this._entitySchemaForCurrentRoot();
    if (!root) return undefined;
    const found = { schema: root };
    const walk = (n: Expression, schema: EntitySchema): boolean => {
      if (n.id === groupId) { found.schema = schema; return true; }
      if (n.kind === 'group') {
        for (const c of n.children) if (walk(c, schema)) return true;
      } else if (n.kind === 'subquery') {
        const fieldDef = schema.fields.find((f) => f.name === n.field);
        const target = fieldDef?.targetEntity ? this.schema.find((s) => s.name === fieldDef.targetEntity) ?? schema : schema;
        if (walk(n.subQuery, target)) return true;
      }
      return false;
    };
    walk(tree, root);
    return found.schema;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._teardownDragListeners();
    this._drag.cancel();
  }

  private _onSaveDraftInput = (e: Event): void => {
    this._saveDraftName = (e.target as HTMLInputElement).value;
  };

  private _onSaveQuery = (): void => {
    const name = this._saveDraftName.trim();
    if (!name) return;
    const tree = this.query;
    if (!tree) return;
    this.dispatchEvent(new CustomEvent('save-query', {
      detail: { name, tree },
      bubbles: false,
    }));
    this._saveDraftName = '';
  };

  private _onLoadQuery = (name: string): void => {
    this.dispatchEvent(new CustomEvent('load-query', {
      detail: { name },
      bubbles: false,
    }));
  };

  private _onDeleteQuery = (name: string): void => {
    this.dispatchEvent(new CustomEvent('delete-query', {
      detail: { name },
      bubbles: false,
    }));
  };

  private _renderSavedPicker(messages: QueryBuilderMessages): TemplateResult {
    return html`
      <div class="qb-saved" part="saved-picker">
        <div class="qb-saved-list" part="saved-list">
          ${this.savedQueries.length === 0
            ? html`<span class="qb-saved-empty">No saved queries</span>`
            : this.savedQueries.map((sq) => html`
                <span class="qb-saved-row" part="saved-row" data-name=${sq.name}>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary qb-saved-load"
                    @click=${() => this._onLoadQuery(sq.name)}
                  >${messages.loadQuery}: ${sq.name}</button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger qb-saved-delete"
                    aria-label=${`Delete ${sq.name}`}
                    @click=${() => this._onDeleteQuery(sq.name)}
                  >${messages.deleteQuery}</button>
                </span>
              `)}
        </div>
        <span class="qb-saved-new" part="saved-new">
          <input
            type="text"
            class="form-control form-control-sm qb-saved-name"
            placeholder=${messages.saveCurrentAs}
            .value=${this._saveDraftName}
            @input=${this._onSaveDraftInput}
            aria-label="Name for saved query"
          />
          <button
            type="button"
            class="btn btn-sm btn-primary qb-saved-save"
            ?disabled=${this._saveDraftName.trim() === ''}
            @click=${this._onSaveQuery}
          >💾 ${messages.saveCurrentAs}</button>
        </span>
      </div>
    `;
  }

  /**
   * Toolbar render. Only emits when `depth === 0` (sub-query builders have
   * no toolbar of their own — they inherit the outer one) AND
   * `multiEntityPickerEnabled` is true AND `schema.length > 1`. Future
   * Phase-2 widgets (field projection, sort-by) hang off this same toolbar.
   */
  private _renderToolbar(): TemplateResult | typeof nothing {
    if (this.depth !== 0) return nothing;
    if (!this.multiEntityPickerEnabled) return nothing;
    if (this.schema.length < 2) return nothing;
    const currentEntity = this.schema.find((e) => e.name === this.rootEntity);
    const projectableFields = currentEntity?.fields.filter((f) => f.type !== 'relation') ?? [];
    return html`
      <div class="qb-toolbar" part="toolbar">
        <label class="qb-toolbar-label">
          Entity:
          <mp-select
            class="qb-entity-picker"
            size="sm"
            part="entity-picker"
            .value=${this.rootEntity}
            ?disabled=${this.disabled}
            @change=${this._onRootEntityChange}
            aria-label="Entity"
          >
            ${this.schema.map((e) => html`<option value=${e.name}>${e.label}</option>`)}
          </mp-select>
        </label>
        ${projectableFields.length > 0 ? html`
          <span class="qb-toolbar-section qb-field-projection" part="field-projection" role="group" aria-label="Columns">
            <span class="qb-toolbar-label">Columns:</span>
            ${projectableFields.map((f) => html`
              <mp-checkbox
                class="qb-field-checkbox"
                value=${f.name}
                ?checked=${this.selectedFields.includes(f.name)}
                ?disabled=${this.disabled}
                @change=${(ev: Event) => this._onFieldProjectionToggle(f.name, ev)}
                aria-label=${f.label}
              >${f.label}</mp-checkbox>
            `)}
          </span>
        ` : nothing}
        ${projectableFields.length > 0 ? this._renderSortBy(projectableFields) : nothing}
      </div>
    `;
  }

  private _renderSortBy(projectableFields: FieldDef[]): TemplateResult {
    return html`
      <span class="qb-toolbar-section qb-sort-by" part="sort-by" role="group" aria-label="Sort by">
        <span class="qb-toolbar-label">Sort by:</span>
        ${this.sortBy.map((s, i) => html`
          <span class="qb-sort-row" part="sort-row">
            <mp-select
              class="qb-sort-field"
              size="sm"
              .value=${s.field}
              ?disabled=${this.disabled}
              @change=${(ev: Event) => this._onSortFieldChange(i, ev)}
              aria-label=${`Sort ${i + 1} field`}
            >
              ${projectableFields.map((f) => html`<option value=${f.name}>${f.label}</option>`)}
              ${projectableFields.some((f) => f.name === s.field) ? nothing : html`
                <option value=${s.field}>(${s.field})</option>
              `}
            </mp-select>
            <mp-select
              class="qb-sort-direction"
              size="sm"
              .value=${s.direction}
              ?disabled=${this.disabled}
              @change=${(ev: Event) => this._onSortDirectionChange(i, ev)}
              aria-label=${`Sort ${i + 1} direction`}
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </mp-select>
            <button
              type="button"
              class="btn btn-sm btn-link qb-sort-remove"
              ?disabled=${this.disabled}
              @click=${() => this._onSortRemove(i)}
              aria-label=${`Remove sort ${i + 1}`}
              title="Remove this sort"
            >×</button>
          </span>
        `)}
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary qb-sort-add"
          part="sort-add"
          ?disabled=${this.disabled || projectableFields.length === 0}
          @click=${() => this._onSortAdd(projectableFields)}
        >+ Add sort</button>
      </span>
    `;
  }

  private _emitSortBy(next: SortDescriptor[]): void {
    this.sortBy = next;
    this.dispatchEvent(new CustomEvent('sort-by-change', {
      detail: { sortBy: next },
      bubbles: false, composed: false,
    }));
  }

  private _onSortFieldChange(index: number, ev: Event): void {
    const field = (ev.target as HTMLSelectElement).value;
    const next = this.sortBy.map((s, i) => (i === index ? { ...s, field } : s));
    this._emitSortBy(next);
  }

  private _onSortDirectionChange(index: number, ev: Event): void {
    const direction = (ev.target as HTMLSelectElement).value as 'asc' | 'desc';
    const next = this.sortBy.map((s, i) => (i === index ? { ...s, direction } : s));
    this._emitSortBy(next);
  }

  private _onSortRemove(index: number): void {
    const next = this.sortBy.filter((_, i) => i !== index);
    this._emitSortBy(next);
  }

  private _onSortAdd(projectableFields: FieldDef[]): void {
    const first = projectableFields[0];
    if (!first) return;
    // Skip fields already used (would duplicate sort priority on the same column).
    const usedNames = new Set(this.sortBy.map((s) => s.field));
    const candidate = projectableFields.find((f) => !usedNames.has(f.name)) ?? first;
    this._emitSortBy([...this.sortBy, { field: candidate.name, direction: 'asc' }]);
  }

  private _onFieldProjectionToggle(fieldName: string, ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    const current = new Set(this.selectedFields);
    if (checked) current.add(fieldName); else current.delete(fieldName);
    const next = Array.from(current);
    this.selectedFields = next;
    this.dispatchEvent(new CustomEvent('selected-fields-change', {
      detail: { selectedFields: next },
      bubbles: false, composed: false,
    }));
  }

  private _onRootEntityChange = (e: Event): void => {
    const next = (e.target as HTMLSelectElement).value;
    if (next === this.rootEntity) return;
    this.rootEntity = next;
    this.dispatchEvent(new CustomEvent('root-entity-change', {
      detail: { rootEntity: next },
      bubbles: false, composed: false,
    }));
  };

  protected override render(): TemplateResult | typeof nothing {
    if (this.depth > this.effectiveMaxDepth()) {
      return html`<div class="qb-too-deep" role="alert">Tree too deep</div>`;
    }
    const tree = this.query;
    if (!tree) return nothing;

    return html`
      <div
        class="qb-root"
        part="root"
        data-qb-root=${this._qbRootId}
        @condition-field-change=${this._onConditionFieldChange}
        @condition-operator-change=${this._onConditionOperatorChange}
        @condition-value-change=${this._onConditionValueChange}
        @group-logic-change=${this._onGroupLogicChange}
        @add-condition=${this._onAddCondition}
        @add-group=${this._onAddGroup}
        @add-subquery=${this._onAddSubquery}
        @node-remove=${this._onNodeRemove}
        @qb-drag-start=${this._onDragStart}
        @qb-keyboard-move=${this._onKeyboardMove}
      >
        ${this._renderToolbar()}
        ${this.showSavedQueries && this.depth === 0
          ? this._renderSavedPicker(this._messages())
          : nothing}
        ${this.showPreview && this.depth === 0
          ? html`<pre class="qb-preview" part="preview">${this._renderPreview(tree)}</pre>`
          : nothing}
        ${this.renderTreeRoot(tree)}
      </div>
    `;
  }

  private _messages(): QueryBuilderMessages {
    const consumed = this._messagesConsumer.value ?? {};
    return {
      ...DEFAULT_MESSAGES,
      ...consumed,
      ...(this.messages ?? {}),
      operators: {
        ...DEFAULT_MESSAGES.operators,
        ...(consumed.operators ?? {}),
        ...(this.messages?.operators ?? {}),
      },
    };
  }

  private _renderPreview(tree: Expression): string {
    try {
      const eff = {
        ...(this._messagesConsumer.value ?? {}),
        ...(this.messages ?? {}),
      };
      return renderExpression(tree, this.schema, {
        messages: eff,
        rootEntity: this.rootEntity,
        maxDepth: this.effectiveMaxDepth(),
      });
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  }

  private renderTreeRoot(tree: Expression): TemplateResult {
    if (tree.kind === 'group') {
      return html`<mp-query-group
        .node=${tree}
        .schema=${this.schema}
        .currentEntity=${this.rootEntity}
        .depth=${this.depth}
        .isRoot=${true}
        .qbRoot=${this._qbRootId}
        .isDragging=${this._isDragging}
      ></mp-query-group>`;
    }
    // Non-group root: wrap in a synthetic group for rendering.
    const synthetic: Group = {
      kind: 'group',
      id: 'synthetic-root',
      logic: 'and',
      children: [tree],
    };
    return html`<mp-query-group
      .node=${synthetic}
      .schema=${this.schema}
      .currentEntity=${this.rootEntity}
      .depth=${this.depth}
      .isRoot=${true}
      .qbRoot=${this._qbRootId}
      .isDragging=${this._isDragging}
    ></mp-query-group>`;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-query-builder')) {
  customElements.define('mp-query-builder', MpQueryBuilderElement);
}
