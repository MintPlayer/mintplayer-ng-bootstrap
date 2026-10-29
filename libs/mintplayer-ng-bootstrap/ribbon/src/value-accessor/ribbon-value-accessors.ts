import { DestroyRef, Directive, Injector, OnInit, forwardRef, inject, signal, type ModelSignal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  BsRibbonCheckBoxComponent,
  BsRibbonColorPickerComponent,
  BsRibbonComboBoxComponent,
  BsRibbonGroupButtonComponent,
  BsRibbonToggleButtonComponent,
} from '../generated';

/**
 * The `ControlValueAccessor` of a ribbon form item (a host directive of the
 * generated component, see the `*.angular.ts` extensions). A bound form
 * control drives the item through `viewValue`; what the user changes reaches
 * the form through the component's two-way model, which a form write never
 * touches.
 */
@Directive()
export abstract class BsRibbonModelAccessor<T> implements ControlValueAccessor, OnInit {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  /** A form control drives the item: its `viewValue` wins over the input. */
  readonly bound = signal(false);
  readonly viewValue = signal<T>(this.empty());
  readonly disabled = signal(false);
  private onChange: (value: T) => void = () => undefined;
  onTouched: () => void = () => undefined;

  /** The value a cleared control writes. */
  protected abstract empty(): T;
  /** The component's two-way model. */
  protected abstract model(injector: Injector): ModelSignal<T | undefined>;

  ngOnInit(): void {
    // The component is created after its host directives, so it is looked up here.
    const sub = this.model(this.injector).subscribe((next) => {
      const value = next ?? this.empty();
      if (!this.bound() || value === this.viewValue()) return;
      this.viewValue.set(value);
      this.onChange(value);
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  registerOnChange(fn: (value: T) => void): void {
    this.bound.set(true);
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  writeValue(value: T | null | undefined): void {
    this.viewValue.set(value ?? this.empty());
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}

@Directive({
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsRibbonToggleButtonValueAccessor), multi: true }],
  host: { '(focusout)': 'onTouched()' },
})
export class BsRibbonToggleButtonValueAccessor extends BsRibbonModelAccessor<boolean> {
  protected empty(): boolean {
    return false;
  }
  protected model(injector: Injector): ModelSignal<boolean | undefined> {
    return injector.get(BsRibbonToggleButtonComponent).pressed;
  }
}

@Directive({
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsRibbonCheckBoxValueAccessor), multi: true }],
  host: { '(focusout)': 'onTouched()' },
})
export class BsRibbonCheckBoxValueAccessor extends BsRibbonModelAccessor<boolean> {
  protected empty(): boolean {
    return false;
  }
  protected model(injector: Injector): ModelSignal<boolean | undefined> {
    return injector.get(BsRibbonCheckBoxComponent).checked;
  }
}

@Directive({
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsRibbonComboBoxValueAccessor), multi: true }],
  host: { '(focusout)': 'onTouched()' },
})
export class BsRibbonComboBoxValueAccessor extends BsRibbonModelAccessor<string> {
  protected empty(): string {
    return '';
  }
  protected model(injector: Injector): ModelSignal<string | undefined> {
    return injector.get(BsRibbonComboBoxComponent).value;
  }
}

@Directive({
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsRibbonColorPickerValueAccessor), multi: true }],
  host: { '(focusout)': 'onTouched()' },
})
export class BsRibbonColorPickerValueAccessor extends BsRibbonModelAccessor<string> {
  protected empty(): string {
    return '#000000';
  }
  protected model(injector: Injector): ModelSignal<string | undefined> {
    return injector.get(BsRibbonColorPickerComponent).color;
  }
}

@Directive({
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsRibbonGroupButtonValueAccessor), multi: true }],
  host: { '(focusout)': 'onTouched()' },
})
export class BsRibbonGroupButtonValueAccessor extends BsRibbonModelAccessor<string> {
  protected empty(): string {
    return '';
  }
  protected model(injector: Injector): ModelSignal<string | undefined> {
    return injector.get(BsRibbonGroupButtonComponent).selectedValue;
  }
}
