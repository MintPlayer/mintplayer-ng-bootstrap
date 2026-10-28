import { DestroyRef, Directive, Injector, OnInit, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsMultiRangeComponent } from '../generated';

const same = (a: readonly number[] | null, b: readonly number[] | null) =>
  a === b || (!!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]));

/**
 * The `ControlValueAccessor` of `bs-multi-range` (a host directive of the
 * generated component, see `multi-range.angular.ts`). A bound form control
 * drives the thumbs through `viewValue`; every move the user makes reaches the
 * form through the component's `value` model, which a form write never echoes.
 */
@Directive({
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsMultiRangeValueAccessor), multi: true }],
  host: {
    '(focusout)': 'onTouched()',
  },
})
export class BsMultiRangeValueAccessor implements ControlValueAccessor, OnInit {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /** A form control drives the thumbs: its `viewValue` wins over the `value` input. */
  readonly bound = signal(false);
  readonly viewValue = signal<number[] | null>(null);
  readonly disabled = signal(false);

  private onChange: (value: number[]) => void = () => undefined;
  onTouched: () => void = () => undefined;

  ngOnInit(): void {
    // The component is created after its host directives, so it is looked up here.
    // Its outputs fire for the user's moves only: a written or normalised value
    // (a null form value shown as [min, max]) never reaches the form as a change.
    const component = this.injector.get(BsMultiRangeComponent);
    const report = (value: number[]) => {
      if (!this.bound() || same(value, this.viewValue())) return;
      this.viewValue.set([...value]);
      this.onChange([...value]);
    };
    const subs = [component.valueinput.subscribe(report), component.valuechange.subscribe(report)];
    this.destroyRef.onDestroy(() => subs.forEach((sub) => sub.unsubscribe()));
  }

  registerOnChange(fn: (value: number[]) => void): void {
    this.bound.set(true);
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  writeValue(value: number[] | null | undefined): void {
    this.viewValue.set(Array.isArray(value) ? [...value] : null);
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
