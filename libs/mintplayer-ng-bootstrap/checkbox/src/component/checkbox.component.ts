import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';
import { BsCheckboxValueAccessor } from '../value-accessor/checkbox-value-accessor';
import { BsCheckboxGroupDirective } from '../directives/checkbox-group/checkbox-group.directive';
import { BsCheckboxType } from '../types/checkbox-type';
import type { CheckboxChangeEventDetail, MpCheckbox } from '@mintplayer/web-components/checkbox';

// Side-effect import: registers <mp-checkbox>.
import '@mintplayer/web-components/checkbox';
import { BsForwardAriaDirective, BsControlValidityDirective } from '@mintplayer/ng-bootstrap/a11y';

@Component({
  selector: 'bs-checkbox',
  templateUrl: './checkbox.component.html',
  imports: [BsForwardAriaDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BsCheckboxValueAccessor, BsControlValidityDirective],
  host: {
    'class': 'd-inline-block',
  },
})
export class BsCheckboxComponent {

  private readonly parentGroup = inject(BsCheckboxGroupDirective, { optional: true, skipSelf: true });

  /** Reference to the underlying `<mp-checkbox>` WC. Read by
   *  `BsCheckboxValueAccessor` and `[bsCheckboxGroup]` to write the WC's
   *  `checked` / `disabled` / `indeterminate` properties. */
  readonly checkboxRef = viewChild.required<ElementRef<MpCheckbox>>('checkbox');

  type = input<BsCheckboxType>('checkbox');
  isToggled = model<boolean | null>(false);
  indeterminate = model<boolean>(false);
  name = input<string | null>(null);
  value = input<string | null>(null);
  group = input<BsCheckboxGroupDirective | null>(null);

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

  constructor() {
    effect(() => {
      const el = this.checkboxRef()?.nativeElement;
      if (!el) return;
      el.type = this.type();
      el.value = this.value();
      el.name = this.nameResult();
      el.checked = !!this.isToggled();
      el.indeterminate = this.indeterminate();
    });
  }

  onChange(ev: Event) {
    const detail = (ev as CustomEvent<CheckboxChangeEventDetail>).detail;
    this.isToggled.set(detail.checked);
    this.indeterminate.set(detail.indeterminate);
  }

}
