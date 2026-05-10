import { AfterViewInit, ChangeDetectionStrategy, Component, computed, ElementRef, input, model, signal, viewChild } from '@angular/core';
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
  }
}
