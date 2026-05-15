import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { ContextConsumer } from '@lit/context';
import type { SubQueryCondition } from '../model/expression';
import type { EntitySchema, FieldDef } from '../model/field-def';
import { DEFAULT_MESSAGES, type QueryBuilderMessages } from '../model/messages';
import { messagesContext } from './context';
import { styles } from './mp-query-subquery.element.template';

export class MpQuerySubqueryElement extends LitElement {
  static override styles = [styles];

  static override properties = {
    node: { attribute: false },
    schema: { attribute: false },
    currentEntity: { attribute: false },
    depth: { attribute: false },
  };

  node: SubQueryCondition | null = null;
  schema: EntitySchema[] = [];
  currentEntity = '';
  depth = 0;

  private _messagesConsumer = new ContextConsumer(this, {
    context: messagesContext,
    subscribe: true,
  });

  private resolveField(name: string): FieldDef | undefined {
    return this.schema
      .find((s) => s.name === this.currentEntity)
      ?.fields.find((f) => f.name === name);
  }

  private messages(): QueryBuilderMessages {
    const consumed = this._messagesConsumer.value ?? {};
    return {
      ...DEFAULT_MESSAGES,
      ...consumed,
      operators: { ...DEFAULT_MESSAGES.operators, ...(consumed.operators ?? {}) },
    };
  }

  protected override render(): TemplateResult | typeof nothing {
    const node = this.node;
    if (!node) return nothing;
    const field = this.resolveField(node.field);
    const messages = this.messages();
    const fieldLabel = field?.label ?? node.field;
    const operatorLabel = messages.operators[node.operator] ?? node.operator;
    const targetEntity = field?.targetEntity ?? '';

    return html`
      <div class="qb-subquery" part="subquery">
        <div class="qb-subquery-header" part="subquery-header">
          <span class="qb-subquery-field">${fieldLabel}</span>
          <span class="qb-subquery-operator">${operatorLabel}</span>
          ${targetEntity
            ? html`<span class="qb-subquery-target">(${targetEntity})</span>`
            : nothing}
        </div>
        <mp-query-builder
          .query=${node.subQuery}
          .schema=${this.schema}
          .rootEntity=${targetEntity}
          .depth=${this.depth + 1}
          part="subquery-builder"
        ></mp-query-builder>
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-query-subquery')) {
  customElements.define('mp-query-subquery', MpQuerySubqueryElement);
}
