import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { ContextConsumer } from '@lit/context';
import type { Condition } from '../model/expression';
import type { EntitySchema, FieldDef } from '../model/field-def';
import { DEFAULT_MESSAGES, type QueryBuilderMessages } from '../model/messages';
import { valueShapeFor } from '../model/operators';
import { messagesContext } from './context';
import { styles } from './mp-query-condition.element.template';

export class MpQueryConditionElement extends LitElement {
  static override styles = [styles];

  static override properties = {
    node: { attribute: false },
    schema: { attribute: false },
    currentEntity: { attribute: false },
  };

  node: Condition | null = null;
  schema: EntitySchema[] = [];
  currentEntity = '';

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

  private renderValue(value: unknown): TemplateResult | typeof nothing | string {
    if (value === null || value === undefined) return nothing;
    if (Array.isArray(value)) {
      return html`<span class="qb-value-list">${value.map(
        (v) => html`<span class="qb-value-pill">${this.formatScalar(v)}</span>`,
      )}</span>`;
    }
    if (typeof value === 'object') {
      const obj = value as { n?: number };
      if (typeof obj.n === 'number') return String(obj.n);
      return JSON.stringify(value);
    }
    return this.formatScalar(value);
  }

  private formatScalar(v: unknown): string {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return v.toISOString();
    return String(v);
  }

  protected override render(): TemplateResult | typeof nothing {
    const node = this.node;
    if (!node) return nothing;
    const field = this.resolveField(node.field);
    const messages = this.messages();
    const fieldLabel = field?.label ?? node.field;
    const operatorLabel = messages.operators[node.operator] ?? node.operator;
    const shape = valueShapeFor(node.operator);

    return html`
      <div class="qb-condition" part="condition">
        <span class="qb-field" part="field">${fieldLabel}</span>
        <span class="qb-operator" part="operator">${operatorLabel}</span>
        ${shape === 'null'
          ? nothing
          : html`<span class="qb-value" part="value">${this.renderValue(node.value)}</span>`}
        ${field
          ? nothing
          : html`<span class="qb-missing" title="Field not in schema">(unknown field)</span>`}
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-query-condition')) {
  customElements.define('mp-query-condition', MpQueryConditionElement);
}
