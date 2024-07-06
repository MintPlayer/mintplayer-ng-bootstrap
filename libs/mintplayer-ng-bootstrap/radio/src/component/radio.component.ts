import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsRadioGroupDirective } from '../directives/radio-group/radio-group.directive';

@Component({
  selector: 'bs-radio',
  standalone: true,
  imports: [CommonModule, BsToggleButtonComponent],
  templateUrl: './radio.component.html',
  styleUrl: './radio.component.scss',
})
export class BsRadioComponent {
  displayStyle = input<'radio' | 'toggle_button'>('radio');
  value = input.required<string>();
  group = inject(BsRadioGroupDirective);
  groupName = computed(() => this.group.name() + '[]');

  isButton = computed(() => this.displayStyle() === 'toggle_button');
  inputClass = computed(() => this.isButton() ? 'btn-check' : 'form-check-input');
  labelClass = computed(() => this.isButton() ? 'btn btn-primary' : 'form-check-label');
}
