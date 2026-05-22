import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { ContextConsumer } from '@lit/context';
import type { Expression, Group } from './model/expression';
import type { EntitySchema } from './model/field-def';
import { DEFAULT_MESSAGES, type QueryBuilderMessages } from './model/messages';
import { disabledContext, messagesContext } from './context';
import { MpQueryConditionElement } from './mp-query-condition.element';
import { MpQuerySubqueryElement } from './mp-query-subquery.element';
import { styles } from './mp-query-group.element.template';
void MpQueryConditionElement;
void MpQuerySubqueryElement;

export class MpQueryGroupElement extends LitElement {
  static override styles = [styles];

  static override properties = {
    node: { attribute: false },
    schema: { attribute: false },
    currentEntity: { attribute: false },
    depth: { attribute: false },
    isRoot: { attribute: false },
    qbRoot: { attribute: false },
    isDragging: { attribute: false },
  };

  node: Group | null = null;
  schema: EntitySchema[] = [];
  currentEntity = '';
  depth = 0;
  // True if this group is the outermost group of an mp-query-builder. Used to
  // disable the "remove group" button on the root (removing the root makes
  // no sense; the tree must always have one).
  isRoot = false;
  // The id of the owning mp-query-builder root — used to tag drop slots so
  // cross-tree DnD (FR-13) can detect target-root mismatches and apply
  // field reset.
  qbRoot = '';
  // True when any descendant in the same builder is mid-drag. Drives the
  // visibility of drop slots (we only render them during drags).
  isDragging = false;

  private _messagesConsumer = new ContextConsumer(this, {
    context: messagesContext,
    subscribe: true,
  });
  private _disabledConsumer = new ContextConsumer(this, {
    context: disabledContext,
    subscribe: true,
  });

  private isDisabled(): boolean {
    return this._disabledConsumer.value ?? false;
  }

  private _hasRelation(): boolean {
    return (this.schema.find((s) => s.name === this.currentEntity)?.fields ?? [])
      .some((f) => f.type === 'relation' && !!f.targetEntity);
  }

  private _emit(type: string, detail: Record<string, unknown>): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private _onLogicChange = (logic: 'and' | 'or'): void => {
    const node = this.node;
    if (!node || node.logic === logic) return;
    this._emit('group-logic-change', { id: node.id, logic });
  };

  private _onAddCondition = (): void => {
    if (!this.node) return;
    this._emit('add-condition', { groupId: this.node.id });
  };

  private _onAddGroup = (): void => {
    if (!this.node) return;
    this._emit('add-group', { groupId: this.node.id });
  };

  private _onAddSubquery = (): void => {
    if (!this.node) return;
    this._emit('add-subquery', { groupId: this.node.id });
  };

  private _onRemove = (): void => {
    if (!this.node) return;
    this._emit('node-remove', { id: this.node.id });
  };

  private messages(): QueryBuilderMessages {
    const consumed = this._messagesConsumer.value ?? {};
    return {
      ...DEFAULT_MESSAGES,
      ...consumed,
      operators: { ...DEFAULT_MESSAGES.operators, ...(consumed.operators ?? {}) },
    };
  }

  private renderChild(child: Expression): TemplateResult {
    switch (child.kind) {
      case 'group':
        return html`<mp-query-group
          .node=${child}
          .schema=${this.schema}
          .currentEntity=${this.currentEntity}
          .depth=${this.depth + 1}
          .qbRoot=${this.qbRoot}
          .isDragging=${this.isDragging}
          part="child-group"
        ></mp-query-group>`;
      case 'condition':
        return html`<mp-query-condition
          .node=${child}
          .schema=${this.schema}
          .currentEntity=${this.currentEntity}
          part="child-condition"
        ></mp-query-condition>`;
      case 'subquery':
        return html`<mp-query-subquery
          .node=${child}
          .schema=${this.schema}
          .currentEntity=${this.currentEntity}
          .depth=${this.depth + 1}
          .qbRoot=${this.qbRoot}
          .isDragging=${this.isDragging}
          part="child-subquery"
        ></mp-query-subquery>`;
    }
  }

