import type { TypeaheadState } from './types';

/** An attribute bag. `null` means "attribute absent"; `true` means present and empty. */
export type AttrBag = Record<string, string | boolean | null>;

export const TYPEAHEAD_SCOPE = 'typeahead';

export interface TypeaheadApi {
  /** The wrapper element. */
  root: AttrBag;
  /** The role-bearing `<input>`. `value` is also here so the server HTML carries it; fronts bind the property too. */
  input: AttrBag;
  /** The `<ul>`; present in the DOM even when closed (hidden), so `aria-controls` always resolves. */
  listbox: AttrBag;
  /** The loading / no-results row, or `null` when there is nothing to say. */
  status: { attrs: AttrBag; text: string } | null;
  option(index: number): AttrBag;
  /** The polite live region and what it currently says. */
  live: { attrs: AttrBag; text: string };
  /** The persistent validation message node, or `null`. */
  error: { attrs: AttrBag; text: string } | null;
}

export function typeaheadIds(id: string) {
  return {
    listbox: `${id}-listbox`,
    option: (index: number) => `${id}-opt-${index}`,
    error: `${id}-error`,
  };
}

/**
 * The ARIA and state attributes every front applies, derived from one snapshot.
 * Pure: same snapshot in, same bags out. This is the single place ARIA is
 * written, which is what keeps the four fronts identical (spike S3).
 */
export function connect<T>(state: TypeaheadState<T>, id: string, extra: { name?: string | null } = {}): TypeaheadApi {
  const ids = typeaheadIds(id);
  const scope = { 'data-mps': TYPEAHEAD_SCOPE };
  const activeId = state.open && state.activeIndex >= 0 ? ids.option(state.activeIndex) : null;
  const hasError = !!state.errorText;
  const statusText = state.status === 'loading' ? state.labels.loading : state.status === 'ready' && state.items.length === 0 ? state.labels.noResults : null;

  return {
    // Classes stay the front's business (Angular/Vue/React each manage `class`); the bag carries only the scope.
    root: { ...scope },
    input: {
      ...scope,
      role: 'combobox',
      'aria-autocomplete': 'list',
      'aria-haspopup': 'listbox',
      'aria-expanded': String(state.open),
      'aria-controls': ids.listbox,
      'aria-activedescendant': activeId,
      'aria-label': state.labels.input,
      'aria-describedby': hasError ? ids.error : null,
      'aria-errormessage': hasError ? ids.error : null,
      'aria-invalid': hasError ? 'true' : null,
      autocomplete: 'off',
      disabled: state.disabled,
      name: extra.name ?? null,
      value: state.term,
    },
    listbox: {
      ...scope,
      id: ids.listbox,
      role: 'listbox',
      'aria-busy': state.status === 'loading' ? 'true' : null,
      'data-side': state.side,
      hidden: !state.open,
    },
    status: statusText === null ? null : { attrs: { ...scope, role: 'presentation' }, text: statusText },
    option: (index) => ({
      ...scope,
      id: ids.option(index),
      role: 'option',
      'aria-selected': String(index === state.activeIndex),
      'data-active': index === state.activeIndex ? true : null,
    }),
    live: { attrs: { ...scope, role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, text: state.announcement },
    error: hasError ? { attrs: { ...scope, id: ids.error }, text: state.errorText as string } : null,
  };
}
