import { contentChildren, Directive, effect, forwardRef, input, signal } from '@angular/core';
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
 * `change` events from the children to recompute the array on every toggle.
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
  // Wrap in forwardRef: BsCheckboxComponent imports this directive (for
  // `inject(BsCheckboxGroupDirective, {...})`), so the two modules form a
  // cycle. Whichever side webpack/vite evaluates first sees `undefined` for
  // the other's exports at field-initialiser time, which makes the recorded
  // query predicate null — ng-mocks' MockDirective then fails with "the
  // query selector wasn't defined" on consumers that mock the group.
  readonly checkboxes = contentChildren<BsCheckboxComponent>(forwardRef(() => BsCheckboxComponent), { descendants: true });

  /** Most-recently-written form value. An effect syncs each child's
   *  `isToggled` (and the WC's `checked` property) whenever this OR the
   *  `checkboxes()` set changes, so an initial `writeValue` that lands
   *  before children register still applies once the `contentChildren`
   *  query populates. */
  private readonly currentValue = signal<readonly string[]>([]);

  private onValueChange?: (value: string[]) => void;
  private onTouched?: () => void;

  constructor() {
    effect(() => {
      const arr = this.currentValue();
      this.checkboxes().forEach(cb => {
        const v = cb.value();
        const isSelected = v != null && arr.includes(v);
        cb.isToggled.set(isSelected);
        const wc = cb.checkboxRef()?.nativeElement;
        if (wc) wc.checked = isSelected;
      });
    });
  }

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
    this.currentValue.set(Array.isArray(value) ? value : []);
  }

  setDisabledState(isDisabled: boolean) {
    this.checkboxes().forEach(cb => {
      const wc = cb.checkboxRef()?.nativeElement;
      if (wc) wc.disabled = isDisabled;
    });
  }
}
