import { afterNextRender, DestroyRef, Directive, ElementRef, forwardRef, inject, Injector, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { preHydrationValue } from '@mintplayer/ui-core/forms';
import { BsTypeaheadComponent } from './generated';

const INPUT = 'input[role=combobox]';

/**
 * The `ControlValueAccessor` of `bs-typeahead` (a host directive of the
 * generated component, see `typeahead.angular.ts`). The value is the term. A
 * bound form control drives it through `viewValue`; what the user types reaches
 * the form through the component's `valuechange`, which a form write never
 * echoes (a programmatic set does not query either).
 */
@Directive({
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BsTypeaheadValueAccessor), multi: true }],
  host: {
    '(focusout)': 'onTouched()',
  },
})
export class BsTypeaheadValueAccessor implements ControlValueAccessor, OnInit {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** A form control drives the term: its `viewValue` wins over the `value` input. */
  readonly bound = signal(false);
  readonly viewValue = signal('');
  readonly disabled = signal(false);

  private onChange: (value: string) => void = () => undefined;
  onTouched: () => void = () => undefined;

  constructor() {
    this.adoptPreHydrationText();
  }

  ngOnInit(): void {
    // The component is created after its host directives, so it is looked up here.
    const component = this.injector.get(BsTypeaheadComponent);
    const sub = component.valuechange.subscribe((value) => {
      if (!this.bound() || value === this.viewValue()) return;
      this.viewValue.set(value);
      this.onChange(value);
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  registerOnChange(fn: (value: string) => void): void {
    this.bound.set(true);
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  writeValue(value: string | null | undefined): void {
    this.viewValue.set(value ?? '');
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  /**
   * Text typed into the server-rendered input before hydration would be
   * overwritten by the `value` binding. Read it while the host still holds the
   * server DOM, and replay it as typing once the form directives have written
   * their initial value (ngModel writes in a microtask after the first render)
   * and the core has attached: a real `input` event, so the term, the model,
   * the form control and the query all take the path live typing takes.
   */
  private adoptPreHydrationText(): void {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const server = this.host.querySelector<HTMLInputElement>(INPUT);
    const typed = preHydrationValue(this.host, server?.getAttribute('value') ?? '', INPUT);
    if (typed === null) return;
    afterNextRender(() =>
      queueMicrotask(() => {
        const input = this.host.querySelector<HTMLInputElement>(INPUT);
        if (!input || input.value) return; // the consumer or the user already wrote a term
        input.value = typed;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }),
    );
  }
}
