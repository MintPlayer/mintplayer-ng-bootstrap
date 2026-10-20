import { LitElement, nothing, type PropertyValues } from 'lit';
import { live } from 'lit/directives/live.js';
import { repeat } from 'lit/directives/repeat.js';
import { installLightStyles, scopedHtml } from '@mintplayer/web-components/light-dom';
import { FormAssociatedMixin, HostAriaController } from '@mintplayer/web-components/a11y';
import { MachineController, props } from '@mintplayer/web-components/machine';
import { trackOpenSide } from '@mintplayer/ui-core/overlay';
import {
  connect,
  TYPEAHEAD_SCOPE,
  TypeaheadLabels,
  TypeaheadMachine,
  TypeaheadProvider,
  typeaheadScopedStyles,
  TypeaheadState,
} from '@mintplayer/ui-core/typeahead';

const html = scopedHtml(TYPEAHEAD_SCOPE);
let instanceCounter = 0;

/** Renders one suggestion row. The returned node is the consumer's: it is never scope-stamped. */
export type TypeaheadItemRenderer<T> = (item: T, term: string) => Node | null | undefined;

const ATTRIBUTES = [
  'value',
  'name',
  'disabled',
  'debounce-ms',
  'min-length',
  'input-label',
  'loading-label',
  'no-results-label',
  'error-text',
  'aria-label',
] as const;

/**
 * `<mp-typeahead>` — a text input with asynchronous suggestions and free text.
 *
 * The web-component front of the headless `TypeaheadMachine`
 * (`@mintplayer/ui-core/typeahead`, #436): the same core, the same ARIA bags,
 * the same scoped stylesheet as `bs-typeahead` (Angular), `BsTypeahead`
 * (React) and `BsTypeahead.vue`.
 *
 * Tier L (emulated encapsulation): no shadow root, because `itemRenderer`
 * mounts consumer DOM, and so the combobox input and its options share one
 * tree (aria-activedescendant resolves). Form-associated: the term is the
 * submitted value under `name`; `fieldset[disabled]` reaches it.
 *
 * No-JS: not server-rendered (light-tier elements are emitted empty); the
 * Angular front is the one with a server-rendered input.
 */
