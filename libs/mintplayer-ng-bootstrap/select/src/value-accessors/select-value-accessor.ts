import { Directive, effect, ElementRef, forwardRef, inject, input, OnDestroy, Renderer2 } from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { BsSelectComponent } from "../component/select.component";

@Directive({
  selector: 'bs-select',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsSelectValueAccessor),
    multi: true,
  }],
  host: {
    '(change)': 'hostOnChange($event)',
    // focusout, not blur: the focusable <select> lives in mp-select's shadow root, and blur
    // neither bubbles nor reaches an ancestor of the shadow host, so (blur) here never fired
    // and the control was never marked touched. focusout is composed and bubbles.
    '(focusout)': 'onTouched()',
  },
})
export class BsSelectValueAccessor implements ControlValueAccessor {
  private _renderer = inject(Renderer2);
  private _elementRef = inject(ElementRef);
  private selectBox = inject(BsSelectComponent);

  onChange = (_: any) => {};
  onTouched = () => {};

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  registerOnChange(fn: (p: any) => void) {
    this.onChange = (valueString: string) => {
      // View -> Model
      this.value = this.getOptionValue(valueString);
      fn(this.value);
    };
  }
  setDisabledState(isDisabled: boolean): void {
    this.setProperty('disabled', isDisabled);
  }
  protected setProperty(key: string, value: any): void {
    this._renderer.setProperty(this.selectBox.selectBox().nativeElement, key, value);
  }

  hostOnChange(event: Event) {
    this.onChange((<any>event.target).value);
  }

  value: any;
  optionMap = new Map<string, any>();
  idCounter = 0;

  private compareWithFunction: (value1: any, value2: any) => boolean = Object.is;
  readonly compareWith = input<((value1: any, value2: any) => boolean) | undefined>(undefined);

  constructor() {
    effect(() => {
      const value = this.compareWith();
      if (value !== undefined) {
        if (typeof value !== 'function') {
          throw new Error('compareWith must be a function');
        }
        this.compareWithFunction = value;
      }
    });
  }

  buildValueString(id: string | null, value: any) {
    if (id == null) {
      return `${value}`;
    }

    if (value && (typeof value === 'object')) {
      value = 'Object';
    }

    return `${id}: ${value}`.slice(0, 50);
  }

  /**
   * The id half of a `"<id>: <value>"` string, or null when there is no string
   * to read.
   *
   * Null is a real case, not defensive padding: `<option value="">` is the
   * idiomatic way to write a placeholder ("— none —", "Browser locale"), and
   * `mp-select` normalizes an empty selection to `null` on its host. The host is
   * what `hostOnChange` reads, because `mp-select` re-dispatches a composed
   * `change` whose target is the element rather than the inner `<select>`. So
   * selecting a placeholder threw `can't access property "split", valueString is
   * null` and the model never updated — the control looked frozen on that option.
   */
  extractId(valueString: string | null | undefined): string | null {
    return valueString == null ? null : valueString.split(':')[0];
  }

  writeValue(value: any) {
    this.value = value;

    const id = this.getOptionId(value);
    const valueString = this.buildValueString(id, value);
    this.setProperty('value', valueString);
  }

  registerOption() {
    return (this.idCounter++).toString();
  }

  /** The id of the registered option whose value matches, or null when none does. */
  getOptionId(value: any): string | null {
    return [...this.optionMap.keys()].find((id) => this.compareWithFunction(this.optionMap.get(id), value)) ?? null;
  }

  getOptionValue(valueString: string | null | undefined) {
    const id = this.extractId(valueString);
    // Options declared with a plain `value` attribute are never registered in
    // optionMap — only `[ngValue]` registers — so falling through to the raw
    // string is the normal path for them, and passing null through is how a
    // placeholder selection reaches the model as "nothing chosen".
    return id !== null && this.optionMap.has(id) ? this.optionMap.get(id) : valueString;
  }
}

@Directive({
  selector: 'option',
})
export class BsSelectOption implements OnDestroy {
  private element = inject(ElementRef);
  private renderer = inject(Renderer2);
  private select = inject(BsSelectValueAccessor, { optional: true, host: true });

  constructor() {
    if (this.select) {
      this.id = this.select.registerOption();
    }

    effect(() => {
      const val = this.ngValue();
      if (val !== undefined && this.select) {
        this.select.optionMap.set(this.id, val);
        this.setElementValue(this.select.buildValueString(this.id, val));
        this.select.writeValue(this.select.value);
      }
    });

    effect(() => {
      const val = this.value();
      if (val !== undefined) {
        this.setElementValue(val);
        if (this.select) {
          this.select.writeValue(this.select.value);
        }
      }
    });
  }

  id!: string;

  readonly ngValue = input<any>(undefined);

  readonly value = input<any>(undefined);

  setElementValue(value: string) {
    this.renderer.setProperty(this.element.nativeElement, 'value', value);
  }

  ngOnDestroy() {
    if (this.select) {
      this.select.optionMap.delete(this.id);
      this.select.writeValue(this.select.value);
    }
  }
}
