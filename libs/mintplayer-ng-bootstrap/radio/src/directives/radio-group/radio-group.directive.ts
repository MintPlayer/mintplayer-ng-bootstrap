import { contentChildren, Directive, effect, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BsRadioComponent } from '../../component/radio.component';

/**
 * Groups N `<bs-radio>` children into a single-select FormControl whose
 * value is the selected radio's `value()`. The group owns the shared
 * `[name]` (radios don't carry their own); the children render with
 * `<input type="radio" name="${group.name}">` so native radio-group
 * semantics (one-of-N) work even without the FormControl layer.
 *
 * Acts as its own `ControlValueAccessor` — bind `[formControl]` /
 * `[(ngModel)]` on the element carrying `[bsRadioGroup]`. Listens to
 * bubbled `(change)` events from the children to compute the new value.
 */
@Directive({
  selector: '[bsRadioGroup]',
  exportAs: 'bsRadioGroup',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsRadioGroupDirective),
    multi: true,
  }],
  host: {
    '(change)': 'onChildChange()',
  },
})
export class BsRadioGroupDirective implements ControlValueAccessor {

  readonly name = input<string | null>(null);
  // Wrap in forwardRef: BsRadioComponent imports this directive (for
  // `inject(BsRadioGroupDirective, {...})`), so the two modules form a cycle.
  // Whichever side webpack/vite evaluates first sees `undefined` for the
  // other's exports at field-initialiser time, which makes the recorded query
  // predicate null — ng-mocks' MockDirective then fails with "the query
  // selector wasn't defined" on consumers (e.g. shell.component.spec.ts).
  readonly radios = contentChildren<BsRadioComponent>(forwardRef(() => BsRadioComponent), { descendants: true });

  /** Most-recently-written form value. An effect syncs each child's
   *  `isToggled` whenever this OR the `radios()` set changes, so an initial
   *  `writeValue` that lands before children register still applies once
   *  the `contentChildren` query populates. */
  private readonly currentValue = signal<string | null>(null);

  private onValueChange?: (value: string | null) => void;
  private onTouched?: () => void;

  constructor() {
    effect(() => {
      const value = this.currentValue();
      this.radios().forEach(r => r.isToggled.set(r.value() === value));
    });
  }

  onChildChange() {
    if (!this.onValueChange) return;
    // When the browser auto-unchecks a sibling radio (native radio-group
    // semantics) it does NOT fire a `change` event on the now-unchecked
    // input, so the sibling's cached `isToggled()` signal stays stale.
    // Re-sync every child's signal from the DOM truth, then emit.
    let selectedValue: string | null = null;
    this.radios().forEach(r => {
      const checked = !!r.checkbox()?.nativeElement?.checked;
      r.isToggled.set(checked);
      if (checked) selectedValue = r.value();
    });
    this.onValueChange(selectedValue);
  }

  registerOnChange(fn: (_: string | null) => void) {
    this.onValueChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: string | null) {
    this.currentValue.set(value);
  }

  setDisabledState(isDisabled: boolean) {
    this.radios().forEach(r => {
      const inputRef = r.checkbox();
      if (inputRef) {
        inputRef.nativeElement.disabled = isDisabled;
      }
    });
  }
}
