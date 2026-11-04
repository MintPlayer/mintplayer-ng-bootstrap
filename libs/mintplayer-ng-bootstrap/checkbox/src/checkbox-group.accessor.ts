import { Directive, ElementRef, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { groupSelection, ownsCheckbox } from '@mintplayer/ui-core/checkbox';

/**
 * The `ControlValueAccessor` of a checkbox group, shared by the generated
 * `bs-checkbox-group` and the attribute form `[bsCheckboxGroup]` (a host
 * directive of both). The value is the list of the checked checkboxes' values.
 * It reacts only to the checkboxes of its own group (`ownsCheckbox`).
 */
@Directive({
  // Applied as a host directive only.
  selector: '[bsCheckboxGroupAccessor]',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsCheckboxGroupValueAccessor), multi: true }],
  host: {
    // A native checkbox's change bubbles to the group's element.
    '(change)': 'onNativeChange($event)',
    '(focusout)': 'onTouched()',
  },
})
export class BsCheckboxGroupValueAccessor implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** A form control is bound: its value drives the group, over the group's own `value`. */
  readonly bound = signal(false);
  /** The selection as the form control or the user last set it. */
  readonly viewValue = signal<readonly string[]>([]);
  readonly disabled = signal(false);

  private onChange: (value: string[]) => void = () => undefined;
  onTouched: () => void = () => undefined;
  /** The owner's own write-back of a toggle (`[(value)]` on the attribute form). */
  onPick: (value: string[]) => void = () => undefined;

  registerOnChange(fn: (value: string[]) => void): void {
    this.bound.set(true);
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  writeValue(value: readonly string[] | null): void {
    this.viewValue.set(Array.isArray(value) ? value : []);
  }

  onNativeChange(event: Event): void {
    if (!ownsCheckbox(this.host, event.target)) return;
    const next = groupSelection(this.host);
    this.viewValue.set(next);
    this.onChange(next);
    this.onPick(next);
  }
}
