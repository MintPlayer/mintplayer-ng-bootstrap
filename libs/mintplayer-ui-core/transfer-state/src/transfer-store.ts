import type { JsonValue } from './canonical';

/**
 * Values a server render hands the client it hydrates (#448). Angular uses its
 * own `TransferState`; React and Vue, which have no channel of their own, use
 * this store: the server fills it while rendering and the app's entry writes
 * `serializeTransferState(store)` into the page head, the client reads it back
 * with `readTransferState()` once at startup.
 */
export interface TransferStore {
  get(key: string): JsonValue | undefined;
  set(key: string, value: JsonValue): void;
  remove(key: string): void;
  toJson(): string;
}

export function createTransferStore(initial: Readonly<Record<string, JsonValue>> = {}): TransferStore {
  const values = new Map<string, JsonValue>(Object.entries(initial));
  return {
    get: (key) => values.get(key),
    set: (key, value) => void values.set(key, value),
    remove: (key) => void values.delete(key),
    toJson: () => JSON.stringify(Object.fromEntries(values)),
  };
}

/** The script element id the store is written under. */
export const TRANSFER_STATE_ID = 'mp-state';

/**
 * JSON that is safe inside an HTML `<script>`: `<` (so neither `</script>` nor
 * `<!--` can end or change the element), `>`, `&` and the two line separators
 * JavaScript once treated as newlines are escaped. The same escapes Angular's
 * `TransferState.toJson` applies.
 */
export function escapeScriptJson(json: string): string {
  return json
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** The `<script>` element to put in the page head of a server render. */
export function serializeTransferState(store: TransferStore, id = TRANSFER_STATE_ID): string {
  return `<script id="${id}" type="application/json">${escapeScriptJson(store.toJson())}</script>`;
}

/** The store a server render wrote, or an empty one (a client-only render, or nothing transferred). */
export function readTransferState(doc: Pick<Document, 'getElementById'> | null | undefined = typeof document === 'undefined' ? null : document, id = TRANSFER_STATE_ID): TransferStore {
  const text = doc?.getElementById(id)?.textContent;
  if (!text) return createTransferStore();
  try {
    const parsed = JSON.parse(text) as unknown;
    return createTransferStore(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, JsonValue>) : {});
  } catch {
    return createTransferStore();
  }
}
