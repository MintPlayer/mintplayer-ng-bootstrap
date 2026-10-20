import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  output,
  PLATFORM_ID,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { isObservable, Observable } from 'rxjs';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { machineSignal, MpPropsDirective, useScopedStyles } from '@mintplayer/ng-bootstrap/machine';
import { abortError } from '@mintplayer/ui-core/async';
import {
  connect,
  TYPEAHEAD_SCOPE,
  TypeaheadLabels,
  TypeaheadMachine,
  TypeaheadProvider,
  TypeaheadRequest,
  typeaheadScopedStyles,
} from '@mintplayer/ui-core/typeahead';
import { BsTypeaheadItemDirective } from './directives/typeahead-item.directive';

/**
 * An Angular provider may answer with a Promise or an Observable. An
 * Observable is unsubscribed when `request.signal` aborts, which cancels an
 * `HttpClient` request in flight.
 */
export type BsTypeaheadProvider<T> = (term: string, request: TypeaheadRequest) => Promise<readonly T[]> | Observable<readonly T[]>;

/**
 * Typeahead: a text input with asynchronous suggestions and free text.
 *
 * The first component built on the headless-core architecture (#436): all
 * behaviour lives in `TypeaheadMachine` (`@mintplayer/ui-core/typeahead`); this
 * component renders its own Angular template from the machine's snapshot and
 * applies the core's ARIA bags with `[mpProps]`. Because it is an Angular
 * template, Angular SSR emits a real, named `<input>` that submits free text
 * with JavaScript disabled, and hydration attaches to that same node.
 *
 * Value = the term (string). `selectedItem()` holds the last picked item until
 * the text changes. Usable with `[(value)]`, `[(ngModel)]`, `formControlName`.
 */
@Component({
  selector: 'bs-typeahead',
  templateUrl: './typeahead.component.html',
  imports: [NgTemplateOutlet, MpPropsDirective],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsTypeaheadComponent), multi: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'presentation' },
})
export class BsTypeaheadComponent<T = unknown> implements ControlValueAccessor {
  /** Supplies suggestions for a settled term; a newer term aborts the previous request. */
  readonly provider = input<BsTypeaheadProvider<T> | null>(null);
  /** Quiet time after the last keystroke, ms. 0 requests synchronously. */
  readonly debounceMs = input<number>(200);
  /** A trimmed term shorter than this closes the list without querying. */
  readonly minLength = input<number>(1);
  readonly disabled = input<boolean>(false);
  /** The text a pick writes into the input. Default: `item.text`, else `String(item)`. */
  readonly itemText = input<((item: T) => string) | undefined>(undefined);
  /** Row identity for keyed rendering. Default: `itemText`. */
  readonly itemKey = input<((item: T) => unknown) | undefined>(undefined);
  /** Submitted with a native `<form>` under this name (also with JavaScript disabled). */
  readonly name = input<string | null>(null);
  /** Accessible name of the input. A host `aria-label` or `aria-labelledby` wins. */
  readonly inputLabel = input<string | null>(null);
  readonly loadingLabel = input<string | undefined>(undefined);
  readonly noResultsLabel = input<string | undefined>(undefined);
  /** Spoken once per settled request, e.g. `n => n + ' resultaten'`. */
  readonly resultsLabel = input<((count: number) => string) | undefined>(undefined);
  /** A persistent validation message, wired to the input with aria-errormessage. */
  readonly errorText = input<string | null>(null);

  /** The term. Two-way; also the ControlValueAccessor value. */
  readonly value = model<string>('');

  readonly select = output<T>();
  readonly submitted = output<string>();
  readonly opened = output<void>();
  readonly closed = output<void>();
  readonly loadError = output<unknown>();

  readonly itemTemplate = contentChild<BsTypeaheadItemDirective<T>>(BsTypeaheadItemDirective);
  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');

  readonly id = inject(BsIdService).next('bs-typeahead');
  /**
   * Host transparency: a consumer's `aria-*`, `id` and `tabindex` on
   * `<bs-typeahead>` land on the role-bearing input (`id` and `tabindex` are
   * moved, so no duplicate id and no dead tab stop on the host). A consumer
   * `role` is NOT forwarded: the input's role is `combobox` by contract. Read
   * once, in the constructor, so the server render carries them too.
   */
  private readonly hostAria = takeHostAria(inject(ElementRef).nativeElement as HTMLElement);
  readonly machine: TypeaheadMachine<T>;
  readonly state;
  readonly api;
  /** The last picked item, `null` once the text changes after the pick. */
  readonly selectedItem;

