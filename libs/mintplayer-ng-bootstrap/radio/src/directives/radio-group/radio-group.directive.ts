import { contentChildren, Directive, effect, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { MpRadio } from '@mintplayer/web-components/radio';
import { BsRadioComponent } from '../../component/radio.component';
/**
 * Groups N `<bs-radio>` children into a single-select FormControl whose
 * value is the selected radio's `value()`. The group owns the shared
 * `[name]` (radios don't carry their own).
 *
 * Each `<bs-radio>` renders an `<mp-radio>` WC; each WC keeps its own
 * `<input type="radio">` inside its own shadow root, so the browser's
 * native one-of-N (auto-unchecking siblings on selection) does not fire
 * across `<mp-radio>` boundaries. This directive coordinates explicitly:
 * on every bubbled `change`, the originating WC is identified by the
 * event target, every other radio's `checked` property is set to `false`,
 * and the new FormControl value is emitted.
 *
 * Acts as its own `ControlValueAccessor` — bind `[formControl]` /
 * `[(ngModel)]` on the element carrying `[bsRadioGroup]`.
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
    '(change)': 'onChildChange($event)',
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
   *  `isToggled` (and the WC's `checked` property) whenever this OR the
   *  `radios()` set changes, so an initial `writeValue` that lands before
   *  children register still applies once the `contentChildren` query
   *  populates. */
  private readonly currentValue = signal<string | null>(null);

  private onValueChange?: (value: string | null) => void;
  private onTouched?: () => void;

  constructor() {
    effect(() => {
      const value = this.currentValue();
      this.radios().forEach(r => {
        const isSelected = r.value() === value;
        r.isToggled.set(isSelected);
        const wc = r.radioRef()?.nativeElement;
        if (wc) wc.checked = isSelected;
      });
    });
  }

  onChildChange(ev: Event) {
    if (!this.onValueChange) return;
    const target = ev.target as HTMLElement;
    let selectedValue: string | null = null;
    this.radios().forEach(r => {
      const wc = r.radioRef()?.nativeElement as MpRadio | undefined;
      const isTarget = !!wc && wc === target;
      const isChecked = isTarget && wc.checked;
      // Shadow DOM blocks native one-of-N — uncheck every non-target sibling.
      if (!isTarget && wc && wc.checked) wc.checked = false;
      r.isToggled.set(isChecked);
      if (isChecked) selectedValue = r.value();
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
      const wc = r.radioRef()?.nativeElement;
      if (wc) wc.disabled = isDisabled;
    });
  }
}
