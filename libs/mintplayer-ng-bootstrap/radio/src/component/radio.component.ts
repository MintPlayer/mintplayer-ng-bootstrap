import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BsRadioGroupDirective } from '../directives/radio-group/radio-group.directive';
import { BsRadioType } from '../types/radio-type';
import type { MpRadio, RadioChangeEventDetail } from '@mintplayer/web-components/radio';
// Side-effect import: registers <mp-radio>.
import '@mintplayer/web-components/radio';

@Component({
  selector: 'bs-radio',
  templateUrl: './radio.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'd-inline-block',
  },
})
export class BsRadioComponent implements AfterViewInit {

  private readonly hostRef = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
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

  ngAfterViewInit() {
    this.mirrorAriaAttributesToRadio();
  }

  /**
   * Mirror every `aria-*` attribute from the host element onto the inner
   * `<mp-radio>`. ATs read the accessible name from the focused element
   * (the inner input, which the WC mirrors aria-* to internally) — surfacing
   * host-level `[attr.aria-…]` bindings on the wrapper means hopping them
   * through the WC. A MutationObserver keeps the mirror in sync with
   * runtime aria attribute changes.
   */
  private mirrorAriaAttributesToRadio() {
    if (isPlatformServer(this.platformId)) return;
    const host = this.hostRef.nativeElement as HTMLElement;
    const radio = this.radioRef().nativeElement as HTMLElement;
    const mirror = () => {
      Array.from(host.attributes)
        .filter(attr => attr.name.startsWith('aria-'))
        .forEach(({ name, value }) => radio.setAttribute(name, value));
    };
    mirror();
    const observer = new MutationObserver(mirror);
    observer.observe(host, { attributes: true });
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
