import { abortError } from '@mintplayer/ui-core/async';
import { defineCore } from '@mintplayer/ui-core/component';
import { trackOpenSide, type OpenSide } from '@mintplayer/ui-core/overlay';
import { connect, type AttrBag } from './connect';
import { TypeaheadMachine } from './typeahead-machine';
import {
  DEFAULT_TYPEAHEAD_LABELS,
  defaultItemText,
  type TypeaheadLabels,
  type TypeaheadProvider,
  type TypeaheadSource,
  type TypeaheadSubscribable,
  type TypeaheadState,
  type TypeaheadStatus,
} from './types';

/**
 * A suggestion, in whatever shape the consumer's provider returns. Untyped on
 * purpose: a generated front cannot be generic, and a slot whose item is
 * `unknown` would force a cast into every consumer template.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TypeaheadItem = any;

export interface TypeaheadInputs {
  /** Supplies suggestions for a settled term (a Promise or an Observable); a newer term aborts the previous request. */
  provider: TypeaheadSource<TypeaheadItem> | null;
  /** Quiet time after the last keystroke, ms. 0 requests synchronously. */
  debounceMs: number;
  /** A trimmed term shorter than this closes the list without querying. */
  minLength: number;
  disabled: boolean;
  /** The text a pick writes into the input. Default: `item.text`, else `String(item)`. */
  itemText: ((item: TypeaheadItem) => string) | null;
  /** Row identity for keyed rendering. Default: `itemText`. */
  itemKey: ((item: TypeaheadItem) => unknown) | null;
  /** Submitted with a native `<form>` under this name (also with JavaScript disabled). */
  name: string | null;
  /** The input's accessible name, when the consumer's `aria-label` does not give one. */
  inputLabel: string | null;
  loadingLabel: string | null;
  noResultsLabel: string | null;
  /** Spoken once per settled request, e.g. `n => n + ' resultaten'`. */
  resultsLabel: ((count: number) => string) | null;
  /** A persistent validation message, wired to the input with aria-errormessage. */
  errorText: string | null;
  /** The term: the text in the input, and the form value. Two-way. */
  value: string;
}

/** The machine's live part; `value` is the term, under the model's name. */
export interface TypeaheadCoreState {
  value: string;
  items: readonly TypeaheadItem[];
  status: TypeaheadStatus;
  open: boolean;
  side: OpenSide;
  activeIndex: number;
  selectedItem: TypeaheadItem | null;
  announcement: string;
}

export interface TypeaheadItemSelectDetail {
  item: TypeaheadItem;
  /** The text the pick wrote into the input. */
  value: string;
}

export interface TypeaheadEvents {
  /** The term changed by typing or by a pick; never for a programmatic set. */
  valueChange: string;
  itemSelect: TypeaheadItemSelectDetail;
  /** Enter with no suggestion highlighted. */
  termSubmit: string;
  openChange: boolean;
  /** A provider call started for this term (after the debounce and the min-length gate). */
  searchStart: string;
  /** The provider rejected with something other than an abort. */
  loadError: unknown;
}

export interface TypeaheadMethods {
  /** Focus the input. */
  focus(): void;
}

export interface TypeaheadOptionView {
  /** The row's render key: `itemKey` (default `itemText`), as a string. */
  key: string;
  item: TypeaheadItem;
  /** The item's text, the row's default content. */
  text: string;
  bag: AttrBag;
}

export interface TypeaheadView {
  root: AttrBag;
  input: AttrBag;
  /** The term, also bound as the input's live `value` property. */
  term: string;
  listbox: AttrBag;
  status: { attrs: AttrBag; text: string } | null;
  options: readonly TypeaheadOptionView[];
  live: { attrs: AttrBag; text: string };
  error: { attrs: AttrBag; text: string } | null;
}

const labelsOf = (inputs: Readonly<TypeaheadInputs>, label: string | null): TypeaheadLabels => ({
  input: label ?? inputs.inputLabel,
  loading: inputs.loadingLabel ?? DEFAULT_TYPEAHEAD_LABELS.loading,
  noResults: inputs.noResultsLabel ?? DEFAULT_TYPEAHEAD_LABELS.noResults,
  results: inputs.resultsLabel ?? DEFAULT_TYPEAHEAD_LABELS.results,
});