  private readonly disabledByCva = signal(false);
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    const host = inject(ElementRef).nativeElement as HTMLElement;
    useScopedStyles(TYPEAHEAD_SCOPE, typeaheadScopedStyles);
    this.machine = new TypeaheadMachine<T>({
      id: this.id,
      value: this.value(),
      onChange: (term) => {
        this.value.set(term);
        this.onChange(term);
      },
      onSelect: (item) => this.select.emit(item),
      onSubmit: (term) => this.submitted.emit(term),
      onOpen: () => this.opened.emit(),
      onClose: () => {
        this.closed.emit();
        this.onTouched();
      },
      onError: (error) => this.loadError.emit(error),
    });
    this.state = machineSignal(this.machine);
    this.api = computed(() => {
      const api = connect(this.state(), this.id, { name: this.name() });
      // A host aria-label / aria-labelledby wins over inputLabel (naming conformance).
      return { ...api, input: { ...api.input, ...this.hostAria } };
    });
    this.selectedItem = computed(() => this.state().selectedItem);
    inject(DestroyRef).onDestroy(() => this.machine.destroy());

    // Inputs → machine configuration. Each effect reads one input so an
    // unrelated input change does not re-apply everything.
    effect(() => {
      const provider = this.provider();
      this.machine.provider = provider ? adaptProvider(provider) : null;
    });
    effect(() => (this.machine.debounceMs = this.debounceMs()));
    effect(() => (this.machine.minLength = this.minLength()));
    effect(() => (this.machine.itemText = this.itemText()));
    effect(() => (this.machine.itemKey = this.itemKey()));
    effect(() => this.machine.setDisabled(this.disabled() || this.disabledByCva()));
    effect(() => this.machine.setErrorText(this.errorText()));
    effect(() => {
      const labels: Partial<TypeaheadLabels> = { input: this.inputLabel() };
      const loading = this.loadingLabel();
      const noResults = this.noResultsLabel();
      const results = this.resultsLabel();
      if (loading !== undefined) labels.loading = loading;
      if (noResults !== undefined) labels.noResults = noResults;
      if (results !== undefined) labels.results = results;
      this.machine.setLabels(labels);
    });
    // A consumer write to [(value)] (not an echo of our own onChange) is a programmatic set: no query.
    effect(() => {
      const next = this.value();
      if (next !== untracked(() => this.machine.snapshot.term)) this.machine.setValue(next);
    });

    this.adoptPreHydrationText(host);
  }

  /**
   * Text typed or pasted into the server-rendered input before hydration lives
   * only in the DOM. Hydration's [value] binding would overwrite it with the
   * empty term, and the replayed input event then reads the empty field, so it
   * is lost. Read it here, while the host still holds the server DOM, and keep
   * it as the term; once effects have configured the provider, re-enter it as a
   * typed term so it notifies the model and queries.
   */
  private adoptPreHydrationText(host: HTMLElement): void {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const typed = host.querySelector('input')?.value ?? '';
    if (!typed || typed === this.machine.snapshot.term) return;
    this.machine.setValue(typed);
    this.value.set(typed);
    afterNextRender(() => {
      if (this.machine.snapshot.term !== typed) return; // superseded by the consumer or the user
      this.machine.setValue('');
      this.machine.setTerm(typed);
    });
  }

  // ---- template handlers --------------------------------------------------

  protected onInput(event: Event): void {
    this.machine.setTerm((event.target as HTMLInputElement).value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const handled = this.machine.keydown(event.key, event);
    if (handled) event.preventDefault();
  }

  protected onBlur(): void {
    this.machine.blur();
    this.onTouched();
  }

  protected trackItem = (index: number, item: T): unknown => this.machine.itemKeyOf(item) ?? index;

  /** Focus the input. */
  focus(): void {
    this.inputRef().nativeElement.focus();
  }

  // ---- ControlValueAccessor -----------------------------------------------

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
    this.machine.setValue(value);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByCva.set(isDisabled);
  }
}

/** Collect `aria-*` (copied) and `id` / `tabindex` (moved) from the host element. */
function takeHostAria(host: HTMLElement): Record<string, string> {
  const bag = Object.fromEntries(
    Array.from(host.attributes)
      .filter(({ name }) => name.startsWith('aria-') || name === 'id' || name === 'tabindex')
      .map(({ name, value }) => [name, value]),
  );
  ['id', 'tabindex'].filter((name) => name in bag).forEach((name) => host.removeAttribute(name));
  return bag;
}

/** Promise or Observable in, Promise out; the Observable is unsubscribed when the request aborts. */
function adaptProvider<T>(provider: BsTypeaheadProvider<T>): TypeaheadProvider<T> {
  return (term, request) => {
    const result = provider(term, request);
    if (!isObservable(result)) return result;
    return new Promise<readonly T[]>((resolve, reject) => {
      const subscription = result.subscribe({
        next: (items) => {
          resolve(items);
          subscription.unsubscribe();
        },
        error: reject,
        complete: () => resolve([]),
      });
      request.signal.addEventListener('abort', () => {
        subscription.unsubscribe();
        reject(abortError());
      });
    });
  };
}
