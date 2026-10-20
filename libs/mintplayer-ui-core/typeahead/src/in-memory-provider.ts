import { abortError } from '@mintplayer/ui-core/async';
import { defaultItemText, TypeaheadProvider } from './types';

export interface InMemoryTypeaheadOptions<T> {
  /** Default: case-insensitive substring match on `itemText(item)`. */
  filter?: (item: T, term: string) => boolean;
  itemText?: (item: T) => string;
  limit?: number;
}

/**
 * A provider over a static list, for consumers who have their suggestions in
 * memory. Honours the abort signal like a network provider would, so the
 * machine's lifecycle is exercised identically.
 */
export function inMemoryTypeaheadProvider<T>(items: readonly T[], options: InMemoryTypeaheadOptions<T> = {}): TypeaheadProvider<T> {
  const text = options.itemText ?? defaultItemText;
  const filter = options.filter ?? ((item: T, term: string) => text(item).toLowerCase().includes(term.toLowerCase()));
  return async (term, request) => {
    if (request.signal.aborted) throw abortError();
    const matches = items.filter((item) => filter(item, term));
    return options.limit === undefined ? matches : matches.slice(0, options.limit);
  };
}
