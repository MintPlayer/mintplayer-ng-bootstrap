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
import { BsRadioGroupDirective } from '../directives/radio-group/radio-group.directive';
import { BsRadioType } from '../types/radio-type';
import type { MpRadio, RadioChangeEventDetail } from '@mintplayer/web-components/radio';

// Side-effect import: registers <mp-radio>.
import '@mintplayer/web-components/radio';
import { BsForwardAriaDirective } from '@mintplayer/ng-bootstrap/a11y';

@Component({
  selector: 'bs-radio',
  templateUrl: './radio.component.html',
  imports: [BsForwardAriaDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'd-inline-block',
  },
})
export class BsRadioComponent {

  private readonly parentGroup = inject(BsRadioGroupDirective, { optional: true, skipSelf: true });

  /** Reference to the underlying `<mp-radio>` WC. Read by `[bsRadioGroup]`
   *  to write the WC's `checked` property — shadow DOM blocks the browser's
   *  native radio one-of-N across <mp-radio> instances, so the group
   *  directive must coordinate unchecking explicitly. */
  readonly radioRef = viewChild.required<ElementRef<MpRadio>>('radio');

  type = input<BsRadioType>('radio');
  isToggled = model<boolean>(false);
  value = input<string | null>(null);
  group = input<BsRadioGroupDirective | null>(null);

  /** Explicit `[group]` input wins over the DI-injected ancestor. */
  readonly resolvedGroup = computed(() => this.group() ?? this.parentGroup ?? null);

  /** Name comes from the resolved group; `<bs-radio>` has no `[name]` input. */
  readonly nameResult = computed(() => this.resolvedGroup()?.name() ?? null);

  constructor() {
    effect(() => {
      const el = this.radioRef()?.nativeElement;
      if (!el) return;
      el.type = this.type();
      el.value = this.value();
      el.name = this.nameResult();
      el.checked = this.isToggled();
    });
  }

  onChange(ev: Event) {
    const detail = (ev as CustomEvent<RadioChangeEventDetail>).detail;
    this.isToggled.set(detail.checked);
  }

}
