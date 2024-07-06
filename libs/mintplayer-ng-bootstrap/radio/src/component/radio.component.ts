import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsRadioGroupDirective } from '../directive/radio-group/radio-group.directive';

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
}
