import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { ContextConsumer, ContextProvider } from '@lit/context';
import type { Expression, Group } from '../model/expression';
import type { EntitySchema } from '../model/field-def';
import type { EditorRegistry } from '../model/editor';
import type { QueryBuilderMessages } from '../model/messages';
import {
  disabledContext,
  editorRegistryContext,
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
  }

  protected override render(): TemplateResult | typeof nothing {
    if (this.depth > this.maxDepth) {
      return html`<div class="qb-too-deep" role="alert">Tree too deep</div>`;
    }
    const tree = this.query;
    if (!tree) return nothing;

    return html`
      <div class="qb-root" part="root">
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
    ></mp-query-group>`;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-query-builder')) {
  customElements.define('mp-query-builder', MpQueryBuilderElement);
}
