import { AfterViewInit, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, model, PLATFORM_ID, viewChild } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsRadioGroupDirective } from '../directives/radio-group/radio-group.directive';
import { BsRadioType } from '../types/radio-type';

@Component({
  selector: 'bs-radio',
  templateUrl: './radio.component.html',
  styleUrls: ['./radio.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BsToggleButtonComponent],
  host: {
    'class': 'd-inline-block',
  },
})
export class BsRadioComponent implements AfterViewInit {

  private readonly hostRef = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly parentGroup = inject(BsRadioGroupDirective, { optional: true, skipSelf: true });

  readonly checkbox = viewChild.required<ElementRef<HTMLInputElement>>('checkbox');

  type = input<BsRadioType>('radio');
  isToggled = model<boolean>(false);
  value = input<string | null>(null);
  group = input<BsRadioGroupDirective | null>(null);

  /** Explicit `[group]` input wins over the DI-injected ancestor. */
  readonly resolvedGroup = computed(() => this.group() ?? this.parentGroup ?? null);

  mainCheckStyle = computed(() => this.type() === 'radio' ? 'form-check' : null);

  inputClass = computed(() => this.type() === 'radio' ? 'form-check-input' : 'btn-check');

  labelClass = computed(() => this.type() === 'radio' ? 'form-check-label' : 'btn btn-secondary');

  /** Name comes from the resolved group; `<bs-radio>` has no `[name]` input. */
  nameResult = computed(() => this.resolvedGroup()?.name() ?? null);

  onInputChange(ev: Event) {
    this.isToggled.set((ev.target as HTMLInputElement).checked);
  }

  ngAfterViewInit() {
    this.mirrorAriaAttributesToInput();
  }

  /**
   * Mirror every `aria-*` attribute from the host element onto the inner
   * `<input>`. Screen readers compute the focused control's accessible name
   * from the input itself — `aria-label` / `aria-labelledby` / `aria-describedby`
   * on the host would otherwise be invisible to AT. A MutationObserver keeps
   * the mirror in sync with `[attr.aria-…]` bindings that change at runtime.
   */
  private mirrorAriaAttributesToInput() {
    if (isPlatformServer(this.platformId)) return;
    const host = this.hostRef.nativeElement as HTMLElement;
    const input = this.checkbox().nativeElement;
    const mirror = () => {
      Array.from(host.attributes)
        .filter(attr => attr.name.startsWith('aria-'))
        .forEach(({ name, value }) => input.setAttribute(name, value));
    };
    mirror();
    const observer = new MutationObserver(mirror);
    observer.observe(host, { attributes: true });
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
