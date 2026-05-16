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
import { BsCheckboxValueAccessor } from '../value-accessor/checkbox-value-accessor';
import { BsCheckboxGroupDirective } from '../directives/checkbox-group/checkbox-group.directive';
import { BsCheckboxType } from '../types/checkbox-type';
import type { CheckboxChangeEventDetail, MpCheckbox } from '@mintplayer/ng-bootstrap/web-components/checkbox';

// Side-effect import: registers <mp-checkbox>.
import '@mintplayer/ng-bootstrap/web-components/checkbox';

@Component({
  selector: 'bs-checkbox',
  templateUrl: './checkbox.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BsCheckboxValueAccessor],
  host: {
    'class': 'd-inline-block',
  },
})
export class BsCheckboxComponent implements AfterViewInit {

  private readonly hostRef = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
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

  ngAfterViewInit() {
    this.mirrorAriaAttributesToCheckbox();
  }

  /**
   * Mirror every `aria-*` attribute from the host element onto the inner
   * `<mp-checkbox>`. Keeps consumer-set `[attr.aria-…]` bindings reachable
   * to assistive tech (the WC mirrors them onto its own inner <input>).
   * A MutationObserver keeps the mirror in sync with runtime changes.
   */
  private mirrorAriaAttributesToCheckbox() {
    if (isPlatformServer(this.platformId)) return;
    const host = this.hostRef.nativeElement as HTMLElement;
    const checkbox = this.checkboxRef().nativeElement as HTMLElement;
    const mirror = () => {
      Array.from(host.attributes)
        .filter(attr => attr.name.startsWith('aria-'))
        .forEach(({ name, value }) => checkbox.setAttribute(name, value));
    };
    mirror();
    const observer = new MutationObserver(mirror);
    observer.observe(host, { attributes: true });
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
