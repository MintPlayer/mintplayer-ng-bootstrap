import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { ContextConsumer } from '@lit/context';
import type { Expression, Group } from '../model/expression';
import type { EntitySchema } from '../model/field-def';
import { DEFAULT_MESSAGES, type QueryBuilderMessages } from '../model/messages';
import { messagesContext } from './context';
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
  };

  node: Group | null = null;
  schema: EntitySchema[] = [];
  currentEntity = '';
  depth = 0;

  private _messagesConsumer = new ContextConsumer(this, {
    context: messagesContext,
    subscribe: true,
  });

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
          part="child-subquery"
        ></mp-query-subquery>`;
    }
  }

  protected override render(): TemplateResult | typeof nothing {
    const node = this.node;
    if (!node) return nothing;
    const messages = this.messages();
    const logicLabel = node.logic === 'and' ? messages.logicAnd : messages.logicOr;
    return html`
      <div
        class="qb-group"
        role="group"
        aria-label=${node.logic === 'and' ? 'AND group' : 'OR group'}
        part="group"
      >
        <div class="qb-group-header" part="group-header">
          <span class="qb-logic" part="logic">${logicLabel}</span>
        </div>
        <div class="qb-children" part="children">
          ${node.children.length === 0
            ? html`<div class="qb-empty">(empty group)</div>`
            : node.children.map((c) => this.renderChild(c))}
        </div>
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-query-group')) {
  customElements.define('mp-query-group', MpQueryGroupElement);
}
