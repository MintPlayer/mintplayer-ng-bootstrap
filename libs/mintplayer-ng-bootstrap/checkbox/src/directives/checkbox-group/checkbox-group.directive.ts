import { contentChildren, Directive, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsCheckboxComponent } from '../../component/checkbox.component';

/**
 * Groups N `<bs-checkbox>` children into a multi-select FormControl whose
 * value is a `string[]` of every checked child's `value()`. The group's
 * `[name]` is the form-array name; the accessor appends the `[]` suffix
 * automatically on each child's inner `<input>` for traditional-form
 * submission. Per-instance `[name]` on each child is ignored when the
 * child resolves into a group.
 *
 * Acts as its own `ControlValueAccessor` — bind `[formControl]` / `[(ngModel)]`
 * directly on the element carrying `[bsCheckboxGroup]`. Listens to bubbled
 * `(change)` events from the children to recompute the array on every toggle.
 */
@Directive({
  selector: '[bsCheckboxGroup]',
  exportAs: 'bsCheckboxGroup',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsCheckboxGroupDirective),
    multi: true,
  }],
  host: {
    '(change)': 'onChildChange()',
  },
})
export class BsCheckboxGroupDirective implements ControlValueAccessor {

  readonly name = input<string | null>(null);
  readonly checkboxes = contentChildren(BsCheckboxComponent, { descendants: true });

  private onValueChange?: (value: string[]) => void;
  private onTouched?: () => void;

  onChildChange() {
    if (!this.onValueChange) return;
    const result = this.checkboxes()
      .filter(cb => !!cb.isToggled() && cb.value() != null)
      .map(cb => cb.value()!);
    this.onValueChange(result);
  }

  registerOnChange(fn: (_: string[]) => void) {
    this.onValueChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: string[] | null) {
    const arr = Array.isArray(value) ? value : [];
    this.checkboxes().forEach(cb => {
      const v = cb.value();
      cb.isToggled.set(v != null && arr.includes(v));
    });
  }

  setDisabledState(isDisabled: boolean) {
    this.checkboxes().forEach(cb => {
      const inputRef = cb.checkbox();
      if (inputRef) {
        inputRef.nativeElement.disabled = isDisabled;
      }
    });
  }
}
