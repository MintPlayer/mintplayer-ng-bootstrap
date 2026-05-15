import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { ContextConsumer, ContextProvider } from '@lit/context';
import type { Expression, Group, Operator } from '../model/expression';
import type { EntitySchema } from '../model/field-def';
import type { EditorRegistry } from '../model/editor';
import type { QueryBuilderMessages } from '../model/messages';
import {
  addEmptyConditionTo,
  addEmptyGroupTo,
  addEmptySubqueryTo,
  changeConditionField,
  changeConditionOperator,
  removeNode,
  setGroupLogic,
  updateCondition,
} from '../model/tree-ops';
import {
  disabledContext,
  editorRegistryContext,
  maxDepthContext,
  messagesContext,
} from './context';
import { MpQueryGroupElement } from './mp-query-group.element';
import { styles } from './mp-query-builder.element.template';

void MpQueryGroupElement;

const DEFAULT_MAX_DEPTH = 32;

export class MpQueryBuilderElement extends LitElement {
  static override styles = [styles];

  static override properties = {
    query: { attribute: false },
    schema: { attribute: false },
    rootEntity: { attribute: 'root-entity', type: String, reflect: true },
    disabled: { attribute: 'disabled', type: Boolean, reflect: true },
    editorRegistry: { attribute: false },
    messages: { attribute: false },
    maxDepth: { attribute: 'max-depth', type: Number, reflect: true },
    depth: { attribute: false },
  };

  query: Expression | null = null;
  schema: EntitySchema[] = [];
  rootEntity = '';
  disabled = false;
  editorRegistry: EditorRegistry | undefined = undefined;
  messages: Partial<QueryBuilderMessages> | undefined = undefined;
  maxDepth = DEFAULT_MAX_DEPTH;

  // `depth` is set by parent <mp-query-subquery> when this WC renders a nested
  // sub-query body. The outermost root keeps depth=0.
  depth = 0;

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

  protected override willUpdate(_changed: PropertyValues): void {
    // editorRegistry — override semantics (this wins if set; else inherit).
    const effRegistry = this.editorRegistry ?? this._registryConsumer.value;
    this._registryProvider.setValue(effRegistry);

    // disabled — OR semantics (outer disable cannot be re-enabled inside).
    const effDisabled =
      (this._disabledConsumer.value ?? false) || (this.disabled ?? false);
    this._disabledProvider.setValue(effDisabled);

    // messages — merge semantics (per-key override; outer keys preserved unless replaced).
    const effMessages = {
      ...(this._messagesConsumer.value ?? {}),
      ...(this.messages ?? {}),
    };
    this._messagesProvider.setValue(effMessages);

    // maxDepth — override semantics (this wins if explicitly set, else inherit).
    const inheritedMax = this._maxDepthConsumer.value;
    const effMaxDepth = inheritedMax ?? this.maxDepth;
    this._maxDepthProvider.setValue(effMaxDepth);
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
        @condition-field-change=${this._onConditionFieldChange}
        @condition-operator-change=${this._onConditionOperatorChange}
        @condition-value-change=${this._onConditionValueChange}
        @group-logic-change=${this._onGroupLogicChange}
        @add-condition=${this._onAddCondition}
        @add-group=${this._onAddGroup}
        @add-subquery=${this._onAddSubquery}
        @node-remove=${this._onNodeRemove}
      >
        ${this.renderTreeRoot(tree)}
      </div>
    `;
  }

  private renderTreeRoot(tree: Expression): TemplateResult {
    if (tree.kind === 'group') {
      return html`<mp-query-group
        .node=${tree}
        .schema=${this.schema}
        .currentEntity=${this.rootEntity}
        .depth=${this.depth}
        .isRoot=${true}
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
    ></mp-query-group>`;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-query-builder')) {
  customElements.define('mp-query-builder', MpQueryBuilderElement);
}
