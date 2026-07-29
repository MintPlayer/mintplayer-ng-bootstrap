import { contentChildren, Directive, effect, ElementRef, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { MpRadio } from '@mintplayer/web-components/radio';
import type { RadioGroupChangeEventDetail } from '@mintplayer/web-components/radio-group';
import { BsRadioComponent } from '../../component/radio.component';

// Side-effect: registers <mp-radio-group>, the preferred host element (below).
import '@mintplayer/web-components/radio-group';

/**
 * Groups N `<bs-radio>` children into a single-select FormControl whose
 * value is the selected radio's `value()`. The group owns the shared
 * `[name]` (radios don't carry their own). Acts as its own
 * `ControlValueAccessor` — bind `[formControl]` / `[(ngModel)]` on the
 * element carrying `[bsRadioGroup]`.
 *
 * Host it on `<mp-radio-group>` where the markup allows: the WC supplies
 * `role="radiogroup"`, the roving tab stop, arrow move-and-select and
 * exclusivity, and this directive is only the CVA bridge (it listens for
 * the WC's `group-change`, which is the ONLY signal a keyboard-driven
 * selection produces — the WC checks radios programmatically, so no
 * `change` bubbles). On any other host (a `<tbody>`, a `<bs-button-group>`)
 * the WC element cannot be used, and this directive coordinates the
 * one-of-N itself on bubbled `change` — shadow roots keep the browser's
 * native auto-uncheck from ever firing across `<mp-radio>` boundaries.
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
    '(group-change)': 'onGroupChange($event)',
    // focusout is composed: the shadow input's blur reaches the host. The
    // stored onTouched was never CALLED before, which kept every
    // invalid-after-touched mirror dead (audit 4.9 prerequisite).
    '(focusout)': 'onTouched?.()',
  },
})
export class BsRadioGroupDirective implements ControlValueAccessor {

  private readonly host = inject(ElementRef).nativeElement as HTMLElement;

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
  // protected, not private: the focusout host binding compiles outside the
  // class body under AOT and cannot reach a private member.
  protected onTouched?: () => void;

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

  /** Keyboard/pointer selection routed through an `<mp-radio-group>` host. */
  onGroupChange(ev: Event) {
    if (ev.target !== this.host) return;
    const value = (ev as CustomEvent<RadioGroupChangeEventDetail>).detail.value;
    this.radios().forEach(r => r.isToggled.set(r.value() === value));
    this.onValueChange?.(value);
  }

  onChildChange(ev: Event) {
    // An <mp-radio-group> host owns exclusivity and reports via group-change;
    // handling the bubbled change here too would double-emit into the form.
    if (this.host.tagName === 'MP-RADIO-GROUP') return;
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
