import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  checkboxClasses,
  connectCheckbox,
  effectiveIndeterminate,
  type CheckboxInputBag,
  type CheckboxState,
  type ToggleButtonColor,
} from '@mintplayer/ui-core/checkbox';
import { BsControlValidityDirective, BsIdService, takeHostAria } from '@mintplayer/ng-bootstrap/a11y';
import { MpPropsDirective, useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { BsCheckboxValueAccessor } from '../value-accessor/checkbox-value-accessor';
import { BsCheckboxGroupDirective } from '../directives/checkbox-group/checkbox-group.directive';
import { BsCheckboxType } from '../types/checkbox-type';
import { bootstrapForms } from '@mintplayer/ui-core/bootstrap';

/**
 * A native `<input type=checkbox>` in Bootstrap's `.form-check` /
 * `.form-switch` / `.btn-check` markup, rendered by this component's own
 * template (#437): it submits, toggles and announces with JavaScript off,
 * and SSR emits the real control. The ARIA contract comes from
 * `@mintplayer/ui-core/checkbox`; the consumer's `aria-*` / `id` /
 * `tabindex` on `<bs-checkbox>` land on the input.
 */
@Component({
  // bs-toggle-button is the toggle-button front: the same control, type fixed.
  selector: 'bs-checkbox, bs-toggle-button',
  templateUrl: './checkbox.component.html',
  imports: [MpPropsDirective, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BsCheckboxValueAccessor, {
    directive: BsControlValidityDirective,
    inputs: ['errorMessages'],
  }],
  // A :host rule, not a d-inline-block utility: its !important fought every
  // d-* a consumer put on the host (#452).
  styles: [':host { display: inline-block; }'],
})
export class BsCheckboxComponent {

  private readonly parentGroup = inject(BsCheckboxGroupDirective, { optional: true, skipSelf: true });
  private readonly validity = inject(BsControlValidityDirective, { self: true });
  private readonly host = inject(ElementRef).nativeElement as HTMLElement;
  private readonly hostAria = takeHostAria(this.host);
  private readonly id = inject(BsIdService).next('bs-checkbox');
  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('input');

  type = input<BsCheckboxType>('checkbox');
  /** Button colour of a `toggle_button`; ignored by the other types. */
  color = input<ToggleButtonColor>('primary');
  isToggled = model<boolean | null>(false);
  indeterminate = model<boolean>(false);
  name = input<string | null>(null);
  value = input<string | null>(null);
  disabled = input<boolean>(false);
  group = input<BsCheckboxGroupDirective | null>(null);

  /** Written by the value accessor and by `[bsCheckboxGroup]` (`setDisabledState`). */
  readonly formDisabled = signal(false);

  /** Explicit `[group]` input wins over the DI-injected ancestor. */
  readonly resolvedGroup = computed(() => this.group() ?? this.parentGroup ?? null);

  /** Single-mode → component's own `[name]`. Multi-mode → group's `[name]` + `[]`. */
  readonly nameResult = computed(() => {
    const group = this.resolvedGroup();
    if (group) {
      const groupName = group.name();
      return groupName == null ? null : `${groupName}[]`;
    }
    return this.name();
  });

  readonly checked = computed(() => !!this.isToggled());

  /** `<bs-toggle-button>` is a toggle button whatever `[type]` says. */
  private readonly isToggleButtonHost = this.host.localName === 'bs-toggle-button';
  readonly resolvedType = computed<BsCheckboxType>(() => this.isToggleButtonHost ? 'toggle_button' : this.type());

  private readonly state = computed<CheckboxState>(() => ({
    type: this.resolvedType(),
    checked: this.checked(),
    indeterminate: effectiveIndeterminate({ type: this.resolvedType(), indeterminate: this.indeterminate() }),
    disabled: this.disabled() || this.formDisabled(),
    required: this.validity.required(),
    invalid: this.validity.invalid(),
    name: this.nameResult(),
    value: this.value(),
    errorText: this.validity.errorText(),
  }));

  readonly classes = computed(() => checkboxClasses(this.resolvedType(), this.color(), this.state().invalid));

  readonly bags = computed(() => {
    const { 'aria-describedby': describedBy, ...aria } = this.hostAria;
    const bags = connectCheckbox(this.state(), this.id, describedBy);
    const inputBag: CheckboxInputBag = { ...bags.input, ...aria, 'aria-describedby': bags.input['aria-describedby'] };
    return { ...bags, input: inputBag, labelFor: bags.labelFor === null ? null : String(inputBag['id']) };
  });

  constructor() {
    useBootstrap(bootstrapForms);
    // `indeterminate` has no attribute, so it is a browser-only property write;
    // aria-checked="mixed" in the bag already carries it in the SSR output.
    afterRenderEffect(() => {
      const el = this.inputRef()?.nativeElement;
      if (el) el.indeterminate = this.state().indeterminate;
    });
  }

  onChange(ev: Event) {
    // A user toggle always clears the mixed state, natively and here.
    this.isToggled.set((ev.target as HTMLInputElement).checked);
    this.indeterminate.set(false);
  }

}
