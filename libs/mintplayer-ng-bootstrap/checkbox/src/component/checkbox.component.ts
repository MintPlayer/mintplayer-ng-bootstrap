import { Component, computed, ElementRef, inject, input, signal, viewChild } from '@angular/core';
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
  isEnabled = signal<boolean>(true);
  group = inject(BsCheckboxGroupDirective, { optional: true });
  groupName = computed(() => this.group ? this.group.name + '[]' : '');
  check = viewChild<ElementRef<HTMLInputElement>>('check');

  isButton = computed(() => this.displayStyle() === 'toggle_button');
  isSwitch = computed(() => this.displayStyle() === 'switch');
  inputClass = computed(() => this.isButton() ? 'btn-check' : 'form-check-input');
  labelClass = computed(() => this.isButton() ? 'btn btn-primary' : 'form-check-label');
  isDisabled = computed(() => !this.isEnabled());
}
