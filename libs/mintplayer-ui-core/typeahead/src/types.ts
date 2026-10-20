import type { AbortableRequest } from '@mintplayer/ui-core/async';

/** The request a provider receives. `signal` aborts when a newer term supersedes this one or the machine is destroyed. */
export type TypeaheadRequest = AbortableRequest;

/**
 * Supplies the suggestions for a settled term. The same shape as
 * `TreeSelectProvider.search` and the datatable distincts provider: pass
 * `request.signal` to `fetch`, or throw an `AbortError` when it fires.
 */
export type TypeaheadProvider<T> = (term: string, request: TypeaheadRequest) => Promise<readonly T[]>;

/** Localized strings. Interpolated strings are formatter functions, never prefix/suffix pairs. */
export interface TypeaheadLabels {
  /** Accessible name of the input. `null` when the front names it another way (`aria-labelledby`). */
  input: string | null;
  loading: string;
  noResults: string;
  /** Spoken once per settled request. */
  results: (count: number) => string;
}

export const DEFAULT_TYPEAHEAD_LABELS: TypeaheadLabels = {
  input: null,
  loading: 'Loading…',
  noResults: 'No suggestions found',
  results: (count) => (count === 1 ? '1 result found' : `${count} results found`),
};

export type TypeaheadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface TypeaheadState<T> {
  /** The text in the input. The form value. */
  term: string;
  items: readonly T[];
  status: TypeaheadStatus;
  open: boolean;
  /** Index into `items` of the highlighted option, or -1. */
  activeIndex: number;
  /** The last picked item; `null` once the text changes after the pick. */
  selectedItem: T | null;
  /** Live-region text; cleared by the machine shortly after it is set. */
  announcement: string;
  disabled: boolean;
  errorText: string | null;
  labels: TypeaheadLabels;
}

export interface TypeaheadCallbacks<T> {
  /** The term changed by typing or by a pick. Not for `setValue`. */
  onChange?(term: string): void;
  onSelect?(item: T, term: string): void;
  /** Enter with the list closed (or no active option). */
  onSubmit?(term: string): void;
  onOpen?(): void;
  onClose?(): void;
  /** A provider call started for this term (after debounce and the min-length gate). */
  onSearch?(term: string): void;
  /** The provider rejected with something other than an abort. */
  onError?(error: unknown): void;
}

export interface TypeaheadOptions<T> extends TypeaheadCallbacks<T> {
  /** Root id; listbox, option and error ids derive from it, so SSR and client agree. */
  id: string;
  provider?: TypeaheadProvider<T> | null;
  /** Quiet time after the last keystroke before the provider runs. 0 runs synchronously. */
  debounceMs?: number;
  /** A trimmed term shorter than this closes the list without querying. */
  minLength?: number;
  /** The text a pick writes into the input. Default: `item.text`, else `String(item)`. */
  itemText?: (item: T) => string;
  /** Row identity for keyed rendering. Default: `itemText`. */
  itemKey?: (item: T) => unknown;
  labels?: Partial<TypeaheadLabels>;
  value?: string;
  disabled?: boolean;
  errorText?: string | null;
  /** How long an announcement stays in the live region before the machine clears it. */
  announcementClearMs?: number;
}

export const TYPEAHEAD_DEFAULTS = {
  debounceMs: 200,
  minLength: 1,
  announcementClearMs: 1500,
} as const;

export function defaultItemText(item: unknown): string {
  if (typeof item === 'object' && item !== null && 'text' in item) {
    return String((item as { text: unknown }).text ?? '');
  }
  return item === null || item === undefined ? '' : String(item);
}

/** Keyboard modifiers a front forwards with `keydown`. */
export interface KeyModifiers {
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}