const textOf = (inputs: Readonly<TypeaheadInputs>) => inputs.itemText ?? defaultItemText;

const withClass = (bag: AttrBag, cls: string): AttrBag => ({ ...bag, class: cls });

const INPUT = 'input[role=combobox]';
const LISTBOX = '[role=listbox]';

/** The live machine of each attached typeahead, for `inputsChanged`. */
const machines = new WeakMap<HTMLElement, TypeaheadMachine<TypeaheadItem>>();

/**
 * The typeahead's core (#458 M3): `TypeaheadMachine` (#436) drives the
 * behaviour once live; this core mirrors its snapshot, so the server renders
 * the same tree (a real, named `<input>` that submits free text with
 * JavaScript off) and every front shares one set of listeners.
 */
export const typeaheadCore = defineCore<
  TypeaheadInputs,
  TypeaheadCoreState,
  { view: TypeaheadView },
  TypeaheadEvents,
  undefined,
  undefined,
  TypeaheadMethods
>({
  state: (inputs) => ({
    value: inputs.value ?? '',
    items: [],
    status: 'idle',
    open: false,
    side: 'below',
    activeIndex: -1,
    selectedItem: null,
    announcement: '',
  }),
  view: ({ inputs, state, id, hydrated, label }) => {
    const snapshot: TypeaheadState<TypeaheadItem> = {
      ...state,
      term: state.value,
      disabled: inputs.disabled,
      errorText: inputs.errorText,
      labels: labelsOf(inputs, label),
    };
    const api = connect(snapshot, id, { name: inputs.name, hydrated });
    const text = textOf(inputs);
    const key = inputs.itemKey ?? text;
    return {
      view: {
        root: withClass(api.root, 'mp-typeahead'),
        input: { ...withClass(api.input, 'form-control'), type: 'text' },
        term: state.value,
        listbox: withClass(api.listbox, 'dropdown-menu'),
        status: api.status && { attrs: withClass(api.status.attrs, 'ta-status'), text: api.status.text },
        options: state.items.map((item, index) => ({
          key: String(key(item) ?? index),
          item,
          text: text(item),
          bag: { ...withClass(api.option(index), 'dropdown-item'), 'data-index': String(index) },
        })),
        live: { attrs: withClass(api.live.attrs, 'visually-hidden'), text: api.live.text },
        error: api.error && { attrs: withClass(api.error.attrs, 'ta-error'), text: api.error.text },
      },
    };
  },
  attach: (api) => {
    const inputs = api.inputs();
    const machine = new TypeaheadMachine<TypeaheadItem>({
      id: api.host.id,
      value: inputs.value ?? '',
      onChange: (term) => api.emit('valueChange', term),
      onSelect: (item, value) => api.emit('itemSelect', { item, value }),
      onSubmit: (term) => api.emit('termSubmit', term),
      onOpen: () => api.emit('openChange', true),
      onClose: () => api.emit('openChange', false),
      onSearch: (term) => api.emit('searchStart', term),
      onError: (error) => api.emit('loadError', error),
    });
    configure(machine, inputs);
    const unsubscribe = machine.subscribe((s) => {
      // A front only seeds the input's value (React renders it as defaultValue): the core keeps
      // the DOM in step when the term moves away from what was typed (a pick, a programmatic set).
      const field = api.host.querySelector<HTMLInputElement>(INPUT);
      if (field && field.value !== s.term) field.value = s.term;
      api.setState({
        value: s.term,
        items: s.items,
        status: s.status,
        open: s.open,
        side: s.side,
        activeIndex: s.activeIndex,
        selectedItem: s.selectedItem,
        announcement: s.announcement,
      });
    });
    machines.set(api.host, machine);

    const input = () => api.host.querySelector<HTMLInputElement>(INPUT);
    const listbox = () => api.host.querySelector<HTMLElement>(LISTBOX);
    const isInput = (target: EventTarget | null) => target instanceof HTMLInputElement && target.matches(INPUT);

    const onInput = (event: Event) => {
      if (isInput(event.target)) machine.setTerm((event.target as HTMLInputElement).value);
    };
    const onKeydown = (event: KeyboardEvent) => {
      if (isInput(event.target) && machine.keydown(event.key, event)) event.preventDefault();
    };
    const onFocusout = (event: FocusEvent) => {
      if (isInput(event.target)) machine.blur();
    };
    // Keep focus in the input while a suggestion is clicked.
    const onMousedown = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest?.('[role=option]')) event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      const option = (event.target as Element | null)?.closest?.<HTMLElement>('[role=option]');
      const index = Number(option?.dataset['index']);
      if (option && api.host.contains(option) && Number.isInteger(index)) machine.pick(index);
    };
    api.host.addEventListener('input', onInput);
    api.host.addEventListener('keydown', onKeydown);
    api.host.addEventListener('focusout', onFocusout);
    api.host.addEventListener('mousedown', onMousedown);
    api.host.addEventListener('click', onClick);
    // Flip the list above the input near the viewport bottom.
    const untrackSide = trackOpenSide(machine, () => input() as HTMLInputElement, () => listbox() as HTMLElement);

    return () => {
      untrackSide();
      api.host.removeEventListener('input', onInput);
      api.host.removeEventListener('keydown', onKeydown);
      api.host.removeEventListener('focusout', onFocusout);
      api.host.removeEventListener('mousedown', onMousedown);
      api.host.removeEventListener('click', onClick);
      unsubscribe();
      machines.delete(api.host);
      machine.destroy();
    };
  },
  inputsChanged: (api, prev) => {
    const machine = machines.get(api.host);
    if (!machine) return;
    const inputs = api.inputs();
    configure(machine, inputs);
    // A consumer's write is a programmatic set: no query. Only a CHANGED value is one: a front
    // re-rendering with its stale controlled value (React, before the parent's state commits)
    // must not revert a pick. An echo of the machine's own term is a no-op too.
    const value = inputs.value ?? '';
    if (value !== (prev.value ?? '') && value !== machine.snapshot.term) machine.setValue(value);
  },
  methods: {
    focus: (api) => api.host.querySelector<HTMLInputElement>(INPUT)?.focus(),
  },
});