  private renderDropSlot(index: number): TemplateResult | typeof nothing {
    if (!this.isDragging || !this.node) return nothing;
    return html`<div
      class="qb-drop-slot"
      data-drop-slot
      data-parent-id=${this.node.id}
      data-index=${String(index)}
      data-qb-root=${this.qbRoot}
      part="drop-slot"
      aria-hidden="true"
    ></div>`;
  }

  private _renderChildrenWithSlots(children: Expression[]): TemplateResult[] {
    const out: TemplateResult[] = [];
    if (this.isDragging) {
      out.push(this.renderDropSlot(0) as TemplateResult);
    }
    for (let i = 0; i < children.length; i++) {
      out.push(this.renderChild(children[i]!));
      if (this.isDragging) {
        out.push(this.renderDropSlot(i + 1) as TemplateResult);
      }
    }
    return out;
  }

  private _dropPlaceholder(): TemplateResult {
    return html`<div
      class="qb-drop-slot qb-drop-slot-placeholder"
      data-drop-slot
      data-parent-id=${this.node?.id ?? ''}
      data-index="0"
      data-qb-root=${this.qbRoot}
      aria-hidden="true"
    >Drop here</div>`;
  }

  protected override render(): TemplateResult | typeof nothing {
    const node = this.node;
    if (!node) return nothing;
    const messages = this.messages();
    const disabled = this.isDisabled();
    const showSubquery = this._hasRelation();
    return html`
      <div
        class="qb-group"
        role="group"
        aria-label=${node.logic === 'and' ? 'AND group' : 'OR group'}
        part="group"
      >
        <div class="qb-group-header" part="group-header">
          <span class="qb-logic-toggle btn-group btn-group-sm" role="group" aria-label="Group logic">
            <button
              type="button"
              class="btn ${node.logic === 'and' ? 'btn-primary' : 'btn-outline-primary'} qb-logic-btn"
              ?disabled=${disabled}
              @click=${() => this._onLogicChange('and')}
              aria-pressed=${node.logic === 'and'}
            >${messages.logicAnd}</button>
            <button
              type="button"
              class="btn ${node.logic === 'or' ? 'btn-primary' : 'btn-outline-primary'} qb-logic-btn"
              ?disabled=${disabled}
              @click=${() => this._onLogicChange('or')}
              aria-pressed=${node.logic === 'or'}
            >${messages.logicOr}</button>
          </span>
          <span class="qb-group-actions">
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary qb-add-condition"
              part="add-condition"
              ?disabled=${disabled}
              @click=${this._onAddCondition}
            >+ ${messages.addCondition}</button>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary qb-add-group"
              part="add-group"
              ?disabled=${disabled}
              @click=${this._onAddGroup}
            >+ ${messages.addGroup}</button>
            ${showSubquery
              ? html`<button
                  type="button"
                  class="btn btn-sm btn-outline-secondary qb-add-subquery"
                  part="add-subquery"
                  ?disabled=${disabled}
                  @click=${this._onAddSubquery}
                >+ ${messages.addSubquery}</button>`
              : nothing}
            ${this.isRoot
              ? nothing
              : html`<button
                  type="button"
                  class="btn btn-sm btn-link qb-remove-group"
                  part="remove-group"
                  ?disabled=${disabled}
                  @click=${this._onRemove}
                  aria-label="Remove group"
                  title=${messages.removeGroup}
                >×</button>`}
          </span>
        </div>
        <div class="qb-children" part="children">
          ${node.children.length === 0
            ? html`<div class="qb-empty">${this.isDragging ? this._dropPlaceholder() : '(empty group)'}</div>`
            : this._renderChildrenWithSlots(node.children)}
        </div>
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-query-group')) {
  customElements.define('mp-query-group', MpQueryGroupElement);
}
