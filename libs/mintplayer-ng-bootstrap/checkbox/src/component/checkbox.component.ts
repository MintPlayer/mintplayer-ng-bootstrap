import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsCheckboxGroupDirective } from '../directives/checkbox-group/checkbox-group.directive';

@Component({
  selector: 'bs-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.scss'
})
export class BsCheckboxComponent {
  displayStyle = input<'checkbox' | 'switch' | 'toggle_button'>('checkbox');
  value = input<string>();
  group = inject(BsCheckboxGroupDirective, { optional: true });
  groupName = computed(() => this.group ? this.group.name() + '[]' : '');

  isButton = computed(() => this.displayStyle() === 'toggle_button');
  inputClass = computed(() => this.isButton() ? 'btn-check' : 'form-check-input');
  labelClass = computed(() => this.isButton() ? 'btn btn-primary' : 'form-check-label');
}
