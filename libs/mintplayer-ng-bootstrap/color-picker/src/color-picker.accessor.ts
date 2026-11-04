import { DestroyRef, Directive, forwardRef, inject, Injector, OnInit, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { normalizeHex } from '@mintplayer/ui-core/color-picker';
import { BsColorPickerComponent } from './generated';

/**
 * The `ControlValueAccessor` of `bs-color-picker` (a host directive of the generated component,
 * see `color-picker.angular.ts`). The value is the hex `#rrggbb`. A bound form control drives it
 * through `viewValue`; what the user picks (on the wheel or a slider) reaches the form through
 * the component's `valuechange`, which a form write never echoes.
 */
@Directive({
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsColorPickerValueAccessor), multi: true }],
  host: {
    '(focusout)': 'onTouched()',
  },
})
export class BsColorPickerValueAccessor implements ControlValueAccessor, OnInit {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /** A form control drives the color: its `viewValue` wins over the `value` input. */
  readonly bound = signal(false);
  readonly viewValue = signal('#ffffff');
  readonly disabled = signal(false);

  private onChange: (value: string) => void = () => undefined;
  onTouched: () => void = () => undefined;

  ngOnInit(): void {
    // The component is created after its host directives, so it is looked up here.
    const component = this.injector.get(BsColorPickerComponent);
    const sub = component.value.subscribe((value) => {
      if (!this.bound() || value === this.viewValue()) return;
      this.viewValue.set(value);
      this.onChange(value);
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  registerOnChange(fn: (value: string) => void): void {
    this.bound.set(true);
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  writeValue(value: string | null | undefined): void {
    // An empty control keeps the color the picker shows.
    if (value) this.viewValue.set(normalizeHex(value));
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
