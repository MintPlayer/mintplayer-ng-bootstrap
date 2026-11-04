import { booleanAttribute, computed, Directive, inject, input, model } from '@angular/core';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { coreContextToken } from '@mintplayer/ng-bootstrap/machine';
import { RADIO_GROUP, radioGroupName, type RadioGroupContext } from '@mintplayer/ui-core/radio';
import { BsRadioGroupValueAccessor } from '../../radio-group.accessor';

/**
 * The attribute form of a radio group (Angular only, #458 M3): put it on a host
 * you already have (a `<tbody>` whose rows each hold a radio, a `<div>` in a table
 * cell, a `<bs-button-group>`). The `<bs-radio>` descendants take its `name` and
 * selection through DI, so the nearest group wins: a radio list in a cell is its
 * own group, and the row selection around it is another. Bind `[formControl]` /
 * `[(ngModel)]` / `[(value)]` on the same element.
 *
 * It adds no role: the host keeps its own (a `rowgroup`, a `group`). Use
 * `<bs-radio-group>` where the set needs `role="radiogroup"`.
 */
@Directive({
  selector: '[bsRadioGroup]',
  exportAs: 'bsRadioGroup',
  hostDirectives: [BsRadioGroupValueAccessor],
  providers: [{ provide: coreContextToken(RADIO_GROUP), useFactory: () => inject(BsRadioGroupDirective).provided }],
  host: {
    // RADIO_GROUP_ATTR, literal for the AOT compiler: the radios find their group by it.
    '[attr.data-radio-group]': "''",
    '[attr.aria-required]': "required() ? 'true' : null",
    '[attr.aria-disabled]': "disabled() ? 'true' : null",
  },
})
export class BsRadioGroupDirective {
  private readonly accessor = inject(BsRadioGroupValueAccessor, { self: true });
  private readonly id = inject(BsIdService).next('bs-radio-group');

  /** The radios' shared name; generated when omitted, so native grouping always forms. */
  readonly name = input<string | null>(null);
  /** Marks the set required: `aria-required` on the host and `required` on every radio. */
  readonly required = input(false, { transform: booleanAttribute });
  /** The selected radio's value, when no form control is bound. */
  readonly value = model<string | null>(null);

  readonly disabled = computed(() => this.accessor.disabled());

  /** What the radios read. */
  readonly provided = computed<RadioGroupContext>(() => ({
    grouped: true,
    name: this.name() ?? radioGroupName(this.id),
    value: this.accessor.bound() ? this.accessor.viewValue() : this.value(),
    disabled: this.disabled(),
    required: this.required(),
  }));

  constructor() {
    // Keep [(value)] honest: a pick writes back.
    this.accessor.onPick = (value) => this.value.set(value);
  }
}
