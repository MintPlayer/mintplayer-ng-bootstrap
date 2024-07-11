import { Component, computed, inject, input, signal } from '@angular/core';
import { BsRadioGroupDirective } from '../directives/radio-group/radio-group.directive';

@Component({
  selector: 'bs-radio',
  templateUrl: './radio.component.html',
  styleUrl: './radio.component.scss',
})
export class BsRadioComponent {
  displayStyle = input<'radio' | 'toggle_button'>('radio');
  value = input.required<string>();
  isEnabled = signal<boolean>(true);
  group = inject(BsRadioGroupDirective);
  groupName = computed(() => this.group.name() + '[]');

  isButton = computed(() => this.displayStyle() === 'toggle_button');
  inputClass = computed(() => this.isButton() ? 'btn-check' : 'form-check-input');
  labelClass = computed(() => this.isButton() ? 'btn btn-primary' : 'form-check-label');
  isDisabled = computed(() => !this.isEnabled());
}