/** Each source's Promise-only adapter, so a re-configure keeps the same provider function. */
const adapted = new WeakMap<TypeaheadSource<TypeaheadItem>, TypeaheadProvider<TypeaheadItem>>();

/** Promise or observable-like in, Promise out; an observable is unsubscribed when the request aborts. */
function toProvider(source: TypeaheadSource<TypeaheadItem>): TypeaheadProvider<TypeaheadItem> {
  const known = adapted.get(source);
  if (known) return known;
  const provider: TypeaheadProvider<TypeaheadItem> = (term, request) => {
    const result = source(term, request);
    if (typeof (result as Promise<unknown>).then === 'function') return result as Promise<readonly TypeaheadItem[]>;
    const observable = result as TypeaheadSubscribable<readonly TypeaheadItem[]>;
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = () => {
        done = true;
        request.signal.removeEventListener('abort', onAbort);
      };
      const onAbort = () => {
        finish();
        subscription.unsubscribe();
        reject(abortError());
      };
      const subscription = observable.subscribe({
        next: (items) => {
          if (done) return;
          finish();
          resolve(items);
          queueMicrotask(() => subscription.unsubscribe());
        },
        error: (error) => {
          if (done) return;
          finish();
          reject(error);
        },
        complete: () => {
          if (done) return;
          finish();
          resolve([]);
        },
      });
      if (!done) request.signal.addEventListener('abort', onAbort, { once: true });
    });
  };
  adapted.set(source, provider);
  return provider;
}

function configure(machine: TypeaheadMachine<TypeaheadItem>, inputs: Readonly<TypeaheadInputs>): void {
  machine.provider = inputs.provider && toProvider(inputs.provider);
  machine.debounceMs = inputs.debounceMs;
  machine.minLength = inputs.minLength;
  machine.itemText = inputs.itemText ?? undefined;
  machine.itemKey = inputs.itemKey ?? undefined;
  machine.setDisabled(inputs.disabled);
  machine.setErrorText(inputs.errorText);
  machine.setLabels({
    loading: inputs.loadingLabel ?? DEFAULT_TYPEAHEAD_LABELS.loading,
    noResults: inputs.noResultsLabel ?? DEFAULT_TYPEAHEAD_LABELS.noResults,
    results: inputs.resultsLabel ?? DEFAULT_TYPEAHEAD_LABELS.results,
  });
}
