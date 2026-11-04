import { afterNextRender, Directive, ElementRef, forwardRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { preHydrationChoice } from '@mintplayer/ui-core/forms';
import { ownsRadio } from '@mintplayer/ui-core/radio';

/**
 * The `ControlValueAccessor` of a radio group, shared by the generated
 * `bs-radio-group` and the attribute form `[bsRadioGroup]` (a host directive of
 * both). The value is the picked radio's `value`. It reacts only to the radios
 * of its own group: a radio list nested in a table cell is its own group and
 * never changes this one (`ownsRadio`).
 */
@Directive({
  // Applied as a host directive only.
  selector: '[bsRadioGroupAccessor]',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsRadioGroupValueAccessor), multi: true }],
  host: {
    // A native radio's change bubbles to the group's element.
    '(change)': 'onNativeChange($event)',
    '(focusout)': 'onTouched()',
  },
})
export class BsRadioGroupValueAccessor implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** A form control is bound: its value drives the group, over the group's own `value`. */
  readonly bound = signal(false);
  /** The selection as the form control or the user last set it. */
  readonly viewValue = signal<string | null>(null);
  readonly disabled = signal(false);

  private onChange: (value: string | null) => void = () => undefined;
  onTouched: () => void = () => undefined;
  /** The owner's own write-back of a pick (`[(value)]`), next to the form control's. */
  onPick: (value: string) => void = () => undefined;

  constructor() {
    this.adoptPreHydrationChoice();
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.bound.set(true);
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  writeValue(value: string | null): void {
    this.viewValue.set(value ?? null);
  }

  onNativeChange(event: Event): void {
    if (ownsRadio(this.host, event.target)) this.select(event.target.value);
  }

  private select(value: string): void {
    this.viewValue.set(value);
    this.onChange(value);
    this.onPick(value);
  }

  /**
   * A radio picked in the server-rendered page before hydration would be reverted
   * by the `checked` bindings. Read it while the host holds the server DOM, and
   * replay it as the user's pick once the form directives have written their
   * initial value (ngModel writes in a microtask after the first render) and the
   * group's core has attached: a real `change`, so every listener (this accessor,
   * the core and its model) takes the one path a live pick takes.
   */
  private adoptPreHydrationChoice(): void {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const picked = preHydrationChoice(this.host);
    if (picked === null) return;
    afterNextRender(() =>
      queueMicrotask(() => {
        const radio = [...this.host.querySelectorAll<HTMLInputElement>('input[type=radio]')]
          .find((input) => input.value === picked && ownsRadio(this.host, input));
        if (!radio) return;
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }),
    );
  }
}
