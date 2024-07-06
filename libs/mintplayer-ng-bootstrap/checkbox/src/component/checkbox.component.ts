import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsCheckboxGroupDirective } from '../directive/checkbox-group/checkbox-group.directive';

@Component({
  selector: 'bs-checkbox',
  standalone: true,
  imports: [CommonModule, BsToggleButtonComponent],
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.scss',
})
export class BsCheckboxComponent {
  displayStyle = input<'checkbox' | 'switch' | 'toggle_button'>('checkbox');
  value = input<string>();
  group = inject(BsCheckboxGroupDirective, { optional: true });
}
