import { computed, Directive, effect, ElementRef, forwardRef, inject, input, OnDestroy, Renderer2, signal, type Signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { syncSelection } from '@mintplayer/ui-core/select';

/**
 * The `ControlValueAccessor` of `bs-select` (a host directive of the generated
 * component, see `select.angular.ts`). The select's value space is strings; an
 * `<option [ngValue]>` maps any value (an object, compared with `compareWith`)
 * to a stable `"<id>: <value>"` string, the way Angular's own
 * `SelectControlValueAccessor` does.
 */
@Directive({
  selector: 'bs-select',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsSelectValueAccessor), multi: true }],
  host: {
    // The native change bubbles out of the light-DOM <select>.
    '(change)': 'onNativeChange($event)',
    '(focusout)': 'onTouched()',
  },
})
export class BsSelectValueAccessor implements ControlValueAccessor {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly compareWith = input<(value1: unknown, value2: unknown) => boolean>(Object.is);

  /** A form control drives the select: its `viewValue` wins over the `value` input. */
  readonly bound = signal(false);
  /** The form control's value, as the select's string. */
  readonly viewValue = signal<string | null>(null);
  readonly disabled = signal(false);
  /** The string the select shows, from the form control or the `value` input (set by `extendInputs`). */
  selected: Signal<string | null> = computed(() => this.viewValue());

  private value: unknown = null;
  private readonly optionMap = new Map<string, unknown>();
  private idCounter = 0;
  private onChange: (value: unknown) => void = () => undefined;
  onTouched: () => void = () => undefined;

  registerOnChange(fn: (value: unknown) => void): void {
    this.bound.set(true);
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  writeValue(value: unknown): void {
    this.value = value;
    const valueString = value == null ? null : this.buildValueString(this.getOptionId(value), value);
    this.viewValue.set(valueString);
    // An option can get its value after the first render; re-select right away.
    const select = this.element.querySelector('select');
    if (select && !select.multiple) syncSelection(select, false, valueString, []);
  }

  onNativeChange(event: Event): void {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement) || select.multiple) return;
    const valueString = select.value || null;
    this.viewValue.set(valueString);
    this.value = this.getOptionValue(valueString);
    this.onChange(this.value);
  }

  registerOption(): string {
    return (this.idCounter++).toString();
  }

  setOption(id: string, value: unknown): void {
    this.optionMap.set(id, value);
    this.writeValue(this.value);
  }

  removeOption(id: string): void {
    this.optionMap.delete(id);
    this.writeValue(this.value);
  }

  /** Re-select after an option's plain value changed. */
  refresh(): void {
    this.writeValue(this.value);
  }

  buildValueString(id: string | null, value: unknown): string {
    if (id == null) return `${value}`;
    const shown = value && typeof value === 'object' ? 'Object' : value;
    return `${id}: ${shown}`.slice(0, 50);
  }

  /** The id of the registered option whose value matches, or null when none does. */
  private getOptionId(value: unknown): string | null {
    const compare = this.compareWith();
    return [...this.optionMap.keys()].find((id) => compare(this.optionMap.get(id), value)) ?? null;
  }

  /**
   * An empty selection (a `<option value="">` placeholder) reaches the model as
   * `null`; a plain `value` option is never registered and passes its string.
   */
  private getOptionValue(valueString: string | null): unknown {
    const id = valueString == null ? null : valueString.split(':')[0];
    return id !== null && this.optionMap.has(id) ? this.optionMap.get(id) : valueString;
  }
}

/**
 * Every `<option>` in a template that imports it: inside a `bs-select`, an
 * `[ngValue]` (any value) or a `[value]` (a string). It writes the `selected`
 * attribute for the selected option, so the server-rendered page shows the
 * selection with JavaScript off.
 */
@Directive({
  selector: 'option',
  host: { '[attr.selected]': "isSelected() ? '' : null" },
})
export class BsSelectOption implements OnDestroy {
  private readonly element = inject<ElementRef<HTMLOptionElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly select = inject(BsSelectValueAccessor, { optional: true, host: true });
  private readonly id = this.select?.registerOption() ?? '';

  readonly ngValue = input<unknown>(undefined);
  readonly value = input<string | undefined>(undefined);

  private readonly valueString = signal<string | null>(null);
  protected readonly isSelected = computed(() => !!this.select && this.valueString() !== null && this.select.selected() === this.valueString());

  constructor() {
    effect(() => {
      const ngValue = this.ngValue();
      if (ngValue === undefined || !this.select) return;
      this.setValue(this.select.buildValueString(this.id, ngValue));
      this.select.setOption(this.id, ngValue);
    });
    effect(() => {
      const value = this.value();
      if (value === undefined) return;
      this.setValue(value);
      this.select?.refresh();
    });
  }

  private setValue(value: string): void {
    // The attribute, so the server-rendered option carries it too.
    this.renderer.setAttribute(this.element, 'value', value);
    this.valueString.set(value);
  }

  ngOnDestroy(): void {
    this.select?.removeOption(this.id);
  }
}
