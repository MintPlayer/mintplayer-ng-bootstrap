import { LitElement, nothing, type TemplateResult } from 'lit';
import { installLightStyles, scopedHtml } from '@mintplayer/web-components/light-dom';
import { ContextConsumer } from '@lit/context';
import type { SubQueryCondition } from './model/expression';
import type { EntitySchema, FieldDef } from './model/field-def';
import { DEFAULT_MESSAGES, type QueryBuilderMessages } from './model/messages';
import { messagesContext } from './context';
import { querySubqueryLightStyles } from './mp-query-subquery.light.styles';

/**
 * Tier L (emulated encapsulation) — the family converts together: a light-tier
 * element nested inside an unconverted ancestor's shadow root would be
 * unstyled. Never use lit's bare `html` here.
 */
const html = scopedHtml('query-subquery');

export class MpQuerySubqueryElement extends LitElement {
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  static override properties = {
    node: { attribute: false },
    schema: { attribute: false },
    currentEntity: { attribute: false },
    depth: { attribute: false },
    qbRoot: { attribute: false },
    isDragging: { attribute: false },
  };

  node: SubQueryCondition | null = null;
  schema: EntitySchema[] = [];
  currentEntity = '';
  depth = 0;
  qbRoot = '';
  isDragging = false;

  private _messagesConsumer = new ContextConsumer(this, {
    context: messagesContext,
    subscribe: true,
  });

  private _onHeaderKeyDown = (e: KeyboardEvent): void => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    const node = this.node;
    if (!node) return;
    const header = this.renderRoot?.querySelector('.qb-subquery-header');
    if (e.composedPath()[0] !== header) return;
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('qb-keyboard-move', {
      detail: { id: node.id, direction: e.key === 'ArrowUp' ? 'up' : 'down' },
      bubbles: true, composed: true,
    }));
  };

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
      <div class="qb-subquery" data-row-id=${node.id}>
        <div
          class="qb-subquery-header"
          tabindex="0"
          role="group"
          aria-label=${
            // Focusable reorder stop — role + a name mirroring the visible
            // field/operator/target text, re-derived every render (§11a).
            `${fieldLabel} ${operatorLabel}${targetEntity ? ` ${targetEntity}` : ''}`
          }
          @keydown=${this._onHeaderKeyDown}
        >
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
        ></mp-query-builder>
      </div>
    `;
  }
}

installLightStyles('query-subquery', querySubqueryLightStyles);

if (typeof customElements !== 'undefined' && !customElements.get('mp-query-subquery')) {
  customElements.define('mp-query-subquery', MpQuerySubqueryElement);
}
