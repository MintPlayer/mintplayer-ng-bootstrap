import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { ContextConsumer } from '@lit/context';
import type { Condition, Operator } from './model/expression';
import type { EntitySchema, FieldDef } from './model/field-def';
import type { EditorContext, EditorFactory, EditorHandle } from './model/editor';
import { DEFAULT_MESSAGES, type QueryBuilderMessages } from './model/messages';
import { operatorsForType, valueShapeFor } from './model/operators';
import { disabledContext, editorRegistryContext, messagesContext } from './context';
import { resolveBuiltinEditor } from './value-editors/builtin-editors';
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
  private _registryConsumer = new ContextConsumer(this, {
    context: editorRegistryContext,
    subscribe: true,
  });

  private _editorMount = createRef<HTMLSpanElement>();
  private _currentHandle: EditorHandle | null = null;
  private _editorKey = '';
  private _registryTokens = new WeakMap<object, number>();
  private _nextRegistryToken = 1;

  private _registryIdentityToken(reg: object | undefined): number {
    if (!reg) return 0;
    const existing = this._registryTokens.get(reg);
    if (existing !== undefined) return existing;
    const t = this._nextRegistryToken++;
    this._registryTokens.set(reg, t);
    return t;
  }

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

    // Key encodes (field, operator, disabled, registry identity). If unchanged,
    // skip rebuild so user keystrokes don't blow away the focused input. Value
    // updates are pushed by the caller via the onChange contract, so we don't
    // re-render the editor for value-only changes.
    const disabled = this.isDisabled();
    const registry = this._registryConsumer.value;
    const registeredFactory: EditorFactory | undefined = registry?.[field.name];
    // Use registry identity (object reference) so swapping the whole registry
    // — even with the same field key — forces a rebuild. Within one registry
    // instance, identity is stable so we don't churn on unrelated updates.
    const registryToken = registeredFactory ? `r${this._registryIdentityToken(registry)}` : 'b';
    const key = `${field.name}|${node.operator}|${disabled ? '1' : '0'}|${registryToken}`;
    if (this._currentHandle && key === this._editorKey) return;

    this._disposeEditor();
    const factory: EditorFactory | null = registeredFactory ?? resolveBuiltinEditor(field, node.operator);
    if (!factory) return;

    const ctx: EditorContext = {
      field,
      operator: node.operator,
      value: node.value,
      disabled,
      onChange: (next: unknown) => {
        this.dispatchEvent(new CustomEvent('condition-value-change', {
          detail: { id: node.id, value: next },
          bubbles: true, composed: true,
        }));
      },
    };
    const handle = factory(ctx);
    mount.appendChild(handle.element);
    this._currentHandle = handle;
    this._editorKey = key;
  }

  private _onFieldChange = (e: Event): void => {
    const target = e.target as HTMLSelectElement;
    const node = this.node;
    if (!node) return;
    this.dispatchEvent(new CustomEvent('condition-field-change', {
      detail: { id: node.id, field: target.value },
      bubbles: true, composed: true,
    }));
  };

  private _onOperatorChange = (e: Event): void => {
    const target = e.target as HTMLSelectElement;
    const node = this.node;
    if (!node) return;
    this.dispatchEvent(new CustomEvent('condition-operator-change', {
      detail: { id: node.id, operator: target.value as Operator },
      bubbles: true, composed: true,
    }));
  };

  private _onRemove = (): void => {
    const node = this.node;
    if (!node) return;
    this.dispatchEvent(new CustomEvent('node-remove', {
      detail: { id: node.id },
      bubbles: true, composed: true,
    }));
  };

  private _onRowKeyDown = (e: KeyboardEvent): void => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    const node = this.node;
    if (!node || this.isDisabled()) return;
    // Only react when focus is on the row itself, not on a child input/select
    // where the arrow keys have native semantics (cursor / option navigation).
    const row = this.shadowRoot?.querySelector('.qb-condition');
    if (e.composedPath()[0] !== row) return;
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('qb-keyboard-move', {
      detail: { id: node.id, direction: e.key === 'ArrowUp' ? 'up' : 'down' },
      bubbles: true, composed: true,
    }));
  };

  private _onDragPointerDown = (e: PointerEvent): void => {
    if (this.isDisabled()) return;
    const node = this.node;
    if (!node) return;
    // Find the row element to use as the ghost source.
    const row = this.shadowRoot?.querySelector('.qb-condition') as HTMLElement | null;
    if (!row) return;
    this.dispatchEvent(new CustomEvent('qb-drag-start', {
      detail: {
        id: node.id,
        pointerId: e.pointerId,
        clientX: e.clientX,
        clientY: e.clientY,
        rowElement: row,
      },
      bubbles: true, composed: true,
    }));
  };

  private _availableFields(): FieldDef[] {
    return this.schema
      .find((s) => s.name === this.currentEntity)
      ?.fields.filter((f) => f.type !== 'relation') ?? [];
  }

  private _availableOperators(field: FieldDef | undefined): readonly Operator[] {
    if (!field) return [];
    return operatorsForType(field.type);
  }

  protected override render(): TemplateResult | typeof nothing {
    const node = this.node;
    if (!node) return nothing;
    const field = this.resolveField(node.field);
    const messages = this.messages();
    const shape = valueShapeFor(node.operator);
    const disabled = this.isDisabled();
    const fields = this._availableFields();
    const operators = this._availableOperators(field);

    return html`
      <div
        class="qb-condition"
        part="condition"
        tabindex="0"
        data-row-id=${node.id}
        @keydown=${this._onRowKeyDown}
      >
        <button
          type="button"
          class="qb-drag-handle"
          part="drag-handle"
          ?disabled=${disabled}
          aria-label="Drag or use Alt+Up/Down to reorder"
          title="Drag or use Alt+Up/Down to reorder"
          @pointerdown=${this._onDragPointerDown}
        >⋮</button>
        <select
          class="form-select form-select-sm qb-field-select"
          part="field-select"
          ?disabled=${disabled}
          @change=${this._onFieldChange}
          aria-label="Field"
        >
          ${fields.map((f) => html`<option value=${f.name} ?selected=${f.name === node.field}>${f.label}</option>`)}
          ${field ? nothing : html`<option value=${node.field} selected>(${node.field})</option>`}
        </select>
        <select
          class="form-select form-select-sm qb-operator-select"
          part="operator-select"
          ?disabled=${disabled || !field}
          @change=${this._onOperatorChange}
          aria-label="Operator"
        >
          ${operators.map((op) => html`
            <option value=${op} ?selected=${op === node.operator}>${messages.operators[op] ?? op}</option>
          `)}
          ${operators.includes(node.operator) ? nothing : html`<option value=${node.operator} selected>${node.operator}</option>`}
        </select>
        ${shape === 'null'
          ? nothing
          : html`<span class="qb-value" part="value" ${ref(this._editorMount)}></span>`}
        <button
          type="button"
          class="btn btn-sm btn-link qb-remove"
          part="remove"
          ?disabled=${disabled}
          @click=${this._onRemove}
          aria-label="Remove condition"
          title="Remove"
        >×</button>
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-query-condition')) {
  customElements.define('mp-query-condition', MpQueryConditionElement);
}
