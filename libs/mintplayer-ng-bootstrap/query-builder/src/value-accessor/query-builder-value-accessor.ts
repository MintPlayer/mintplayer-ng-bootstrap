import { DestroyRef, Directive, Injector, OnInit, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { Expression } from '@mintplayer/ui-core/query-builder';
import { BsQueryBuilderComponent } from '../generated';

/**
 * The `ControlValueAccessor` of `bs-query-builder` (a host directive of the
 * generated component, see `query-builder.angular.ts`). A bound form control
 * drives the tree through `viewValue`; every edit the user makes reaches the
 * form through the component's `query` model, which a form write never touches.
 */
@Directive({
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsQueryBuilderValueAccessor), multi: true }],
  host: {
    '(focusout)': 'onTouched()',
  },
})
export class BsQueryBuilderValueAccessor implements ControlValueAccessor, OnInit {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /** A form control drives the tree: its `viewValue` wins over the `query` input. */
  readonly bound = signal(false);
  readonly viewValue = signal<Expression | null>(null);
  readonly disabled = signal(false);

  private onChange: (value: Expression | null) => void = () => undefined;
  onTouched: () => void = () => undefined;

  ngOnInit(): void {
    // The component is created after its host directives, so it is looked up here.
    const sub = this.injector.get(BsQueryBuilderComponent).query.subscribe((value) => {
      if (!this.bound() || value === this.viewValue()) return;
      this.viewValue.set(value);
      this.onChange(value);
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  writeValue(value: Expression | null | undefined): void {
    this.viewValue.set(value ?? null);
  }

  registerOnChange(fn: (value: Expression | null) => void): void {
    this.bound.set(true);
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
