import { AfterViewInit, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, model, PLATFORM_ID, viewChild } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsCheckboxValueAccessor } from '../value-accessor/checkbox-value-accessor';
import { BsCheckboxGroupDirective } from '../directives/checkbox-group/checkbox-group.directive';
import { BsCheckboxType } from '../types/checkbox-type';

@Component({
  selector: 'bs-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BsToggleButtonComponent],
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

  readonly checkbox = viewChild.required<ElementRef<HTMLInputElement>>('checkbox');

  type = input<BsCheckboxType>('checkbox');
  isToggled = model<boolean | null>(false);
  name = input<string | null>(null);
  value = input<string | null>(null);
  group = input<BsCheckboxGroupDirective | null>(null);

  /** Explicit `[group]` input wins over the DI-injected ancestor. */
  readonly resolvedGroup = computed(() => this.group() ?? this.parentGroup ?? null);

  mainCheckStyle = computed(() => {
    switch (this.type()) {
      case 'checkbox':
      case 'switch':
        return 'form-check';
      default:
        return null;
    }
  });

  isSwitch = computed(() => this.type() === 'switch');

  inputClass = computed(() => {
    switch (this.type()) {
      case 'checkbox':
      case 'switch':
        return 'form-check-input';
      case 'toggle_button':
        return 'btn-check';
    }
  });

  labelClass = computed(() => {
    switch (this.type()) {
      case 'checkbox':
      case 'switch':
        return 'form-check-label';
      case 'toggle_button':
        return 'btn btn-primary';
    }
  });

  /**
   * ARIA role override per type. `'checkbox'` keeps its implicit role.
   * `'switch'` gets `role="switch"`. `'toggle_button'` is exposed as the
   * ARIA toggle-button pattern (`role="button"` + `aria-pressed`).
   */
  ariaRole = computed<string | null>(() => {
    switch (this.type()) {
      case 'switch':
        return 'switch';
      case 'toggle_button':
        return 'button';
      default:
        return null;
    }
  });

  /** Only meaningful for the toggle-button (role=button) variant. */
  ariaPressed = computed<string | null>(() => {
    if (this.type() !== 'toggle_button') return null;
    return this.isToggled() ? 'true' : 'false';
  });

  /** Single-mode → component's own `[name]`. Multi-mode → group's `[name]` + `[]`. */
  nameResult = computed(() => {
    const group = this.resolvedGroup();
    if (group) {
      const groupName = group.name();
      return groupName == null ? null : `${groupName}[]`;
    }
    return this.name();
  });

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
