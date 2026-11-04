import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/**
 * A loading region with Bootstrap's placeholder skeleton (#458 M5).
 *
 *   <div class="placeholder-region [placeholder-glow]" [aria-busy=true]>
 *     …content: elements marked data-placeholder-field render as skeleton bars while loading…
 *     <span class="visually-hidden" role=status>[Loading complete]</span>
 *   </div>
 *
 * A field is any element of the content carrying `data-placeholder-field`: a
 * plain attribute every front can write (it replaces the Angular-only
 * `bsPlaceholderField` directive). The scoped sheet paints marked fields as
 * skeleton bars while the region loads, anchored on the region, so the
 * component never writes into the consumer's DOM.
 *
 * `aria-busy` is the semantic channel while loading; when loading ends the
 * status region (always present, never inserted with its text) says
 * `loadedText` once and clears itself. Never a subtree-wide `aria-live`, which
 * would announce every skeleton mutation. No-JS tier 2: the region renders in
 * whatever state the server gave it.
 */
export interface PlaceholderInputs {
  /** Paint the marked fields as skeleton bars and mark the region busy. */
  loading: boolean;
  /** Said once when loading ends. Override for localisation. */
  loadedText: string;
}

export interface PlaceholderView {
  readonly root: CoreBag;
  readonly status: CoreBag;
  readonly message: string;
}

/** The attribute a consumer puts on each element that becomes a skeleton bar while loading. */
export const PLACEHOLDER_FIELD_ATTR = 'data-placeholder-field';

/** How long the status message stays before it clears, so a later one is spoken again. */
export const PLACEHOLDER_CLEAR_MS = 1500;

export function connectPlaceholder({ loading }: PlaceholderInputs, message: string): PlaceholderView {
  return {
    root: { class: loading ? 'placeholder-region placeholder-glow' : 'placeholder-region', 'aria-busy': loading ? 'true' : null },
    status: { class: 'visually-hidden', role: 'status' },
    message,
  };
}

const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

function clearTimer(host: HTMLElement): void {
  clearTimeout(timers.get(host));
  timers.delete(host);
}

export const placeholderCore = defineCore<PlaceholderInputs, { message: string }, { view: PlaceholderView }>({
  state: () => ({ message: '' }),
  view: ({ inputs, state }) => ({ view: connectPlaceholder(inputs, state.message) }),
  attach: (api) => () => clearTimer(api.host),
  inputsChanged: (api, prev) => {
    const loading = !!api.inputs().loading;
    if (loading || !prev.loading) return;
    api.setState({ message: api.inputs().loadedText });
    clearTimer(api.host);
    timers.set(
      api.host,
      setTimeout(() => {
        timers.delete(api.host);
        api.setState({ message: '' });
      }, PLACEHOLDER_CLEAR_MS),
    );
  },
});
