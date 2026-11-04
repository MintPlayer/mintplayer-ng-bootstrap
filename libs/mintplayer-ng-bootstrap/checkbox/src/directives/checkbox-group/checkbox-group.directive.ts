import { computed, Directive, ElementRef, inject, input, model } from '@angular/core';
import { coreContextToken } from '@mintplayer/ng-bootstrap/machine';
import { CHECKBOX_GROUP, type CheckboxGroupContext } from '@mintplayer/ui-core/checkbox';
import { BsCheckboxGroupValueAccessor } from '../../checkbox-group.accessor';

/** Hosts whose own role is load-bearing: a group role would destroy it. */
const STRUCTURAL = new Set(['TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'UL', 'OL', 'LI']);

/**
 * The attribute form of a checkbox group (Angular only, #458 M4): put it on a
 * host you already have (a `<tbody>` whose rows each hold a checkbox, a `<div>`
 * in a table cell). The `<bs-checkbox>` descendants take its name (`<name>[]`)
 * and selection through DI, so the nearest group wins. Bind `[formControl]` /
 * `[(ngModel)]` / `[(value)]` on the same element.
 *
 * It adds `role="group"` only on a host whose implicit role is generic and that
 * has no role of its own. Use `<bs-checkbox-group>` for a standalone set.
 */
@Directive({
  selector: '[bsCheckboxGroup]',
  exportAs: 'bsCheckboxGroup',
  hostDirectives: [BsCheckboxGroupValueAccessor],
  providers: [{ provide: coreContextToken(CHECKBOX_GROUP), useFactory: () => inject(BsCheckboxGroupDirective).provided }],
  host: {
    // CHECKBOX_GROUP_ATTR, literal for the AOT compiler: the checkboxes find their group by it.
    '[attr.data-checkbox-group]': "''",
    '[attr.aria-disabled]': "disabled() ? 'true' : null",
  },
})
export class BsCheckboxGroupDirective {
  private readonly accessor = inject(BsCheckboxGroupValueAccessor, { self: true });

  /** The group's name: its checkboxes submit as `<name>[]`. */
  readonly name = input<string | null>(null);
  /** The selected checkboxes' values, when no form control is bound. */
  readonly value = model<readonly string[]>([]);

  readonly disabled = computed(() => this.accessor.disabled());

  /** What the checkboxes read. */
  readonly provided = computed<CheckboxGroupContext>(() => ({
    grouped: true,
    name: this.name(),
    value: this.accessor.bound() ? this.accessor.viewValue() : this.value(),
    disabled: this.disabled(),
  }));

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    if (!host.hasAttribute('role') && !STRUCTURAL.has(host.tagName)) host.setAttribute('role', 'group');
    // Keep [(value)] honest: a toggle writes back.
    this.accessor.onPick = (value) => this.value.set(value);
  }
}
