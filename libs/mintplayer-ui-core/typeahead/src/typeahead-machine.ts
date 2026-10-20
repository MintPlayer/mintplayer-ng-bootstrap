import { SupersedingRequest } from '@mintplayer/ui-core/async';
import type { OpenSide } from '@mintplayer/ui-core/overlay';
import { Machine } from '@mintplayer/ui-core/store';
import {
  DEFAULT_TYPEAHEAD_LABELS,
  defaultItemText,
  KeyModifiers,
  TYPEAHEAD_DEFAULTS,
  TypeaheadLabels,
  TypeaheadOptions,
  TypeaheadProvider,
  TypeaheadState,
} from './types';

/**
 * The typeahead core: a text input with asynchronous suggestions and free
 * text. Owns the term, the request lifecycle (debounce, abort on supersede,
 * stale-drop), the open/active state, the keyboard contract and the
 * announcements. Fronts render `connect(snapshot)` and forward events to the
 * commands below; they never decide ARIA or keyboard behaviour themselves.
 *
 * Headless and DOM-free. Timers are the only platform dependency.
 */
export class TypeaheadMachine<T = unknown> extends Machine<TypeaheadState<T>> {
  readonly id: string;
  #provider: TypeaheadProvider<T> | null;
  #minLength: number;
  #itemText: (item: T) => string;
  #itemKey: (item: T) => unknown;
  #runner: SupersedingRequest;
  #callbacks: TypeaheadOptions<T>;
  #announcementClearMs: number;
  #announcementTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: TypeaheadOptions<T>) {
    super({
      term: options.value ?? '',
      items: [],
      status: 'idle',
      open: false,
      side: 'below',
      activeIndex: -1,
      selectedItem: null,
      announcement: '',
      disabled: options.disabled ?? false,
      errorText: options.errorText ?? null,
      labels: { ...DEFAULT_TYPEAHEAD_LABELS, ...options.labels },
    });
    this.id = options.id;
    this.#callbacks = options;
    this.#provider = options.provider ?? null;
    this.#minLength = clampInt(options.minLength, TYPEAHEAD_DEFAULTS.minLength);
    this.#itemText = options.itemText ?? defaultItemText;
    this.#itemKey = options.itemKey ?? this.#itemText;
    this.#announcementClearMs = clampInt(options.announcementClearMs, TYPEAHEAD_DEFAULTS.announcementClearMs);
    this.#runner = this.#createRunner(clampInt(options.debounceMs, TYPEAHEAD_DEFAULTS.debounceMs));
  }

  // ---- configuration a front pushes when its inputs change -------------------

  get provider(): TypeaheadProvider<T> | null {
    return this.#provider;
  }
  set provider(value: TypeaheadProvider<T> | null | undefined) {
    const next = value ?? null;
    // Idempotent on reference: React re-assigns every prop on every render.
    if (next === this.#provider) return;
    this.#provider = next;
    this.#runner.cancel();
    this.update({ items: [], status: 'idle', open: false, activeIndex: -1 });
  }

  get debounceMs(): number {
    return this.#runner.debounceMs;
  }
  set debounceMs(value: number | undefined) {
    const next = clampInt(value, TYPEAHEAD_DEFAULTS.debounceMs);
    if (next === this.#runner.debounceMs) return;
    this.#runner.dispose();
    this.#runner = this.#createRunner(next);
  }

  get minLength(): number {
    return this.#minLength;
  }
  set minLength(value: number | undefined) {
    this.#minLength = clampInt(value, TYPEAHEAD_DEFAULTS.minLength);
  }

  set itemText(fn: ((item: T) => string) | undefined) {
    this.#itemText = fn ?? defaultItemText;
  }
  set itemKey(fn: ((item: T) => unknown) | undefined) {
    this.#itemKey = fn ?? this.#itemText;
  }

  /** Replace the callbacks (a front re-binds when its outputs change). */
  set callbacks(value: TypeaheadOptions<T>) {
    this.#callbacks = { ...this.#callbacks, ...value };
  }

  setLabels(labels: Partial<TypeaheadLabels>): void {
    this.update((s) => ({ labels: { ...s.labels, ...labels } }));
  }

  setDisabled(disabled: boolean): void {
    if (disabled === this.snapshot.disabled) return;
    this.batch(() => {
      this.update({ disabled });
      if (disabled) this.close();
      if (disabled) this.#runner.cancel();
    });
  }

  setErrorText(errorText: string | null | undefined): void {
    this.update({ errorText: errorText ?? null });
  }

  // ---- derived helpers for fronts -------------------------------------------

  itemTextOf(item: T): string {
    return this.#itemText(item);
  }
  itemKeyOf(item: T): unknown {
    return this.#itemKey(item);
  }

  // ---- commands ---------------------------------------------------------------

  /** The user typed. Clears the pick, notifies `onChange`, and queries (debounced). */
  setTerm(term: string): void {
    if (this.snapshot.disabled) return;
    const changed = term !== this.snapshot.term;
    this.batch(() => {
      this.update({ term, selectedItem: changed ? null : this.snapshot.selectedItem });
      if (changed) this.#callbacks.onChange?.(term);
      this.#search(term);
    });
  }

  /** The form (or a consumer) wrote the value. No query, no `onChange`; the pick is cleared when the text differs. */
  setValue(term: string | null | undefined): void {
    const next = term ?? '';
    if (next === this.snapshot.term) return;
    this.batch(() => {
      this.#runner.cancel();
      this.update({ term: next, selectedItem: null, items: [], status: 'idle', open: false, activeIndex: -1 });
    });
  }

  /** Open the list: with items it just shows them; without, it queries the current term. */
  open(): void {
    const s = this.snapshot;
    if (s.disabled || s.open) return;
    if (s.items.length > 0) {
      this.#setOpen(true);
      return;
    }
    this.#search(s.term);
  }

  close(): void {
    if (!this.snapshot.open) return;
    this.batch(() => {
      this.update({ open: false, activeIndex: -1 });
      this.#callbacks.onClose?.();
    });
  }

  /** The side the front measured for the open list. A no-op while closed, so a late measurement cannot reopen anything. */
  place(side: OpenSide): void {
    if (this.snapshot.open && this.snapshot.side !== side) this.update({ side });
  }

  /** Focus left the input: close, keep the term and the pick. */
  blur(): void {
    this.close();
  }

  moveActive(delta: number | 'first' | 'last'): void {
    const s = this.snapshot;
    if (!s.open || s.items.length === 0) return;
    const last = s.items.length - 1;
    const next =
      delta === 'first' ? 0 : delta === 'last' ? last : Math.min(last, Math.max(0, (s.activeIndex < 0 ? (delta > 0 ? -1 : s.items.length) : s.activeIndex) + delta));
    this.update({ activeIndex: next });
  }

  /** Pick an option: its text becomes the term, the list closes, `onSelect` fires. */
  pick(index: number): void {
    const s = this.snapshot;
    const item = s.items[index];
    if (item === undefined || s.disabled) return;
    const text = this.#itemText(item);
    this.batch(() => {
      this.#runner.cancel();
      this.update({ term: text, selectedItem: item, open: false, activeIndex: -1, status: 'ready' });
      if (text !== s.term) this.#callbacks.onChange?.(text);
      this.#callbacks.onSelect?.(item, text);
      if (s.open) this.#callbacks.onClose?.();
    });
  }

  /** Enter with nothing to pick. */
  submit(): void {
    this.batch(() => {
      this.close();
      this.#callbacks.onSubmit?.(this.snapshot.term);
    });
  }

  /**
   * The keyboard contract (WAI-ARIA combobox, list autocomplete). Returns true
   * when the key was consumed, so the front calls `preventDefault()`.
   */
  keydown(key: string, modifiers: KeyModifiers = {}): boolean {
    const s = this.snapshot;
    if (s.disabled) return false;
    if (modifiers.altKey || modifiers.ctrlKey || modifiers.metaKey) return false;
    switch (key) {
      case 'ArrowDown':
        if (s.open) this.moveActive(1);
        else this.open();
        return true;
      case 'ArrowUp':
        if (s.open) this.moveActive(-1);
        else this.open();
        return true;
      case 'Home':
      case 'End':
        if (!s.open) return false;
        this.moveActive(key === 'Home' ? 'first' : 'last');
        return true;
      case 'Enter':
        if (s.open && s.activeIndex >= 0) this.pick(s.activeIndex);
        else this.submit();
        return true;
      case 'Escape':
        if (!s.open) return false;
        this.close();
        return true;
      case 'Tab':
        this.close();
        return false;
      default:
        return false;
    }
  }

  override destroy(): void {
    this.#runner.dispose();
    this.#clearAnnouncementTimer();
    super.destroy();
  }

  // ---- internals ----------------------------------------------------------------

  #createRunner(debounceMs: number): SupersedingRequest {
    return new SupersedingRequest({ debounceMs, onError: (error) => this.#callbacks.onError?.(error) });
  }

  #setOpen(open: boolean): void {
    if (open === this.snapshot.open) return;
    this.batch(() => {
      this.update({ open, activeIndex: -1 });
      if (open) this.#callbacks.onOpen?.();
      else this.#callbacks.onClose?.();
    });
  }

  #search(term: string): void {
    const trimmed = term.trim();
    const provider = this.#provider;
    if (!provider || trimmed.length < this.#minLength) {
      this.#runner.cancel();
      this.batch(() => {
        this.update({ items: [], status: 'idle' });
        this.#setOpen(false);
      });
      return;
    }
    this.batch(() => {
      this.update({ status: 'loading', activeIndex: -1 });
      this.#setOpen(true);
    });
    void this.#runner
      .run((request) => {
        this.#callbacks.onSearch?.(trimmed);
        return provider(trimmed, request);
      })
      .then((result) => {
        if (result.aborted || this.destroyed) return;
        if (result.value === null) {
          this.update({ items: [], status: 'error', activeIndex: -1 });
          return;
        }
        const items = [...result.value];
        this.batch(() => {
          this.update({ items, status: 'ready', activeIndex: -1 });
          this.#announce(this.snapshot.labels.results(items.length));
        });
      });
  }

  #announce(text: string): void {
    this.#clearAnnouncementTimer();
    this.update({ announcement: text });
    this.#announcementTimer = setTimeout(() => {
      this.#announcementTimer = null;
      if (this.snapshot.announcement === text) this.update({ announcement: '' });
    }, this.#announcementClearMs);
  }

  #clearAnnouncementTimer(): void {
    if (this.#announcementTimer !== null) {
      clearTimeout(this.#announcementTimer);
      this.#announcementTimer = null;
    }
  }
}

function clampInt(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}