export class MpTypeahead<T = unknown> extends FormAssociatedMixin(LitElement) {
  static override get observedAttributes(): string[] {
    return [...(super.observedAttributes ?? []), ...ATTRIBUTES];
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  readonly #id = `mp-typeahead-${++instanceCounter}`;
  readonly #ctl = new MachineController<TypeaheadMachine<T>, TypeaheadState<T>>(
    this,
    new TypeaheadMachine<T>({
      id: this.#id,
      onChange: (value) => this.#emit('value-change', { value }),
      onSelect: (item, value) => this.#emit('select', { item, value }),
      onSubmit: (value) => this.#emit('submit', { value }),
      onOpen: () => this.#emit('open'),
      onClose: () => this.#emit('close'),
      onSearch: (term) => this.#emit('search', { term }),
      onError: (error) => this.#emit('load-error', { error }),
    }),
  );
  /** `aria-labelledby` / `aria-describedby` on the host resolve onto the input. */
  readonly #hostAria = new HostAriaController(this, {
    referenceTarget: () => this.querySelector<HTMLInputElement>(`input[data-mps=${TYPEAHEAD_SCOPE}]`),
  });

  #name: string | null = null;
  #disabled = false;
  #defaultValue = '';
  #inputLabel: string | null = null;
  #itemRenderer: TypeaheadItemRenderer<T> | null = null;

  /** The machine behind this element (shared contract with the framework fronts). */
  get machine(): TypeaheadMachine<T> {
    return this.#ctl.machine;
  }

  // ---- properties ---------------------------------------------------------

  /** The term. Setting it never queries. */
  get value(): string {
    return this.machine.snapshot.term;
  }
  set value(next: string) {
    this.machine.setValue(next);
  }

  /** The last picked item; null once the text changes after the pick. */
  get selectedItem(): T | null {
    return this.machine.snapshot.selectedItem;
  }

  get provider(): TypeaheadProvider<T> | null {
    return this.machine.provider;
  }
  set provider(next: TypeaheadProvider<T> | null) {
    this.machine.provider = next;
  }

  get debounceMs(): number {
    return this.machine.debounceMs;
  }
  set debounceMs(next: number) {
    this.machine.debounceMs = next;
  }

  get minLength(): number {
    return this.machine.minLength;
  }
  set minLength(next: number) {
    this.machine.minLength = next;
  }

  set itemText(fn: ((item: T) => string) | undefined) {
    this.machine.itemText = fn;
    this.requestUpdate();
  }
  set itemKey(fn: ((item: T) => unknown) | undefined) {
    this.machine.itemKey = fn;
    this.requestUpdate();
  }

  get itemRenderer(): TypeaheadItemRenderer<T> | null {
    return this.#itemRenderer;
  }
  set itemRenderer(fn: TypeaheadItemRenderer<T> | null) {
    this.#itemRenderer = fn;
    this.requestUpdate();
  }

  set resultsLabel(fn: ((count: number) => string) | undefined) {
    if (fn) this.machine.setLabels({ results: fn });
  }

  get name(): string | null {
    return this.#name;
  }
  set name(next: string | null) {
    this.#name = next ?? null;
    this.requestUpdate();
  }

  get disabled(): boolean {
    return this.#disabled;
  }
  set disabled(next: boolean) {
    const value = !!next;
    if (value === this.#disabled) return;
    this.#disabled = value;
    this.toggleAttribute('disabled', value);
    this.requestUpdate();
  }

  get errorText(): string | null {
    return this.machine.snapshot.errorText;
  }
  set errorText(next: string | null) {
    this.machine.setErrorText(next);
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback(name, old, value);
    switch (name) {
      case 'value':
        this.#defaultValue = value ?? '';
        this.machine.setValue(value ?? '');
        break;
      case 'name':
        this.name = value;
        break;
      case 'disabled':
        this.#disabled = value !== null;
        this.requestUpdate();
        break;
      case 'debounce-ms': {
        const ms = value === null ? NaN : Number(value);
        this.machine.debounceMs = Number.isFinite(ms) ? ms : undefined;
        break;
      }
      case 'min-length': {
        const n = value === null ? NaN : Number(value);
        this.machine.minLength = Number.isFinite(n) ? n : undefined;
        break;
      }
      case 'input-label':
        this.#inputLabel = value;
        this.#syncInputLabel();
        break;
      case 'aria-label':
        this.#syncInputLabel();
        break;
      case 'loading-label':
      case 'no-results-label': {
        const key: keyof TypeaheadLabels = name === 'loading-label' ? 'loading' : 'noResults';
        if (value !== null) this.machine.setLabels({ [key]: value });
        break;
      }
      case 'error-text':
        this.machine.setErrorText(value);
        break;
    }
  }

  /** A host `aria-label` wins over `input-label` (naming conformance). */
  #syncInputLabel(): void {
    this.machine.setLabels({ input: this.getAttribute('aria-label') ?? this.#inputLabel });
  }

  // ---- form association ------------------------------------------------------

  formValue(): string | null {
    return this.#name === null ? null : this.machine.snapshot.term;
  }

  formReset(): void {
    this.machine.setValue(this.#defaultValue);
  }

  formRestore(state: string | FormData | File | null): void {
    if (typeof state === 'string') this.machine.setValue(state);
  }

  formValidityAnchor(): HTMLElement | null {
    return this.querySelector('input');
  }

  // ---- lifecycle ----------------------------------------------------------------

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    // Author `disabled` or a disabled form owner (the mixin's safe read).
    this.machine.setDisabled(this.effectiveDisabled || this.#disabled);
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.#hostAria.syncReferences();
    this.syncFormValue();
  }

  #untrackSide: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    // Flip the list above the input near the viewport bottom.
    this.#untrackSide ??= trackOpenSide(
      this.machine,
      () => this.querySelector(`input[data-mps=${TYPEAHEAD_SCOPE}]`),
      () => this.querySelector<HTMLElement>(`ul[data-mps=${TYPEAHEAD_SCOPE}]`),
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#untrackSide?.();
    this.#untrackSide = null;
    // A node moved in the DOM reconnects with its machine intact; a removed one stops its work.
    queueMicrotask(() => {
      if (!this.isConnected) this.machine.close();
    });
  }

  /** Focus the input. */
  override focus(options?: FocusOptions): void {
    this.querySelector<HTMLInputElement>('input')?.focus(options);
  }

  // ---- render -------------------------------------------------------------------

  protected override render() {
    const state = this.#ctl.state;
    const api = connect(state, this.#id, { name: null }); // the host submits; the inner input carries no name
    const { value: _value, ...inputBag } = api.input;
    const machine = this.machine;
    return html`
      <div class="mp-typeahead" ${props(api.root)}>
        <input
          class="form-control"
          type="text"
          ${props(inputBag)}
          .value=${live(state.term)}
          @input=${(e: Event) => machine.setTerm((e.target as HTMLInputElement).value)}
          @keydown=${(e: KeyboardEvent) => {
            if (machine.keydown(e.key, e)) e.preventDefault();
          }}
          @blur=${() => machine.blur()}
        />
        <ul class="dropdown-menu" ${props(api.listbox)}>
          ${api.status ? html`<li class="ta-status" ${props(api.status.attrs)}>${api.status.text}</li>` : nothing}
          ${repeat(
            state.items,
            (item, index) => machine.itemKeyOf(item) ?? index,
            (item, index) => html`
              <li
                class="dropdown-item"
                ${props(api.option(index))}
                @mousedown=${(e: Event) => e.preventDefault()}
                @click=${() => machine.pick(index)}
              >${this.#row(item, state.term)}</li>
            `,
          )}
        </ul>
        <span class="visually-hidden" ${props(api.live.attrs)}>${api.live.text}</span>
        ${api.error ? html`<div class="ta-error" ${props(api.error.attrs)}>${api.error.text}</div>` : nothing}
      </div>
    `;
  }

  /** A consumer node goes in as a child value: lit inserts it as-is, so it is never stamped with our scope. */
  #row(item: T, term: string): Node | string {
    return this.#itemRenderer?.(item, term) ?? this.machine.itemTextOf(item);
  }

  #emit(type: string, detail?: unknown): void {
    // The deferred close after removal stops work silently: nothing listens to a detached
    // element, and under a torn-down test realm the dispatch itself throws.
    if (!this.isConnected) return;
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

installLightStyles(TYPEAHEAD_SCOPE, typeaheadScopedStyles);

if (typeof customElements !== 'undefined' && !customElements.get('mp-typeahead')) {
  customElements.define('mp-typeahead', MpTypeahead);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-typeahead': MpTypeahead;
  }
}
