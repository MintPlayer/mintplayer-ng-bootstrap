import { DestroyRef, Directive, Injector, OnInit, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { TreeSelectValue } from '@mintplayer/ui-core/tree-select';
import { BsTreeSelectComponent } from '../generated';

/**
 * The `ControlValueAccessor` of `bs-tree-select` (a host directive of the
 * generated component, see `tree-select.angular.ts`). A bound form control
 * drives the value through `viewValue`; a user's change reaches the form
 * through the component's `value` model, which a form write never echoes.
 */
@Directive({
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsTreeSelectValueAccessor), multi: true }],
  host: {
    '(focusout)': 'onTouched()',
  },
})
export class BsTreeSelectValueAccessor implements ControlValueAccessor, OnInit {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /** A form control drives the value: its `viewValue` wins over the `value` input. */
  readonly bound = signal(false);
  readonly viewValue = signal<TreeSelectValue>(null);
  readonly disabled = signal(false);

  private onChange: (value: TreeSelectValue) => void = () => undefined;
  onTouched: () => void = () => undefined;

  ngOnInit(): void {
    // The component is created after its host directives, so it is looked up here.
    const component = this.injector.get(BsTreeSelectComponent);
    const sub = component.valuechange.subscribe((value) => {
      if (!this.bound() || value === this.viewValue()) return;
      this.viewValue.set(value);
      this.onChange(value);
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  registerOnChange(fn: (value: TreeSelectValue) => void): void {
    this.bound.set(true);
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  writeValue(value: TreeSelectValue | undefined): void {
    this.viewValue.set(value ?? null);
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
