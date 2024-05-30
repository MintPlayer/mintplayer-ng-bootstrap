import { JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsCheckRadioGroupDirective } from '@mintplayer/ng-bootstrap/form-check';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsRadioButtonComponent } from '@mintplayer/ng-bootstrap/radio-button';

@Component({
  selector: 'demo-toggle-button',
  templateUrl: './toggle-button.component.html',
  styleUrls: ['./toggle-button.component.scss'],
  standalone: true,
  imports: [JsonPipe, FormsModule, BsGridModule, BsCheckboxComponent, BsRadioButtonComponent, BsCheckRadioGroupDirective]
})
export class ToggleButtonComponent {
  darkMode: boolean | null = true;

  // Checkbox - Multi mode
  favoriteColors: string[] = [];

  // Checkbox - Single mode
  isAllDisabled = false;
  isHstsEnabled = true;
  isCrossPlatform = false;

  // Radio
  theme: 'light' | 'dark' | 'contrast' | 'disabled' = 'light';
}
