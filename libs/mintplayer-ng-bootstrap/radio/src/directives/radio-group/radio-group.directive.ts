import { afterNextRender, computed, Directive, ElementRef, forwardRef, inject, input, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { connectRadioGroup, radioGroupName } from '@mintplayer/ui-core/radio';
import { preHydrationChoice } from '@mintplayer/ui-core/forms';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';

/**
 * Groups N `<bs-radio>` descendants into a single-select FormControl whose
 * value is the selected radio's `value()`. Bind `[formControl]` /
 * `[(ngModel)]` on the element carrying it.
 *
 * The group hands its `name` to every radio (generated when none is given),
 * so they are native radios of ONE set in one node tree: the browser supplies
 * exclusivity, the single tab stop, arrow move-and-select and posinset, also
 * with JavaScript off (#437). This directive only carries the value, the
 * disabled state and the touched signal.
 *
 * `<bs-radio-group>` is the element form and takes `role="radiogroup"`; name
 * it with `aria-label` / `aria-labelledby`. On another host (a `<tbody>`, a
 * `<bs-button-group>`) the attribute form adds no role, because the host keeps
 * its own; radios that are not descendants wire in with `[group]="g"`.
 */
@Directive({
  selector: '[bsRadioGroup], bs-radio-group',
  exportAs: 'bsRadioGroup',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsRadioGroupDirective),
    multi: true,
  }],
  host: {
    '[attr.role]': 'groupAttrs()[\'role\']',
    '[attr.aria-required]': 'groupAttrs()["aria-required"]',
    '[attr.aria-disabled]': 'groupAttrs()["aria-disabled"]',
    '(focusout)': 'onTouched?.()',
  },
})
export class BsRadioGroupDirective implements ControlValueAccessor {

  private readonly host = inject(ElementRef).nativeElement as HTMLElement;
  private readonly isElementHost = this.host.localName === 'bs-radio-group';
  private readonly id = inject(BsIdService).next('bs-radio-group');

  readonly name = input<string | null>(null);
  /** Marks the set required: `aria-required` on the group and `required` on every radio. */
  readonly required = input<boolean>(false);

  /** The radios' shared `name`; one is generated so native grouping always forms. */
  readonly groupName = computed(() => this.name() ?? radioGroupName(this.id));

  private readonly selected = signal<string | null>(null);
  readonly value = this.selected.asReadonly();

  private readonly formDisabled = signal(false);
  readonly disabled = this.formDisabled.asReadonly();

  protected readonly groupAttrs = computed(() => {
    const attrs = connectRadioGroup({ required: this.required(), disabled: this.disabled() });
    return this.isElementHost ? attrs : { ...attrs, role: null };
  });

  private onValueChange?: (value: string | null) => void;
  // protected, not private: the focusout host binding compiles outside the
  // class body under AOT and cannot reach a private member.
  protected onTouched?: () => void;

  constructor() {
    this.adoptPreHydrationChoice();
  }

  /** Called by a radio whose native input became checked. */
  select(value: string | null) {
    this.selected.set(value);
    this.onValueChange?.(value);
  }

  /**
   * A radio picked in the server-rendered page before hydration would be reverted
   * by the `[checked]` bindings. Read it while the host holds the server DOM, and
   * report it once the form directives have written their initial value (ngModel
   * writes in a microtask after the first render).
   */
  private adoptPreHydrationChoice(): void {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const picked = preHydrationChoice(this.host);
    if (picked === null) return;
    afterNextRender(() => queueMicrotask(() => this.select(picked)));
  }

  registerOnChange(fn: (_: string | null) => void) {
    this.onValueChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: string | null) {
    this.selected.set(value ?? null);
  }

  setDisabledState(isDisabled: boolean) {
    this.formDisabled.set(isDisabled);
  }
}
