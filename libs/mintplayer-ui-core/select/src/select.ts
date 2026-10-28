import { errorFeedback } from '@mintplayer/ui-core/forms';

/**
 * The select (PRD #437 wave B): a native `<select class="form-select">`, so it
 * opens, picks, submits and announces with JavaScript off. The options come
 * from the `options` input, or are the consumer's own `<option>` / `<optgroup>`
 * children, rendered inside the select in every front.
 *
 * Selection on the server is the `selected` attribute on each rendered option
 * (React seeds it from the select's `defaultValue` instead). Once attached, the
 * core keeps the live selection in step with the inputs, including options a
 * front adds or relabels later.
 *
 * Rich options: where the engine supports customizable select
 * (`appearance: base-select`), a consumer's `option` slot renders each option's
 * content and the closed face mirrors it through `<selectedcontent>`. Everywhere
 * else, and with JavaScript off, the option is its text label.
 */

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectOptgroup {
  label: string;
  disabled?: boolean;
  options: SelectOption[];
}

/** One entry of the list: a plain option, or a labelled group of them. */
export type SelectItem = SelectOption | SelectOptgroup;

export interface SelectChangeEventDetail {
  value: string | null;
  values: string[];
}

export const SELECT_SCOPE = 'select';

const SIZES: ReadonlySet<string> = new Set(['sm', 'md', 'lg']);
const ROOT: SelectBag = { 'data-mps': SELECT_SCOPE, class: 'mp-select' };

export function isOptgroup(item: SelectItem): item is SelectOptgroup {
  return Array.isArray((item as SelectOptgroup).options);
}

export type SelectBag = Record<string, string | number | boolean | null>;

export interface SelectOptionView {
  readonly key: string;
  readonly option: SelectOption;
  readonly bag: SelectBag;
}

export interface SelectItemView {
  readonly key: string;
  /** Set for an `<optgroup>`; its options are in `options`. */
  readonly group: SelectBag | null;
  readonly options: readonly SelectOptionView[];
}

export interface SelectView {
  /** The wrapper: the front's host in Angular and Lit. */
  readonly root: SelectBag;
  readonly select: SelectBag;
  /** What React seeds as `defaultValue`; the other fronts select through `selected`. */
  readonly value: string | string[] | undefined;
  /** `null` in slotted mode: the consumer's children are the options. */
  readonly items: readonly SelectItemView[] | null;
  /** Render `<button><selectedcontent>` and the `option` slot (customizable select). */
  readonly rich: boolean;
  /** Whether the validation message renders. */
  readonly showFeedback: boolean;
  readonly feedback: { readonly attrs: SelectBag; readonly text: string };
}

export interface SelectOptions {
  readonly id: string;
  readonly size: SelectSize;
  readonly multiple: boolean;
  readonly numberVisible: number | null;
  readonly disabled: boolean;
  readonly required: boolean;
  readonly invalid: boolean;
  readonly name: string | null;
  readonly label: string | null;
  readonly errorText: string | null;
  readonly value: string | null;
  readonly values: readonly string[];
  readonly items: readonly SelectItem[] | null;
  /** The front has an `option` slot and the engine supports customizable select. */
  readonly rich: boolean;
}

/** Whether the engine renders `appearance: base-select` (false on the server). */
export function supportsBaseSelect(): boolean {
  try {
    return typeof CSS !== 'undefined' && CSS.supports('appearance', 'base-select');
  } catch {
    return false;
  }
}

export function connectSelect(options: SelectOptions): SelectView {
  const size = SIZES.has(options.size) ? options.size : 'md';
  const error = errorFeedback(`${options.id}-error`, options.errorText, options.invalid);
  // base-select does not apply to a listbox (multiple, or size > 1).
  const rich = options.rich && !!options.items && !options.multiple && options.numberVisible == null;
  const isSelected = (value: string) => (options.multiple ? options.values.includes(value) : options.value === value);
  const optionView = (option: SelectOption, key: string): SelectOptionView => ({
    key,
    option,
    bag: { value: option.value, disabled: !!option.disabled, selected: isSelected(option.value) },
  });
  return {
    root: ROOT,
    select: {
      'data-mps': SELECT_SCOPE,
      class: size === 'md' ? 'form-select' : `form-select form-select-${size}`,
      id: options.id,
      name: options.name,
      multiple: options.multiple,
      size: options.numberVisible,
      disabled: options.disabled,
      required: options.required,
      'aria-label': options.label,
      'aria-invalid': options.invalid ? 'true' : null,
      'aria-required': options.required ? 'true' : null,
      'aria-errormessage': error.control['aria-errormessage'],
      'aria-describedby': error.control['aria-describedby'],
    },
    value: options.multiple ? [...options.values] : (options.value ?? undefined),
    items:
      options.items?.map((item, i) =>
        isOptgroup(item)
          ? {
              key: `g${i}:${item.label}`,
              group: { label: item.label, disabled: !!item.disabled },
              options: item.options.map((o) => optionView(o, o.value)),
            }
          : { key: `o:${item.value}`, group: null, options: [optionView(item, item.value)] },
      ) ?? null,
    rich,
    showFeedback: !!error.message,
    // Stamped like every node a front renders (a light host tells its own nodes from a consumer's by it).
    feedback: error.message ? { attrs: { ...error.message.attrs, 'data-mps': SELECT_SCOPE }, text: error.message.text } : { attrs: {}, text: '' },
  };
}

/**
 * Make the live selection match `value` / `values`. Rendered options carry the
 * `selected` attribute, which stops applying once the user (or a re-render)
 * changes the selection, and a consumer's options can get their values after
 * the first render (Angular's `[ngValue]`).
 */
export function syncSelection(select: HTMLSelectElement, multiple: boolean, value: string | null, values: readonly string[]): void {
  if (multiple) {
    [...select.options].map((option) => (option.selected = values.includes(option.value)));
    return;
  }
  if (value == null) {
    // Nothing chosen: an empty-valued placeholder if there is one, else no selection.
    const placeholder = [...select.options].find((option) => option.value === '');
    select.selectedIndex = placeholder ? placeholder.index : -1;
    return;
  }
  select.value = value;
}

/** What the select holds now, read after a user change. */
export function readSelection(select: HTMLSelectElement): SelectChangeEventDetail {
  if (select.multiple) {
    const values = [...select.selectedOptions].map((option) => option.value);
    return { value: values[0] ?? null, values };
  }
  const value = select.value || null;
  return { value, values: value == null ? [] : [value] };
}

export function isSelectSize(value: unknown): value is SelectSize {
  return typeof value === 'string' && SIZES.has(value);
}
