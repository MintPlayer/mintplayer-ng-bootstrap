import { AfterViewInit, ChangeDetectionStrategy, Component, computed, ElementRef, input, model, viewChild } from '@angular/core';
import { BsToggleButtonGroupDirective } from '../directives/toggle-button-group/toggle-button-group.directive';
import { BsCheckStyle } from '../types/check-style';

@Component({
  selector: 'bs-toggle-button',
  templateUrl: './toggle-button.component.html',
  styleUrls: ['./toggle-button.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'd-inline-block',
  },
})
export class BsToggleButtonComponent implements AfterViewInit {

  readonly checkbox = viewChild.required<ElementRef<HTMLInputElement>>('checkbox');

  disableAnimations = true;

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

  ngAfterViewInit() {
    this.disableAnimations = false;
  }
}
