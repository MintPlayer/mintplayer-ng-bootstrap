import { AfterViewInit, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, model, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { BsToggleButtonValueAccessor } from '../value-accessor/toggle-button-value-accessor';
import { BsToggleButtonGroupDirective } from '../directives/toggle-button-group/toggle-button-group.directive';
import { BsCheckStyle } from '../types/check-style';

@Component({
  selector: 'bs-toggle-button',
  templateUrl: './toggle-button.component.html',
  styleUrls: ['./toggle-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BsToggleButtonValueAccessor],
  host: {
    'class': 'd-inline-block',
  },
})
export class BsToggleButtonComponent implements AfterViewInit {

  private readonly hostRef = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly checkbox = viewChild.required<ElementRef<HTMLInputElement>>('checkbox');

  disableAnimations = signal(true);

  type = input<BsCheckStyle>('checkbox');
  isToggled = model<boolean | null>(false);
  name = input<string | null>(null);
  value = input<string | null>(null);
  group = input<BsToggleButtonGroupDirective | null>(null);

  mainCheckStyle = computed(() => {
    switch (this.type()) {
      case 'checkbox':
      case 'radio':
      case 'switch':
        return 'form-check';
      default:
        return null;
    }
  });

  isSwitch = computed(() => {
    switch (this.type()) {
      case 'switch':
        return true;
      default:
        return false;
    }
  });

  inputClass = computed(() => {
    switch (this.type()) {
      case 'checkbox':
      case 'radio':
      case 'switch':
        return 'form-check-input';
      default:
        return 'btn-check';
    }
  });

  labelClass = computed(() => {
    switch (this.type()) {
      case 'checkbox':
      case 'radio':
      case 'switch':
        return 'form-check-label';
      case 'toggle_button':
        return 'btn btn-primary'
      case 'radio_toggle_button':
        return 'btn btn-secondary';
    }
  });

  checkOrRadio = computed<'checkbox' | 'radio'>(() => {
    switch (this.type()) {
      case 'radio':
      case 'radio_toggle_button':
        return 'radio';
      default:
        return 'checkbox';
    }
  });

  /**
   * ARIA role override per type. We let `checkbox`, `radio`, and `radio_toggle_button`
   * keep their implicit roles (`checkbox` / `radio`) — those are already correct.
   * `switch` gets `role="switch"`. `toggle_button` is exposed as the ARIA toggle-button
   * pattern (`role="button"` + `aria-pressed`), which is how SRs announce it as a
   * toggle button rather than a checkbox.
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

  nameResult = computed(() => {
    const type = this.type();
    const name = this.name();
    const group = this.group();
    switch (type) {
      case 'radio':
      case 'radio_toggle_button':
        return name;
      case 'checkbox':
      case 'toggle_button':
      case 'switch':
        if (group) {
          return `${name}[]`;
        } else {
          return name;
        }
      default:
        throw 'Invalid value';
    }
  });

  onInputChange(ev: Event) {
    this.isToggled.set((ev.target as HTMLInputElement).checked);
  }

  ngAfterViewInit() {
    this.disableAnimations.set(false);
    this.mirrorAriaAttributesToInput();
  }

  /**
   * Mirror every `aria-*` attribute from the host element onto the inner
   * `<input>`. The host is a plain Angular tag (no shadow DOM), so screen
   * readers compute the focused control's accessible name from the input
   * itself — `aria-label` / `aria-labelledby` / `aria-describedby` on the
   * host would otherwise be invisible to AT. A MutationObserver keeps the
   * mirror in sync with `[attr.aria-…]` bindings that change at runtime.
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
