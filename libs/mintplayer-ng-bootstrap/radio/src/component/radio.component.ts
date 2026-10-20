import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  model,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  connectRadio,
  radioClasses,
  type RadioInputBag,
  type RadioState,
} from '@mintplayer/ui-core/radio';
import type { ToggleButtonColor } from '@mintplayer/ui-core/checkbox';
import { BsControlValidityDirective, BsIdService, takeHostAria } from '@mintplayer/ng-bootstrap/a11y';
import { MpPropsDirective } from '@mintplayer/ng-bootstrap/machine';
import { BsRadioGroupDirective } from '../directives/radio-group/radio-group.directive';
import { BsRadioType } from '../types/radio-type';

/**
 * A native `<input type=radio>` in Bootstrap's `.form-check` / `.btn-check`
 * markup, rendered by this component's own template (#437). Inside a
 * `[bsRadioGroup]` it takes the group's `name`, so the browser supplies the
 * one-of-N, the single tab stop and arrow move-and-select, with JavaScript
 * off as well. The consumer's `aria-*` / `id` / `tabindex` on `<bs-radio>`
 * land on the input.
 */
@Component({
  hostDirectives: [{
    directive: BsControlValidityDirective,
    inputs: ['errorMessages'],
  }],
  selector: 'bs-radio',
  templateUrl: './radio.component.html',
  imports: [MpPropsDirective, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'd-inline-block',
  },
})
export class BsRadioComponent {

  private readonly parentGroup = inject(BsRadioGroupDirective, { optional: true, skipSelf: true });
  private readonly validity = inject(BsControlValidityDirective, { self: true });
  private readonly hostAria = takeHostAria(inject(ElementRef).nativeElement);
  private readonly id = inject(BsIdService).next('bs-radio');

  type = input<BsRadioType>('radio');
  /** Button colour of a `toggle_button`; ignored by `radio`. */
  color = input<ToggleButtonColor>('secondary');
  isToggled = model<boolean>(false);
  value = input<string | null>(null);
  disabled = input<boolean>(false);
  group = input<BsRadioGroupDirective | null>(null);
  /**
   * The input's accessible name when it has no visible label (a radio in a table
   * row). Host aria-* are read once at creation, so a bound [attr.aria-label]
   * would not follow; this input does.
   */
  inputLabel = input<string | null>(null);

  /** Explicit `[group]` input wins over the DI-injected ancestor. */
  readonly resolvedGroup = computed(() => this.group() ?? this.parentGroup ?? null);

  /** In a group the selection is the group's value; alone, `isToggled`. */
  readonly checked = computed(() => {
    const group = this.resolvedGroup();
    return group ? group.value() !== null && group.value() === this.value() : this.isToggled();
  });

  private readonly state = computed<RadioState>(() => ({
    type: this.type(),
    checked: this.checked(),
    disabled: this.disabled() || !!this.resolvedGroup()?.disabled(),
    required: this.validity.required() || !!this.resolvedGroup()?.required(),
    invalid: this.validity.invalid(),
    // `<bs-radio>` has no `[name]` input: the group owns it.
    name: this.resolvedGroup()?.groupName() ?? null,
    value: this.value(),
    errorText: this.validity.errorText(),
  }));

  readonly classes = computed(() => radioClasses(this.type(), this.color(), this.state().invalid));

  readonly bags = computed(() => {
    const { 'aria-describedby': describedBy, ...aria } = this.hostAria;
    const bags = connectRadio(this.state(), this.id, describedBy);
    const label = this.inputLabel();
    const inputBag: RadioInputBag = {
      ...bags.input,
      ...aria,
      ...(label === null ? {} : { 'aria-label': label }),
      'aria-describedby': bags.input['aria-describedby'],
    };
    return { ...bags, input: inputBag, labelFor: bags.labelFor === null ? null : String(inputBag['id']) };
  });

  constructor() {
    // Keep `[(isToggled)]` honest in a group, where a sibling's selection unchecks this radio.
    effect(() => {
      if (this.resolvedGroup()) this.isToggled.set(this.checked());
    });
  }

  /** A native radio fires `change` only when it becomes checked: by click, Space or an arrow key. */
  onChange(ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    const group = this.resolvedGroup();
    if (group) group.select(this.value());
    else this.isToggled.set(checked);
  }

}
