import * as React from 'react';
import { useEffect, useId, useRef } from 'react';
import { installLightStyles } from '@mintplayer/ui-core/scoped-styles';
import {
  connect,
  TYPEAHEAD_SCOPE,
  TypeaheadLabels,
  TypeaheadMachine,
  TypeaheadProvider,
  typeaheadScopedStyles,
} from '@mintplayer/ui-core/typeahead';
import { useMachine } from '../../machine/src/useMachine';
import { reactProps } from '../../machine/src/react-props';

type InputAttributes = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'onSelect' | 'onSubmit' | 'children' | 'role' | 'type'
>;

export interface BsTypeaheadProps<T> extends InputAttributes {
  /** Supplies suggestions for a settled term; a newer term aborts the previous request through `request.signal`. */
  provider?: TypeaheadProvider<T> | null;
  /** Quiet time after the last keystroke, ms (default 200). 0 requests synchronously. */
  debounceMs?: number;
  /** A trimmed term shorter than this closes the list without querying (default 1). */
  minLength?: number;
  /** The text a pick writes into the input. Default: `item.text`, else `String(item)`. */
  itemText?: (item: T) => string;
  /** Row identity for React keys. Default: `itemText`. */
  itemKey?: (item: T) => React.Key;
  /** Renders one suggestion row; receives the current term for highlighting. Default: the item text. */
  renderItem?: (item: T, term: string) => React.ReactNode;
  /** Controlled term. Pair with `onValueChange`. */
  value?: string;
  /** Uncontrolled initial term. */
  defaultValue?: string;
  /** The term changed by typing or by a pick. */
  onValueChange?: (value: string) => void;
  /** A suggestion was picked; `value` is the text written into the input. */
  onSelect?: (item: T, value: string) => void;
  /** Enter with no suggestion highlighted. */
  onSubmit?: (value: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onLoadError?: (error: unknown) => void;
  /** Accessible name of the input. An `aria-label` / `aria-labelledby` prop wins. */
  inputLabel?: string;
  loadingLabel?: string;
  noResultsLabel?: string;
  resultsLabel?: (count: number) => string;
  /** A persistent validation message, wired to the input with aria-errormessage. */
  errorText?: string | null;
}

/**
 * Typeahead: a text input with asynchronous suggestions and free text.
 *
 * A front of the headless `TypeaheadMachine` (`@mintplayer/ui-core/typeahead`,
 * #436): React renders its own JSX from the machine's snapshot and spreads the
 * core's ARIA bags, so it behaves and reads exactly like the Angular, Vue and
 * web-component typeaheads. Consumer props land on the role-bearing `<input>`;
 * `role` is not accepted, the input is a `combobox` by contract.
 */
export function BsTypeahead<T = unknown>(props: BsTypeaheadProps<T>): React.ReactElement {
  const {
    provider,
    debounceMs,
    minLength,
    itemText,
    itemKey,
    renderItem,
    value,
    defaultValue,
    onValueChange,
    onSelect,
    onSubmit,
    onOpen,
    onClose,
    onLoadError,
    inputLabel,
    loadingLabel,
    noResultsLabel,
    resultsLabel,
    errorText,
    disabled,
    name,
    onKeyDown,
    onBlur,
    ...rest
  } = props;

  // Latest callbacks without re-creating the machine: the machine calls through this ref.
  const callbacks = useRef({ onValueChange, onSelect, onSubmit, onOpen, onClose, onLoadError });
  callbacks.current = { onValueChange, onSelect, onSubmit, onOpen, onClose, onLoadError };

  const reactId = useId();
  const id = `bs-typeahead-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [machine, state] = useMachine(
    () =>
      new TypeaheadMachine<T>({
        id,
        value: value ?? defaultValue ?? '',
        onChange: (term) => callbacks.current.onValueChange?.(term),
        onSelect: (item, term) => callbacks.current.onSelect?.(item, term),
        onSubmit: (term) => callbacks.current.onSubmit?.(term),
        onOpen: () => callbacks.current.onOpen?.(),
        onClose: () => callbacks.current.onClose?.(),
        onError: (error) => callbacks.current.onLoadError?.(error),
      }),
  );

  installLightStyles(TYPEAHEAD_SCOPE, typeaheadScopedStyles);

  // Props → machine. The machine's setters are idempotent on equal values, so
  // React re-running these with unchanged props costs nothing and never restarts a request.
  useEffect(() => {
    machine.provider = provider ?? null;
  }, [machine, provider]);
  useEffect(() => {
    machine.debounceMs = debounceMs;
  }, [machine, debounceMs]);
  useEffect(() => {
    machine.minLength = minLength;
  }, [machine, minLength]);
  useEffect(() => {
    machine.itemText = itemText;
    machine.itemKey = itemKey;
  }, [machine, itemText, itemKey]);
  useEffect(() => machine.setDisabled(!!disabled), [machine, disabled]);
  useEffect(() => machine.setErrorText(errorText), [machine, errorText]);
  useEffect(() => {
    const labels: Partial<TypeaheadLabels> = { input: inputLabel ?? null };
    if (loadingLabel !== undefined) labels.loading = loadingLabel;
    if (noResultsLabel !== undefined) labels.noResults = noResultsLabel;
    if (resultsLabel !== undefined) labels.results = resultsLabel;
    machine.setLabels(labels);
  }, [machine, inputLabel, loadingLabel, noResultsLabel, resultsLabel]);
  // Controlled value written by the consumer (not an echo of our own onValueChange): no query.
  useEffect(() => {
    if (value !== undefined && value !== machine.snapshot.term) machine.setValue(value);
  }, [machine, value]);

  const api = connect(state, id, { name: name ?? null });
  const { value: termValue, ...inputBag } = reactProps(api.input);

  return (
    <div className="mp-typeahead" {...reactProps(api.root)}>
      <input
        className="form-control"
        type="text"
        {...inputBag}
        {...rest}
        role="combobox"
        value={String(termValue ?? '')}
        onChange={(event) => machine.setTerm(event.target.value)}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented) return;
          if (machine.keydown(event.key, event)) event.preventDefault();
        }}
        onBlur={(event) => {
          onBlur?.(event);
          machine.blur();
        }}
      />
      <ul className="dropdown-menu" {...reactProps(api.listbox)}>
        {api.status && (
          <li className="ta-status" {...reactProps(api.status.attrs)}>
            {api.status.text}
          </li>
        )}
        {state.items.map((item, index) => (
          <li
            key={(itemKey ? itemKey(item) : machine.itemTextOf(item)) || index}
            className="dropdown-item"
            {...reactProps(api.option(index))}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => machine.pick(index)}
          >
            {renderItem ? renderItem(item, state.term) : machine.itemTextOf(item)}
          </li>
        ))}
      </ul>
      <span className="visually-hidden" {...reactProps(api.live.attrs)}>
        {api.live.text}
      </span>
      {api.error && (
        <div className="ta-error" {...reactProps(api.error.attrs)}>
          {api.error.text}
        </div>
      )}
    </div>
  );
}
