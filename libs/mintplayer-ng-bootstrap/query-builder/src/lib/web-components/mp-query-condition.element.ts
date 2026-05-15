import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { ContextConsumer } from '@lit/context';
import type { Condition } from '../model/expression';
import type { EntitySchema, FieldDef } from '../model/field-def';
import type { EditorContext, EditorHandle } from '../model/editor';
import { DEFAULT_MESSAGES, type QueryBuilderMessages } from '../model/messages';
import { valueShapeFor } from '../model/operators';
import { disabledContext, messagesContext } from './context';
import { resolveBuiltinEditor } from '../value-editors/builtin-editors';
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
  private _disabledConsumer = new ContextConsumer(this, {
    context: disabledContext,
    subscribe: true,
  });

  private _editorMount = createRef<HTMLSpanElement>();
  private _currentHandle: EditorHandle | null = null;
  private _editorKey = '';

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._disposeEditor();
  }

  private _disposeEditor(): void {
    const h = this._currentHandle;
    if (h) {
      try { h.dispose?.(); } catch { /* ignore */ }
      h.element.remove();
      this._currentHandle = null;
    }
  }

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

  private isDisabled(): boolean {
    return (this._disabledConsumer.value ?? false);
  }

  protected override updated(_changed: PropertyValues): void {
    this._refreshEditor();
  }

  private _refreshEditor(): void {
    const mount = this._editorMount.value;
    if (!mount) return;
    const node = this.node;
    if (!node) {
      this._disposeEditor();
      return;
    }
    const field = this.resolveField(node.field);
    if (!field) {
      this._disposeEditor();
      return;
    }
    const shape = valueShapeFor(node.operator);
    if (shape === 'null') {
      this._disposeEditor();
      return;
    }

    // Key encodes the (field, operator) pair plus disabled state. If unchanged,
    // skip rebuild so user keystrokes don't blow away the focused input. Value
    // updates are pushed by the caller via the onChange contract, so we don't
    // re-render the editor for value-only changes.
    const disabled = this.isDisabled();
    const key = `${field.name}|${node.operator}|${disabled ? '1' : '0'}`;
    if (this._currentHandle && key === this._editorKey) return;

    this._disposeEditor();
    const factory = resolveBuiltinEditor(field, node.operator);
    if (!factory) return;

    const ctx: EditorContext = {
      field,
      operator: node.operator,
      value: node.value,
      disabled,
      onChange: (next: unknown) => {
        this.dispatchEvent(new CustomEvent('condition-value-change', {
          detail: { id: node.id, value: next },
          bubbles: false,
        }));
      },
    };
    const handle = factory(ctx);
    mount.appendChild(handle.element);
    this._currentHandle = handle;
    this._editorKey = key;
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
          : html`<span class="qb-value" part="value" ${ref(this._editorMount)}></span>`}
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
